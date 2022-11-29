# SortedTroves.sol

View Source: [contracts/SortedTroves.sol](../contracts/SortedTroves.sol)

**↗ Extends: [SortedTrovesStorage](SortedTrovesStorage.md), [CheckContract](CheckContract.md), [ISortedTroves](ISortedTroves.md)**

**SortedTroves**

**Events**

```js
event TroveManagerAddressChanged(address  _troveManagerAddress);
event BorrowerOperationsAddressChanged(address  _borrowerOperationsAddress);
event NodeAdded(address  _id, uint256  _NICR);
event NodeRemoved(address  _id);
```

## Functions

- [setParams(uint256 _size, address _troveManagerAddress, address _borrowerOperationsAddress)](#setparams)
- [insert(address _id, uint256 _NICR, address _prevId, address _nextId)](#insert)
- [_insert(ITroveManager _troveManager, address _id, uint256 _NICR, address _prevId, address _nextId)](#_insert)
- [remove(address _id)](#remove)
- [_remove(address _id)](#_remove)
- [reInsert(address _id, uint256 _newNICR, address _prevId, address _nextId)](#reinsert)
- [contains(address _id)](#contains)
- [isFull()](#isfull)
- [isEmpty()](#isempty)
- [getSize()](#getsize)
- [getMaxSize()](#getmaxsize)
- [getFirst()](#getfirst)
- [getLast()](#getlast)
- [getNext(address _id)](#getnext)
- [getPrev(address _id)](#getprev)
- [validInsertPosition(uint256 _NICR, address _prevId, address _nextId)](#validinsertposition)
- [_validInsertPosition(ITroveManager _troveManager, uint256 _NICR, address _prevId, address _nextId)](#_validinsertposition)
- [_descendList(ITroveManager _troveManager, uint256 _NICR, address _startId)](#_descendlist)
- [_ascendList(ITroveManager _troveManager, uint256 _NICR, address _startId)](#_ascendlist)
- [findInsertPosition(uint256 _NICR, address _prevId, address _nextId)](#findinsertposition)
- [_findInsertPosition(ITroveManager _troveManager, uint256 _NICR, address _prevId, address _nextId)](#_findinsertposition)
- [_requireCallerIsTroveManager()](#_requirecalleristrovemanager)
- [_requireCallerIsBOorTroveM(ITroveManager _troveManager)](#_requirecallerisboortrovem)

---    

> ### setParams

```solidity
function setParams(uint256 _size, address _troveManagerAddress, address _borrowerOperationsAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _size | uint256 |  | 
| _troveManagerAddress | address |  | 
| _borrowerOperationsAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setParams(uint256 _size, address _troveManagerAddress, address _borrowerOperationsAddress) external override onlyOwner {
        require(_size > 0, "SortedTroves: Size can’t be zero");
        checkContract(_troveManagerAddress);
        checkContract(_borrowerOperationsAddress);

        data.maxSize = _size;

        troveManager = ITroveManager(_troveManagerAddress);
        borrowerOperationsAddress = _borrowerOperationsAddress;

        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);

    }

```
</details>

---    

> ### insert

Add a node to the list

```solidity
function insert(address _id, uint256 _NICR, address _prevId, address _nextId) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 
| _NICR | uint256 | Node's NICR | 
| _prevId | address | Id of previous node for the insert position | 
| _nextId | address | Id of next node for the insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction insert (address _id, uint256 _NICR, address _prevId, address _nextId) external override {
        ITroveManager troveManagerCached = troveManager;

        _requireCallerIsBOorTroveM(troveManagerCached);
        _insert(troveManagerCached, _id, _NICR, _prevId, _nextId);
    }

```
</details>

---    

> ### _insert

```solidity
function _insert(ITroveManager _troveManager, address _id, uint256 _NICR, address _prevId, address _nextId) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 
| _id | address |  | 
| _NICR | uint256 |  | 
| _prevId | address |  | 
| _nextId | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _insert(ITroveManager _troveManager, address _id, uint256 _NICR, address _prevId, address _nextId) internal {
        // List must not be full
        require(!isFull(), "SortedTroves: List is full");
        // List must not already contain node
        require(!contains(_id), "SortedTroves: List already contains the node");
        // Node id must not be null
        require(_id != address(0), "SortedTroves: Id cannot be zero");
        // NICR must be non-zero
        require(_NICR > 0, "SortedTroves: NICR must be positive");

        address prevId = _prevId;
        address nextId = _nextId;

        if (!_validInsertPosition(_troveManager, _NICR, prevId, nextId)) {
            // Sender's hint was not a valid insert position
            // Use sender's hint to find a valid insert position
            (prevId, nextId) = _findInsertPosition(_troveManager, _NICR, prevId, nextId);
        }

         data.nodes[_id].exists = true;

        if (prevId == address(0) && nextId == address(0)) {
            // Insert as head and tail
            data.head = _id;
            data.tail = _id;
        } else if (prevId == address(0)) {
            // Insert before `prevId` as the head
            data.nodes[_id].nextId = data.head;
            data.nodes[data.head].prevId = _id;
            data.head = _id;
        } else if (nextId == address(0)) {
            // Insert after `nextId` as the tail
            data.nodes[_id].prevId = data.tail;
            data.nodes[data.tail].nextId = _id;
            data.tail = _id;
        } else {
            // Insert at insert position between `prevId` and `nextId`
            data.nodes[_id].nextId = nextId;
            data.nodes[_id].prevId = prevId;
            data.nodes[prevId].nextId = _id;
            data.nodes[nextId].prevId = _id;
        }

        data.size = data.size.add(1);
        emit NodeAdded(_id, _NICR);
    }

```
</details>

---    

> ### remove

```solidity
function remove(address _id) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction remove(address _id) external override {
        _requireCallerIsTroveManager();
        _remove(_id);
    }

```
</details>

---    

> ### _remove

Remove a node from the list

```solidity
function _remove(address _id) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _remove(address _id) internal {
        // List must contain the node
        require(contains(_id), "SortedTroves: List does not contain the id");

        if (data.size > 1) {
            // List contains more than a single node
            if (_id == data.head) {
                // The removed node is the head
                // Set head to next node
                data.head = data.nodes[_id].nextId;
                // Set prev pointer of new head to null
                data.nodes[data.head].prevId = address(0);
            } else if (_id == data.tail) {
                // The removed node is the tail
                // Set tail to previous node
                data.tail = data.nodes[_id].prevId;
                // Set next pointer of new tail to null
                data.nodes[data.tail].nextId = address(0);
            } else {
                // The removed node is neither the head nor the tail
                // Set next pointer of previous node to the next node
                data.nodes[data.nodes[_id].prevId].nextId = data.nodes[_id].nextId;
                // Set prev pointer of next node to the previous node
                data.nodes[data.nodes[_id].nextId].prevId = data.nodes[_id].prevId;
            }
        } else {
            // List contains a single node
            // Set the head and tail to null
            data.head = address(0);
            data.tail = address(0);
        }

        delete data.nodes[_id];
        data.size = data.size.sub(1);
        NodeRemoved(_id);
    }

```
</details>

---    

> ### reInsert

Re-insert the node at a new position, based on its new NICR

```solidity
function reInsert(address _id, uint256 _newNICR, address _prevId, address _nextId) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 
| _newNICR | uint256 | Node's new NICR | 
| _prevId | address | Id of previous node for the new insert position | 
| _nextId | address | Id of next node for the new insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction reInsert(address _id, uint256 _newNICR, address _prevId, address _nextId) external override {
        ITroveManager troveManagerCached = troveManager;

        _requireCallerIsBOorTroveM(troveManagerCached);
        // List must contain the node
        require(contains(_id), "SortedTroves: List does not contain the id");
        // NICR must be non-zero
        require(_newNICR > 0, "SortedTroves: NICR must be positive");

        // Remove node from the list
        _remove(_id);

        _insert(troveManagerCached, _id, _newNICR, _prevId, _nextId);
    }

```
</details>

---    

> ### contains

Checks if the list contains a node

```solidity
function contains(address _id) public view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction contains(address _id) public view override returns (bool) {
        return data.nodes[_id].exists;
    }

```
</details>

---    

> ### isFull

Checks if the list is full

```solidity
function isFull() public view
returns(bool)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction isFull() public view override returns (bool) {
        return data.size == data.maxSize;
    }

```
</details>

---    

> ### isEmpty

Checks if the list is empty

```solidity
function isEmpty() public view
returns(bool)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction isEmpty() public view override returns (bool) {
        return data.size == 0;
    }

```
</details>

---    

> ### getSize

Returns the current size of the list

```solidity
function getSize() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getSize() external view override returns (uint256) {
        return data.size;
    }

```
</details>

---    

> ### getMaxSize

Returns the maximum size of the list

```solidity
function getMaxSize() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getMaxSize() external view override returns (uint256) {
        return data.maxSize;
    }

```
</details>

---    

> ### getFirst

Returns the first node in the list (node with the largest NICR)

```solidity
function getFirst() external view
returns(address)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getFirst() external view override returns (address) {
        return data.head;
    }

```
</details>

---    

> ### getLast

Returns the last node in the list (node with the smallest NICR)

```solidity
function getLast() external view
returns(address)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getLast() external view override returns (address) {
        return data.tail;
    }

```
</details>

---    

> ### getNext

Returns the next node (with a smaller NICR) in the list for a given node

```solidity
function getNext(address _id) external view
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getNext(address _id) external view override returns (address) {
        return data.nodes[_id].nextId;
    }

```
</details>

---    

> ### getPrev

Returns the previous node (with a larger NICR) in the list for a given node

```solidity
function getPrev(address _id) external view
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _id | address | Node's id | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getPrev(address _id) external view override returns (address) {
        return data.nodes[_id].prevId;
    }

```
</details>

---    

> ### validInsertPosition

Check if a pair of nodes is a valid insertion point for a new node with the given NICR

```solidity
function validInsertPosition(uint256 _NICR, address _prevId, address _nextId) external view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _NICR | uint256 | Node's NICR | 
| _prevId | address | Id of previous node for the insert position | 
| _nextId | address | Id of next node for the insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction validInsertPosition(uint256 _NICR, address _prevId, address _nextId) external view override returns (bool) {
        return _validInsertPosition(troveManager, _NICR, _prevId, _nextId);
    }

```
</details>

---    

> ### _validInsertPosition

```solidity
function _validInsertPosition(ITroveManager _troveManager, uint256 _NICR, address _prevId, address _nextId) internal view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 
| _NICR | uint256 |  | 
| _prevId | address |  | 
| _nextId | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _validInsertPosition(ITroveManager _troveManager, uint256 _NICR, address _prevId, address _nextId) internal view returns (bool) {
        if (_prevId == address(0) && _nextId == address(0)) {
            // `(null, null)` is a valid insert position if the list is empty
            return isEmpty();
        } else if (_prevId == address(0)) {
            // `(null, _nextId)` is a valid insert position if `_nextId` is the head of the list
            return data.head == _nextId && _NICR >= _troveManager.getNominalICR(_nextId);
        } else if (_nextId == address(0)) {
            // `(_prevId, null)` is a valid insert position if `_prevId` is the tail of the list
            return data.tail == _prevId && _NICR <= _troveManager.getNominalICR(_prevId);
        } else {
            // `(_prevId, _nextId)` is a valid insert position if they are adjacent nodes and `_NICR` falls between the two nodes' NICRs
            return data.nodes[_prevId].nextId == _nextId &&
                   _troveManager.getNominalICR(_prevId) >= _NICR &&
                   _NICR >= _troveManager.getNominalICR(_nextId);
        }
    }

```
</details>

---    

> ### _descendList

Descend the list (larger NICRs to smaller NICRs) to find a valid insert position

```solidity
function _descendList(ITroveManager _troveManager, uint256 _NICR, address _startId) internal view
returns(address, address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager | TroveManager contract, passed in as param to save SLOAD’s | 
| _NICR | uint256 | Node's NICR | 
| _startId | address | Id of node to start descending the list from | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
tion _descendList(ITroveManager _troveManager, uint256 _NICR, address _startId) internal view returns (address, address) {
        // If `_startId` is the head, check if the insert position is before the head
        if (data.head == _startId && _NICR >= _troveManager.getNominalICR(_startId)) {
            return (address(0), _startId);
        }

        address prevId = _startId;
        address nextId = data.nodes[prevId].nextId;

        // Descend the list until we reach the end or until we find a valid insert position
        while (prevId != address(0) && !_validInsertPosition(_troveManager, _NICR, prevId, nextId)) {
            prevId = data.nodes[prevId].nextId;
            nextId = data.nodes[prevId].nextId;
        }

        return (prevId, nextId);
    }

```
</details>

---    

> ### _ascendList

Ascend the list (smaller NICRs to larger NICRs) to find a valid insert position

```solidity
function _ascendList(ITroveManager _troveManager, uint256 _NICR, address _startId) internal view
returns(address, address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager | TroveManager contract, passed in as param to save SLOAD’s | 
| _NICR | uint256 | Node's NICR | 
| _startId | address | Id of node to start ascending the list from | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _ascendList(ITroveManager _troveManager, uint256 _NICR, address _startId) internal view returns (address, address) {
        // If `_startId` is the tail, check if the insert position is after the tail
        if (data.tail == _startId && _NICR <= _troveManager.getNominalICR(_startId)) {
            return (_startId, address(0));
        }

        address nextId = _startId;
        address prevId = data.nodes[nextId].prevId;

        // Ascend the list until we reach the end or until we find a valid insertion point
        while (nextId != address(0) && !_validInsertPosition(_troveManager, _NICR, prevId, nextId)) {
            nextId = data.nodes[nextId].prevId;
            prevId = data.nodes[nextId].prevId;
        }

        return (prevId, nextId);
    }

```
</details>

---    

> ### findInsertPosition

Find the insert position for a new node with the given NICR

```solidity
function findInsertPosition(uint256 _NICR, address _prevId, address _nextId) external view
returns(address, address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _NICR | uint256 | Node's NICR | 
| _prevId | address | Id of previous node for the insert position | 
| _nextId | address | Id of next node for the insert position | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on findInsertPosition(uint256 _NICR, address _prevId, address _nextId) external view override returns (address, address) {
        return _findInsertPosition(troveManager, _NICR, _prevId, _nextId);
    }

```
</details>

---    

> ### _findInsertPosition

```solidity
function _findInsertPosition(ITroveManager _troveManager, uint256 _NICR, address _prevId, address _nextId) internal view
returns(address, address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 
| _NICR | uint256 |  | 
| _prevId | address |  | 
| _nextId | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _findInsertPosition(ITroveManager _troveManager, uint256 _NICR, address _prevId, address _nextId) internal view returns (address, address) {
        address prevId = _prevId;
        address nextId = _nextId;

        if (prevId != address(0)) {
            if (!contains(prevId) || _NICR > _troveManager.getNominalICR(prevId)) {
                // `prevId` does not exist anymore or now has a smaller NICR than the given NICR
                prevId = address(0);
            }
        }

        if (nextId != address(0)) {
            if (!contains(nextId) || _NICR < _troveManager.getNominalICR(nextId)) {
                // `nextId` does not exist anymore or now has a larger NICR than the given NICR
                nextId = address(0);
            }
        }

        if (prevId == address(0) && nextId == address(0)) {
            // No hint - descend list starting from head
            return _descendList(_troveManager, _NICR, data.head);
        } else if (prevId == address(0)) {
            // No `prevId` for hint - ascend list starting from `nextId`
            return _ascendList(_troveManager, _NICR, nextId);
        } else if (nextId == address(0)) {
            // No `nextId` for hint - descend list starting from `prevId`
            return _descendList(_troveManager, _NICR, prevId);
        } else {
            // Descend list starting from `prevId`
            return _descendList(_troveManager, _NICR, prevId);
        }
    }

```
</details>

---    

> ### _requireCallerIsTroveManager

```solidity
function _requireCallerIsTroveManager() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _requireCallerIsTroveManager() internal view {
        require(msg.sender == address(troveManager), "SortedTroves: Caller is not the TroveManager");
    }

```
</details>

---    

> ### _requireCallerIsBOorTroveM

```solidity
function _requireCallerIsBOorTroveM(ITroveManager _troveManager) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
on _requireCallerIsBOorTroveM(ITroveManager _troveManager) internal view {
        require(msg.sender == borrowerOperationsAddress || msg.sender == address(_troveManager),
                "SortedTroves: Caller is neither BO nor TroveM");
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
