# TroveManagerBase1MinuteBootstrap.sol

View Source: [contracts/TestContracts/TroveManagerBase1MinuteBootstrap.sol](../contracts/TestContracts/TroveManagerBase1MinuteBootstrap.sol)

**↗ Extends: [LiquityBase](LiquityBase.md), [TroveManagerStorage](TroveManagerStorage.md)**

**TroveManagerBase1MinuteBootstrap**

**Enums**
### TroveManagerOperation

```js
enum TroveManagerOperation {
 applyPendingRewards,
 liquidateInNormalMode,
 liquidateInRecoveryMode,
 redeemCollateral
}
```

## Structs
### LocalVariables_OuterLiquidationFunction

```js
struct LocalVariables_OuterLiquidationFunction {
 uint256 price,
 uint256 ZUSDInStabPool,
 bool recoveryModeAtStart,
 uint256 liquidatedDebt,
 uint256 liquidatedColl
}
```

### LocalVariables_InnerSingleLiquidateFunction

```js
struct LocalVariables_InnerSingleLiquidateFunction {
 uint256 collToLiquidate,
 uint256 pendingDebtReward,
 uint256 pendingCollReward
}
```

### LocalVariables_LiquidationSequence

```js
struct LocalVariables_LiquidationSequence {
 uint256 remainingZUSDInStabPool,
 uint256 i,
 uint256 ICR,
 address user,
 bool backToNormalMode,
 uint256 entireSystemDebt,
 uint256 entireSystemColl
}
```

### LiquidationValues

```js
struct LiquidationValues {
 uint256 entireTroveDebt,
 uint256 entireTroveColl,
 uint256 collGasCompensation,
 uint256 ZUSDGasCompensation,
 uint256 debtToOffset,
 uint256 collToSendToSP,
 uint256 debtToRedistribute,
 uint256 collToRedistribute,
 uint256 collSurplus
}
```

### LiquidationTotals

```js
struct LiquidationTotals {
 uint256 totalCollInSequence,
 uint256 totalDebtInSequence,
 uint256 totalCollGasCompensation,
 uint256 totalZUSDGasCompensation,
 uint256 totalDebtToOffset,
 uint256 totalCollToSendToSP,
 uint256 totalDebtToRedistribute,
 uint256 totalCollToRedistribute,
 uint256 totalCollSurplus
}
```

### ContractsCache

```js
struct ContractsCache {
 contract IActivePool activePool,
 contract IDefaultPool defaultPool,
 contract IZUSDToken zusdToken,
 contract IZEROStaking zeroStaking,
 contract ISortedTroves sortedTroves,
 contract ICollSurplusPool collSurplusPool,
 address gasPoolAddress
}
```

### RedemptionTotals

```js
struct RedemptionTotals {
 uint256 remainingZUSD,
 uint256 totalZUSDToRedeem,
 uint256 totalETHDrawn,
 uint256 ETHFee,
 uint256 ETHToSendToRedeemer,
 uint256 decayedBaseRate,
 uint256 price,
 uint256 totalZUSDSupplyAtStart
}
```

### SingleRedemptionValues

```js
struct SingleRedemptionValues {
 uint256 ZUSDLot,
 uint256 ETHLot,
 bool cancelledPartial
}
```

## Contract Members
**Constants & Variables**

```js
uint256 public constant SECONDS_IN_ONE_MINUTE;
uint256 public constant MINUTE_DECAY_FACTOR;
uint256 public constant BOOTSTRAP_PERIOD;
uint256 public constant BETA;

```

**Events**

```js
event Liquidation(uint256  _liquidatedDebt, uint256  _liquidatedColl, uint256  _collGasCompensation, uint256  _ZUSDGasCompensation);
event Redemption(uint256  _attemptedZUSDAmount, uint256  _actualZUSDAmount, uint256  _ETHSent, uint256  _ETHFee);
event TroveUpdated(address indexed _borrower, uint256  _debt, uint256  _coll, uint256  _stake, enum TroveManagerBase1MinuteBootstrap.TroveManagerOperation  _operation);
event TroveLiquidated(address indexed _borrower, uint256  _debt, uint256  _coll, enum TroveManagerBase1MinuteBootstrap.TroveManagerOperation  _operation);
event BaseRateUpdated(uint256  _baseRate);
event LastFeeOpTimeUpdated(uint256  _lastFeeOpTime);
event TotalStakesUpdated(uint256  _newTotalStakes);
event SystemSnapshotsUpdated(uint256  _totalStakesSnapshot, uint256  _totalCollateralSnapshot);
event LTermsUpdated(uint256  _L_ETH, uint256  _L_ZUSDDebt);
event TroveSnapshotsUpdated(uint256  _L_ETH, uint256  _L_ZUSDDebt);
event TroveIndexUpdated(address  _borrower, uint256  _newIndex);
```

