# TroveManager.sol

View Source: [contracts/TroveManager.sol](../contracts/TroveManager.sol)

**↗ Extends: [TroveManagerBase](TroveManagerBase.md), [CheckContract](CheckContract.md), [ITroveManager](ITroveManager.md)**

**TroveManager**

**Events**

```js
event FeeDistributorAddressChanged(address  _feeDistributorAddress);
event TroveManagerRedeemOpsAddressChanged(address  _troveManagerRedeemOps);
event LiquityBaseParamsAddressChanges(address  _borrowerOperationsAddress);
event BorrowerOperationsAddressChanged(address  _newBorrowerOperationsAddress);
event PriceFeedAddressChanged(address  _newPriceFeedAddress);
event ZUSDTokenAddressChanged(address  _newZUSDTokenAddress);
event ActivePoolAddressChanged(address  _activePoolAddress);
event DefaultPoolAddressChanged(address  _defaultPoolAddress);
event StabilityPoolAddressChanged(address  _stabilityPoolAddress);
event GasPoolAddressChanged(address  _gasPoolAddress);
event CollSurplusPoolAddressChanged(address  _collSurplusPoolAddress);
event SortedTrovesAddressChanged(address  _sortedTrovesAddress);
event ZEROTokenAddressChanged(address  _zeroTokenAddress);
event ZEROStakingAddressChanged(address  _zeroStakingAddress);
```

## Functions

