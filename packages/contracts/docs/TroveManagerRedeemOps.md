# TroveManagerRedeemOps.sol

View Source: [contracts/Dependencies/TroveManagerRedeemOps.sol](../contracts/Dependencies/TroveManagerRedeemOps.sol)

**↗ Extends: [TroveManagerBase](TroveManagerBase.md)**

**TroveManagerRedeemOps**

## Functions

- [redeemCollateral(uint256 _ZUSDamount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFeePercentage)](#redeemcollateral)
- [_isValidFirstRedemptionHint(ISortedTroves _sortedTroves, address _firstRedemptionHint, uint256 _price)](#_isvalidfirstredemptionhint)
- [_redeemCollateralFromTrove(struct TroveManagerBase.ContractsCache _contractsCache, address _borrower, uint256 _maxZUSDamount, uint256 _price, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR)](#_redeemcollateralfromtrove)
- [_updateBaseRateFromRedemption(uint256 _ETHDrawn, uint256 _price, uint256 _totalZUSDSupply)](#_updatebaseratefromredemption)
- [_redeemCloseTrove(struct TroveManagerBase.ContractsCache _contractsCache, address _borrower, uint256 _ZUSD, uint256 _ETH)](#_redeemclosetrove)

---    

> ### redeemCollateral

```solidity
function redeemCollateral(uint256 _ZUSDamount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFeePercentage) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDamount | uint256 |  | 
| _firstRedemptionHint | address |  | 
| _upperPartialRedemptionHint | address |  | 
| _lowerPartialRedemptionHint | address |  | 
| _partialRedemptionHintNICR | uint256 |  | 
| _maxIterations | uint256 |  | 
| _maxFeePercentage | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on redeemCollateral(
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

        emit Redemption(_ZUSDamount, totals.totalZUSDToRedeem, totals.totalETHDrawn, totals.ETHFee);

        // Burn the total ZUSD that is cancelled with debt, and send the redeemed ETH to msg.sender
        contractsCache.zusdToken.burn(msg.sender, totals.totalZUSDToRedeem);
        // Update Active Pool ZUSD, and send ETH to account
        contractsCache.activePool.decreaseZUSDDebt(totals.totalZUSDToRedeem);
        contractsCache.activePool.sendETH(msg.sender, totals.ETHToSendToRedeemer);
    }

```
</details>

---    

> ### _isValidFirstRedemptionHint

```solidity
function _isValidFirstRedemptionHint(ISortedTroves _sortedTroves, address _firstRedemptionHint, uint256 _price) internal view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _sortedTroves | ISortedTroves |  | 
| _firstRedemptionHint | address |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _isValidFirstRedemptionHint(
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
        return nextTrove == address(0) || _getCurrentICR(nextTrove, _price) < liquityBaseParams.MCR();
    }

```
</details>

---    

> ### _redeemCollateralFromTrove

```solidity
function _redeemCollateralFromTrove(struct TroveManagerBase.ContractsCache _contractsCache, address _borrower, uint256 _maxZUSDamount, uint256 _price, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR) internal nonpayable
returns(singleRedemption struct TroveManagerBase.SingleRedemptionValues)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _contractsCache | struct TroveManagerBase.ContractsCache |  | 
| _borrower | address |  | 
| _maxZUSDamount | uint256 |  | 
| _price | uint256 |  | 
| _upperPartialRedemptionHint | address |  | 
| _lowerPartialRedemptionHint | address |  | 
| _partialRedemptionHintNICR | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _redeemCollateralFromTrove(
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

```
</details>

---    

> ### _updateBaseRateFromRedemption

```solidity
function _updateBaseRateFromRedemption(uint256 _ETHDrawn, uint256 _price, uint256 _totalZUSDSupply) internal nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ETHDrawn | uint256 |  | 
| _price | uint256 |  | 
| _totalZUSDSupply | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _updateBaseRateFromRedemption(
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

```
</details>

---    

> ### _redeemCloseTrove

```solidity
function _redeemCloseTrove(struct TroveManagerBase.ContractsCache _contractsCache, address _borrower, uint256 _ZUSD, uint256 _ETH) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _contractsCache | struct TroveManagerBase.ContractsCache |  | 
| _borrower | address |  | 
| _ZUSD | uint256 |  | 
| _ETH | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _redeemCloseTrove(
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

```
</details>

## Contracts

* [ActivePool](ActivePool.md)
* [ActivePoolStorage](ActivePoolStorage.md)
* [BaseMath](BaseMath.md)
* [BorrowerOperations](BorrowerOperations.md)
* [BorrowerOperationsScript](BorrowerOperationsScript.md)
* [BorrowerOperationsStorage](BorrowerOperationsStorage.md)
* [BorrowerWrappersScript](BorrowerWrappersScript.md)
* [CheckContract](CheckContract.md)
* [CollSurplusPool](CollSurplusPool.md)
* [CollSurplusPoolStorage](CollSurplusPoolStorage.md)
* [console](console.md)
* [Context](Context.md)
* [DefaultPool](DefaultPool.md)
* [DefaultPoolStorage](DefaultPoolStorage.md)
* [DocsCover](DocsCover.md)
* [DSAuth](DSAuth.md)
* [DSAuthEvents](DSAuthEvents.md)
* [DSAuthority](DSAuthority.md)
* [DSNote](DSNote.md)
* [DSProxy](DSProxy.md)
* [DSProxyCache](DSProxyCache.md)
* [DSProxyFactory](DSProxyFactory.md)
* [ERC20](ERC20.md)
* [ETHTransferScript](ETHTransferScript.md)
* [FeeDistributor](FeeDistributor.md)
* [FeeDistributorStorage](FeeDistributorStorage.md)
* [GasPool](GasPool.md)
* [HintHelpers](HintHelpers.md)
* [HintHelpersStorage](HintHelpersStorage.md)
* [IActivePool](IActivePool.md)
* [IBalanceRedirectPresale](IBalanceRedirectPresale.md)
* [IBorrowerOperations](IBorrowerOperations.md)
* [ICollSurplusPool](ICollSurplusPool.md)
* [IDefaultPool](IDefaultPool.md)
* [IERC20](IERC20.md)
* [IERC2612](IERC2612.md)
* [IExternalPriceFeed](IExternalPriceFeed.md)
* [IFeeDistributor](IFeeDistributor.md)
* [IFeeSharingProxy](IFeeSharingProxy.md)
* [ILiquityBase](ILiquityBase.md)
* [ILiquityBaseParams](ILiquityBaseParams.md)
* [IMasset](IMasset.md)
* [IMoCBaseOracle](IMoCBaseOracle.md)
* [Initializable](Initializable.md)
* [IPool](IPool.md)
* [IPriceFeed](IPriceFeed.md)
* [IRSKOracle](IRSKOracle.md)
* [ISortedTroves](ISortedTroves.md)
* [IStabilityPool](IStabilityPool.md)
* [ITroveManager](ITroveManager.md)
* [IWrbtc](IWrbtc.md)
* [IZUSDToken](IZUSDToken.md)
* [LiquityBase](LiquityBase.md)
* [LiquityBaseParams](LiquityBaseParams.md)
* [LiquityMath](LiquityMath.md)
* [LiquitySafeMath128](LiquitySafeMath128.md)
* [MoCMedianizer](MoCMedianizer.md)
* [MultiTroveGetter](MultiTroveGetter.md)
* [MultiTroveGetterStorage](MultiTroveGetterStorage.md)
* [NueToken](NueToken.md)
* [Ownable](Ownable.md)
* [PriceFeed](PriceFeed.md)
* [PriceFeedStorage](PriceFeedStorage.md)
* [ProxiableContract](ProxiableContract.md)
* [ProxiableContract2](ProxiableContract2.md)
* [Proxy](Proxy.md)
* [RskOracle](RskOracle.md)
* [SafeMath](SafeMath.md)
* [SortedTroves](SortedTroves.md)
* [SortedTrovesStorage](SortedTrovesStorage.md)
* [StabilityPool](StabilityPool.md)
* [StabilityPoolScript](StabilityPoolScript.md)
* [StabilityPoolStorage](StabilityPoolStorage.md)
* [Storage](Storage.md)
* [Storage2](Storage2.md)
* [TokenScript](TokenScript.md)
* [TroveManager](TroveManager.md)
* [TroveManagerBase](TroveManagerBase.md)
* [TroveManagerBase1MinuteBootstrap](TroveManagerBase1MinuteBootstrap.md)
* [TroveManagerRedeemOps](TroveManagerRedeemOps.md)
* [TroveManagerScript](TroveManagerScript.md)
* [TroveManagerStorage](TroveManagerStorage.md)
* [UpgradableProxy](UpgradableProxy.md)
* [ZUSDToken](ZUSDToken.md)
* [ZUSDTokenStorage](ZUSDTokenStorage.md)