## Functions

- [_getCurrentICR(address _borrower, uint256 _price)](#_getcurrenticr)
- [_getCurrentTroveAmounts(address _borrower)](#_getcurrenttroveamounts)
- [_getPendingETHReward(address _borrower)](#_getpendingethreward)
- [_getPendingZUSDDebtReward(address _borrower)](#_getpendingzusddebtreward)
- [_applyPendingRewards(IActivePool _activePool, IDefaultPool _defaultPool, address _borrower)](#_applypendingrewards)
- [_hasPendingRewards(address _borrower)](#_haspendingrewards)
- [_updateTroveRewardSnapshots(address _borrower)](#_updatetroverewardsnapshots)
- [_movePendingTroveRewardsToActivePool(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _ZUSD, uint256 _ETH)](#_movependingtroverewardstoactivepool)
- [_removeStake(address _borrower)](#_removestake)
- [_closeTrove(address _borrower, enum TroveManagerStorage.Status closedStatus)](#_closetrove)
- [_updateStakeAndTotalStakes(address _borrower)](#_updatestakeandtotalstakes)
- [_computeNewStake(uint256 _coll)](#_computenewstake)
- [_calcDecayedBaseRate()](#_calcdecayedbaserate)
- [_minutesPassedSinceLastFeeOp()](#_minutespassedsincelastfeeop)
- [_updateLastFeeOpTime()](#_updatelastfeeoptime)
- [_calcRedemptionFee(uint256 _redemptionRate, uint256 _ETHDrawn)](#_calcredemptionfee)
- [_getRedemptionRate()](#_getredemptionrate)
- [_getRedemptionFee(uint256 _ETHDrawn)](#_getredemptionfee)
- [_calcRedemptionRate(uint256 _baseRate)](#_calcredemptionrate)
- [_removeTroveOwner(address _borrower, uint256 TroveOwnersArrayLength)](#_removetroveowner)
- [_requireCallerIsBorrowerOperations()](#_requirecallerisborroweroperations)
- [_requireTroveIsActive(address _borrower)](#_requiretroveisactive)
- [_requireZUSDBalanceCoversRedemption(IZUSDToken _zusdToken, address _redeemer, uint256 _amount)](#_requirezusdbalancecoversredemption)
- [_requireMoreThanOneTroveInSystem(uint256 TroveOwnersArrayLength)](#_requiremorethanonetroveinsystem)
- [_requireAmountGreaterThanZero(uint256 _amount)](#_requireamountgreaterthanzero)
- [_requireTCRoverMCR(uint256 _price)](#_requiretcrovermcr)
- [_requireAfterBootstrapPeriod()](#_requireafterbootstrapperiod)
- [_requireValidMaxFeePercentage(uint256 _maxFeePercentage)](#_requirevalidmaxfeepercentage)

---    

> ### _getCurrentICR

```solidity
function _getCurrentICR(address _borrower, uint256 _price) public view
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
function _getCurrentICR(address _borrower, uint256 _price) public view returns (uint256) {
        (uint256 currentETH, uint256 currentZUSDDebt) = _getCurrentTroveAmounts(_borrower);

        uint256 ICR = LiquityMath._computeCR(currentETH, currentZUSDDebt, _price);
        return ICR;
    }
```
</details>

---    

> ### _getCurrentTroveAmounts

```solidity
function _getCurrentTroveAmounts(address _borrower) internal view
returns(uint256, uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getCurrentTroveAmounts(address _borrower) internal view returns (uint256, uint256) {
        uint256 pendingETHReward = _getPendingETHReward(_borrower);
        uint256 pendingZUSDDebtReward = _getPendingZUSDDebtReward(_borrower);

        uint256 currentETH = Troves[_borrower].coll.add(pendingETHReward);
        uint256 currentZUSDDebt = Troves[_borrower].debt.add(pendingZUSDDebtReward);

        return (currentETH, currentZUSDDebt);
    }
```
</details>

---    

> ### _getPendingETHReward

```solidity
function _getPendingETHReward(address _borrower) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getPendingETHReward(address _borrower) public view returns (uint256) {
        uint256 snapshotETH = rewardSnapshots[_borrower].ETH;
        uint256 rewardPerUnitStaked = L_ETH.sub(snapshotETH);

        if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
            return 0;
        }

        uint256 stake = Troves[_borrower].stake;

        uint256 pendingETHReward = stake.mul(rewardPerUnitStaked).div(DECIMAL_PRECISION);

        return pendingETHReward;
    }
```
</details>

---    

> ### _getPendingZUSDDebtReward

```solidity
function _getPendingZUSDDebtReward(address _borrower) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getPendingZUSDDebtReward(address _borrower) public view returns (uint256) {
        uint256 snapshotZUSDDebt = rewardSnapshots[_borrower].ZUSDDebt;
        uint256 rewardPerUnitStaked = L_ZUSDDebt.sub(snapshotZUSDDebt);

        if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
            return 0;
        }

        uint256 stake = Troves[_borrower].stake;

        uint256 pendingZUSDDebtReward = stake.mul(rewardPerUnitStaked).div(DECIMAL_PRECISION);

        return pendingZUSDDebtReward;
    }
```
</details>

---    

> ### _applyPendingRewards

```solidity
function _applyPendingRewards(IActivePool _activePool, IDefaultPool _defaultPool, address _borrower) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _applyPendingRewards(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        address _borrower
    ) internal {
        if (_hasPendingRewards(_borrower)) {
            _requireTroveIsActive(_borrower);

            // Compute pending rewards
            uint256 pendingETHReward = _getPendingETHReward(_borrower);
            uint256 pendingZUSDDebtReward = _getPendingZUSDDebtReward(_borrower);

            // Apply pending rewards to trove's state
            Troves[_borrower].coll = Troves[_borrower].coll.add(pendingETHReward);
            Troves[_borrower].debt = Troves[_borrower].debt.add(pendingZUSDDebtReward);

            _updateTroveRewardSnapshots(_borrower);

            // Transfer from DefaultPool to ActivePool
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                pendingZUSDDebtReward,
                pendingETHReward
            );

            emit TroveUpdated(
                _borrower,
                Troves[_borrower].debt,
                Troves[_borrower].coll,
                Troves[_borrower].stake,
                TroveManagerOperation.applyPendingRewards
            );
        }
    }
```
</details>

---    

> ### _hasPendingRewards

```solidity
function _hasPendingRewards(address _borrower) public view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _hasPendingRewards(address _borrower) public view returns (bool) {
        /*
         * A Trove has pending rewards if its snapshot is less than the current rewards per-unit-staked sum:
         * this indicates that rewards have occured since the snapshot was made, and the user therefore has
         * pending rewards
         */
        if (Troves[_borrower].status != Status.active) {
            return false;
        }

        return (rewardSnapshots[_borrower].ETH < L_ETH);
    }
```
</details>

---    

> ### _updateTroveRewardSnapshots

```solidity
function _updateTroveRewardSnapshots(address _borrower) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _updateTroveRewardSnapshots(address _borrower) internal {
        rewardSnapshots[_borrower].ETH = L_ETH;
        rewardSnapshots[_borrower].ZUSDDebt = L_ZUSDDebt;
        emit TroveSnapshotsUpdated(L_ETH, L_ZUSDDebt);
    }
```
</details>

---    

> ### _movePendingTroveRewardsToActivePool

```solidity
function _movePendingTroveRewardsToActivePool(IActivePool _activePool, IDefaultPool _defaultPool, uint256 _ZUSD, uint256 _ETH) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _defaultPool | IDefaultPool |  | 
| _ZUSD | uint256 |  | 
| _ETH | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _movePendingTroveRewardsToActivePool(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _ZUSD,
        uint256 _ETH
    ) internal {
        _defaultPool.decreaseZUSDDebt(_ZUSD);
        _activePool.increaseZUSDDebt(_ZUSD);
        _defaultPool.sendETHToActivePool(_ETH);
    }
```
</details>

---    

> ### _removeStake

```solidity
function _removeStake(address _borrower) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _removeStake(address _borrower) internal {
        uint256 stake = Troves[_borrower].stake;
        totalStakes = totalStakes.sub(stake);
        Troves[_borrower].stake = 0;
    }
```
</details>

---    

> ### _closeTrove

```solidity
function _closeTrove(address _borrower, enum TroveManagerStorage.Status closedStatus) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| closedStatus | enum TroveManagerStorage.Status |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _closeTrove(address _borrower, Status closedStatus) internal {
        assert(closedStatus != Status.nonExistent && closedStatus != Status.active);

        uint256 TroveOwnersArrayLength = TroveOwners.length;
        _requireMoreThanOneTroveInSystem(TroveOwnersArrayLength);

        Troves[_borrower].status = closedStatus;
        Troves[_borrower].coll = 0;
        Troves[_borrower].debt = 0;

        rewardSnapshots[_borrower].ETH = 0;
        rewardSnapshots[_borrower].ZUSDDebt = 0;

        _removeTroveOwner(_borrower, TroveOwnersArrayLength);
        sortedTroves.remove(_borrower);
    }
```
</details>

---    

> ### _updateStakeAndTotalStakes

```solidity
function _updateStakeAndTotalStakes(address _borrower) internal nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _updateStakeAndTotalStakes(address _borrower) internal returns (uint256) {
        uint256 newStake = _computeNewStake(Troves[_borrower].coll);
        uint256 oldStake = Troves[_borrower].stake;
        Troves[_borrower].stake = newStake;

        totalStakes = totalStakes.sub(oldStake).add(newStake);
        emit TotalStakesUpdated(totalStakes);

        return newStake;
    }
```
</details>

---    

> ### _computeNewStake

```solidity
function _computeNewStake(uint256 _coll) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _coll | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _computeNewStake(uint256 _coll) internal view returns (uint256) {
        uint256 stake;
        if (totalCollateralSnapshot == 0) {
            stake = _coll;
        } else {
            /*
             * The following assert() holds true because:
             * - The system always contains >= 1 trove
             * - When we close or liquidate a trove, we redistribute the pending rewards, so if all troves were closed/liquidated,
             * rewards would’ve been emptied and totalCollateralSnapshot would be zero too.
             */
            assert(totalStakesSnapshot > 0);
            stake = _coll.mul(totalStakesSnapshot).div(totalCollateralSnapshot);
        }
        return stake;
    }

```
</details>

---    

> ### _calcDecayedBaseRate

```solidity
function _calcDecayedBaseRate() internal view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _calcDecayedBaseRate() internal view returns (uint256) {
        uint256 minutesPassed = _minutesPassedSinceLastFeeOp();
        uint256 decayFactor = LiquityMath._decPow(MINUTE_DECAY_FACTOR, minutesPassed);

        return baseRate.mul(decayFactor).div(DECIMAL_PRECISION);
    }

```
</details>

---    

> ### _minutesPassedSinceLastFeeOp

```solidity
function _minutesPassedSinceLastFeeOp() internal view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _minutesPassedSinceLastFeeOp() internal view returns (uint256) {
        return (block.timestamp.sub(lastFeeOperationTime)).div(SECONDS_IN_ONE_MINUTE);
    }

```
</details>

---    

> ### _updateLastFeeOpTime

```solidity
function _updateLastFeeOpTime() internal nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _updateLastFeeOpTime() internal {
        uint256 timePassed = block.timestamp.sub(lastFeeOperationTime);

        if (timePassed >= SECONDS_IN_ONE_MINUTE) {
            lastFeeOperationTime = block.timestamp;
            emit LastFeeOpTimeUpdated(block.timestamp);
        }
    }

```
</details>

---    

> ### _calcRedemptionFee

```solidity
function _calcRedemptionFee(uint256 _redemptionRate, uint256 _ETHDrawn) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _redemptionRate | uint256 |  | 
| _ETHDrawn | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _calcRedemptionFee(uint256 _redemptionRate, uint256 _ETHDrawn)
        internal
        pure
        returns (uint256)
    {
        uint256 redemptionFee = _redemptionRate.mul(_ETHDrawn).div(DECIMAL_PRECISION);
        require(redemptionFee < _ETHDrawn, "TroveManager: Fee would eat up all returned collateral");
        return redemptionFee;
    }

```
</details>

---    

> ### _getRedemptionRate

```solidity
function _getRedemptionRate() public view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _getRedemptionRate() public view returns (uint256) {
        return _calcRedemptionRate(baseRate);
    }

```
</details>

---    

> ### _getRedemptionFee

```solidity
function _getRedemptionFee(uint256 _ETHDrawn) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ETHDrawn | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _getRedemptionFee(uint256 _ETHDrawn) internal view returns (uint256) {
        return _calcRedemptionFee(_getRedemptionRate(), _ETHDrawn);
    }

```
</details>

---    

> ### _calcRedemptionRate

```solidity
function _calcRedemptionRate(uint256 _baseRate) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _baseRate | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _calcRedemptionRate(uint256 _baseRate) internal view returns (uint256) {
        return
            LiquityMath._min(
                liquityBaseParams.REDEMPTION_FEE_FLOOR().add(_baseRate),
                DECIMAL_PRECISION // cap at a maximum of 100%
            );
    }

```
</details>

---    

> ### _removeTroveOwner

```solidity
function _removeTroveOwner(address _borrower, uint256 TroveOwnersArrayLength) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| TroveOwnersArrayLength | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _removeTroveOwner(address _borrower, uint256 TroveOwnersArrayLength) internal {
        Status troveStatus = Troves[_borrower].status;
        // It’s set in caller function `_closeTrove`
        assert(troveStatus != Status.nonExistent && troveStatus != Status.active);

        uint128 index = Troves[_borrower].arrayIndex;
        uint256 length = TroveOwnersArrayLength;
        uint256 idxLast = length.sub(1);

        assert(index <= idxLast);

        address addressToMove = TroveOwners[idxLast];

        TroveOwners[index] = addressToMove;
        Troves[addressToMove].arrayIndex = index;
        emit TroveIndexUpdated(addressToMove, index);

        TroveOwners.pop();
    }

```
</details>

---    

> ### _requireCallerIsBorrowerOperations

```solidity
function _requireCallerIsBorrowerOperations() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireCallerIsBorrowerOperations() internal view {
        require(
            msg.sender == borrowerOperationsAddress,
            "TroveManager: Caller is not the BorrowerOperations contract"
        );
    }

```
</details>

---    

> ### _requireTroveIsActive

```solidity
function _requireTroveIsActive(address _borrower) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireTroveIsActive(address _borrower) internal view {
        require(
            Troves[_borrower].status == Status.active,
            "TroveManager: Trove does not exist or is closed"
        );
    }

```
</details>

---    

> ### _requireZUSDBalanceCoversRedemption

```solidity
function _requireZUSDBalanceCoversRedemption(IZUSDToken _zusdToken, address _redeemer, uint256 _amount) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _zusdToken | IZUSDToken |  | 
| _redeemer | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireZUSDBalanceCoversRedemption(
        IZUSDToken _zusdToken,
        address _redeemer,
        uint256 _amount
    ) internal view {
        require(
            _zusdToken.balanceOf(_redeemer) >= _amount,
            "TroveManager: Requested redemption amount must be <= user's ZUSD token balance"
        );
    }

```
</details>

---    

> ### _requireMoreThanOneTroveInSystem

```solidity
function _requireMoreThanOneTroveInSystem(uint256 TroveOwnersArrayLength) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| TroveOwnersArrayLength | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireMoreThanOneTroveInSystem(uint256 TroveOwnersArrayLength) internal view {
        require(
            TroveOwnersArrayLength > 1 && sortedTroves.getSize() > 1,
            "TroveManager: Only one trove in the system"
        );
    }

```
</details>

---    

> ### _requireAmountGreaterThanZero

```solidity
function _requireAmountGreaterThanZero(uint256 _amount) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireAmountGreaterThanZero(uint256 _amount) internal pure {
        require(_amount > 0, "TroveManager: Amount must be greater than zero");
    }

```
</details>

---    

> ### _requireTCRoverMCR

```solidity
function _requireTCRoverMCR(uint256 _price) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireTCRoverMCR(uint256 _price) internal view {
        require(
            _getTCR(_price) >= liquityBaseParams.MCR(),
            "TroveManager: Cannot redeem when TCR < MCR"
        );
    }

```
</details>

---    

> ### _requireAfterBootstrapPeriod

```solidity
function _requireAfterBootstrapPeriod() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireAfterBootstrapPeriod() internal view {
        uint256 systemDeploymentTime = _zeroToken.getDeploymentStartTime();
        require(
            block.timestamp >= systemDeploymentTime.add(BOOTSTRAP_PERIOD),
            "TroveManager: Redemptions are not allowed during bootstrap phase"
        );
    }

```
</details>

---    

> ### _requireValidMaxFeePercentage

```solidity
function _requireValidMaxFeePercentage(uint256 _maxFeePercentage) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _requireValidMaxFeePercentage(uint256 _maxFeePercentage) internal view {
        require(
            _maxFeePercentage >= liquityBaseParams.REDEMPTION_FEE_FLOOR() &&
                _maxFeePercentage <= DECIMAL_PRECISION,
            "Max fee percentage must be between 0.5% and 100%"
        );
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