- [setAddresses(address _feeDistributorAddress, address _troveManagerRedeemOps, address _liquityBaseParamsAddress, address _borrowerOperationsAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _zusdTokenAddress, address _sortedTrovesAddress, address _zeroTokenAddress, address _zeroStakingAddress)](#setaddresses)
- [getTroveOwnersCount()](#gettroveownerscount)
- [getTroveFromTroveOwnersArray(uint256 _index)](#gettrovefromtroveownersarray)
- [liquidate(address _borrower)](#liquidate)
- [_liquidateNormalMode(IActivePool _activePool, IDefaultPool _defaultPool, address _borrower, uint256 _ZUSDInStabPool)](#_liquidatenormalmode)
- [_liquidateRecoveryMode(IActivePool _activePool, IDefaultPool _defaultPool, address _borrower, uint256 _ICR, uint256 _ZUSDInStabPool, uint256 _TCR, uint256 _price)](#_liquidaterecoverymode)
- [_getOffsetAndRedistributionVals(uint256 _debt, uint256 _coll, uint256 _ZUSDInStabPool)](#_getoffsetandredistributionvals)
- [_getCappedOffsetVals(uint256 _entireTroveDebt, uint256 _entireTroveColl, uint256 _price)](#_getcappedoffsetvals)
- [liquidateTroves(uint256 _n)](#liquidatetroves)
- [_getTotalsFromLiquidateTrovesSequence_RecoveryMode(struct TroveManagerBase.ContractsCache _contractsCache, uint256 _price, uint256 _ZUSDInStabPool, uint256 _n)](#_gettotalsfromliquidatetrovessequence_recoverymode)
- [_getTotalsFromLiquidateTrovesSequence_NormalMode(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _price, uint256 _ZUSDInStabPool, uint256 _n)](#_gettotalsfromliquidatetrovessequence_normalmode)
- [batchLiquidateTroves(address[] _troveArray)](#batchliquidatetroves)
- [_getTotalFromBatchLiquidate_RecoveryMode(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _price, uint256 _ZUSDInStabPool, address[] _troveArray)](#_gettotalfrombatchliquidate_recoverymode)
- [_getTotalsFromBatchLiquidate_NormalMode(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _price, uint256 _ZUSDInStabPool, address[] _troveArray)](#_gettotalsfrombatchliquidate_normalmode)
- [_addLiquidationValuesToTotals(struct TroveManagerBase.LiquidationTotals oldTotals, struct TroveManagerBase.LiquidationValues singleLiquidation)](#_addliquidationvaluestototals)
- [_sendGasCompensation(IActivePool _activePool, address _liquidator, uint256 _ZUSD, uint256 _ETH)](#_sendgascompensation)
- [getNominalICR(address _borrower)](#getnominalicr)
- [applyPendingRewards(address _borrower)](#applypendingrewards)
- [updateTroveRewardSnapshots(address _borrower)](#updatetroverewardsnapshots)
- [getEntireDebtAndColl(address _borrower)](#getentiredebtandcoll)
- [removeStake(address _borrower)](#removestake)
- [updateStakeAndTotalStakes(address _borrower)](#updatestakeandtotalstakes)
- [_redistributeDebtAndColl(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _debt, uint256 _coll)](#_redistributedebtandcoll)
- [closeTrove(address _borrower)](#closetrove)
- [_updateSystemSnapshots_excludeCollRemainder(IActivePool _activePool, uint256 _collRemainder)](#_updatesystemsnapshots_excludecollremainder)
- [addTroveOwnerToArray(address _borrower)](#addtroveownertoarray)
- [_addTroveOwnerToArray(address _borrower)](#_addtroveownertoarray)
- [getTCR(uint256 _price)](#gettcr)
- [MCR()](#mcr)
- [CCR()](#ccr)
- [checkRecoveryMode(uint256 _price)](#checkrecoverymode)
- [_checkPotentialRecoveryMode(uint256 _entireSystemColl, uint256 _entireSystemDebt, uint256 _price)](#_checkpotentialrecoverymode)
- [getRedemptionRateWithDecay()](#getredemptionratewithdecay)
- [getRedemptionFeeWithDecay(uint256 _ETHDrawn)](#getredemptionfeewithdecay)
- [getBorrowingRate()](#getborrowingrate)
- [getBorrowingRateWithDecay()](#getborrowingratewithdecay)
- [_calcBorrowingRate(uint256 _baseRate)](#_calcborrowingrate)
- [getBorrowingFee(uint256 _ZUSDDebt)](#getborrowingfee)
- [getBorrowingFeeWithDecay(uint256 _ZUSDDebt)](#getborrowingfeewithdecay)
- [_calcBorrowingFee(uint256 _borrowingRate, uint256 _ZUSDDebt)](#_calcborrowingfee)
- [decayBaseRateFromBorrowing()](#decaybaseratefromborrowing)
- [getTroveStatus(address _borrower)](#gettrovestatus)
- [getTroveStake(address _borrower)](#gettrovestake)
- [getTroveDebt(address _borrower)](#gettrovedebt)
- [getTroveColl(address _borrower)](#gettrovecoll)
- [setTroveStatus(address _borrower, uint256 _num)](#settrovestatus)
- [increaseTroveColl(address _borrower, uint256 _collIncrease)](#increasetrovecoll)
- [decreaseTroveColl(address _borrower, uint256 _collDecrease)](#decreasetrovecoll)
- [increaseTroveDebt(address _borrower, uint256 _debtIncrease)](#increasetrovedebt)
- [decreaseTroveDebt(address _borrower, uint256 _debtDecrease)](#decreasetrovedebt)
- [getCurrentICR(address _borrower, uint256 _price)](#getcurrenticr)
- [getPendingETHReward(address _borrower)](#getpendingethreward)
- [getPendingZUSDDebtReward(address _borrower)](#getpendingzusddebtreward)
- [hasPendingRewards(address _borrower)](#haspendingrewards)
- [getRedemptionRate()](#getredemptionrate)
- [redeemCollateral(uint256 _ZUSDamount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFeePercentage)](#redeemcollateral)

---    

> ### setAddresses

```solidity
function setAddresses(address _feeDistributorAddress, address _troveManagerRedeemOps, address _liquityBaseParamsAddress, address _borrowerOperationsAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _zusdTokenAddress, address _sortedTrovesAddress, address _zeroTokenAddress, address _zeroStakingAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _feeDistributorAddress | address |  | 
| _troveManagerRedeemOps | address |  | 
| _liquityBaseParamsAddress | address |  | 
| _borrowerOperationsAddress | address |  | 
| _activePoolAddress | address |  | 
| _defaultPoolAddress | address |  | 
| _stabilityPoolAddress | address |  | 
| _gasPoolAddress | address |  | 
| _collSurplusPoolAddress | address |  | 
| _priceFeedAddress | address |  | 
| _zusdTokenAddress | address |  | 
| _sortedTrovesAddress | address |  | 
| _zeroTokenAddress | address |  | 
| _zeroStakingAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _feeDistributorAddress,
        address _troveManagerRedeemOps,
        address _liquityBaseParamsAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _zusdTokenAddress,
        address _sortedTrovesAddress,
        address _zeroTokenAddress,
        address _zeroStakingAddress
    ) external override onlyOwner {

        checkContract(_feeDistributorAddress);
        checkContract(_troveManagerRedeemOps);
        checkContract(_liquityBaseParamsAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_activePoolAddress);
        checkContract(_defaultPoolAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_gasPoolAddress);
        checkContract(_collSurplusPoolAddress);
        checkContract(_priceFeedAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_sortedTrovesAddress);
        checkContract(_zeroTokenAddress);
        checkContract(_zeroStakingAddress);

        feeDistributor = IFeeDistributor(_feeDistributorAddress);
        troveManagerRedeemOps = _troveManagerRedeemOps;
        liquityBaseParams = ILiquityBaseParams(_liquityBaseParamsAddress);
        borrowerOperationsAddress = _borrowerOperationsAddress;
        activePool = IActivePool(_activePoolAddress);
        defaultPool = IDefaultPool(_defaultPoolAddress);
        _stabilityPool = IStabilityPool(_stabilityPoolAddress);
        gasPoolAddress = _gasPoolAddress;
        collSurplusPool = ICollSurplusPool(_collSurplusPoolAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        _zusdToken = IZUSDToken(_zusdTokenAddress);
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        _zeroToken = IZEROToken(_zeroTokenAddress);
        _zeroStaking = IZEROStaking(_zeroStakingAddress);        

        emit FeeDistributorAddressChanged(_feeDistributorAddress);
        emit TroveManagerRedeemOpsAddressChanged(_troveManagerRedeemOps);
        emit LiquityBaseParamsAddressChanges(_borrowerOperationsAddress);
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit GasPoolAddressChanged(_gasPoolAddress);
        emit CollSurplusPoolAddressChanged(_collSurplusPoolAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit SortedTrovesAddressChanged(_sortedTrovesAddress);
        emit ZEROTokenAddressChanged(_zeroTokenAddress);
        emit ZEROStakingAddressChanged(_zeroStakingAddress);

    }
```
</details>

---    

> ### getTroveOwnersCount

```solidity
function getTroveOwnersCount() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTroveOwnersCount() external view override returns (uint256) {
        return TroveOwners.length;
    }
```
</details>

---    

> ### getTroveFromTroveOwnersArray

```solidity
function getTroveFromTroveOwnersArray(uint256 _index) external view
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _index | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTroveFromTroveOwnersArray(uint256 _index) external view override returns (address) {
        return TroveOwners[_index];
    }
```
</details>

---    

> ### liquidate

```solidity
function liquidate(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function liquidate(address _borrower) external override {
        _requireTroveIsActive(_borrower);

        address[] memory borrowers = new address[](1);
        borrowers[0] = _borrower;
        batchLiquidateTroves(borrowers);
    }
```
</details>

---    

> ### _liquidateNormalMode

```solidity
function _liquidateNormalMode(IActivePool _activePool, IDefaultPool _defaultPool, address _borrower, uint256 _ZUSDInStabPool) internal nonpayable
returns(singleLiquidation struct TroveManagerBase.LiquidationValues)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _borrower | address |  | 
| _ZUSDInStabPool | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _liquidateNormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        address _borrower,
        uint256 _ZUSDInStabPool
    ) internal returns (LiquidationValues memory singleLiquidation) {
        LocalVariables_InnerSingleLiquidateFunction memory vars;

        (
            singleLiquidation.entireTroveDebt,
            singleLiquidation.entireTroveColl,
            vars.pendingDebtReward,
            vars.pendingCollReward
        ) = getEntireDebtAndColl(_borrower);

        _movePendingTroveRewardsToActivePool(
            _activePool,
            _defaultPool,
            vars.pendingDebtReward,
            vars.pendingCollReward
        );
        _removeStake(_borrower);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(
            singleLiquidation.entireTroveColl
        );
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;
        uint256 collToLiquidate = singleLiquidation.entireTroveColl.sub(
            singleLiquidation.collGasCompensation
        );

        (
            singleLiquidation.debtToOffset,
            singleLiquidation.collToSendToSP,
            singleLiquidation.debtToRedistribute,
            singleLiquidation.collToRedistribute
        ) = _getOffsetAndRedistributionVals(
            singleLiquidation.entireTroveDebt,
            collToLiquidate,
            _ZUSDInStabPool
        );

        _closeTrove(_borrower, Status.closedByLiquidation);
        emit TroveLiquidated(
            _borrower,
            singleLiquidation.entireTroveDebt,
            singleLiquidation.entireTroveColl,
            TroveManagerOperation.liquidateInNormalMode
        );
        emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInNormalMode);
        return singleLiquidation;
    }
```
</details>

---    

> ### _liquidateRecoveryMode

```solidity
function _liquidateRecoveryMode(IActivePool _activePool, IDefaultPool _defaultPool, address _borrower, uint256 _ICR, uint256 _ZUSDInStabPool, uint256 _TCR, uint256 _price) internal nonpayable
returns(singleLiquidation struct TroveManagerBase.LiquidationValues)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _borrower | address |  | 
| _ICR | uint256 |  | 
| _ZUSDInStabPool | uint256 |  | 
| _TCR | uint256 |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _liquidateRecoveryMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        address _borrower,
        uint256 _ICR,
        uint256 _ZUSDInStabPool,
        uint256 _TCR,
        uint256 _price
    ) internal returns (LiquidationValues memory singleLiquidation) {
        LocalVariables_InnerSingleLiquidateFunction memory vars;
        if (TroveOwners.length <= 1) {
            return singleLiquidation;
        } // don't liquidate if last trove
        (
            singleLiquidation.entireTroveDebt,
            singleLiquidation.entireTroveColl,
            vars.pendingDebtReward,
            vars.pendingCollReward
        ) = getEntireDebtAndColl(_borrower);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(
            singleLiquidation.entireTroveColl
        );
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;
        vars.collToLiquidate = singleLiquidation.entireTroveColl.sub(
            singleLiquidation.collGasCompensation
        );

        // If ICR <= 100%, purely redistribute the Trove across all active Troves
        if (_ICR <= _100pct) {
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            _removeStake(_borrower);

            singleLiquidation.debtToOffset = 0;
            singleLiquidation.collToSendToSP = 0;
            singleLiquidation.debtToRedistribute = singleLiquidation.entireTroveDebt;
            singleLiquidation.collToRedistribute = vars.collToLiquidate;

            _closeTrove(_borrower, Status.closedByLiquidation);
            emit TroveLiquidated(
                _borrower,
                singleLiquidation.entireTroveDebt,
                singleLiquidation.entireTroveColl,
                TroveManagerOperation.liquidateInRecoveryMode
            );
            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);

            // If 100% < ICR < MCR, offset as much as possible, and redistribute the remainder
        } else if ((_ICR > _100pct) && (_ICR < liquityBaseParams.MCR())) {
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            _removeStake(_borrower);

            (
                singleLiquidation.debtToOffset,
                singleLiquidation.collToSendToSP,
                singleLiquidation.debtToRedistribute,
                singleLiquidation.collToRedistribute
            ) = _getOffsetAndRedistributionVals(
                singleLiquidation.entireTroveDebt,
                vars.collToLiquidate,
                _ZUSDInStabPool
            );

            _closeTrove(_borrower, Status.closedByLiquidation);
            emit TroveLiquidated(
                _borrower,
                singleLiquidation.entireTroveDebt,
                singleLiquidation.entireTroveColl,
                TroveManagerOperation.liquidateInRecoveryMode
            );
            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);
            /*
             * If 110% <= ICR < current TCR (accounting for the preceding liquidations in the current sequence)
             * and there is ZUSD in the Stability Pool, only offset, with no redistribution,
             * but at a capped rate of 1.1 and only if the whole debt can be liquidated.
             * The remainder due to the capped rate will be claimable as collateral surplus.
             */
        } else if (
            (_ICR >= liquityBaseParams.MCR()) &&
            (_ICR < _TCR) &&
            (singleLiquidation.entireTroveDebt <= _ZUSDInStabPool)
        ) {
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            assert(_ZUSDInStabPool != 0);

            _removeStake(_borrower);
            singleLiquidation = _getCappedOffsetVals(
                singleLiquidation.entireTroveDebt,
                singleLiquidation.entireTroveColl,
                _price
            );

            _closeTrove(_borrower, Status.closedByLiquidation);
            if (singleLiquidation.collSurplus > 0) {
                collSurplusPool.accountSurplus(_borrower, singleLiquidation.collSurplus);
            }

            emit TroveLiquidated(
                _borrower,
                singleLiquidation.entireTroveDebt,
                singleLiquidation.collToSendToSP,
                TroveManagerOperation.liquidateInRecoveryMode
            );
            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);
        } else {
            // if (_ICR >= liquityBaseParams.MCR() && ( _ICR >= _TCR || singleLiquidation.entireTroveDebt > _ZUSDInStabPool))
            LiquidationValues memory zeroVals;
            return zeroVals;
        }

        return singleLiquidation;
    }
```
</details>

---    

> ### _getOffsetAndRedistributionVals

```solidity
function _getOffsetAndRedistributionVals(uint256 _debt, uint256 _coll, uint256 _ZUSDInStabPool) internal pure
returns(debtToOffset uint256, collToSendToSP uint256, debtToRedistribute uint256, collToRedistribute uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _debt | uint256 |  | 
| _coll | uint256 |  | 
| _ZUSDInStabPool | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getOffsetAndRedistributionVals(
        uint256 _debt,
        uint256 _coll,
        uint256 _ZUSDInStabPool
    )
        internal
        pure
        returns (
            uint256 debtToOffset,
            uint256 collToSendToSP,
            uint256 debtToRedistribute,
            uint256 collToRedistribute
        )
    {
        if (_ZUSDInStabPool > 0) {
            /*
             * Offset as much debt & collateral as possible against the Stability Pool, and redistribute the remainder
             * between all active troves.
             *
             *  If the trove's debt is larger than the deposited ZUSD in the Stability Pool:
             *
             *  - Offset an amount of the trove's debt equal to the ZUSD in the Stability Pool
             *  - Send a fraction of the trove's collateral to the Stability Pool, equal to the fraction of its offset debt
             *
             */
            debtToOffset = LiquityMath._min(_debt, _ZUSDInStabPool);
            collToSendToSP = _coll.mul(debtToOffset).div(_debt);
            debtToRedistribute = _debt.sub(debtToOffset);
            collToRedistribute = _coll.sub(collToSendToSP);
        } else {
            debtToOffset = 0;
            collToSendToSP = 0;
            debtToRedistribute = _debt;
            collToRedistribute = _coll;
        }
    }
```
</details>

---    

> ### _getCappedOffsetVals

```solidity
function _getCappedOffsetVals(uint256 _entireTroveDebt, uint256 _entireTroveColl, uint256 _price) internal view
returns(singleLiquidation struct TroveManagerBase.LiquidationValues)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _entireTroveDebt | uint256 |  | 
| _entireTroveColl | uint256 |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getCappedOffsetVals(
        uint256 _entireTroveDebt,
        uint256 _entireTroveColl,
        uint256 _price
    ) internal view returns (LiquidationValues memory singleLiquidation) {
        singleLiquidation.entireTroveDebt = _entireTroveDebt;
        singleLiquidation.entireTroveColl = _entireTroveColl;
        uint256 collToOffset = _entireTroveDebt.mul(liquityBaseParams.MCR()).div(_price);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(collToOffset);
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;

        singleLiquidation.debtToOffset = _entireTroveDebt;
        singleLiquidation.collToSendToSP = collToOffset.sub(singleLiquidation.collGasCompensation);
        singleLiquidation.collSurplus = _entireTroveColl.sub(collToOffset);
        singleLiquidation.debtToRedistribute = 0;
        singleLiquidation.collToRedistribute = 0;
    }
```
</details>

---    

> ### liquidateTroves

```solidity
function liquidateTroves(uint256 _n) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _n | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function liquidateTroves(uint256 _n) external override {
        ContractsCache memory contractsCache = ContractsCache(
            activePool,
            defaultPool,
            IZUSDToken(address(0)),
            IZEROStaking(address(0)),
            sortedTroves,
            ICollSurplusPool(address(0)),
            address(0)
        );
        IStabilityPool stabilityPoolCached = _stabilityPool;

        LocalVariables_OuterLiquidationFunction memory vars;

        LiquidationTotals memory totals;

        vars.price = priceFeed.fetchPrice();
        vars.ZUSDInStabPool = stabilityPoolCached.getTotalZUSDDeposits();
        vars.recoveryModeAtStart = _checkRecoveryMode(vars.price);

        // Perform the appropriate liquidation sequence - tally the values, and obtain their totals
        if (vars.recoveryModeAtStart) {
            totals = _getTotalsFromLiquidateTrovesSequence_RecoveryMode(
                contractsCache,
                vars.price,
                vars.ZUSDInStabPool,
                _n
            );
        } else {
            // if !vars.recoveryModeAtStart
            totals = _getTotalsFromLiquidateTrovesSequence_NormalMode(
                contractsCache.activePool,
                contractsCache.defaultPool,
                vars.price,
                vars.ZUSDInStabPool,
                _n
            );
        }

        require(totals.totalDebtInSequence > 0, "TroveManager: nothing to liquidate");

        // Move liquidated ETH and ZUSD to the appropriate pools
        stabilityPoolCached.offset(totals.totalDebtToOffset, totals.totalCollToSendToSP);
        _redistributeDebtAndColl(
            contractsCache.activePool,
            contractsCache.defaultPool,
            totals.totalDebtToRedistribute,
            totals.totalCollToRedistribute
        );
        if (totals.totalCollSurplus > 0) {
            contractsCache.activePool.sendETH(address(collSurplusPool), totals.totalCollSurplus);
        }

        // Update system snapshots
        _updateSystemSnapshots_excludeCollRemainder(
            contractsCache.activePool,
            totals.totalCollGasCompensation
        );

        vars.liquidatedDebt = totals.totalDebtInSequence;
        vars.liquidatedColl = totals.totalCollInSequence.sub(totals.totalCollGasCompensation).sub(
            totals.totalCollSurplus
        );
        emit Liquidation(
            vars.liquidatedDebt,
            vars.liquidatedColl,
            totals.totalCollGasCompensation,
            totals.totalZUSDGasCompensation
        );

        // Send gas compensation to caller
        _sendGasCompensation(
            contractsCache.activePool,
            msg.sender,
            totals.totalZUSDGasCompensation,
            totals.totalCollGasCompensation
        );
    }
```
</details>

---    

> ### _getTotalsFromLiquidateTrovesSequence_RecoveryMode

```solidity
function _getTotalsFromLiquidateTrovesSequence_RecoveryMode(struct TroveManagerBase.ContractsCache _contractsCache, uint256 _price, uint256 _ZUSDInStabPool, uint256 _n) internal nonpayable
returns(totals struct TroveManagerBase.LiquidationTotals)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _contractsCache | struct TroveManagerBase.ContractsCache |  | 
| _price | uint256 |  | 
| _ZUSDInStabPool | uint256 |  | 
| _n | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getTotalsFromLiquidateTrovesSequence_RecoveryMode(
        ContractsCache memory _contractsCache,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        uint256 _n
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;
        vars.backToNormalMode = false;
        vars.entireSystemDebt = getEntireSystemDebt();
        vars.entireSystemColl = getEntireSystemColl();

        vars.user = _contractsCache.sortedTroves.getLast();
        address firstUser = _contractsCache.sortedTroves.getFirst();
        for (vars.i = 0; vars.i < _n && vars.user != firstUser; vars.i++) {
            // we need to cache it, because current user is likely going to be deleted
            address nextUser = _contractsCache.sortedTroves.getPrev(vars.user);

            vars.ICR = _getCurrentICR(vars.user, _price);

            if (!vars.backToNormalMode) {
                // Break the loop if ICR is greater than liquityBaseParams.MCR() and Stability Pool is empty
                if (vars.ICR >= liquityBaseParams.MCR() && vars.remainingZUSDInStabPool == 0) {
                    break;
                }

                uint256 TCR = LiquityMath._computeCR(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );

                singleLiquidation = _liquidateRecoveryMode(
                    _contractsCache.activePool,
                    _contractsCache.defaultPool,
                    vars.user,
                    vars.ICR,
                    vars.remainingZUSDInStabPool,
                    TCR,
                    _price
                );

                // Update aggregate trackers
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );
                vars.entireSystemDebt = vars.entireSystemDebt.sub(singleLiquidation.debtToOffset);
                vars.entireSystemColl = vars
                .entireSystemColl
                .sub(singleLiquidation.collToSendToSP)
                .sub(singleLiquidation.collSurplus);

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);

                vars.backToNormalMode = !_checkPotentialRecoveryMode(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );
            } else if (vars.backToNormalMode && vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _contractsCache.activePool,
                    _contractsCache.defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );

                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            } else break; // break if the loop reaches a Trove with ICR >= MCR

            vars.user = nextUser;
        }
    }
```
</details>

---    

> ### _getTotalsFromLiquidateTrovesSequence_NormalMode

```solidity
function _getTotalsFromLiquidateTrovesSequence_NormalMode(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _price, uint256 _ZUSDInStabPool, uint256 _n) internal nonpayable
returns(totals struct TroveManagerBase.LiquidationTotals)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _price | uint256 |  | 
| _ZUSDInStabPool | uint256 |  | 
| _n | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getTotalsFromLiquidateTrovesSequence_NormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        uint256 _n
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;
        ISortedTroves sortedTrovesCached = sortedTroves;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;

        for (vars.i = 0; vars.i < _n; vars.i++) {
            vars.user = sortedTrovesCached.getLast();
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );

                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            } else break; // break if the loop reaches a Trove with ICR >= MCR
        }
    }
```
</details>

---    

> ### batchLiquidateTroves

```solidity
function batchLiquidateTroves(address[] _troveArray) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveArray | address[] |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function batchLiquidateTroves(address[] memory _troveArray) public override {
        require(_troveArray.length != 0, "TroveManager: Calldata address array must not be empty");

        IActivePool activePoolCached = activePool;
        IDefaultPool defaultPoolCached = defaultPool;
        IStabilityPool stabilityPoolCached = _stabilityPool;

        LocalVariables_OuterLiquidationFunction memory vars;
        LiquidationTotals memory totals;

        vars.price = priceFeed.fetchPrice();
        vars.ZUSDInStabPool = stabilityPoolCached.getTotalZUSDDeposits();
        vars.recoveryModeAtStart = _checkRecoveryMode(vars.price);

        // Perform the appropriate liquidation sequence - tally values and obtain their totals.
        if (vars.recoveryModeAtStart) {
            totals = _getTotalFromBatchLiquidate_RecoveryMode(
                activePoolCached,
                defaultPoolCached,
                vars.price,
                vars.ZUSDInStabPool,
                _troveArray
            );
        } else {
            //  if !vars.recoveryModeAtStart
            totals = _getTotalsFromBatchLiquidate_NormalMode(
                activePoolCached,
                defaultPoolCached,
                vars.price,
                vars.ZUSDInStabPool,
                _troveArray
            );
        }

        require(totals.totalDebtInSequence > 0, "TroveManager: nothing to liquidate");

        // Move liquidated ETH and ZUSD to the appropriate pools
        stabilityPoolCached.offset(totals.totalDebtToOffset, totals.totalCollToSendToSP);
        _redistributeDebtAndColl(
            activePoolCached,
            defaultPoolCached,
            totals.totalDebtToRedistribute,
            totals.totalCollToRedistribute
        );
        if (totals.totalCollSurplus > 0) {
            activePoolCached.sendETH(address(collSurplusPool), totals.totalCollSurplus);
        }

        // Update system snapshots
        _updateSystemSnapshots_excludeCollRemainder(
            activePoolCached,
            totals.totalCollGasCompensation
        );

        vars.liquidatedDebt = totals.totalDebtInSequence;
        vars.liquidatedColl = totals.totalCollInSequence.sub(totals.totalCollGasCompensation).sub(
            totals.totalCollSurplus
        );
        emit Liquidation(
            vars.liquidatedDebt,
            vars.liquidatedColl,
            totals.totalCollGasCompensation,
            totals.totalZUSDGasCompensation
        );

        // Send gas compensation to caller
        _sendGasCompensation(
            activePoolCached,
            msg.sender,
            totals.totalZUSDGasCompensation,
            totals.totalCollGasCompensation
        );
    }
```
</details>

---    

> ### _getTotalFromBatchLiquidate_RecoveryMode

```solidity
function _getTotalFromBatchLiquidate_RecoveryMode(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _price, uint256 _ZUSDInStabPool, address[] _troveArray) internal nonpayable
returns(totals struct TroveManagerBase.LiquidationTotals)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _price | uint256 |  | 
| _ZUSDInStabPool | uint256 |  | 
| _troveArray | address[] |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getTotalFromBatchLiquidate_RecoveryMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        address[] memory _troveArray
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;
        vars.backToNormalMode = false;
        vars.entireSystemDebt = getEntireSystemDebt();
        vars.entireSystemColl = getEntireSystemColl();

        for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
            vars.user = _troveArray[vars.i];
            // Skip non-active troves
            if (Troves[vars.user].status != Status.active) {
                continue;
            }
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (!vars.backToNormalMode) {
                // Skip this trove if ICR is greater than liquityBaseParams.MCR() and Stability Pool is empty
                if (vars.ICR >= liquityBaseParams.MCR() && vars.remainingZUSDInStabPool == 0) {
                    continue;
                }

                uint256 TCR = LiquityMath._computeCR(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );

                singleLiquidation = _liquidateRecoveryMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.ICR,
                    vars.remainingZUSDInStabPool,
                    TCR,
                    _price
                );

                // Update aggregate trackers
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );
                vars.entireSystemDebt = vars.entireSystemDebt.sub(singleLiquidation.debtToOffset);
                vars.entireSystemColl = vars.entireSystemColl.sub(singleLiquidation.collToSendToSP);

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);

                vars.backToNormalMode = !_checkPotentialRecoveryMode(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );
            } else if (vars.backToNormalMode && vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            } else continue; // In Normal Mode skip troves with ICR >= MCR
        }
    }
```
</details>

---    

> ### _getTotalsFromBatchLiquidate_NormalMode

```solidity
function _getTotalsFromBatchLiquidate_NormalMode(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _price, uint256 _ZUSDInStabPool, address[] _troveArray) internal nonpayable
returns(totals struct TroveManagerBase.LiquidationTotals)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _price | uint256 |  | 
| _ZUSDInStabPool | uint256 |  | 
| _troveArray | address[] |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getTotalsFromBatchLiquidate_NormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        address[] memory _troveArray
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;

        for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
            vars.user = _troveArray[vars.i];
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            }
        }
    }
```
</details>

---    

> ### _addLiquidationValuesToTotals

```solidity
function _addLiquidationValuesToTotals(struct TroveManagerBase.LiquidationTotals oldTotals, struct TroveManagerBase.LiquidationValues singleLiquidation) internal pure
returns(newTotals struct TroveManagerBase.LiquidationTotals)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| oldTotals | struct TroveManagerBase.LiquidationTotals |  | 
| singleLiquidation | struct TroveManagerBase.LiquidationValues |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _addLiquidationValuesToTotals(
        LiquidationTotals memory oldTotals,
        LiquidationValues memory singleLiquidation
    ) internal pure returns (LiquidationTotals memory newTotals) {
        // Tally all the values with their respective running totals
        newTotals.totalCollGasCompensation = oldTotals.totalCollGasCompensation.add(
            singleLiquidation.collGasCompensation
        );
        newTotals.totalZUSDGasCompensation = oldTotals.totalZUSDGasCompensation.add(
            singleLiquidation.ZUSDGasCompensation
        );
        newTotals.totalDebtInSequence = oldTotals.totalDebtInSequence.add(
            singleLiquidation.entireTroveDebt
        );
        newTotals.totalCollInSequence = oldTotals.totalCollInSequence.add(
            singleLiquidation.entireTroveColl
        );
        newTotals.totalDebtToOffset = oldTotals.totalDebtToOffset.add(
            singleLiquidation.debtToOffset
        );
        newTotals.totalCollToSendToSP = oldTotals.totalCollToSendToSP.add(
            singleLiquidation.collToSendToSP
        );
        newTotals.totalDebtToRedistribute = oldTotals.totalDebtToRedistribute.add(
            singleLiquidation.debtToRedistribute
        );
        newTotals.totalCollToRedistribute = oldTotals.totalCollToRedistribute.add(
            singleLiquidation.collToRedistribute
        );
        newTotals.totalCollSurplus = oldTotals.totalCollSurplus.add(singleLiquidation.collSurplus);

        return newTotals;
    }
```
</details>

---    

> ### _sendGasCompensation

```solidity
function _sendGasCompensation(IActivePool _activePool, address _liquidator, uint256 _ZUSD, uint256 _ETH) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _liquidator | address |  | 
| _ZUSD | uint256 |  | 
| _ETH | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _sendGasCompensation(
        IActivePool _activePool,
        address _liquidator,
        uint256 _ZUSD,
        uint256 _ETH
    ) internal {
        if (_ZUSD > 0) {
            _zusdToken.returnFromPool(gasPoolAddress, _liquidator, _ZUSD);
        }

        if (_ETH > 0) {
            _activePool.sendETH(_liquidator, _ETH);
        }
    }
```
</details>

---    

> ### getNominalICR

```solidity
function getNominalICR(address _borrower) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

**Returns**

the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getNominalICR(address _borrower) public view override returns (uint256) {
        (uint256 currentETH, uint256 currentZUSDDebt) = _getCurrentTroveAmounts(_borrower);

        uint256 NICR = LiquityMath._computeNominalCR(currentETH, currentZUSDDebt);
        return NICR;
    }
```
</details>

---    

> ### applyPendingRewards

```solidity
function applyPendingRewards(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function applyPendingRewards(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _applyPendingRewards(activePool, defaultPool, _borrower);
    }
```
</details>

---    

> ### updateTroveRewardSnapshots

```solidity
function updateTroveRewardSnapshots(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function updateTroveRewardSnapshots(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _updateTroveRewardSnapshots(_borrower);
    }
```
</details>

---    

> ### getEntireDebtAndColl

```solidity
function getEntireDebtAndColl(address _borrower) public view
returns(debt uint256, coll uint256, pendingZUSDDebtReward uint256, pendingETHReward uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getEntireDebtAndColl(address _borrower)
        public
        view
        override
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingETHReward
        )
    {
        debt = Troves[_borrower].debt;
        coll = Troves[_borrower].coll;

        pendingZUSDDebtReward = getPendingZUSDDebtReward(_borrower);
        pendingETHReward = getPendingETHReward(_borrower);

        debt = debt.add(pendingZUSDDebtReward);
        coll = coll.add(pendingETHReward);
    }
```
</details>

---    

> ### removeStake

```solidity
function removeStake(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function removeStake(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _removeStake(_borrower);
    }
```
</details>

---    

> ### updateStakeAndTotalStakes

```solidity
function updateStakeAndTotalStakes(address _borrower) external nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function updateStakeAndTotalStakes(address _borrower) external override returns (uint256) {
        _requireCallerIsBorrowerOperations();
        return _updateStakeAndTotalStakes(_borrower);
    }
```
</details>

---    

> ### _redistributeDebtAndColl

```solidity
function _redistributeDebtAndColl(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _debt, uint256 _coll) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _debt | uint256 |  | 
| _coll | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _redistributeDebtAndColl(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _debt,
        uint256 _coll
    ) internal {
        if (_debt == 0) {
            return;
        }

        /*
         * Add distributed coll and debt rewards-per-unit-staked to the running totals. Division uses a "feedback"
         * error correction, to keep the cumulative error low in the running totals L_ETH and L_ZUSDDebt:
         *
         * 1) Form numerators which compensate for the floor division errors that occurred the last time this
         * function was called.
         * 2) Calculate "per-unit-staked" ratios.
         * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
         * 4) Store these errors for use in the next correction when this function is called.
         * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
         */
        uint256 ETHNumerator = _coll.mul(DECIMAL_PRECISION).add(lastETHError_Redistribution);
        uint256 ZUSDDebtNumerator = _debt.mul(DECIMAL_PRECISION).add(
            lastZUSDDebtError_Redistribution
        );

        // Get the per-unit-staked terms
        uint256 ETHRewardPerUnitStaked = ETHNumerator.div(totalStakes);
        uint256 ZUSDDebtRewardPerUnitStaked = ZUSDDebtNumerator.div(totalStakes);

        lastETHError_Redistribution = ETHNumerator.sub(ETHRewardPerUnitStaked.mul(totalStakes));
        lastZUSDDebtError_Redistribution = ZUSDDebtNumerator.sub(
            ZUSDDebtRewardPerUnitStaked.mul(totalStakes)
        );

        // Add per-unit-staked terms to the running totals
        L_ETH = L_ETH.add(ETHRewardPerUnitStaked);
        L_ZUSDDebt = L_ZUSDDebt.add(ZUSDDebtRewardPerUnitStaked);

        emit LTermsUpdated(L_ETH, L_ZUSDDebt);

        // Transfer coll and debt from ActivePool to DefaultPool
        _activePool.decreaseZUSDDebt(_debt);
        _defaultPool.increaseZUSDDebt(_debt);
        _activePool.sendETH(address(_defaultPool), _coll);
    }
```
</details>

---    

> ### closeTrove

```solidity
function closeTrove(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function closeTrove(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _closeTrove(_borrower, Status.closedByOwner);
    }
```
</details>

---    

> ### _updateSystemSnapshots_excludeCollRemainder

```solidity
function _updateSystemSnapshots_excludeCollRemainder(IActivePool _activePool, uint256 _collRemainder) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _collRemainder | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _updateSystemSnapshots_excludeCollRemainder(
        IActivePool _activePool,
        uint256 _collRemainder
    ) internal {
        totalStakesSnapshot = totalStakes;

        uint256 activeColl = _activePool.getETH();
        uint256 liquidatedColl = defaultPool.getETH();
        totalCollateralSnapshot = activeColl.sub(_collRemainder).add(liquidatedColl);

        emit SystemSnapshotsUpdated(totalStakesSnapshot, totalCollateralSnapshot);
    }
```
</details>

---    

> ### addTroveOwnerToArray

```solidity
function addTroveOwnerToArray(address _borrower) external nonpayable
returns(index uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function addTroveOwnerToArray(address _borrower) external override returns (uint256 index) {
        _requireCallerIsBorrowerOperations();
        return _addTroveOwnerToArray(_borrower);
    }
```
</details>

---    

> ### _addTroveOwnerToArray

```solidity
function _addTroveOwnerToArray(address _borrower) internal nonpayable
returns(index uint128)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _addTroveOwnerToArray(address _borrower) internal returns (uint128 index) {
        /* Max array size is 2**128 - 1, i.e. ~3e30 troves. No risk of overflow, since troves have minimum ZUSD
        debt of liquidation reserve plus MIN_NET_DEBT. 3e30 ZUSD dwarfs the value of all wealth in the world ( which is < 1e15 USD). */

        // Push the Troveowner to the array
        TroveOwners.push(_borrower);

        // Record the index of the new Troveowner on their Trove struct
        index = uint128(TroveOwners.length.sub(1));
        Troves[_borrower].arrayIndex = index;

        return index;
    }
```
</details>

---    

> ### getTCR

```solidity
function getTCR(uint256 _price) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTCR(uint256 _price) external view override returns (uint256) {
        return _getTCR(_price);
    }
```
</details>

---    

> ### MCR

```solidity
function MCR() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function MCR() external view override returns (uint256) {
        return liquityBaseParams.MCR();
    }
```
</details>

---    

> ### CCR

```solidity
function CCR() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function CCR() external view override returns (uint256) {
        return liquityBaseParams.CCR();
    }
```
</details>

---    

> ### checkRecoveryMode

```solidity
function checkRecoveryMode(uint256 _price) external view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function checkRecoveryMode(uint256 _price) external view override returns (bool) {
        return _checkRecoveryMode(_price);
    }
```
</details>

---    

> ### _checkPotentialRecoveryMode

```solidity
function _checkPotentialRecoveryMode(uint256 _entireSystemColl, uint256 _entireSystemDebt, uint256 _price) internal view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _entireSystemColl | uint256 |  | 
| _entireSystemDebt | uint256 |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _checkPotentialRecoveryMode(
        uint256 _entireSystemColl,
        uint256 _entireSystemDebt,
        uint256 _price
    ) internal view returns (bool) {
        uint256 TCR = LiquityMath._computeCR(_entireSystemColl, _entireSystemDebt, _price);

        return TCR < liquityBaseParams.CCR();
    }
```
</details>

---    

> ### getRedemptionRateWithDecay

```solidity
function getRedemptionRateWithDecay() public view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getRedemptionRateWithDecay() public view override returns (uint256) {
        return _calcRedemptionRate(_calcDecayedBaseRate());
    }
```
</details>

---    

> ### getRedemptionFeeWithDecay

```solidity
function getRedemptionFeeWithDecay(uint256 _ETHDrawn) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ETHDrawn | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getRedemptionFeeWithDecay(uint256 _ETHDrawn) external view override returns (uint256) {
        return _calcRedemptionFee(getRedemptionRateWithDecay(), _ETHDrawn);
    }
```
</details>

---    

> ### getBorrowingRate

```solidity
function getBorrowingRate() public view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getBorrowingRate() public view override returns (uint256) {
        return _calcBorrowingRate(baseRate);
    }
```
</details>

---    

> ### getBorrowingRateWithDecay

```solidity
function getBorrowingRateWithDecay() public view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getBorrowingRateWithDecay() public view override returns (uint256) {
        return _calcBorrowingRate(_calcDecayedBaseRate());
    }
```
</details>

---    

> ### _calcBorrowingRate

```solidity
function _calcBorrowingRate(uint256 _baseRate) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _baseRate | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _calcBorrowingRate(uint256 _baseRate) internal view returns (uint256) {
        return
            LiquityMath._min(
                liquityBaseParams.BORROWING_FEE_FLOOR().add(_baseRate),
                liquityBaseParams.MAX_BORROWING_FEE()
            );
    }
```
</details>

---    

> ### getBorrowingFee

```solidity
function getBorrowingFee(uint256 _ZUSDDebt) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDDebt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getBorrowingFee(uint256 _ZUSDDebt) external view override returns (uint256) {
        return _calcBorrowingFee(getBorrowingRate(), _ZUSDDebt);
    }
```
</details>

---    

> ### getBorrowingFeeWithDecay

```solidity
function getBorrowingFeeWithDecay(uint256 _ZUSDDebt) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDDebt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getBorrowingFeeWithDecay(uint256 _ZUSDDebt) external view override returns (uint256) {
        return _calcBorrowingFee(getBorrowingRateWithDecay(), _ZUSDDebt);
    }
```
</details>

---    

> ### _calcBorrowingFee

```solidity
function _calcBorrowingFee(uint256 _borrowingRate, uint256 _ZUSDDebt) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrowingRate | uint256 |  | 
| _ZUSDDebt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _calcBorrowingFee(uint256 _borrowingRate, uint256 _ZUSDDebt)
        internal
        pure
        returns (uint256)
    {
        return _borrowingRate.mul(_ZUSDDebt).div(DECIMAL_PRECISION);
    }
```
</details>

---    

> ### decayBaseRateFromBorrowing

```solidity
function decayBaseRateFromBorrowing() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decayBaseRateFromBorrowing() external override {
        _requireCallerIsBorrowerOperations();

        uint256 decayedBaseRate = _calcDecayedBaseRate();
        assert(decayedBaseRate <= DECIMAL_PRECISION); // The baseRate can decay to 0

        baseRate = decayedBaseRate;
        emit BaseRateUpdated(decayedBaseRate);

        _updateLastFeeOpTime();
    }
```
</details>

---    

> ### getTroveStatus

```solidity
function getTroveStatus(address _borrower) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTroveStatus(address _borrower) external view override returns (uint256) {
        return uint256(Troves[_borrower].status);
    }
```
</details>

---    

> ### getTroveStake

```solidity
function getTroveStake(address _borrower) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTroveStake(address _borrower) external view override returns (uint256) {
        return Troves[_borrower].stake;
    }
```
</details>

---    

> ### getTroveDebt

```solidity
function getTroveDebt(address _borrower) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTroveDebt(address _borrower) external view override returns (uint256) {
        return Troves[_borrower].debt;
    }
```
</details>

---    

> ### getTroveColl

```solidity
function getTroveColl(address _borrower) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTroveColl(address _borrower) external view override returns (uint256) {
        return Troves[_borrower].coll;
    }
```
</details>

---    

> ### setTroveStatus

```solidity
function setTroveStatus(address _borrower, uint256 _num) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _num | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setTroveStatus(address _borrower, uint256 _num) external override {
        _requireCallerIsBorrowerOperations();
        Troves[_borrower].status = Status(_num);
    }
```
</details>

---    

> ### increaseTroveColl

```solidity
function increaseTroveColl(address _borrower, uint256 _collIncrease) external nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _collIncrease | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function increaseTroveColl(address _borrower, uint256 _collIncrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newColl = Troves[_borrower].coll.add(_collIncrease);
        Troves[_borrower].coll = newColl;
        return newColl;
    }
```
</details>

---    

> ### decreaseTroveColl

```solidity
function decreaseTroveColl(address _borrower, uint256 _collDecrease) external nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _collDecrease | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decreaseTroveColl(address _borrower, uint256 _collDecrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newColl = Troves[_borrower].coll.sub(_collDecrease);
        Troves[_borrower].coll = newColl;
        return newColl;
    }
```
</details>

---    

> ### increaseTroveDebt

```solidity
function increaseTroveDebt(address _borrower, uint256 _debtIncrease) external nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _debtIncrease | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function increaseTroveDebt(address _borrower, uint256 _debtIncrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newDebt = Troves[_borrower].debt.add(_debtIncrease);
        Troves[_borrower].debt = newDebt;
        return newDebt;
    }
```
</details>

---    

> ### decreaseTroveDebt

```solidity
function decreaseTroveDebt(address _borrower, uint256 _debtDecrease) external nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _debtDecrease | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decreaseTroveDebt(address _borrower, uint256 _debtDecrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newDebt = Troves[_borrower].debt.sub(_debtDecrease);
        Troves[_borrower].debt = newDebt;
        return newDebt;
    }
```
</details>

---    

> ### getCurrentICR

```solidity
function getCurrentICR(address _borrower, uint256 _price) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getCurrentICR(address _borrower, uint256 _price)
        external
        view
        override
        returns (uint256)
    {
        return _getCurrentICR(_borrower, _price);
    }
```
</details>

---    

> ### getPendingETHReward

```solidity
function getPendingETHReward(address _borrower) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getPendingETHReward(address _borrower) public view override returns (uint256) {
        return _getPendingETHReward(_borrower);
    }
```
</details>

---    

> ### getPendingZUSDDebtReward

```solidity
function getPendingZUSDDebtReward(address _borrower) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getPendingZUSDDebtReward(address _borrower) public view override returns (uint256) {
        return _getPendingZUSDDebtReward(_borrower);
    }
```
</details>

---    

> ### hasPendingRewards

```solidity
function hasPendingRewards(address _borrower) public view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function hasPendingRewards(address _borrower) public view override returns (bool) {
        return _hasPendingRewards(_borrower);
    }
```
</details>

---    

> ### getRedemptionRate

```solidity
function getRedemptionRate() public view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getRedemptionRate() public view override returns (uint256) {
        return _getRedemptionRate();
    }
```
</details>

---    

> ### redeemCollateral

this function forwards the call to the troveManagerRedeemOps in a delegate call fashion
         so the parameters are not needed

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
function redeemCollateral(
        uint256 _ZUSDamount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) external override {
        (bool success, bytes memory returndata) = troveManagerRedeemOps.delegatecall(msg.data);
        require(success, string(returndata));
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
