# IBorrowerOperations.sol

View Source: [contracts/Interfaces/IBorrowerOperations.sol](../contracts/Interfaces/IBorrowerOperations.sol)

**↘ Derived Contracts: [BorrowerOperations](BorrowerOperations.md)**

**IBorrowerOperations**

**Events**

```js
event FeeDistributorAddressChanged(address  _feeDistributorAddress);
event TroveManagerAddressChanged(address  _newTroveManagerAddress);
event ActivePoolAddressChanged(address  _activePoolAddress);
event DefaultPoolAddressChanged(address  _defaultPoolAddress);
event StabilityPoolAddressChanged(address  _stabilityPoolAddress);
event GasPoolAddressChanged(address  _gasPoolAddress);
event CollSurplusPoolAddressChanged(address  _collSurplusPoolAddress);
event PriceFeedAddressChanged(address  _newPriceFeedAddress);
event SortedTrovesAddressChanged(address  _sortedTrovesAddress);
event ZUSDTokenAddressChanged(address  _zusdTokenAddress);
event ZEROStakingAddressChanged(address  _zeroStakingAddress);
event TroveCreated(address indexed _borrower, uint256  arrayIndex);
event TroveUpdated(address indexed _borrower, uint256  _debt, uint256  _coll, uint256  stake, uint8  operation);
event ZUSDBorrowingFeePaid(address indexed _borrower, uint256  _ZUSDFee);
```

## Functions

