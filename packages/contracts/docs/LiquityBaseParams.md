# LiquityBaseParams.sol

View Source: [contracts/LiquityBaseParams.sol](../contracts/LiquityBaseParams.sol)

**↗ Extends: [ILiquityBaseParams](ILiquityBaseParams.md), [Ownable](Ownable.md), [Initializable](Initializable.md), [BaseMath](BaseMath.md)**

**LiquityBaseParams**

## Contract Members
**Constants & Variables**

```js
uint256 public MCR;
uint256 public CCR;
uint256 public PERCENT_DIVISOR;
uint256 public BORROWING_FEE_FLOOR;
uint256 public REDEMPTION_FEE_FLOOR;
uint256 public MAX_BORROWING_FEE;

```

## Functions

- [initialize()](#initialize)
- [setMCR(uint256 MCR_)](#setmcr)
- [setCCR(uint256 CCR_)](#setccr)
- [setPercentDivisor(uint256 PERCENT_DIVISOR_)](#setpercentdivisor)
- [setBorrowingFeeFloor(uint256 BORROWING_FEE_FLOOR_)](#setborrowingfeefloor)
- [setRedemptionFeeFloor(uint256 REDEMPTION_FEE_FLOOR_)](#setredemptionfeefloor)
- [setMaxBorrowingFee(uint256 MAX_BORROWING_FEE_)](#setmaxborrowingfee)

---    

> ### initialize

```solidity
function initialize() public nonpayable initializer onlyOwner 
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function initialize() public initializer onlyOwner {
        MCR = 1100000000000000000; // 110%
        CCR = 1500000000000000000; // 150%
        PERCENT_DIVISOR = 200; // dividing by 200 yields 0.5%
        BORROWING_FEE_FLOOR = (DECIMAL_PRECISION / 1000) * 5; // 0.5%
        REDEMPTION_FEE_FLOOR = (DECIMAL_PRECISION / 1000) * 5; // 0.5%
        MAX_BORROWING_FEE = (DECIMAL_PRECISION / 100) * 5; // 5%
    }
```
</details>

---    

> ### setMCR

```solidity
function setMCR(uint256 MCR_) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| MCR_ | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setMCR(uint256 MCR_) public onlyOwner {
        MCR = MCR_;
    }
```
</details>

---    

> ### setCCR

```solidity
function setCCR(uint256 CCR_) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| CCR_ | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setCCR(uint256 CCR_) public onlyOwner {
        CCR = CCR_;
    }
```
</details>

---    

> ### setPercentDivisor

```solidity
function setPercentDivisor(uint256 PERCENT_DIVISOR_) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| PERCENT_DIVISOR_ | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setPercentDivisor(uint256 PERCENT_DIVISOR_) public onlyOwner {
        PERCENT_DIVISOR = PERCENT_DIVISOR_;
    }
```
</details>

---    

> ### setBorrowingFeeFloor

```solidity
function setBorrowingFeeFloor(uint256 BORROWING_FEE_FLOOR_) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| BORROWING_FEE_FLOOR_ | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setBorrowingFeeFloor(uint256 BORROWING_FEE_FLOOR_) public onlyOwner {
        BORROWING_FEE_FLOOR = BORROWING_FEE_FLOOR_;
    }
```
</details>

---    

> ### setRedemptionFeeFloor

```solidity
function setRedemptionFeeFloor(uint256 REDEMPTION_FEE_FLOOR_) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| REDEMPTION_FEE_FLOOR_ | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setRedemptionFeeFloor(uint256 REDEMPTION_FEE_FLOOR_) public onlyOwner {
        REDEMPTION_FEE_FLOOR = REDEMPTION_FEE_FLOOR_;
    }
```
</details>

---    

> ### setMaxBorrowingFee

```solidity
function setMaxBorrowingFee(uint256 MAX_BORROWING_FEE_) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| MAX_BORROWING_FEE_ | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setMaxBorrowingFee(uint256 MAX_BORROWING_FEE_) public onlyOwner {
        MAX_BORROWING_FEE = MAX_BORROWING_FEE_;
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
