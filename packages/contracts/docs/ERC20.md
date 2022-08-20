# ERC20.sol

View Source: [@openzeppelin/contracts/token/ERC20/ERC20.sol](../@openzeppelin/contracts/token/ERC20/ERC20.sol)

**↗ Extends: [Context](Context.md), [IERC20](IERC20.md)**
**↘ Derived Contracts: [NueToken](NueToken.md)**

**ERC20**

Implementation of the {IERC20} interface.
 This implementation is agnostic to the way tokens are created. This means
 that a supply mechanism has to be added in a derived contract using {_mint}.
 For a generic mechanism see {ERC20PresetMinterPauser}.
 TIP: For a detailed writeup see our guide
 https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 to implement supply mechanisms].
 We have followed general OpenZeppelin guidelines: functions revert instead
 of returning `false` on failure. This behavior is nonetheless conventional
 and does not conflict with the expectations of ERC20 applications.
 Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 This allows applications to reconstruct the allowance for all accounts just
 by listening to said events. Other implementations of the EIP may not emit
 these events, as it isn't required by the specification.
 Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 functions have been added to mitigate the well-known issues around setting
 allowances. See {IERC20-approve}.

## Contract Members
**Constants & Variables**

```js
mapping(address => uint256) private _balances;
mapping(address => mapping(address => uint256)) private _allowances;
uint256 private _totalSupply;
string private _name;
string private _symbol;
uint8 private _decimals;

```

## Functions

