// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "../Dependencies/Mynt/MyntLib.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "./TroveManagerBase.sol";

/// This contract is designed to be used via delegatecall from the TroveManager contract
/// TroveManagerBase constructor param is bootsrap period when redemptions are not allowed
contract TroveManagerRedeemOps is TroveManagerBase {
    /** Send _ZUSDamount ZUSD to the system and redeem the corresponding amount of collateral from as many Troves as are needed to fill the redemption
      request.  Applies pending rewards to a Trove before reducing its debt and coll.
     
      Note that if _amount is very large, this function can run out of gas, specially if traversed troves are small. This can be easily avoided by
      splitting the total _amount in appropriate chunks and calling the function multiple times.
     
      Param `_maxIterations` can also be provided, so the loop through Troves is capped (if it’s zero, it will be ignored).This makes it easier to
      avoid OOG for the frontend, as only knowing approximately the average cost of an iteration is enough, without needing to know the “topology”
      of the trove list. It also avoids the need to set the cap in stone in the contract, nor doing gas calculations, as both gas price and opcode
      costs can vary.
     
      All Troves that are redeemed from -- with the likely exception of the last one -- will end up with no debt left, therefore they will be closed.
      If the last Trove does have some remaining debt, it has a finite ICR, and the reinsertion could be anywhere in the list, therefore it requires a hint.
      A frontend should use getRedemptionHints() to calculate what the ICR of this Trove will be after redemption, and pass a hint for its position
      in the sortedTroves list along with the ICR value that the hint was found for.
     
      If another transaction modifies the list between calling getRedemptionHints() and passing the hints to redeemCollateral(), it
      is very likely that the last (partially) redeemed Trove would end up with a different ICR than what the hint is for. In this case the
      redemption will stop after the last completely redeemed Trove and the sender will keep the remaining ZUSD amount, which they can attempt
      to redeem later.
     */

    constructor(uint256 _bootstrapPeriod) public TroveManagerBase(_bootstrapPeriod) {}

    function redeemCollateral(
        uint256 _ZUSDamount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) external {
        _redeemCollateral(
            _ZUSDamount,
            _firstRedemptionHint,
            _upperPartialRedemptionHint,
            _lowerPartialRedemptionHint,
            _partialRedemptionHintNICR,
            _maxIterations,
            _maxFeePercentage
        );
    }

    function _redeemCollateral(
        uint256 _ZUSDamount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) internal {
        ContractsCache memory contractsCache = ContractsCache(
            activePool,
            defaultPool,
            _zusdToken,
            _zeroStaking,
            sortedTroves,
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
                contractsCache.sortedTroves,
                _firstRedemptionHint,
                totals.price
            )
        ) {
            currentBorrower = _firstRedemptionHint;
        } else {
            currentBorrower = contractsCache.sortedTroves.getLast();
            // Find the first trove with ICR >= MCR
            while (
                currentBorrower != address(0) &&
                _getCurrentICR(currentBorrower, totals.price) < liquityBaseParams.MCR()
            ) {
                currentBorrower = contractsCache.sortedTroves.getPrev(currentBorrower);
            }
        }

        // Loop through the Troves starting from the one with lowest collateral ratio until _amount of ZUSD is exchanged for collateral
        if (_maxIterations == 0) {
            _maxIterations = uint256(-1);
        }
        while (currentBorrower != address(0) && totals.remainingZUSD > 0 && _maxIterations > 0) {
            _maxIterations--;
            // Save the address of the Trove preceding the current one, before potentially modifying the list
            address nextUserToCheck = contractsCache.sortedTroves.getPrev(currentBorrower);

            _applyPendingRewards(
                contractsCache.activePool,
                contractsCache.defaultPool,
                currentBorrower
            );

            SingleRedemptionValues memory singleRedemption = _redeemCollateralFromTrove(
                contractsCache,
                currentBorrower,
                totals.remainingZUSD,
                totals.price,
                _upperPartialRedemptionHint,
                _lowerPartialRedemptionHint,
                _partialRedemptionHintNICR
            );

            if (singleRedemption.cancelledPartial) break; // Partial redemption was cancelled (out-of-date hint, or new net debt < minimum), therefore we could not redeem from the last Trove

            totals.totalZUSDToRedeem = totals.totalZUSDToRedeem.add(singleRedemption.ZUSDLot);
            totals.totalETHDrawn = totals.totalETHDrawn.add(singleRedemption.ETHLot);

            totals.remainingZUSD = totals.remainingZUSD.sub(singleRedemption.ZUSDLot);
            currentBorrower = nextUserToCheck;
        }
        require(totals.totalETHDrawn > 0, "TroveManager: Unable to redeem any amount");

        // Decay the baseRate due to time passed, and then increase it according to the size of this redemption.
        // Use the saved total ZUSD supply value, from before it was reduced by the redemption.
        _updateBaseRateFromRedemption(
            totals.totalETHDrawn,
            totals.price,
            totals.totalZUSDSupplyAtStart
        );

        // Calculate the ETH fee
        totals.ETHFee = _getRedemptionFee(totals.totalETHDrawn);

        _requireUserAcceptsFee(totals.ETHFee, totals.totalETHDrawn, _maxFeePercentage);

        // Send the ETH fee to the feeDistributorContract address
        contractsCache.activePool.sendETH(address(feeDistributor), totals.ETHFee);
        feeDistributor.distributeFees();

        totals.ETHToSendToRedeemer = totals.totalETHDrawn.sub(totals.ETHFee);

        emit Redemption(
            _ZUSDamount,
            totals.totalZUSDToRedeem,
            totals.totalETHDrawn,
            totals.ETHFee
        );

        // Burn the total ZUSD that is cancelled with debt, and send the redeemed ETH to msg.sender
        contractsCache.zusdToken.burn(msg.sender, totals.totalZUSDToRedeem);
        // Update Active Pool ZUSD, and send ETH to account
        contractsCache.activePool.decreaseZUSDDebt(totals.totalZUSDToRedeem);
        contractsCache.activePool.sendETH(msg.sender, totals.ETHToSendToRedeemer);
    }

    ///DLLR _owner can use Sovryn Mynt to convert DLLR to ZUSD, then use the Zero redemption mechanism to redeem ZUSD for RBTC, all in a single transaction
    function redeemCollateralViaDLLR(
        uint256 _dllrAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage,
        IMassetManager.PermitParams calldata _permitParams
    ) external {
        uint256 _zusdAmount = MyntLib.redeemZusdFromDllrWithPermit(
            IBorrowerOperations(borrowerOperationsAddress).getMassetManager(),
            _dllrAmount,
            address(_zusdToken),
            _permitParams
        );
        _redeemCollateral(
            _zusdAmount,
            _firstRedemptionHint,
            _upperPartialRedemptionHint,
            _lowerPartialRedemptionHint,
            _partialRedemptionHintNICR,
            _maxIterations,
            _maxFeePercentage
        );
    }

    function _isValidFirstRedemptionHint(
        ISortedTroves _sortedTroves,
        address _firstRedemptionHint,
        uint256 _price
    ) internal view returns (bool) {
        if (
            _firstRedemptionHint == address(0) ||
            !_sortedTroves.contains(_firstRedemptionHint) ||
            _getCurrentICR(_firstRedemptionHint, _price) < liquityBaseParams.MCR()
        ) {
            return false;
        }

        address nextTrove = _sortedTroves.getNext(_firstRedemptionHint);
        return
            nextTrove == address(0) || _getCurrentICR(nextTrove, _price) < liquityBaseParams.MCR();
    }

    /// Redeem as much collateral as possible from _borrower's Trove in exchange for ZUSD up to _maxZUSDamount
    function _redeemCollateralFromTrove(
        ContractsCache memory _contractsCache,
        address _borrower,
        uint256 _maxZUSDamount,
        uint256 _price,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR
    ) internal returns (SingleRedemptionValues memory singleRedemption) {
        // Determine the remaining amount (lot) to be redeemed, capped by the entire debt of the Trove minus the liquidation reserve
        singleRedemption.ZUSDLot = LiquityMath._min(
            _maxZUSDamount,
            Troves[_borrower].debt.sub(ZUSD_GAS_COMPENSATION)
        );

        // Get the ETHLot of equivalent value in USD
        singleRedemption.ETHLot = singleRedemption.ZUSDLot.mul(DECIMAL_PRECISION).div(_price);

        // Decrease the debt and collateral of the current Trove according to the ZUSD lot and corresponding ETH to send
        uint256 newDebt = (Troves[_borrower].debt).sub(singleRedemption.ZUSDLot);
        uint256 newColl = (Troves[_borrower].coll).sub(singleRedemption.ETHLot);

        if (newDebt == ZUSD_GAS_COMPENSATION) {
            // No debt left in the Trove (except for the liquidation reserve), therefore the trove gets closed
            _removeStake(_borrower);
            _closeTrove(_borrower, Status.closedByRedemption);
            _redeemCloseTrove(_contractsCache, _borrower, ZUSD_GAS_COMPENSATION, newColl);
            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.redeemCollateral);
        } else {
            uint256 newNICR = LiquityMath._computeNominalCR(newColl, newDebt);

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

            _contractsCache.sortedTroves.reInsert(
                _borrower,
                newNICR,
                _upperPartialRedemptionHint,
                _lowerPartialRedemptionHint
            );

            Troves[_borrower].debt = newDebt;
            Troves[_borrower].coll = newColl;
            _updateStakeAndTotalStakes(_borrower);

            emit TroveUpdated(
                _borrower,
                newDebt,
                newColl,
                Troves[_borrower].stake,
                TroveManagerOperation.redeemCollateral
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
        uint256 _ETHDrawn,
        uint256 _price,
        uint256 _totalZUSDSupply
    ) internal returns (uint256) {
        uint256 decayedBaseRate = _calcDecayedBaseRate();

        /* Convert the drawn ETH back to ZUSD at face value rate (1 ZUSD:1 USD), in order to get
         * the fraction of total supply that was redeemed at face value. */
        uint256 redeemedZUSDFraction = _ETHDrawn.mul(_price).div(_totalZUSDSupply);

        uint256 newBaseRate = decayedBaseRate.add(redeemedZUSDFraction.div(BETA));
        newBaseRate = LiquityMath._min(newBaseRate, DECIMAL_PRECISION); // cap baseRate at a maximum of 100%
        //assert(newBaseRate <= DECIMAL_PRECISION); // This is already enforced in the line above
        assert(newBaseRate > 0); // Base rate is always non-zero after redemption

        // Update the baseRate state variable
        baseRate = newBaseRate;
        emit BaseRateUpdated(newBaseRate);

        _updateLastFeeOpTime();

        return newBaseRate;
    }

    /**
      Called when a full redemption occurs, and closes the trove.
      The redeemer swaps (debt - liquidation reserve) ZUSD for (debt - liquidation reserve) worth of ETH, so the ZUSD liquidation reserve left corresponds to the remaining debt.
      In order to close the trove, the ZUSD liquidation reserve is burned, and the corresponding debt is removed from the active pool.
      The debt recorded on the trove's struct is zero'd elswhere, in _closeTrove.
      Any surplus ETH left in the trove, is sent to the Coll surplus pool, and can be later claimed by the borrower.
     */
    function _redeemCloseTrove(
        ContractsCache memory _contractsCache,
        address _borrower,
        uint256 _ZUSD,
        uint256 _ETH
    ) internal {
        _contractsCache.zusdToken.burn(gasPoolAddress, _ZUSD);
        // Update Active Pool ZUSD, and send ETH to account
        _contractsCache.activePool.decreaseZUSDDebt(_ZUSD);

        // send ETH from Active Pool to CollSurplus Pool
        _contractsCache.collSurplusPool.accountSurplus(_borrower, _ETH);
        _contractsCache.activePool.sendETH(address(_contractsCache.collSurplusPool), _ETH);
    }
}
