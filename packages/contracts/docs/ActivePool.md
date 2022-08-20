# Active Pool (ActivePool.sol)

View Source: [contracts/ActivePool.sol](../contracts/ActivePool.sol)

**↗ Extends: [CheckContract](CheckContract.md), [IActivePool](IActivePool.md), [ActivePoolStorage](ActivePoolStorage.md)**

**ActivePool**

The Active Pool holds the ETH collateral and ZUSD debt (but not ZUSD tokens) for all active troves.

 When a trove is liquidated, it's ETH and ZUSD debt are transferred from the Active Pool, to either the
 Stability Pool, the Default Pool, or both, depending on the liquidation conditions.

**Events**

```js
event BorrowerOperationsAddressChanged(address  _newBorrowerOperationsAddress);
event TroveManagerAddressChanged(address  _newTroveManagerAddress);
event ActivePoolZUSDDebtUpdated(uint256  _ZUSDDebt);
event ActivePoolETHBalanceUpdated(uint256  _ETH);
```

## Functions

- [setAddresses(address _borrowerOperationsAddress, address _troveManagerAddress, address _stabilityPoolAddress, address _defaultPoolAddress)](#setaddresses)
- [getETH()](#geteth)
- [getZUSDDebt()](#getzusddebt)
- [sendETH(address _account, uint256 _amount)](#sendeth)
- [increaseZUSDDebt(uint256 _amount)](#increasezusddebt)
- [decreaseZUSDDebt(uint256 _amount)](#decreasezusddebt)
- [_requireCallerIsBorrowerOperationsOrDefaultPool()](#_requirecallerisborroweroperationsordefaultpool)
- [_requireCallerIsBOorTroveMorSP()](#_requirecallerisboortrovemorsp)
- [_requireCallerIsBOorTroveM()](#_requirecallerisboortrovem)
- [constructor()](#constructor)

---    

> ### setAddresses

initializer function that sets required addresses

```solidity
function setAddresses(address _borrowerOperationsAddress, address _troveManagerAddress, address _stabilityPoolAddress, address _defaultPoolAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrowerOperationsAddress | address | BorrowerOperations contract address | 
| _troveManagerAddress | address | TroveManager contract address | 
| _stabilityPoolAddress | address | StabilityPool contract address | 
| _defaultPoolAddress | address | DefaultPool contract address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _defaultPoolAddress
    ) external onlyOwner {
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_defaultPoolAddress);

        borrowerOperationsAddress = _borrowerOperationsAddress;
        troveManagerAddress = _troveManagerAddress;
        stabilityPoolAddress = _stabilityPoolAddress;
        defaultPoolAddress = _defaultPoolAddress;

        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);

    }
```
</details>

---    

> ### getETH

Not necessarily equal to the the contract's raw ETH balance - ether can be forcibly sent to contracts.

```solidity
function getETH() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getETH() external view override returns (uint) {
        return ETH;
    }
```
</details>

---    

> ### getZUSDDebt

```solidity
function getZUSDDebt() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getZUSDDebt() external view override returns (uint) {
        return ZUSDDebt;
    }
```
</details>

---    

> ### sendETH

Send ETH amount to given account. Updates ActivePool balance. Only callable by BorrowerOperations, TroveManager or StabilityPool.

```solidity
function sendETH(address _account, uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _account | address | account to receive the ETH amount | 
| _amount | uint256 | ETH amount to send | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function sendETH(address _account, uint _amount) external override {
        _requireCallerIsBOorTroveMorSP();
        ETH = ETH.sub(_amount);
        emit ActivePoolETHBalanceUpdated(ETH);
        emit EtherSent(_account, _amount);

        (bool success, ) = _account.call{value: _amount}("");
        require(success, "ActivePool: sending ETH failed");
    }
```
</details>

---    

> ### increaseZUSDDebt

Increases ZUSD debt of the active pool. Only callable by BorrowerOperations, TroveManager or StabilityPool.

```solidity
function increaseZUSDDebt(uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 | ZUSD amount to add to the pool debt | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function increaseZUSDDebt(uint _amount) external override {
        _requireCallerIsBOorTroveM();
        ZUSDDebt = ZUSDDebt.add(_amount);
        ActivePoolZUSDDebtUpdated(ZUSDDebt);
    }
```
</details>

---    

> ### decreaseZUSDDebt

Decreases ZUSD debt of the active pool. Only callable by BorrowerOperations, TroveManager or StabilityPool.

```solidity
function decreaseZUSDDebt(uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 | ZUSD amount to sub to the pool debt | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decreaseZUSDDebt(uint _amount) external override {
        _requireCallerIsBOorTroveMorSP();
        ZUSDDebt = ZUSDDebt.sub(_amount);
        ActivePoolZUSDDebtUpdated(ZUSDDebt);
    }
```
</details>

---    

> ### _requireCallerIsBorrowerOperationsOrDefaultPool

```solidity
function _requireCallerIsBorrowerOperationsOrDefaultPool() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsBorrowerOperationsOrDefaultPool() internal view {
        require(
            msg.sender == borrowerOperationsAddress || msg.sender == defaultPoolAddress,
            "ActivePool: Caller is neither BO nor Default Pool"
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
            "ActivePool: Caller is neither BorrowerOperations nor TroveManager nor StabilityPool"
        );
    }
```
</details>

---    

> ### _requireCallerIsBOorTroveM

```solidity
function _requireCallerIsBOorTroveM() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsBOorTroveM() internal view {
        require(
            msg.sender == borrowerOperationsAddress || msg.sender == troveManagerAddress,
            "ActivePool: Caller is neither BorrowerOperations nor TroveManager"
        );
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
        _requireCallerIsBorrowerOperationsOrDefaultPool();
        ETH = ETH.add(msg.value);
        emit ActivePoolETHBalanceUpdated(ETH);
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
