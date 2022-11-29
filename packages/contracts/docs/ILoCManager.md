# ITroveManager.sol

View Source: [contracts/Interfaces/ITroveManager.sol](../contracts/Interfaces/ITroveManager.sol)

**↗ Extends: [ILiquityBase](ILiquityBase.md)**
**↘ Derived Contracts: [TroveManager](TroveManager.md)**

**ITroveManager**

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
event Liquidation(uint256  _liquidatedDebt, uint256  _liquidatedColl, uint256  _collGasCompensation, uint256  _ZUSDGasCompensation);
event Redemption(uint256  _attemptedZUSDAmount, uint256  _actualZUSDAmount, uint256  _ETHSent, uint256  _ETHFee);
event TroveUpdated(address indexed _borrower, uint256  _debt, uint256  _coll, uint256  stake, uint8  operation);
event TroveLiquidated(address indexed _borrower, uint256  _debt, uint256  _coll, uint8  operation);
event BaseRateUpdated(uint256  _baseRate);
event LastFeeOpTimeUpdated(uint256  _lastFeeOpTime);
event TotalStakesUpdated(uint256  _newTotalStakes);
event SystemSnapshotsUpdated(uint256  _totalStakesSnapshot, uint256  _totalCollateralSnapshot);
event LTermsUpdated(uint256  _L_ETH, uint256  _L_ZUSDDebt);
event TroveSnapshotsUpdated(uint256  _L_ETH, uint256  _L_ZUSDDebt);
event TroveIndexUpdated(address  _borrower, uint256  _newIndex);
```

## Functions

- [setAddresses(address _feeDistributorAddress, address _troveManagerRedeemOps, address _liquityBaseParamsAddress, address _borrowerOperationsAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _zusdTokenAddress, address _sortedTrovesAddress, address _zeroTokenAddress, address _zeroStakingAddress)](#setaddresses)
- [getTroveOwnersCount()](#gettroveownerscount)
- [getTroveFromTroveOwnersArray(uint256 _index)](#gettrovefromtroveownersarray)
- [getNominalICR(address _borrower)](#getnominalicr)
- [getCurrentICR(address _borrower, uint256 _price)](#getcurrenticr)
- [liquidate(address _borrower)](#liquidate)
- [liquidateTroves(uint256 _n)](#liquidatetroves)
- [batchLiquidateTroves(address[] _troveArray)](#batchliquidatetroves)
- [redeemCollateral(uint256 _ZUSDAmount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFee)](#redeemcollateral)
- [updateStakeAndTotalStakes(address _borrower)](#updatestakeandtotalstakes)
- [updateTroveRewardSnapshots(address _borrower)](#updatetroverewardsnapshots)
- [addTroveOwnerToArray(address _borrower)](#addtroveownertoarray)
- [applyPendingRewards(address _borrower)](#applypendingrewards)
- [getPendingETHReward(address _borrower)](#getpendingethreward)
- [getPendingZUSDDebtReward(address _borrower)](#getpendingzusddebtreward)
- [hasPendingRewards(address _borrower)](#haspendingrewards)
- [getEntireDebtAndColl(address _borrower)](#getentiredebtandcoll)
- [closeTrove(address _borrower)](#closetrove)
- [removeStake(address _borrower)](#removestake)
- [getRedemptionRate()](#getredemptionrate)
- [getRedemptionRateWithDecay()](#getredemptionratewithdecay)
- [getRedemptionFeeWithDecay(uint256 _ETHDrawn)](#getredemptionfeewithdecay)
- [getBorrowingRate()](#getborrowingrate)
- [getBorrowingRateWithDecay()](#getborrowingratewithdecay)
- [getBorrowingFee(uint256 ZUSDDebt)](#getborrowingfee)
- [getBorrowingFeeWithDecay(uint256 _ZUSDDebt)](#getborrowingfeewithdecay)
- [decayBaseRateFromBorrowing()](#decaybaseratefromborrowing)
- [getTroveStatus(address _borrower)](#gettrovestatus)
- [getTroveStake(address _borrower)](#gettrovestake)
- [getTroveDebt(address _borrower)](#gettrovedebt)
- [getTroveColl(address _borrower)](#gettrovecoll)
- [setTroveStatus(address _borrower, uint256 num)](#settrovestatus)
- [increaseTroveColl(address _borrower, uint256 _collIncrease)](#increasetrovecoll)
- [decreaseTroveColl(address _borrower, uint256 _collDecrease)](#decreasetrovecoll)
- [increaseTroveDebt(address _borrower, uint256 _debtIncrease)](#increasetrovedebt)
- [decreaseTroveDebt(address _borrower, uint256 _debtDecrease)](#decreasetrovedebt)
- [getTCR(uint256 _price)](#gettcr)
- [MCR()](#mcr)
- [CCR()](#ccr)
- [checkRecoveryMode(uint256 _price)](#checkrecoverymode)

---    

> ### setAddresses

Called only once on init, to set addresses of other Zero contracts. Callable only by owner

```solidity
function setAddresses(address _feeDistributorAddress, address _troveManagerRedeemOps, address _liquityBaseParamsAddress, address _borrowerOperationsAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _zusdTokenAddress, address _sortedTrovesAddress, address _zeroTokenAddress, address _zeroStakingAddress) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _feeDistributorAddress | address | feeDistributor contract address | 
| _troveManagerRedeemOps | address | TroveManagerRedeemOps contract address | 
| _liquityBaseParamsAddress | address | LiquityBaseParams contract address | 
| _borrowerOperationsAddress | address | BorrowerOperations contract address | 
| _activePoolAddress | address | ActivePool contract address | 
| _defaultPoolAddress | address | DefaultPool contract address | 
| _stabilityPoolAddress | address | StabilityPool contract address | 
| _gasPoolAddress | address | GasPool contract address | 
| _collSurplusPoolAddress | address | CollSurplusPool contract address | 
| _priceFeedAddress | address | PriceFeed contract address | 
| _zusdTokenAddress | address | ZUSDToken contract address | 
| _sortedTrovesAddress | address | SortedTroves contract address | 
| _zeroTokenAddress | address | ZEROToken contract address | 
| _zeroStakingAddress | address | ZEROStaking contract address | 

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
    ) external;
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
function getTroveOwnersCount() external view returns (uint256);
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
| _index | uint256 | Trove owner index | 

