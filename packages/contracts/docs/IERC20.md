# IERC20.sol

View Source: [contracts/Dependencies/IERC20.sol](../contracts/Dependencies/IERC20.sol)

**↘ Derived Contracts: [ERC20](ERC20.md), [IWrbtc](IWrbtc.md), [IZUSDToken](IZUSDToken.md)**

**IERC20**

Interface of the ERC20 standard as defined in the EIP.

**Events**

```js
event Transfer(address indexed from, address indexed to, uint256  value);
event Approval(address indexed owner, address indexed spender, uint256  value);
```

## Functions

- [totalSupply()](#totalsupply)
- [balanceOf(address account)](#balanceof)
- [transfer(address recipient, uint256 amount)](#transfer)
- [allowance(address owner, address spender)](#allowance)
- [increaseAllowance(address spender, uint256 addedValue)](#increaseallowance)
- [decreaseAllowance(address spender, uint256 subtractedValue)](#decreaseallowance)
- [approve(address spender, uint256 amount)](#approve)
- [transferFrom(address sender, address recipient, uint256 amount)](#transferfrom)
- [name()](#name)
- [symbol()](#symbol)
- [decimals()](#decimals)

---    

> ### totalSupply

Returns the amount of tokens in existence.

```solidity
function totalSupply() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function totalSupply() external view returns (uint256);
```
</details>

---    

> ### balanceOf

Returns the amount of tokens owned by `account`.

```solidity
function balanceOf(address account) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function balanceOf(address account) external view returns (uint256);
```
</details>

---    

> ### transfer

Moves `amount` tokens from the caller's account to `recipient`.
 Returns a boolean value indicating whether the operation succeeded.
 Emits a {Transfer} event.

```solidity
function transfer(address recipient, uint256 amount) external nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| recipient | address |  | 
| amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function transfer(address recipient, uint256 amount) external returns (bool);
```
</details>

---    

> ### allowance

Returns the remaining number of tokens that `spender` will be
 allowed to spend on behalf of `owner` through {transferFrom}. This is
 zero by default.
 This value changes when {approve} or {transferFrom} are called.

```solidity
function allowance(address owner, address spender) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner | address |  | 
| spender | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function allowance(address owner, address spender) external view returns (uint256);
```
</details>

---    

> ### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| spender | address |  | 
| addedValue | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
```
</details>

---    

> ### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| spender | address |  | 
| subtractedValue | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
```
</details>

---    

> ### approve

Sets `amount` as the allowance of `spender` over the caller's tokens.
 Returns a boolean value indicating whether the operation succeeded.
 IMPORTANT: Beware that changing an allowance with this method brings the risk
 that someone may use both the old and the new allowance by unfortunate
 transaction ordering. One possible solution to mitigate this race
 condition is to first reduce the spender's allowance to 0 and set the
 desired value afterwards:
 https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
 Emits an {Approval} event.

```solidity
function approve(address spender, uint256 amount) external nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| spender | address |  | 
| amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function approve(address spender, uint256 amount) external returns (bool);
```
</details>

---    

> ### transferFrom

Moves `amount` tokens from `sender` to `recipient` using the
 allowance mechanism. `amount` is then deducted from the caller's
 allowance.
 Returns a boolean value indicating whether the operation succeeded.
 Emits a {Transfer} event.

```solidity
function transferFrom(address sender, address recipient, uint256 amount) external nonpayable
returns(bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| sender | address |  | 
| recipient | address |  | 
| amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
```
</details>

---    

> ### name

```solidity
function name() external view
returns(string)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function name() external view returns (string memory);
```
</details>

---    

> ### symbol

```solidity
function symbol() external view
returns(string)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function symbol() external view returns (string memory);
```
</details>

---    

> ### decimals

```solidity
function decimals() external view
returns(uint8)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decimals() external view returns (uint8);
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