- [setAddresses(address _feeDistributorAddress, address _liquityBaseParamsAddress, address _troveManagerAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _sortedTrovesAddress, address _zusdTokenAddress, address _zeroStakingAddress)](#setaddresses)
- [openTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#opentrove)
- [openNueTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#opennuetrove)
- [addColl(address _upperHint, address _lowerHint)](#addcoll)
- [moveETHGainToTrove(address _user, address _upperHint, address _lowerHint)](#moveethgaintotrove)
- [withdrawColl(uint256 _amount, address _upperHint, address _lowerHint)](#withdrawcoll)
- [withdrawZUSD(uint256 _maxFee, uint256 _amount, address _upperHint, address _lowerHint)](#withdrawzusd)
- [repayZUSD(uint256 _amount, address _upperHint, address _lowerHint)](#repayzusd)
- [closeTrove()](#closetrove)
- [closeNueTrove()](#closenuetrove)
- [adjustTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint)](#adjusttrove)
- [adjustNueTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint)](#adjustnuetrove)
- [claimCollateral()](#claimcollateral)
- [getCompositeDebt(uint256 _debt)](#getcompositedebt)
- [BORROWING_FEE_FLOOR()](#borrowing_fee_floor)

---    

> ### setAddresses

Called only once on init, to set addresses of other Zero contracts. Callable only by owner

```solidity
function setAddresses(address _feeDistributorAddress, address _liquityBaseParamsAddress, address _troveManagerAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _sortedTrovesAddress, address _zusdTokenAddress, address _zeroStakingAddress) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _feeDistributorAddress | address | feeDistributor contract address | 
| _liquityBaseParamsAddress | address | LiquidityBaseParams contract address | 
| _troveManagerAddress | address | TroveManager contract address | 
| _activePoolAddress | address | ActivePool contract address | 
| _defaultPoolAddress | address | DefaultPool contract address | 
| _stabilityPoolAddress | address | StabilityPool contract address | 
| _gasPoolAddress | address | GasPool contract address | 
| _collSurplusPoolAddress | address | CollSurplusPool contract address | 
| _priceFeedAddress | address | PrideFeed contract address | 
| _sortedTrovesAddress | address | SortedTroves contract address | 
| _zusdTokenAddress | address | ZUSDToken contract address | 
| _zeroStakingAddress | address | ZEROStaking contract address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _feeDistributorAddress,
        address _liquityBaseParamsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedTrovesAddress,
        address _zusdTokenAddress,
        address _zeroStakingAddress
    ) external;
```
</details>

---    

> ### openTrove

payable function that creates a Trove for the caller with the requested debt, and the Ether received as collateral.
 Successful execution is conditional mainly on the resulting collateralization ratio which must exceed the minimum (110% in Normal Mode, 150% in Recovery Mode).
 In addition to the requested debt, extra debt is issued to pay the issuance fee, and cover the gas compensation.
 The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.

```solidity
function openTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage | 
| _ZUSDAmount | uint256 | ZUSD requested debt | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function openTrove(
        uint256 _maxFee,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;
```
</details>

---    

> ### openNueTrove

payable function that creates a Trove for the caller with the requested debt, and the Ether received as collateral.
 Successful execution is conditional mainly on the resulting collateralization ratio which must exceed the minimum (110% in Normal Mode, 150% in Recovery Mode).
 In addition to the requested debt, extra debt is issued to pay the issuance fee, and cover the gas compensation.
 The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.
 This method is identical to `openTrove()`, but operates on NUE tokens instead of ZUSD.

```solidity
function openNueTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage | 
| _ZUSDAmount | uint256 | ZUSD requested debt | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function openNueTrove(
        uint256 _maxFee,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;
```
</details>

---    

> ### addColl

payable function that adds the received Ether to the caller's active Trove.

```solidity
function addColl(address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function addColl(address _upperHint, address _lowerHint) external payable;
```
</details>

---    

> ### moveETHGainToTrove

send ETH as collateral to a trove. Called by only the Stability Pool.

```solidity
function moveETHGainToTrove(address _user, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _user | address | user trove address | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function moveETHGainToTrove(
        address _user,
        address _upperHint,
        address _lowerHint
    ) external payable;
```
</details>

---    

> ### withdrawColl

withdraws `_amount` of collateral from the caller’s Trove.
 Executes only if the user has an active Trove, the withdrawal would not pull the user’s Trove below the minimum collateralization ratio,
 and the resulting total collateralization ratio of the system is above 150%.

```solidity
function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 | collateral amount to withdraw | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion withdrawColl(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

```
</details>

---    

> ### withdrawZUSD

issues `_amount` of ZUSD from the caller’s Trove to the caller.
 Executes only if the Trove's collateralization ratio would remain above the minimum, and the resulting total collateralization ratio is above 150%.
 The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.

```solidity
function withdrawZUSD(uint256 _maxFee, uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage | 
| _amount | uint256 | ZUSD amount to withdraw | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on withdrawZUSD(
        uint256 _maxFee,
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

```
</details>

---    

> ### repayZUSD

repay `_amount` of ZUSD to the caller’s Trove, subject to leaving 50 debt in the Trove (which corresponds to the 50 ZUSD gas compensation).

```solidity
function repayZUSD(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 | ZUSD amount to repay | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 repayZUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /*
```
</details>

---    

> ### closeTrove

allows a borrower to repay all debt, withdraw all their collateral, and close their Trove.
 Requires the borrower have a ZUSD balance sufficient to repay their trove's debt, excluding gas compensation - i.e. `(debt - 50)` ZUSD.

```solidity
function closeTrove() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 closeTrove() external;

    /*
```
</details>

---    

> ### closeNueTrove

allows a borrower to repay all debt, withdraw all their collateral, and close their Trove.
 Requires the borrower have a NUE balance sufficient to repay their trove's debt, excluding gas compensation - i.e. `(debt - 50)` NUE.
 This method is identical to `closeTrove()`, but operates on NUE tokens instead of ZUSD.

```solidity
function closeNueTrove() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 closeNueTrove() external;

    /*
```
</details>

---    

> ### adjustTrove

enables a borrower to simultaneously change both their collateral and debt, subject to all the restrictions that apply to individual increases/decreases of each quantity with the following particularity:
 if the adjustment reduces the collateralization ratio of the Trove, the function only executes if the resulting total collateralization ratio is above 150%.
 The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.
 The parameter is ignored if the debt is not increased with the transaction.

```solidity
function adjustTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage | 
| _collWithdrawal | uint256 | collateral amount to withdraw | 
| _debtChange | uint256 | ZUSD amount to change | 
| isDebtIncrease | bool | indicates if increases debt | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 adjustTrove(
        uint256 _maxFee,
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable;

    /*
```
</details>

---    

> ### adjustNueTrove

enables a borrower to simultaneously change both their collateral and debt, subject to all the restrictions that apply to individual increases/decreases of each quantity with the following particularity:
 if the adjustment reduces the collateralization ratio of the Trove, the function only executes if the resulting total collateralization ratio is above 150%.
 The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.
 The parameter is ignored if the debt is not increased with the transaction.
 This method is identical to `adjustTrove()`, but operates on NUE tokens instead of ZUSD.

```solidity
function adjustNueTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage | 
| _collWithdrawal | uint256 | collateral amount to withdraw | 
| _debtChange | uint256 | ZUSD amount to change | 
| isDebtIncrease | bool | indicates if increases debt | 
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
 adjustNueTrove(
        uint256 _maxFee,
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable;

    /*
```
</details>

---    

> ### claimCollateral

when a borrower’s Trove has been fully redeemed from and closed, or liquidated in Recovery Mode with a collateralization ratio above 110%,
 this function allows the borrower to claim their ETH collateral surplus that remains in the system (collateral - debt upon redemption; collateral - 110% of the debt upon liquidation).

```solidity
function claimCollateral() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
laimCollateral() external;

    func
```
</details>

---    

> ### getCompositeDebt

```solidity
function getCompositeDebt(uint256 _debt) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _debt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
etCompositeDebt(uint256 _debt) external view returns (uint256);

    func
```
</details>

---    

> ### BORROWING_FEE_FLOOR

```solidity
function BORROWING_FEE_FLOOR() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
ORROWING_FEE_FLOOR() external view returns (uint256);
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
