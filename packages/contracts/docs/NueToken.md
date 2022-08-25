# NueToken.sol

View Source: [contracts/TestContracts/MassetTester.sol](../contracts/TestContracts/MassetTester.sol)

**↗ Extends: [ERC20](ERC20.md), [Ownable](Ownable.md)**

**NueToken**

## Contract Members
**Constants & Variables**

```js
contract NueToken public token;

```

## Functions

- [constructor()](#constructor)
- [mint(address _account, uint256 _amount)](#mint)
- [burn(address _account, uint256 _amount)](#burn)
- [constructor()](#constructor)
- [onTokensMinted(uint256 _orderAmount, address _tokenAddress, bytes _userData)](#ontokensminted)
- [redeemByBridge(address _bAsset, uint256 _massetQuantity, address _recipient)](#redeembybridge)

---    

> ### constructor

```solidity
function () public nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor () public {}
```
</details>

---    

> ### mint

```solidity
function mint(address _account, uint256 _amount) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _account | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function mint (address _account, uint256 _amount) onlyOwner public {
        _mint(_account, _amount);
    }
```
</details>

---    

> ### burn

```solidity
function burn(address _account, uint256 _amount) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _account | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function burn(address _account, uint256 _amount) onlyOwner public {
        _burn(_account, _amount);
    }
```
</details>

---    

> ### constructor

```solidity
function () public nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor () public {
        token = new NueToken();
    }
```
</details>

---    

> ### onTokensMinted

```solidity
function onTokensMinted(uint256 _orderAmount, address _tokenAddress, bytes _userData) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _orderAmount | uint256 |  | 
| _tokenAddress | address |  | 
| _userData | bytes |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function onTokensMinted(
        uint256 _orderAmount,
        address _tokenAddress,
        bytes calldata _userData
    ) external override {
        token.mint(abi.decode(_userData, (address)), _orderAmount);
    }
```
</details>

---    

> ### redeemByBridge

```solidity
function redeemByBridge(address _bAsset, uint256 _massetQuantity, address _recipient) external nonpayable
returns(massetRedeemed uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _bAsset | address |  | 
| _massetQuantity | uint256 |  | 
| _recipient | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function redeemByBridge(
        address _bAsset,
        uint256 _massetQuantity,
        address _recipient
    ) external override returns (uint256 massetRedeemed) {
        ERC20(_bAsset).transfer(_recipient, _massetQuantity);
        token.burn(_recipient, _massetQuantity);

        return _massetQuantity;
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
