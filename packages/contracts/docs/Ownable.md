# Ownable.sol

View Source: [contracts/Dependencies/Ownable.sol](../contracts/Dependencies/Ownable.sol)

**↘ Derived Contracts: [ActivePoolStorage](ActivePoolStorage.md), [BorrowerOperationsStorage](BorrowerOperationsStorage.md), [CollSurplusPoolStorage](CollSurplusPoolStorage.md), [DefaultPoolStorage](DefaultPoolStorage.md), [FeeDistributorStorage](FeeDistributorStorage.md), [HintHelpersStorage](HintHelpersStorage.md), [IMasset](IMasset.md), [LiquityBaseParams](LiquityBaseParams.md), [MultiTroveGetterStorage](MultiTroveGetterStorage.md), [NueToken](NueToken.md), [PriceFeedStorage](PriceFeedStorage.md), [Proxy](Proxy.md), [SortedTrovesStorage](SortedTrovesStorage.md), [StabilityPoolStorage](StabilityPoolStorage.md), [TroveManagerStorage](TroveManagerStorage.md), [ZUSDToken](ZUSDToken.md)**

**Ownable**

Contract module which provides a basic access control mechanism, where
 there is an account (an owner) that can be granted exclusive access to
 specific functions.
 This module is used through inheritance. It will make available the modifier
 `onlyOwner`, which can be applied to your functions to restrict their use to
 the owner.

## Contract Members
**Constants & Variables**

```js
bytes32 private constant KEY_OWNER;

```

**Events**

```js
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

## Modifiers

- [onlyOwner](#onlyowner)

### onlyOwner

Throws if called by any account other than the owner.

```js
modifier onlyOwner() internal
```

## Functions

- [constructor()](#constructor)
- [_setOwner(address _owner)](#_setowner)
- [setOwner(address _owner)](#setowner)
- [getOwner()](#getowner)

---    

> ### constructor

Initializes the contract setting the deployer as the initial owner.

```solidity
function () internal nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor () internal {
        _setOwner(msg.sender);
    }
```
</details>

---    

> ### _setOwner

Set address of the owner.

```solidity
function _setOwner(address _owner) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _owner | address | Address of the owner. | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _setOwner(address _owner) internal {
        require(_owner != address(0), "Ownable::setOwner: invalid address");
        emit OwnershipTransferred(getOwner(), _owner);

        bytes32 key = KEY_OWNER;
        assembly {
            sstore(key, _owner)
        }
    }
```
</details>

---    

> ### setOwner

Set address of the owner (only owner can call this function)

```solidity
function setOwner(address _owner) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _owner | address | Address of the owner. | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setOwner(address _owner) public onlyOwner {
        _setOwner(_owner);
    }
```
</details>

---    

> ### getOwner

Return address of the owner.

```solidity
function getOwner() public view
returns(_owner address)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getOwner() public view returns (address _owner) {
        bytes32 key = KEY_OWNER;
        assembly {
            _owner := sload(key)
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
