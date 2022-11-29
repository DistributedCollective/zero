// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./LoCManagerBase.sol";

contract LoCManagerRedeemOps is LoCManagerBase {
    /** Send _ZUSDamount ZUSD to the system and redeem the corresponding amount of collateral from as many LoCs as are needed to fill the redemption
      request.  Applies pending rewards to a LoC before reducing its debt and coll.
     
      Note that if _amount is very large, this function can run out of gas, specially if traversed locs are small. This can be easily avoided by
      splitting the total _amount in appropriate chunks and calling the function multiple times.
     
      Param `_maxIterations` can also be provided, so the loop through LoCs is capped (if it’s zero, it will be ignored).This makes it easier to
      avoid OOG for the frontend, as only knowing approximately the average cost of an iteration is enough, without needing to know the “topology”
      of the LoC list. It also avoids the need to set the cap in stone in the contract, nor doing gas calculations, as both gas price and opcode
      costs can vary.
     
      All LoCs that are redeemed from -- with the likely exception of the last one -- will end up with no debt left, therefore they will be closed.
      If the last LoC does have some remaining debt, it has a finite ICR, and the reinsertion could be anywhere in the list, therefore it requires a hint.
      A frontend should use getRedemptionHints() to calculate what the ICR of this LoC will be after redemption, and pass a hint for its position
      in the sortedLoCs list along with the ICR value that the hint was found for.
     
      If another transaction modifies the list between calling getRedemptionHints() and passing the hints to redeemCollateral(), it
      is very likely that the last (partially) redeemed LoC would end up with a different ICR than what the hint is for. In this case the
      redemption will stop after the last completely redeemed LoC and the sender will keep the remaining ZUSD amount, which they can attempt
      to redeem later.
     */
    function redeemCollateral(
        uint256 _ZUSDamount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) external {
        ContractsCache memory contractsCache = ContractsCache(
            activePool,
            defaultPool,
            _zusdToken,
            _zeroStaking,
            sortedLoCs,
            collSurplusPool,
            gasPoolAddress
        );
        RedemptionTotals memory totals;

        _requireValidMaxFeePercentage(_maxFeePercentage);
        _requireAfterBootstrapPeriod();
        totals.price = priceFeed.fetchPrice();
        _requireTCRoverMCR(totals.price);
        _requireAmountGreaterThanZero(_ZUSDamount);
        _requireZUSDBalanceCoversRedemption(contractsCache.zusdToken, msg.sender, _ZUSDamount);

        totals.totalZUSDSupplyAtStart = getEntireSystemDebt();
        // Confirm redeemer's balance is less than total ZUSD supply
        assert(contractsCache.zusdToken.balanceOf(msg.sender) <= totals.totalZUSDSupplyAtStart);

        totals.remainingZUSD = _ZUSDamount;
        address currentBorrower;

        if (
            _isValidFirstRedemptionHint(
                contractsCache.sortedLoCs,
                _firstRedemptionHint,
                totals.price
            )
        ) {
            currentBorrower = _firstRedemptionHint;
        } else {
            currentBorrower = contractsCache.sortedLoCs.getLast();
            // Find the first LoC with ICR >= MCR
            while (
                currentBorrower != address(0) &&
                _getCurrentICR(currentBorrower, totals.price) < zeroBaseParams.MCR()
            ) {
                currentBorrower = contractsCache.sortedLoCs.getPrev(currentBorrower);
            }
        }

        // Loop through the LoCs starting from the one with lowest collateral ratio until _amount of ZUSD is exchanged for collateral
        if (_maxIterations == 0) {
            _maxIterations = uint256(-1);
        }
        while (currentBorrower != address(0) && totals.remainingZUSD > 0 && _maxIterations > 0) {
            _maxIterations--;
            // Save the address of the LoC preceding the current one, before potentially modifying the list
            address nextUserToCheck = contractsCache.sortedLoCs.getPrev(currentBorrower);

            _applyPendingRewards(
                contractsCache.activePool,
                contractsCache.defaultPool,
                currentBorrower
            );

            SingleRedemptionValues memory singleRedemption = _redeemCollateralFromLoC(
                contractsCache,
                currentBorrower,
                totals.remainingZUSD,
                totals.price,
                _upperPartialRedemptionHint,
                _lowerPartialRedemptionHint,
                _partialRedemptionHintNICR
            );

            if (singleRedemption.cancelledPartial) break; // Partial redemption was cancelled (out-of-date hint, or new net debt < minimum), therefore we could not redeem from the last LoC

            totals.totalZUSDToRedeem = totals.totalZUSDToRedeem.add(singleRedemption.ZUSDLot);
            totals.totalBTCDrawn = totals.totalBTCDrawn.add(singleRedemption.BTCLot);

            totals.remainingZUSD = totals.remainingZUSD.sub(singleRedemption.ZUSDLot);
            currentBorrower = nextUserToCheck;
        }
        require(totals.totalBTCDrawn > 0, "LoCManager: Unable to redeem any amount");

        // Decay the baseRate due to time passed, and then increase it according to the size of this redemption.
        // Use the saved total ZUSD supply value, from before it was reduced by the redemption.
        _updateBaseRateFromRedemption(
            totals.totalBTCDrawn,
            totals.price,
            totals.totalZUSDSupplyAtStart
        );

        // Calculate the BTC fee
        totals.BTCFee = _getRedemptionFee(totals.totalBTCDrawn);

        _requireUserAcceptsFee(totals.BTCFee, totals.totalBTCDrawn, _maxFeePercentage);

        // Send the BTC fee to the feeDistributorContract address
        contractsCache.activePool.sendBTC(address(feeDistributor), totals.BTCFee);
        feeDistributor.distributeFees();

        totals.BTCToSendToRedeemer = totals.totalBTCDrawn.sub(totals.BTCFee);

        emit Redemption(_ZUSDamount, totals.totalZUSDToRedeem, totals.totalBTCDrawn, totals.BTCFee);

        // Burn the total ZUSD that is cancelled with debt, and send the redeemed BTC to msg.sender
        contractsCache.zusdToken.burn(msg.sender, totals.totalZUSDToRedeem);
        // Update Active Pool ZUSD, and send BTC to account
        contractsCache.activePool.decreaseZUSDDebt(totals.totalZUSDToRedeem);
        contractsCache.activePool.sendBTC(msg.sender, totals.BTCToSendToRedeemer);
    }

    function _isValidFirstRedemptionHint(
        ISortedLoCs _sortedLoCs,
        address _firstRedemptionHint,
        uint256 _price
    ) internal view returns (bool) {
        if (
            _firstRedemptionHint == address(0) ||
            !_sortedLoCs.contains(_firstRedemptionHint) ||
            _getCurrentICR(_firstRedemptionHint, _price) < zeroBaseParams.MCR()
        ) {
            return false;
        }

        address nextLoC = _sortedLoCs.getNext(_firstRedemptionHint);
        return nextLoC == address(0) || _getCurrentICR(nextLoC, _price) < zeroBaseParams.MCR();
    }

    /// Redeem as much collateral as possible from _borrower's LoC in exchange for ZUSD up to _maxZUSDamount
    function _redeemCollateralFromLoC(
        ContractsCache memory _contractsCache,
        address _borrower,
        uint256 _maxZUSDamount,
        uint256 _price,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR
    ) internal returns (SingleRedemptionValues memory singleRedemption) {
        // Determine the remaining amount (lot) to be redeemed, capped by the entire debt of the LoC minus the liquidation reserve
        singleRedemption.ZUSDLot = ZeroMath._min(
            _maxZUSDamount,
            LoCs[_borrower].debt.sub(ZUSD_GAS_COMPENSATION)
        );

        // Get the BTCLot of equivalent value in USD
        singleRedemption.BTCLot = singleRedemption.ZUSDLot.mul(DECIMAL_PRECISION).div(_price);

        // Decrease the debt and collateral of the current LoC according to the ZUSD lot and corresponding BTC to send
        uint256 newDebt = (LoCs[_borrower].debt).sub(singleRedemption.ZUSDLot);
        uint256 newColl = (LoCs[_borrower].coll).sub(singleRedemption.BTCLot);

        if (newDebt == ZUSD_GAS_COMPENSATION) {
            // No debt left in the LoC (except for the liquidation reserve), therefore the LoC gets closed
            _removeStake(_borrower);
            _closeLoC(_borrower, Status.closedByRedemption);
            _redeemCloseLoC(_contractsCache, _borrower, ZUSD_GAS_COMPENSATION, newColl);
            emit LoCUpdated(_borrower, 0, 0, 0, LoCManagerOperation.redeemCollateral);
        } else {
            uint256 newNICR = ZeroMath._computeNominalCR(newColl, newDebt);

            /*
             * If the provided hint is out of date, we bail since trying to reinsert without a good hint will almost
             * certainly result in running out of gas.
             *
             * If the resultant net debt of the partial is less than the minimum, net debt we bail.
             */
            if (newNICR != _partialRedemptionHintNICR || _getNetDebt(newDebt) < MIN_NET_DEBT) {
                singleRedemption.cancelledPartial = true;
                return singleRedemption;
            }

            _contractsCache.sortedLoCs.reInsert(
                _borrower,
                newNICR,
                _upperPartialRedemptionHint,
                _lowerPartialRedemptionHint
            );

            LoCs[_borrower].debt = newDebt;
            LoCs[_borrower].coll = newColl;
            _updateStakeAndTotalStakes(_borrower);

            emit LoCUpdated(
                _borrower,
                newDebt,
                newColl,
                LoCs[_borrower].stake,
                LoCManagerOperation.redeemCollateral
            );
        }

        return singleRedemption;
    }

    /**
      This function has two impacts on the baseRate state variable:
      1) decays the baseRate based on time passed since last redemption or ZUSD borrowing operation.
      then,
      2) increases the baseRate based on the amount redeemed, as a proportion of total supply
     */
    function _updateBaseRateFromRedemption(
        uint256 _BTCDrawn,
        uint256 _price,
        uint256 _totalZUSDSupply
    ) internal returns (uint256) {
        uint256 decayedBaseRate = _calcDecayedBaseRate();

        /* Convert the drawn BTC back to ZUSD at face value rate (1 ZUSD:1 USD), in order to get
         * the fraction of total supply that was redeemed at face value. */
        uint256 redeemedZUSDFraction = _BTCDrawn.mul(_price).div(_totalZUSDSupply);

        uint256 newBaseRate = decayedBaseRate.add(redeemedZUSDFraction.div(BETA));
        newBaseRate = ZeroMath._min(newBaseRate, DECIMAL_PRECISION); // cap baseRate at a maximum of 100%
        //assert(newBaseRate <= DECIMAL_PRECISION); // This is already enforced in the line above
        assert(newBaseRate > 0); // Base rate is always non-zero after redemption

        // Update the baseRate state variable
        baseRate = newBaseRate;
        emit BaseRateUpdated(newBaseRate);

        _updateLastFeeOpTime();

        return newBaseRate;
    }

    /**
      Called when a full redemption occurs, and closes the loc.
      The redeemer swaps (debt - liquidation reserve) ZUSD for (debt - liquidation reserve) worth of BTC, so the ZUSD liquidation reserve left corresponds to the remaining debt.
      In order to close the loc, the ZUSD liquidation reserve is burned, and the corresponding debt is removed from the active pool.
      The debt recorded on the LoC's struct is zero'd elswhere, in _closeLoC.
      Any surplus BTC left in the loc, is sent to the Coll surplus pool, and can be later claimed by the borrower.
     */
    function _redeemCloseLoC(
        ContractsCache memory _contractsCache,
        address _borrower,
        uint256 _ZUSD,
        uint256 _BTC
    ) internal {
        _contractsCache.zusdToken.burn(gasPoolAddress, _ZUSD);
        // Update Active Pool ZUSD, and send BTC to account
        _contractsCache.activePool.decreaseZUSDDebt(_ZUSD);

        // send BTC from Active Pool to CollSurplus Pool
        _contractsCache.collSurplusPool.accountSurplus(_borrower, _BTC);
        _contractsCache.activePool.sendBTC(address(_contractsCache.collSurplusPool), _BTC);
    }
}