- [constructor(string name_, string symbol_)](#constructor)
- [name()](#name)
- [symbol()](#symbol)
- [decimals()](#decimals)
- [totalSupply()](#totalsupply)
- [balanceOf(address account)](#balanceof)
- [transfer(address recipient, uint256 amount)](#transfer)
- [allowance(address owner, address spender)](#allowance)
- [approve(address spender, uint256 amount)](#approve)
- [transferFrom(address sender, address recipient, uint256 amount)](#transferfrom)
- [increaseAllowance(address spender, uint256 addedValue)](#increaseallowance)
- [decreaseAllowance(address spender, uint256 subtractedValue)](#decreaseallowance)
- [_transfer(address sender, address recipient, uint256 amount)](#_transfer)
- [_mint(address account, uint256 amount)](#_mint)
- [_burn(address account, uint256 amount)](#_burn)
- [_approve(address owner, address spender, uint256 amount)](#_approve)
- [_setupDecimals(uint8 decimals_)](#_setupdecimals)
- [_beforeTokenTransfer(address from, address to, uint256 amount)](#_beforetokentransfer)

---    

> ### constructor

Sets the values for {name} and {symbol}, initializes {decimals} with
 a default value of 18.
 To select a different value for {decimals}, use {_setupDecimals}.
 All three of these values are immutable: they can only be set once during
 construction.

```solidity
function (string name_, string symbol_) public nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| name_ | string |  | 
| symbol_ | string |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor (string memory name_, string memory symbol_) public {
        _name = name_;
        _symbol = symbol_;
        _decimals = 18;
    }
```
</details>

---    

> ### name

Returns the name of the token.

```solidity
function name() public view
returns(string)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function name() public view virtual returns (string memory) {
        return _name;
    }
```
</details>

---    

> ### symbol

Returns the symbol of the token, usually a shorter version of the
 name.

```solidity
function symbol() public view
returns(string)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function symbol() public view virtual returns (string memory) {
        return _symbol;
    }
```
</details>

---    

> ### decimals

Returns the number of decimals used to get its user representation.
 For example, if `decimals` equals `2`, a balance of `505` tokens should
 be displayed to a user as `5,05` (`505 / 10 ** 2`).
 Tokens usually opt for a value of 18, imitating the relationship between
 Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
 called.
 NOTE: This information is only used for _display_ purposes: it in
 no way affects any of the arithmetic of the contract, including
 {IERC20-balanceOf} and {IERC20-transfer}.

```solidity
function decimals() public view
returns(uint8)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decimals() public view virtual returns (uint8) {
        return _decimals;
    }
```
</details>

---    

> ### totalSupply

See {IERC20-totalSupply}.

```solidity
function totalSupply() public view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }
```
</details>

---    

> ### balanceOf

See {IERC20-balanceOf}.

```solidity
function balanceOf(address account) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }
```
</details>

---    

> ### transfer

See {IERC20-transfer}.
 Requirements:
 - `recipient` cannot be the zero address.
 - the caller must have a balance of at least `amount`.

```solidity
function transfer(address recipient, uint256 amount) public nonpayable
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
function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
```
</details>

---    

> ### allowance

See {IERC20-allowance}.

```solidity
function allowance(address owner, address spender) public view
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
function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
```
</details>

---    

> ### approve

See {IERC20-approve}.
 Requirements:
 - `spender` cannot be the zero address.

```solidity
function approve(address spender, uint256 amount) public nonpayable
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
function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }
```
</details>

---    

> ### transferFrom

See {IERC20-transferFrom}.
 Emits an {Approval} event indicating the updated allowance. This is not
 required by the EIP. See the note at the beginning of {ERC20}.
 Requirements:
 - `sender` and `recipient` cannot be the zero address.
 - `sender` must have a balance of at least `amount`.
 - the caller must have allowance for ``sender``'s tokens of at least
 `amount`.

```solidity
function transferFrom(address sender, address recipient, uint256 amount) public nonpayable
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
function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }
```
</details>

---    

> ### increaseAllowance

Atomically increases the allowance granted to `spender` by the caller.
 This is an alternative to {approve} that can be used as a mitigation for
 problems described in {IERC20-approve}.
 Emits an {Approval} event indicating the updated allowance.
 Requirements:
 - `spender` cannot be the zero address.

```solidity
function increaseAllowance(address spender, uint256 addedValue) public nonpayable
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
function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }
```
</details>

---    

> ### decreaseAllowance

Atomically decreases the allowance granted to `spender` by the caller.
 This is an alternative to {approve} that can be used as a mitigation for
 problems described in {IERC20-approve}.
 Emits an {Approval} event indicating the updated allowance.
 Requirements:
 - `spender` cannot be the zero address.
 - `spender` must have allowance for the caller of at least
 `subtractedValue`.

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) public nonpayable
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
function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }
```
</details>

---    

> ### _transfer

Moves tokens `amount` from `sender` to `recipient`.
 This is internal function is equivalent to {transfer}, and can be used to
 e.g. implement automatic token fees, slashing mechanisms, etc.
 Emits a {Transfer} event.
 Requirements:
 - `sender` cannot be the zero address.
 - `recipient` cannot be the zero address.
 - `sender` must have a balance of at least `amount`.

```solidity
function _transfer(address sender, address recipient, uint256 amount) internal nonpayable
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
function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
```
</details>

---    

> ### _mint

Creates `amount` tokens and assigns them to `account`, increasing
 the total supply.
 Emits a {Transfer} event with `from` set to the zero address.
 Requirements:
 - `to` cannot be the zero address.

```solidity
function _mint(address account, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 
| amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
```
</details>

---    

> ### _burn

Destroys `amount` tokens from `account`, reducing the
 total supply.
 Emits a {Transfer} event with `to` set to the zero address.
 Requirements:
 - `account` cannot be the zero address.
 - `account` must have at least `amount` tokens.

```solidity
function _burn(address account, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| account | address |  | 
| amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }
```
</details>

---    

> ### _approve

Sets `amount` as the allowance of `spender` over the `owner` s tokens.
 This internal function is equivalent to `approve`, and can be used to
 e.g. set automatic allowances for certain subsystems, etc.
 Emits an {Approval} event.
 Requirements:
 - `owner` cannot be the zero address.
 - `spender` cannot be the zero address.

```solidity
function _approve(address owner, address spender, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner | address |  | 
| spender | address |  | 
| amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
```
</details>

---    

> ### _setupDecimals

Sets {decimals} to a value other than the default one of 18.
 WARNING: This function should only be called from the constructor. Most
 applications that interact with token contracts will not expect
 {decimals} to ever change, and may work incorrectly if it does.

```solidity
function _setupDecimals(uint8 decimals_) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| decimals_ | uint8 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _setupDecimals(uint8 decimals_) internal virtual {
        _decimals = decimals_;
    }
```
</details>

---    

> ### _beforeTokenTransfer

Hook that is called before any transfer of tokens. This includes
 minting and burning.
 Calling conditions:
 - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
 will be to transferred to `to`.
 - when `from` is zero, `amount` tokens will be minted for `to`.
 - when `to` is zero, `amount` of ``from``'s tokens will be burned.
 - `from` and `to` are never both zero.
 To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| from | address |  | 
| to | address |  | 
| amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual { }
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