**Returns**

Trove from TroveOwners array in given index

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTroveFromTroveOwnersArray(uint256 _index) external view returns (address);
```
</details>

---    

> ### getNominalICR

```solidity
function getNominalICR(address _borrower) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

**Returns**

the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getNominalICR(address _borrower) external view returns (uint256);
```
</details>

---    

> ### getCurrentICR

computes the user’s individual collateralization ratio (ICR) based on their total collateral and total ZUSD debt. Returns 2^256 -1 if they have 0 debt.

```solidity
function getCurrentICR(address _borrower, uint256 _price) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 
| _price | uint256 | ETH price | 

**Returns**

the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getCurrentICR(address _borrower, uint256 _price) external view returns (uint256);

```
</details>

---    

> ### liquidate

Closes the trove if its ICR is lower than the minimum collateral ratio.

```solidity
function liquidate(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction liquidate(address _borrower) external;

```
</details>

---    

> ### liquidateTroves

Liquidate a sequence of troves. Closes a maximum number of n under-collateralized Troves,
 starting from the one with the lowest collateral ratio in the system, and moving upwards

```solidity
function liquidateTroves(uint256 _n) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _n | uint256 | max number of under-collateralized Troves to liquidate | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction liquidateTroves(uint256 _n) external;

```
</details>

---    

> ### batchLiquidateTroves

Attempt to liquidate a custom list of troves provided by the caller.

```solidity
function batchLiquidateTroves(address[] _troveArray) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveArray | address[] | list of trove addresses | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction batchLiquidateTroves(address[] calldata _troveArray) external;

```
</details>

---    

> ### redeemCollateral

Send _ZUSDamount ZUSD to the system and redeem the corresponding amount of collateral from as many Troves as are needed to fill the redemption
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

```solidity
function redeemCollateral(uint256 _ZUSDAmount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFee) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDAmount | uint256 | ZUSD amount to send to the system | 
| _firstRedemptionHint | address | calculated ICR hint of first trove after redemption | 
| _upperPartialRedemptionHint | address |  | 
| _lowerPartialRedemptionHint | address |  | 
| _partialRedemptionHintNICR | uint256 |  | 
| _maxIterations | uint256 | max Troves iterations (can be 0) | 
| _maxFee | uint256 | max fee percentage to accept | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 redeemCollateral(
        uint256 _ZUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFee
    ) external;

    //
```
</details>

---    

> ### updateStakeAndTotalStakes

Update borrower's stake based on their latest collateral value

```solidity
function updateStakeAndTotalStakes(address _borrower) external nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 updateStakeAndTotalStakes(address _borrower) external returns (uint256);

    //
```
</details>

---    

> ### updateTroveRewardSnapshots

Update borrower's snapshots of L_ETH and L_ZUSDDebt to reflect the current values

```solidity
function updateTroveRewardSnapshots(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 updateTroveRewardSnapshots(address _borrower) external;

    //
```
</details>

---    

> ### addTroveOwnerToArray

Push the owner's address to the Trove owners list, and record the corresponding array index on the Trove struct

```solidity
function addTroveOwnerToArray(address _borrower) external nonpayable
returns(index uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

**Returns**

index where Trove was inserted

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 addTroveOwnerToArray(address _borrower) external returns (uint256 index);

    //
```
</details>

---    

> ### applyPendingRewards

Add the borrowers's coll and debt rewards earned from redistributions, to their Trove

```solidity
function applyPendingRewards(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 applyPendingRewards(address _borrower) external;

    //
```
</details>

---    

> ### getPendingETHReward

```solidity
function getPendingETHReward(address _borrower) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

**Returns**

the borrower's pending accumulated ETH reward, earned by their stake

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getPendingETHReward(address _borrower) external view returns (uint256);

    //
```
</details>

---    

> ### getPendingZUSDDebtReward

```solidity
function getPendingZUSDDebtReward(address _borrower) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

**Returns**

the borrower's pending accumulated ZUSD reward, earned by their stake

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getPendingZUSDDebtReward(address _borrower) external view returns (uint256);

    /*
```
</details>

---    

> ### hasPendingRewards

```solidity
function hasPendingRewards(address _borrower) external view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 hasPendingRewards(address _borrower) external view returns (bool);

    //
```
</details>

---    

> ### getEntireDebtAndColl

returns the Troves entire debt and coll, including pending rewards from redistributions.

```solidity
function getEntireDebtAndColl(address _borrower) external view
returns(debt uint256, coll uint256, pendingZUSDDebtReward uint256, pendingETHReward uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getEntireDebtAndColl(address _borrower)
        external
        view
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingETHReward
        );

    //
```
</details>

---    

> ### closeTrove

Close given trove. Called by BorrowerOperations.

```solidity
function closeTrove(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 closeTrove(address _borrower) external;

    //
```
</details>

---    

> ### removeStake

Remove borrower's stake from the totalStakes sum, and set their stake to 0

```solidity
function removeStake(address _borrower) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 removeStake(address _borrower) external;

    //
```
</details>

---    

> ### getRedemptionRate

```solidity
function getRedemptionRate() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getRedemptionRate() external view returns (uint256);

    //
```
</details>

---    

> ### getRedemptionRateWithDecay

```solidity
function getRedemptionRateWithDecay() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getRedemptionRateWithDecay() external view returns (uint256);

    //
```
</details>

---    

> ### getRedemptionFeeWithDecay

The redemption fee is taken as a cut of the total ETH drawn from the system in a redemption. It is based on the current redemption rate.

```solidity
function getRedemptionFeeWithDecay(uint256 _ETHDrawn) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ETHDrawn | uint256 | ETH drawn | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getRedemptionFeeWithDecay(uint256 _ETHDrawn) external view returns (uint256);

    //
```
</details>

---    

> ### getBorrowingRate

```solidity
function getBorrowingRate() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getBorrowingRate() external view returns (uint256);

    //
```
</details>

---    

> ### getBorrowingRateWithDecay

```solidity
function getBorrowingRateWithDecay() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getBorrowingRateWithDecay() external view returns (uint256);

    //
```
</details>

---    

> ### getBorrowingFee

```solidity
function getBorrowingFee(uint256 ZUSDDebt) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| ZUSDDebt | uint256 | ZUSD debt amount to calculate fee | 

**Returns**

borrowing fee using borrowing rate

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getBorrowingFee(uint256 ZUSDDebt) external view returns (uint256);

    //
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
| _ZUSDDebt | uint256 | ZUSD debt amount to calculate fee | 

**Returns**

borrowing fee using borrowing rate with decay

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getBorrowingFeeWithDecay(uint256 _ZUSDDebt) external view returns (uint256);

    //
```
</details>

---    

> ### decayBaseRateFromBorrowing

Updates the baseRate state variable based on time elapsed since the last redemption or ZUSD borrowing operation.

```solidity
function decayBaseRateFromBorrowing() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 decayBaseRateFromBorrowing() external;

    //
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
| _borrower | address | borrower address | 

**Returns**

Trove status from given trove

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getTroveStatus(address _borrower) external view returns (uint256);

    //
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
| _borrower | address | borrower address | 

**Returns**

Trove stake from given trove

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getTroveStake(address _borrower) external view returns (uint256);

    //
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
| _borrower | address | borrower address | 

**Returns**

Trove debt from given trove

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getTroveDebt(address _borrower) external view returns (uint256);

    //
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
| _borrower | address | borrower address | 

**Returns**

Trove collateral from given trove

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getTroveColl(address _borrower) external view returns (uint256);

    //
```
</details>

---    

> ### setTroveStatus

```solidity
function setTroveStatus(address _borrower, uint256 num) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address | borrower address | 
| num | uint256 | status to set | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 setTroveStatus(address _borrower, uint256 num) external;

    //
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
| _borrower | address | borrower address | 
| _collIncrease | uint256 | amount of collateral to increase | 

**Returns**

new trove collateral

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 increaseTroveColl(address _borrower, uint256 _collIncrease) external returns (uint256);

    //
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
| _borrower | address | borrower address | 
| _collDecrease | uint256 | amount of collateral to decrease | 

**Returns**

new trove collateral

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 decreaseTroveColl(address _borrower, uint256 _collDecrease) external returns (uint256);

    //
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
| _borrower | address | borrower address | 
| _debtIncrease | uint256 | amount of debt to increase | 

**Returns**

new trove debt

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 increaseTroveDebt(address _borrower, uint256 _debtIncrease) external returns (uint256);

    //
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
| _borrower | address | borrower address | 
| _debtDecrease | uint256 | amount of debt to decrease | 

**Returns**

new trove debt

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 decreaseTroveDebt(address _borrower, uint256 _debtDecrease) external returns (uint256);

    /*
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
| _price | uint256 | ETH price | 

**Returns**

the total collateralization ratio (TCR) of the system.
 The TCR is based on the the entire system debt and collateral (including pending rewards).

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 getTCR(uint256 _price) external view returns (uint256);

    fu
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
 MCR() external view returns (uint256);

    fu
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
 CCR() external view returns (uint256);

    //
```
</details>

---    

> ### checkRecoveryMode

reveals whether or not the system is in Recovery Mode (i.e. whether the Total Collateralization Ratio (TCR) is below the Critical Collateralization Ratio (CCR)).

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
 checkRecoveryMode(uint256 _price) external view returns (bool);
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
