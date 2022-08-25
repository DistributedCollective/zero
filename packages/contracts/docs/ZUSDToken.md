# ZUSDToken.sol

View Source: [contracts/ZUSDToken.sol](../contracts/ZUSDToken.sol)

**↗ Extends: [ZUSDTokenStorage](ZUSDTokenStorage.md), [CheckContract](CheckContract.md), [IZUSDToken](IZUSDToken.md), [Ownable](Ownable.md)**

**ZUSDToken**

**Events**

```js
event TroveManagerAddressChanged(address  _troveManagerAddress);
event StabilityPoolAddressChanged(address  _newStabilityPoolAddress);
event BorrowerOperationsAddressChanged(address  _newBorrowerOperationsAddress);
```

## Functions

- [initialize(address _troveManagerAddress, address _stabilityPoolAddress, address _borrowerOperationsAddress)](#initialize)
- [mint(address _account, uint256 _amount)](#mint)
- [burn(address _account, uint256 _amount)](#burn)
- [sendToPool(address _sender, address _poolAddress, uint256 _amount)](#sendtopool)
- [returnFromPool(address _poolAddress, address _receiver, uint256 _amount)](#returnfrompool)
- [totalSupply()](#totalsupply)
- [balanceOf(address account)](#balanceof)
- [transfer(address recipient, uint256 amount)](#transfer)
- [allowance(address owner, address spender)](#allowance)
- [approve(address spender, uint256 amount)](#approve)
- [transferFrom(address sender, address recipient, uint256 amount)](#transferfrom)
- [increaseAllowance(address spender, uint256 addedValue)](#increaseallowance)
- [decreaseAllowance(address spender, uint256 subtractedValue)](#decreaseallowance)
- [domainSeparator()](#domainseparator)
- [permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)](#permit)
- [nonces(address owner)](#nonces)
- [_chainID()](#_chainid)
- [_buildDomainSeparator(bytes32 typeHash, bytes32 name, bytes32 version)](#_builddomainseparator)
- [_transfer(address sender, address recipient, uint256 amount)](#_transfer)
- [_mint(address account, uint256 amount)](#_mint)
- [_burn(address account, uint256 amount)](#_burn)
- [_approve(address owner, address spender, uint256 amount)](#_approve)
- [_requireValidRecipient(address _recipient)](#_requirevalidrecipient)
- [_requireCallerIsBorrowerOperations()](#_requirecallerisborroweroperations)
- [_requireCallerIsBOorTroveMorSP()](#_requirecallerisboortrovemorsp)
- [_requireCallerIsStabilityPool()](#_requirecallerisstabilitypool)
- [_requireCallerIsTroveMorSP()](#_requirecalleristrovemorsp)
- [name()](#name)
- [symbol()](#symbol)
- [decimals()](#decimals)
- [version()](#version)
- [permitTypeHash()](#permittypehash)

---    

> ### initialize

```solidity
function initialize(address _troveManagerAddress, address _stabilityPoolAddress, address _borrowerOperationsAddress) public nonpayable initializer onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManagerAddress | address |  | 
| _stabilityPoolAddress | address |  | 
| _borrowerOperationsAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function initialize(
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress
    ) public initializer onlyOwner {
        checkContract(_troveManagerAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_borrowerOperationsAddress);

        troveManagerAddress = _troveManagerAddress;
        emit TroveManagerAddressChanged(_troveManagerAddress);

        stabilityPoolAddress = _stabilityPoolAddress;
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);

        borrowerOperationsAddress = _borrowerOperationsAddress;
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);

        bytes32 hashedName = keccak256(bytes(_NAME));
        bytes32 hashedVersion = keccak256(bytes(_VERSION));

        _HASHED_NAME = hashedName;
        _HASHED_VERSION = hashedVersion;
        _CACHED_CHAIN_ID = _chainID();
        _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(_TYPE_HASH, hashedName, hashedVersion);
    }
```
</details>

---    

> ### mint

```solidity
function mint(address _account, uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _account | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function mint(address _account, uint256 _amount) external override {
        _requireCallerIsBorrowerOperations();
        _mint(_account, _amount);
    }
```
</details>

---    

> ### burn

```solidity
function burn(address _account, uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _account | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function burn(address _account, uint256 _amount) external override {
        _requireCallerIsBOorTroveMorSP();
        _burn(_account, _amount);
    }
```
</details>

---    

> ### sendToPool

```solidity
function sendToPool(address _sender, address _poolAddress, uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _sender | address |  | 
| _poolAddress | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function sendToPool(
        address _sender,
        address _poolAddress,
        uint256 _amount
    ) external override {
        _requireCallerIsStabilityPool();
        _transfer(_sender, _poolAddress, _amount);
    }
```
</details>

---    

> ### returnFromPool

```solidity
function returnFromPool(address _poolAddress, address _receiver, uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _poolAddress | address |  | 
| _receiver | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function returnFromPool(
        address _poolAddress,
        address _receiver,
        uint256 _amount
    ) external override {
        _requireCallerIsTroveMorSP();
        _transfer(_poolAddress, _receiver, _amount);
    }
```
</details>

---    

> ### totalSupply

```solidity
function totalSupply() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
```
</details>

---    

> ### balanceOf

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
function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }
```
</details>

---    

> ### transfer

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
function transfer(address recipient, uint256 amount) external override returns (bool) {
        _requireValidRecipient(recipient);
        _transfer(msg.sender, recipient, amount);
        return true;
    }
```
</details>

---    

> ### allowance

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
function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }
```
</details>

---    

> ### approve

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
function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
```
</details>

---    

> ### transferFrom

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
function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool) {
        _requireValidRecipient(recipient);
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            msg.sender,
            _allowances[sender][msg.sender].sub(amount, "ERC20: transfer amount exceeds allowance")
        );
        return true;
    }
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
function increaseAllowance(address spender, uint256 addedValue)
        external
        override
        returns (bool)
    {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }
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
function decreaseAllowance(address spender, uint256 subtractedValue)
        external
        override
        returns (bool)
    {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].sub(
                subtractedValue,
                "ERC20: decreased allowance below zero"
            )
        );
        return true;
    }
```
</details>

---    

> ### domainSeparator

```solidity
function domainSeparator() public view
returns(bytes32)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function domainSeparator() public view override returns (bytes32) {
        if (_chainID() == _CACHED_CHAIN_ID) {
            return _CACHED_DOMAIN_SEPARATOR;
        } else {
            return _buildDomainSeparator(_TYPE_HASH, _HASHED_NAME, _HASHED_VERSION);
        }
    }
```
</details>

---    

> ### permit

```solidity
function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner | address |  | 
| spender | address |  | 
| amount | uint256 |  | 
| deadline | uint256 |  | 
| v | uint8 |  | 
| r | bytes32 |  | 
| s | bytes32 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function permit(
        address owner,
        address spender,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        require(deadline >= now, "ZUSD: expired deadline");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator(),
                keccak256(
                    abi.encode(_PERMIT_TYPEHASH, owner, spender, amount, _nonces[owner]++, deadline)
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress == owner, "ZUSD: invalid signature");
        _approve(owner, spender, amount);
    }
```
</details>

---    

> ### nonces

```solidity
function nonces(address owner) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| owner | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function nonces(address owner) external view override returns (uint256) {
        // FOR EIP 2612
        return _nonces[owner];
    }
```
</details>

---    

> ### _chainID

```solidity
function _chainID() private pure
returns(chainID uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _chainID() private pure returns (uint256 chainID) {
        assembly {
            chainID := chainid()
        }
    }
```
</details>

---    

> ### _buildDomainSeparator

```solidity
function _buildDomainSeparator(bytes32 typeHash, bytes32 name, bytes32 version) private view
returns(bytes32)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| typeHash | bytes32 |  | 
| name | bytes32 |  | 
| version | bytes32 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _buildDomainSeparator(
        bytes32 typeHash,
        bytes32 name,
        bytes32 version
    ) private view returns (bytes32) {
        return keccak256(abi.encode(typeHash, name, version, _chainID(), address(this)));
    }
```
</details>

---    

> ### _transfer

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
function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        assert(sender != address(0));
        assert(recipient != address(0));

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
```
</details>

---    

> ### _mint

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
function _mint(address account, uint256 amount) internal {
        assert(account != address(0));

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
```
</details>

---    

> ### _burn

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
function _burn(address account, uint256 amount) internal {
        assert(account != address(0));

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }
```
</details>

---    

> ### _approve

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
function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        assert(owner != address(0));
        assert(spender != address(0));

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
```
</details>

---    

> ### _requireValidRecipient

```solidity
function _requireValidRecipient(address _recipient) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _recipient | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireValidRecipient(address _recipient) internal view {
        require(
            _recipient != address(0) && _recipient != address(this),
            "ZUSD: Cannot transfer tokens directly to the ZUSD token contract or the zero address"
        );
        require(
            _recipient != stabilityPoolAddress &&
                _recipient != troveManagerAddress &&
                _recipient != borrowerOperationsAddress,
            "ZUSD: Cannot transfer tokens directly to the StabilityPool, TroveManager or BorrowerOps"
        );
    }
```
</details>

---    

> ### _requireCallerIsBorrowerOperations

```solidity
function _requireCallerIsBorrowerOperations() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsBorrowerOperations() internal view {
        require(
            msg.sender == borrowerOperationsAddress,
            "ZUSDToken: Caller is not BorrowerOperations"
        );
    }
```
</details>

---    

> ### _requireCallerIsBOorTroveMorSP

```solidity
function _requireCallerIsBOorTroveMorSP() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsBOorTroveMorSP() internal view {
        require(
            msg.sender == borrowerOperationsAddress ||
                msg.sender == troveManagerAddress ||
                msg.sender == stabilityPoolAddress,
            "ZUSD: Caller is neither BorrowerOperations nor TroveManager nor StabilityPool"
        );
    }
```
</details>

---    

> ### _requireCallerIsStabilityPool

```solidity
function _requireCallerIsStabilityPool() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "ZUSD: Caller is not the StabilityPool");
    }
```
</details>

---    

> ### _requireCallerIsTroveMorSP

```solidity
function _requireCallerIsTroveMorSP() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsTroveMorSP() internal view {
        require(
            msg.sender == troveManagerAddress || msg.sender == stabilityPoolAddress,
            "ZUSD: Caller is neither TroveManager nor StabilityPool"
        );
    }
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
function name() external view override returns (string memory) {
        return _NAME;
    }
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
function symbol() external view override returns (string memory) {
        return _SYMBOL;
    }
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
function decimals() external view override returns (uint8) {
        return _DECIMALS;
    }
```
</details>

---    

> ### version

```solidity
function version() external view
returns(string)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function version() external view override returns (string memory) {
        return _VERSION;
    }
```
</details>

---    

> ### permitTypeHash

```solidity
function permitTypeHash() external view
returns(bytes32)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function permitTypeHash() external view override returns (bytes32) {
        return _PERMIT_TYPEHASH;
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
