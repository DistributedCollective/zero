# DSAuthEvents.sol

View Source: [contracts/TestContracts/DappSys/proxy.sol](../contracts/TestContracts/DappSys/proxy.sol)

**↗ Extends: [DSAuthEvents](DSAuthEvents.md)**
**↘ Derived Contracts: [DSAuth](DSAuth.md), [DSAuthEvents](DSAuthEvents.md), [DSAuthority](DSAuthority.md), [DSNote](DSNote.md), [DSProxy](DSProxy.md), [DSProxyCache](DSProxyCache.md), [DSProxyFactory](DSProxyFactory.md)**

**DSAuthEvents**

## Contract Members
**Constants & Variables**

```js
//public members
contract DSAuthority public authority;
address public owner;
contract DSProxyCache public cache;
mapping(address => bool) public isProxy;
contract DSProxyCache public cache;

//internal members
mapping(bytes32 => address) internal cache;

```

**Events**

```js
event LogSetAuthority(address indexed authority);
event LogSetOwner(address indexed owner);
event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256  wad, bytes  fax);
event Created(address indexed sender, address indexed owner, address  proxy, address  cache);
```

## Modifiers

- [auth](#auth)
- [note](#note)

### auth

```js
modifier auth() internal
```

### note

```js
modifier note() internal
```

## Functions

- [canCall(address src, address dst, bytes4 sig)](#cancall)
- [constructor()](#constructor)
- [setOwner(address owner_)](#setowner)
- [setAuthority(DSAuthority authority_)](#setauthority)
- [isAuthorized(address src, bytes4 sig)](#isauthorized)
- [constructor(address _cacheAddr)](#constructor)
- [constructor()](#constructor)
- [constructor()](#constructor)
- [execute(bytes _code, bytes _data)](#execute)
- [execute(address _target, bytes _data)](#execute)
- [setCache(address _cacheAddr)](#setcache)
- [build()](#build)
- [build(address owner)](#build)
- [read(bytes _code)](#read)
- [write(bytes _code)](#write)

---    

> ### canCall

```solidity
function canCall(address src, address dst, bytes4 sig) public view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| src | address |  | 
| dst | address |  | 
| sig | bytes4 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function canCall(
        address src, address dst, bytes4 sig
    ) virtual public view returns (bool);
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
constructor() public {
        owner = msg.sender;
        emit LogSetOwner(msg.sender);
    }
```
</details>

---    

> ### setOwner

```solidity
function setOwner(address owner_) public nonpayable auth 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner_ | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setOwner(address owner_)
        public
        auth
    {
        owner = owner_;
        emit LogSetOwner(owner);
    }
```
</details>

---    

> ### setAuthority

```solidity
function setAuthority(DSAuthority authority_) public nonpayable auth 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| authority_ | DSAuthority |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAuthority(DSAuthority authority_)
        public
        auth
    {
        authority = authority_;
        emit LogSetAuthority(address(authority));
    }
```
</details>

---    

> ### isAuthorized

```solidity
function isAuthorized(address src, bytes4 sig) internal view
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| src | address |  | 
| sig | bytes4 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function isAuthorized(address src, bytes4 sig) internal view returns (bool) {
        if (src == address(this)) {
            return true;
        } else if (src == owner) {
            return true;
        } else if (authority == DSAuthority(0)) {
            return false;
        } else {
            return authority.canCall(src, address(this), sig);
        }
    }
```
</details>

---    

> ### constructor

```solidity
function (address _cacheAddr) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _cacheAddr | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor(address _cacheAddr) public {
        require(setCache(_cacheAddr));
    }
```
</details>

---    

> ### constructor

```solidity
function () external payable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
fallback() external payable {
    }
```
</details>

---    

> ### constructor

```solidity
function () external payable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
receive() external payable {
    }
```
</details>

---    

> ### execute

```solidity
function execute(bytes _code, bytes _data) public payable
returns(target address, response bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _code | bytes |  | 
| _data | bytes |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function execute(bytes calldata _code, bytes calldata _data)
        public
        payable
        returns (address target, bytes32 response)
    {
        target = cache.read(_code);
        if (target == address(0x0)) {
            // deploy contract & store its address in cache
            target = cache.write(_code);
        }

        response = execute(target, _data);
    }
```
</details>

---    

> ### execute

```solidity
function execute(address _target, bytes _data) public payable auth note 
returns(response bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _target | address |  | 
| _data | bytes |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function execute(address _target, bytes memory _data)
        public
        auth
        note
        payable
        returns (bytes32 response)
    {
        require(_target != address(0x0));

        // call contract in current context
        assembly {
            let succeeded := delegatecall(sub(gas(), 5000), _target, add(_data, 0x20), mload(_data), 0, 32)
            response := mload(0)      // load delegatecall output
            switch iszero(succeeded)
            case 1 {
                // throw if delegatecall failed
                revert(0, 0)
            }
        }
    }
```
</details>

---    

> ### setCache

```solidity
function setCache(address _cacheAddr) internal nonpayable auth note 
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _cacheAddr | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setCache(address _cacheAddr)
        internal
        auth
        note
        returns (bool)
    {
        require(_cacheAddr != address(0x0));        // invalid cache address
        cache = DSProxyCache(_cacheAddr);  // overwrite cache
        return true;
    }
```
</details>

---    

> ### build

```solidity
function build() public nonpayable
returns(proxy contract DSProxy)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function build() public returns (DSProxy proxy) {
        proxy = build(msg.sender);
    }
```
</details>

---    

> ### build

```solidity
function build(address owner) public nonpayable
returns(proxy contract DSProxy)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function build(address owner) public returns (DSProxy proxy) {
        proxy = new DSProxy(address(cache));
        emit Created(msg.sender, owner, address(proxy), address(cache));
        proxy.setOwner(owner);
        isProxy[address(proxy)] = true;
    }
```
</details>

---    

> ### read

```solidity
function read(bytes _code) public view
returns(address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _code | bytes |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function read(bytes calldata _code) public view returns (address) {
        bytes32 hash = keccak256(_code);
        return cache[hash];
    }
```
</details>

---    

> ### write

```solidity
function write(bytes _code) public nonpayable
returns(target address)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _code | bytes |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function write(bytes memory _code) public returns (address target) {
        assembly {
            target := create(0, add(_code, 0x20), mload(_code))
            switch iszero(extcodesize(target))
            case 1 {
                // throw if contract failed to deploy
                revert(0, 0)
            }
        }
        bytes32 hash = keccak256(_code);
        cache[hash] = target;
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
