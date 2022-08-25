# Base Proxy contract.

 Adapted version of https://github.com/DistributedCollective/Sovryn-smart-contracts/blob/development/contracts/proxy/Proxy.sol (Proxy.sol)

View Source: [contracts/Proxy/Proxy.sol](../contracts/Proxy/Proxy.sol)

**↗ Extends: [Ownable](Ownable.md)**
**↘ Derived Contracts: [UpgradableProxy](UpgradableProxy.md)**

**Proxy**

The proxy performs delegated calls to the contract implementation
 it is pointing to. This way upgradable contracts are possible on blockchain.
 Delegating proxy contracts are widely used for both upgradeability and gas
 savings. These proxies rely on a logic contract (also known as implementation
 contract or master copy) that is called using delegatecall. This allows
 proxies to keep a persistent state (storage and balance) while the code is
 delegated to the logic contract.
 Proxy contract is meant to be inherited and its internal functions
 _setImplementation and _setOwner to be called when upgrades become
 neccessary.
 The loan token (iToken) contract as well as the protocol contract act as
 proxies, delegating all calls to underlying contracts. Therefore, if you
 want to interact with them using web3, you need to use the ABIs from the
 contracts containing the actual logic or the interface contract.
   ABI for LoanToken contracts: LoanTokenLogicStandard
   ABI for Protocol contract: ISovryn

## Contract Members
**Constants & Variables**

```js
bytes32 private constant KEY_IMPLEMENTATION;

```

**Events**

```js
event ImplementationChanged(address indexed _oldImplementation, address indexed _newImplementation);
```

## Functions

- [_setImplementation(address _implementation)](#_setimplementation)
- [getImplementation()](#getimplementation)
- [constructor()](#constructor)
- [constructor()](#constructor)
- [delegate()](#delegate)

---    

> ### _setImplementation

Set address of the implementation.

```solidity
function _setImplementation(address _implementation) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _implementation | address | Address of the implementation. | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _setImplementation(address _implementation) internal {
        require(_implementation != address(0), "Proxy::setImplementation: invalid address");
        emit ImplementationChanged(getImplementation(), _implementation);

        bytes32 key = KEY_IMPLEMENTATION;
        assembly {
            sstore(key, _implementation)
        }
    }
```
</details>

---    

> ### getImplementation

Return address of the implementation.

```solidity
function getImplementation() public view
returns(_implementation address)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getImplementation() public view returns (address _implementation) {
        bytes32 key = KEY_IMPLEMENTATION;
        assembly {
            _implementation := sload(key)
        }
    }
```
</details>

---    

> ### constructor

Fallback function performs a delegate call
 to the actual implementation address is pointing this proxy.
 Returns whatever the implementation call returns.

```solidity
function () external payable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
fallback() external payable {
        delegate();
    }
```
</details>

---    

> ### constructor

Fallback function performs a delegate call
 to the actual implementation address is pointing this proxy.
 Returns whatever the implementation call returns.

```solidity
function () external payable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
receive() external payable {
        delegate();
    }
```
</details>

---    

> ### delegate

```solidity
function delegate() internal nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function delegate() internal {
        address implementation = getImplementation();
        require(implementation != address(0), "Proxy::(): implementation not found");

        assembly {
            let pointer := mload(0x40)
            calldatacopy(pointer, 0, calldatasize())
            let result := delegatecall(gas(), implementation, pointer, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(pointer, 0, size)

            switch result
            case 0 {
                revert(pointer, size)
            }
            default {
                return(pointer, size)
            }
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
