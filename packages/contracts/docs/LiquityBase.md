# LiquityBase.sol

View Source: [contracts/Dependencies/LiquityBase.sol](../contracts/Dependencies/LiquityBase.sol)

**↗ Extends: [BaseMath](BaseMath.md), [ILiquityBase](ILiquityBase.md)**
**↘ Derived Contracts: [BorrowerOperations](BorrowerOperations.md), [HintHelpers](HintHelpers.md), [StabilityPool](StabilityPool.md), [TroveManagerBase](TroveManagerBase.md), [TroveManagerBase1MinuteBootstrap](TroveManagerBase1MinuteBootstrap.md)**

**LiquityBase**

## Contract Members
**Constants & Variables**

```js
uint256 public constant _100pct;
uint256 public constant ZUSD_GAS_COMPENSATION;
uint256 public constant MIN_NET_DEBT;
contract IActivePool public activePool;
contract IDefaultPool public defaultPool;
contract IPriceFeed public priceFeed;
contract ILiquityBaseParams public liquityBaseParams;

```

## Functions

- [_getCompositeDebt(uint256 _debt)](#_getcompositedebt)
- [_getNetDebt(uint256 _debt)](#_getnetdebt)
- [_getCollGasCompensation(uint256 _entireColl)](#_getcollgascompensation)
- [getEntireSystemColl()](#getentiresystemcoll)
- [getEntireSystemDebt()](#getentiresystemdebt)
- [_getTCR(uint256 _price)](#_gettcr)
- [_checkRecoveryMode(uint256 _price)](#_checkrecoverymode)
- [_requireUserAcceptsFee(uint256 _fee, uint256 _amount, uint256 _maxFeePercentage)](#_requireuseracceptsfee)

---    

> ### _getCompositeDebt

```solidity
function _getCompositeDebt(uint256 _debt) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _debt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getCompositeDebt(uint256 _debt) internal pure returns (uint256) {
        return _debt.add(ZUSD_GAS_COMPENSATION);
    }
```
</details>

---    

> ### _getNetDebt

```solidity
function _getNetDebt(uint256 _debt) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _debt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getNetDebt(uint256 _debt) internal pure returns (uint256) {
        return _debt.sub(ZUSD_GAS_COMPENSATION);
    }
```
</details>

---    

> ### _getCollGasCompensation

```solidity
function _getCollGasCompensation(uint256 _entireColl) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _entireColl | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getCollGasCompensation(uint256 _entireColl) internal view returns (uint256) {
        return _entireColl / liquityBaseParams.PERCENT_DIVISOR();
    }
```
</details>

---    

> ### getEntireSystemColl

```solidity
function getEntireSystemColl() public view
returns(entireSystemColl uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getEntireSystemColl() public view returns (uint256 entireSystemColl) {
        uint256 activeColl = activePool.getETH();
        uint256 liquidatedColl = defaultPool.getETH();

        return activeColl.add(liquidatedColl);
    }
```
</details>

---    

> ### getEntireSystemDebt

```solidity
function getEntireSystemDebt() public view
returns(entireSystemDebt uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getEntireSystemDebt() public view returns (uint256 entireSystemDebt) {
        uint256 activeDebt = activePool.getZUSDDebt();
        uint256 closedDebt = defaultPool.getZUSDDebt();

        return activeDebt.add(closedDebt);
    }
```
</details>

---    

> ### _getTCR

```solidity
function _getTCR(uint256 _price) internal view
returns(TCR uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getTCR(uint256 _price) internal view returns (uint256 TCR) {
        uint256 entireSystemColl = getEntireSystemColl();
        uint256 entireSystemDebt = getEntireSystemDebt();

        TCR = LiquityMath._computeCR(entireSystemColl, entireSystemDebt, _price);

        return TCR;
    }
```
</details>

---    

> ### _checkRecoveryMode

```solidity
function _checkRecoveryMode(uint256 _price) internal view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _checkRecoveryMode(uint256 _price) internal view returns (bool) {
        uint256 TCR = _getTCR(_price);

        return TCR < liquityBaseParams.CCR();
    }
```
</details>

---    

> ### _requireUserAcceptsFee

```solidity
function _requireUserAcceptsFee(uint256 _fee, uint256 _amount, uint256 _maxFeePercentage) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _fee | uint256 |  | 
| _amount | uint256 |  | 
| _maxFeePercentage | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireUserAcceptsFee(
        uint256 _fee,
        uint256 _amount,
        uint256 _maxFeePercentage
    ) internal pure {
        uint256 feePercentage = _fee.mul(DECIMAL_PRECISION).div(_amount);
        require(feePercentage <= _maxFeePercentage, "Fee exceeded provided maximum");
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
