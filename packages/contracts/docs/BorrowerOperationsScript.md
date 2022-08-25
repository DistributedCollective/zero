# BorrowerOperationsScript.sol

View Source: [contracts/Proxy/BorrowerOperationsScript.sol](../contracts/Proxy/BorrowerOperationsScript.sol)

**↗ Extends: [CheckContract](CheckContract.md)**
**↘ Derived Contracts: [BorrowerWrappersScript](BorrowerWrappersScript.md)**

**BorrowerOperationsScript**

## Contract Members
**Constants & Variables**

```js
contract IBorrowerOperations internal borrowerOperations;

```

## Functions

- [constructor(IBorrowerOperations _borrowerOperations)](#constructor)
- [openTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#opentrove)
- [addColl(address _upperHint, address _lowerHint)](#addcoll)
- [withdrawColl(uint256 _amount, address _upperHint, address _lowerHint)](#withdrawcoll)
- [withdrawZUSD(uint256 _maxFee, uint256 _amount, address _upperHint, address _lowerHint)](#withdrawzusd)
- [repayZUSD(uint256 _amount, address _upperHint, address _lowerHint)](#repayzusd)
- [closeTrove()](#closetrove)
- [adjustTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint)](#adjusttrove)
- [claimCollateral()](#claimcollateral)

---    

> ### constructor

```solidity
function (IBorrowerOperations _borrowerOperations) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrowerOperations | IBorrowerOperations |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor(IBorrowerOperations _borrowerOperations) public {
        checkContract(address(_borrowerOperations));
        borrowerOperations = _borrowerOperations;
    }
```
</details>

---    

> ### openTrove

```solidity
function openTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 |  | 
| _ZUSDAmount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function openTrove(uint _maxFee, uint _ZUSDAmount, address _upperHint, address _lowerHint) external payable {
        borrowerOperations.openTrove{ value: msg.value }(_maxFee, _ZUSDAmount, _upperHint, _lowerHint);
    }
```
</details>

---    

> ### addColl

```solidity
function addColl(address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function addColl(address _upperHint, address _lowerHint) external payable {
        borrowerOperations.addColl{ value: msg.value }(_upperHint, _lowerHint);
    }
```
</details>

---    

> ### withdrawColl

```solidity
function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
    }
```
</details>

---    

> ### withdrawZUSD

```solidity
function withdrawZUSD(uint256 _maxFee, uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 |  | 
| _amount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function withdrawZUSD(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawZUSD(_maxFee, _amount, _upperHint, _lowerHint);
    }
```
</details>

---    

> ### repayZUSD

```solidity
function repayZUSD(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function repayZUSD(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.repayZUSD(_amount, _upperHint, _lowerHint);
    }
```
</details>

---    

> ### closeTrove

```solidity
function closeTrove() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function closeTrove() external {
        borrowerOperations.closeTrove();
    }
```
</details>

---    

> ### adjustTrove

```solidity
function adjustTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 |  | 
| _collWithdrawal | uint256 |  | 
| _debtChange | uint256 |  | 
| isDebtIncrease | bool |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function adjustTrove(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable {
        borrowerOperations.adjustTrove{ value: msg.value }(_maxFee, _collWithdrawal, _debtChange, isDebtIncrease, _upperHint, _lowerHint);
    }
```
</details>

---    

> ### claimCollateral

```solidity
function claimCollateral() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function claimCollateral() external {
        borrowerOperations.claimCollateral();
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
