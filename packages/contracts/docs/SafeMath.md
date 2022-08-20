# SafeMath.sol

View Source: [contracts/Dependencies/SafeMath.sol](../contracts/Dependencies/SafeMath.sol)

**SafeMath**

Wrappers over Solidity's arithmetic operations with added overflow
 checks.
 Arithmetic operations in Solidity wrap on overflow. This can easily result
 in bugs, because programmers usually assume that an overflow raises an
 error, which is the standard behavior in high level programming languages.
 `SafeMath` restores this intuition by reverting the transaction when an
 operation overflows.
 Using this library instead of the unchecked operations eliminates an entire
 class of bugs, so it's recommended to use it always.

## Functions

- [add(uint256 a, uint256 b)](#add)
- [sub(uint256 a, uint256 b)](#sub)
- [sub(uint256 a, uint256 b, string errorMessage)](#sub)
- [mul(uint256 a, uint256 b)](#mul)
- [div(uint256 a, uint256 b)](#div)
- [div(uint256 a, uint256 b, string errorMessage)](#div)
- [mod(uint256 a, uint256 b)](#mod)
- [mod(uint256 a, uint256 b, string errorMessage)](#mod)

---    

> ### add

Returns the addition of two unsigned integers, reverting on
 overflow.
 Counterpart to Solidity's `+` operator.
 Requirements:
 - Addition cannot overflow.

```solidity
function add(uint256 a, uint256 b) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }
```
</details>

---    

> ### sub

Returns the subtraction of two unsigned integers, reverting on
 overflow (when the result is negative).
 Counterpart to Solidity's `-` operator.
 Requirements:
 - Subtraction cannot overflow.

```solidity
function sub(uint256 a, uint256 b) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }
```
</details>

---    

> ### sub

Returns the subtraction of two unsigned integers, reverting with custom message on
 overflow (when the result is negative).
 Counterpart to Solidity's `-` operator.
 Requirements:
 - Subtraction cannot overflow.
 _Available since v2.4.0._

```solidity
function sub(uint256 a, uint256 b, string errorMessage) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 
| errorMessage | string |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }
```
</details>

---    

> ### mul

Returns the multiplication of two unsigned integers, reverting on
 overflow.
 Counterpart to Solidity's `*` operator.
 Requirements:
 - Multiplication cannot overflow.

```solidity
function mul(uint256 a, uint256 b) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }
```
</details>

---    

> ### div

Returns the integer division of two unsigned integers. Reverts on
 division by zero. The result is rounded towards zero.
 Counterpart to Solidity's `/` operator. Note: this function uses a
 `revert` opcode (which leaves remaining gas untouched) while Solidity
 uses an invalid opcode to revert (consuming all remaining gas).
 Requirements:
 - The divisor cannot be zero.

```solidity
function div(uint256 a, uint256 b) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }
```
</details>

---    

> ### div

Returns the integer division of two unsigned integers. Reverts with custom message on
 division by zero. The result is rounded towards zero.
 Counterpart to Solidity's `/` operator. Note: this function uses a
 `revert` opcode (which leaves remaining gas untouched) while Solidity
 uses an invalid opcode to revert (consuming all remaining gas).
 Requirements:
 - The divisor cannot be zero.
 _Available since v2.4.0._

```solidity
function div(uint256 a, uint256 b, string errorMessage) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 
| errorMessage | string |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }
```
</details>

---    

> ### mod

Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
 Reverts when dividing by zero.
 Counterpart to Solidity's `%` operator. This function uses a `revert`
 opcode (which leaves remaining gas untouched) while Solidity uses an
 invalid opcode to revert (consuming all remaining gas).
 Requirements:
 - The divisor cannot be zero.

```solidity
function mod(uint256 a, uint256 b) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }
```
</details>

---    

> ### mod

Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
 Reverts with custom message when dividing by zero.
 Counterpart to Solidity's `%` operator. This function uses a `revert`
 opcode (which leaves remaining gas untouched) while Solidity uses an
 invalid opcode to revert (consuming all remaining gas).
 Requirements:
 - The divisor cannot be zero.
 _Available since v2.4.0._

```solidity
function mod(uint256 a, uint256 b, string errorMessage) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| a | uint256 |  | 
| b | uint256 |  | 
| errorMessage | string |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
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
