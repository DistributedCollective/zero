# ISortedTroves.sol

View Source: [contracts/Interfaces/ISortedTroves.sol](../contracts/Interfaces/ISortedTroves.sol)

**↘ Derived Contracts: [SortedTroves](SortedTroves.md)**

**ISortedTroves**

**Events**

```js
event SortedTrovesAddressChanged(address  _sortedDoublyLLAddress);
event BorrowerOperationsAddressChanged(address  _borrowerOperationsAddress);
event NodeAdded(address  _id, uint256  _NICR);
event NodeRemoved(address  _id);
```

## Functions

- [setParams(uint256 _size, address _TroveManagerAddress, address _borrowerOperationsAddress)](#setparams)
- [insert(address _id, uint256 _ICR, address _prevId, address _nextId)](#insert)
- [remove(address _id)](#remove)
- [reInsert(address _id, uint256 _newICR, address _prevId, address _nextId)](#reinsert)
- [contains(address _id)](#contains)
- [isFull()](#isfull)
- [isEmpty()](#isempty)
- [getSize()](#getsize)
- [getMaxSize()](#getmaxsize)
- [getFirst()](#getfirst)
- [getLast()](#getlast)
- [getNext(address _id)](#getnext)
- [getPrev(address _id)](#getprev)
- [validInsertPosition(uint256 _ICR, address _prevId, address _nextId)](#validinsertposition)
- [findInsertPosition(uint256 _ICR, address _prevId, address _nextId)](#findinsertposition)

---    

> ### setParams

Called only once on init, to set addresses of other Zero contracts and size. Callable only by owner

```solidity
function setParams(uint256 _size, address _TroveManagerAddress, address _borrowerOperationsAddress) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _size | uint256 | max size of troves list | 
| _TroveManagerAddress | address | TroveManager contract address | 
| _borrowerOperationsAddress | address | BorrowerOperations contract address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setParams(
        uint256 _size,
        address _TroveManagerAddress,
        address _borrowerOperationsAddress
    ) external;
```
</details>

---    

> ### insert

Add a node to the list

```solidity
function insert(address _id, uint256 _ICR, address _prevId, address _nextId) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 
| _ICR | uint256 | Node's NICR | 
| _prevId | address | Id of previous node for the insert position | 
| _nextId | address | Id of next node for the insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function insert(
        address _id,
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external;
```
</details>

---    

> ### remove

Remove a node from the list

```solidity
function remove(address _id) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function remove(address _id) external;
```
</details>

---    

> ### reInsert

Re-insert the node at a new position, based on its new NICR

```solidity
function reInsert(address _id, uint256 _newICR, address _prevId, address _nextId) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 
| _newICR | uint256 | Node's new NICR | 
| _prevId | address | Id of previous node for the new insert position | 
| _nextId | address | Id of next node for the new insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function reInsert(
        address _id,
        uint256 _newICR,
        address _prevId,
        address _nextId
    ) external;
```
</details>

---    

> ### contains

Checks if the list contains a node

```solidity
function contains(address _id) external view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 

**Returns**

true if list contains a node with given id

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function contains(address _id) external view returns (bool);
```
</details>

---    

> ### isFull

Checks if the list is full

```solidity
function isFull() external view
returns(bool)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function isFull() external view returns (bool);
```
</details>

---    

> ### isEmpty

Checks if the list is empty

```solidity
function isEmpty() external view
returns(bool)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function isEmpty() external view returns (bool);
```
</details>

---    

> ### getSize

```solidity
function getSize() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getSize() external view returns (uint256);
```
</details>

---    

> ### getMaxSize

```solidity
function getMaxSize() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getMaxSize() external view returns (uint256);
```
</details>

---    

> ### getFirst

```solidity
function getFirst() external view
returns(address)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getFirst() external view returns (address);
```
</details>

---    

> ### getLast

```solidity
function getLast() external view
returns(address)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getLast() external view returns (address);
```
</details>

---    

> ### getNext

```solidity
function getNext(address _id) external view
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 

**Returns**

the next node (with a smaller NICR) in the list for a given node

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getNext(address _id) external view returns (address);
```
</details>

---    

> ### getPrev

```solidity
function getPrev(address _id) external view
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 

**Returns**

the previous node (with a larger NICR) in the list for a given node

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getPrev(address _id) external view returns (address);
```
</details>

---    

> ### validInsertPosition

Check if a pair of nodes is a valid insertion point for a new node with the given NICR

```solidity
function validInsertPosition(uint256 _ICR, address _prevId, address _nextId) external view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ICR | uint256 | Node's NICR | 
| _prevId | address | Id of previous node for the insert position | 
| _nextId | address | Id of next node for the insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function validInsertPosition(
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external view returns (bool);
```
</details>

---    

> ### findInsertPosition

Find the insert position for a new node with the given NICR

```solidity
function findInsertPosition(uint256 _ICR, address _prevId, address _nextId) external view
returns(address, address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ICR | uint256 | Node's NICR | 
| _prevId | address | Id of previous node for the insert position | 
| _nextId | address | Id of next node for the insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function findInsertPosition(
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external view returns (address, address);
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
