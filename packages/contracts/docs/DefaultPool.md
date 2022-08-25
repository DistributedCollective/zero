# DefaultPool.sol

View Source: [contracts/DefaultPool.sol](../contracts/DefaultPool.sol)

**↗ Extends: [DefaultPoolStorage](DefaultPoolStorage.md), [CheckContract](CheckContract.md), [IDefaultPool](IDefaultPool.md)**

**DefaultPool**

**Events**

```js
event TroveManagerAddressChanged(address  _newTroveManagerAddress);
event DefaultPoolZUSDDebtUpdated(uint256  _ZUSDDebt);
event DefaultPoolETHBalanceUpdated(uint256  _ETH);
```

## Functions

- [setAddresses(address _troveManagerAddress, address _activePoolAddress)](#setaddresses)
- [getETH()](#geteth)
- [getZUSDDebt()](#getzusddebt)
- [sendETHToActivePool(uint256 _amount)](#sendethtoactivepool)
- [increaseZUSDDebt(uint256 _amount)](#increasezusddebt)
- [decreaseZUSDDebt(uint256 _amount)](#decreasezusddebt)
- [_requireCallerIsActivePool()](#_requirecallerisactivepool)
- [_requireCallerIsTroveManager()](#_requirecalleristrovemanager)
- [constructor()](#constructor)

---    

> ### setAddresses

```solidity
function setAddresses(address _troveManagerAddress, address _activePoolAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManagerAddress | address |  | 
| _activePoolAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress
    )
        external
        onlyOwner
    {
        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);

        troveManagerAddress = _troveManagerAddress;
        activePoolAddress = _activePoolAddress;

        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);

    }
```
</details>

---    

> ### getETH

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

> ### sendETHToActivePool

```solidity
function sendETHToActivePool(uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function sendETHToActivePool(uint _amount) external override {
        _requireCallerIsTroveManager();
        address activePool = activePoolAddress; // cache to save an SLOAD
        ETH = ETH.sub(_amount);
        emit DefaultPoolETHBalanceUpdated(ETH);
        emit EtherSent(activePool, _amount);

        (bool success, ) = activePool.call{ value: _amount }("");
        require(success, "DefaultPool: sending ETH failed");
    }
```
</details>

---    

> ### increaseZUSDDebt

```solidity
function increaseZUSDDebt(uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function increaseZUSDDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        ZUSDDebt = ZUSDDebt.add(_amount);
        emit DefaultPoolZUSDDebtUpdated(ZUSDDebt);
    }
```
</details>

---    

> ### decreaseZUSDDebt

```solidity
function decreaseZUSDDebt(uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function decreaseZUSDDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        ZUSDDebt = ZUSDDebt.sub(_amount);
        emit DefaultPoolZUSDDebtUpdated(ZUSDDebt);
    }
```
</details>

---    

> ### _requireCallerIsActivePool

```solidity
function _requireCallerIsActivePool() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "DefaultPool: Caller is not the ActivePool");
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
function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "DefaultPool: Caller is not the TroveManager");
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
        _requireCallerIsActivePool();
        ETH = ETH.add(msg.value);
        emit DefaultPoolETHBalanceUpdated(ETH);
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
