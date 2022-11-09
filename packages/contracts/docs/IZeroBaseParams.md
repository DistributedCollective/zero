# ILiquityBaseParams.sol

View Source: [contracts/Interfaces/ILiquityBaseParams.sol](../contracts/Interfaces/ILiquityBaseParams.sol)

**↘ Derived Contracts: [LiquityBaseParams](LiquityBaseParams.md)**

**ILiquityBaseParams**

## Functions

- [MCR()](#mcr)
- [CCR()](#ccr)
- [PERCENT_DIVISOR()](#percent_divisor)
- [BORROWING_FEE_FLOOR()](#borrowing_fee_floor)
- [REDEMPTION_FEE_FLOOR()](#redemption_fee_floor)
- [MAX_BORROWING_FEE()](#max_borrowing_fee)

---    

> ### MCR

```solidity
function MCR() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function MCR() external view returns (uint);
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
function CCR() external view returns (uint);
```
</details>

---    

> ### PERCENT_DIVISOR

```solidity
function PERCENT_DIVISOR() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function PERCENT_DIVISOR() external view returns (uint);
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
function BORROWING_FEE_FLOOR() external view returns (uint);
```
</details>

---    

> ### REDEMPTION_FEE_FLOOR

```solidity
function REDEMPTION_FEE_FLOOR() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function REDEMPTION_FEE_FLOOR() external view returns (uint);
```
</details>

---    

> ### MAX_BORROWING_FEE

```solidity
function MAX_BORROWING_FEE() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function MAX_BORROWING_FEE() external view returns (uint);
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
