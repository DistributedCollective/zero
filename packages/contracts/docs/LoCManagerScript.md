# TroveManagerScript.sol

View Source: [contracts/Proxy/TroveManagerScript.sol](../contracts/Proxy/TroveManagerScript.sol)

**↗ Extends: [CheckContract](CheckContract.md)**

**TroveManagerScript**

## Contract Members
**Constants & Variables**

```js
//public members
string public constant NAME;

//internal members
contract ITroveManager internal troveManager;

```

## Functions

- [constructor(ITroveManager _troveManager)](#constructor)
- [redeemCollateral(uint256 _ZUSDAmount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFee)](#redeemcollateral)

---    

> ### constructor

```solidity
function (ITroveManager _troveManager) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor(ITroveManager _troveManager) public {
        checkContract(address(_troveManager));
        troveManager = _troveManager;
    }
```
</details>

---    

> ### redeemCollateral

```solidity
function redeemCollateral(uint256 _ZUSDAmount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFee) external nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDAmount | uint256 |  | 
| _firstRedemptionHint | address |  | 
| _upperPartialRedemptionHint | address |  | 
| _lowerPartialRedemptionHint | address |  | 
| _partialRedemptionHintNICR | uint256 |  | 
| _maxIterations | uint256 |  | 
| _maxFee | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function redeemCollateral(
        uint _ZUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations,
        uint _maxFee
    ) external returns (uint) {
        troveManager.redeemCollateral(
            _ZUSDAmount,
            _firstRedemptionHint,
            _upperPartialRedemptionHint,
            _lowerPartialRedemptionHint,
            _partialRedemptionHintNICR,
            _maxIterations,
            _maxFee
        );
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
