# The system price feed adapter (PriceFeed.sol)

View Source: [contracts/PriceFeed.sol](../contracts/PriceFeed.sol)

**↗ Extends: [PriceFeedStorage](PriceFeedStorage.md), [IPriceFeed](IPriceFeed.md)**

**PriceFeed**

The PriceFeed relies upon a main oracle and a secondary as a fallback in case of error

**Events**

```js
event LastGoodPriceUpdated(uint256  _lastGoodPrice);
event PriceFeedBroken(uint8  index, address  priceFeedAddress);
event PriceFeedUpdated(uint8  index, address  newPriceFeedAddress);
```

## Functions

- [setAddresses(address _mainPriceFeed, address _backupPriceFeed)](#setaddresses)
- [fetchPrice()](#fetchprice)
- [setAddress(uint8 _index, address _newPriceFeed)](#setaddress)
- [_storePrice(uint256 _currentPrice)](#_storeprice)

---    

> ### setAddresses

```solidity
function setAddresses(address _mainPriceFeed, address _backupPriceFeed) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _mainPriceFeed | address |  | 
| _backupPriceFeed | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(address _mainPriceFeed, address _backupPriceFeed) external onlyOwner {
        uint256 latestPrice = setAddress(0, _mainPriceFeed);
        setAddress(1, _backupPriceFeed);

        _storePrice(latestPrice);
    }
```
</details>

---    

> ### fetchPrice

Returns the latest price obtained from the Oracle. Called by Zero functions that require a current price.
         It uses the main price feed and fallback to the backup one in case of an error. If both fail return the last
         good price seen.

```solidity
function fetchPrice() external nonpayable
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function fetchPrice() external override returns (uint256) {
        for (uint8 index = 0; index < 2; index++) {
            (uint256 price, bool success) = priceFeeds[index].latestAnswer();
            if (success) {
                _storePrice(price);
                return price;
            } else {
                emit PriceFeedBroken(index, address(priceFeeds[index]));
            }
        }
        return lastGoodPrice;
    }
```
</details>

---    

> ### setAddress

Allows users to setup the main and the backup price feeds

```solidity
function setAddress(uint8 _index, address _newPriceFeed) public nonpayable onlyOwner 
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _index | uint8 | the oracle to be configured | 
| _newPriceFeed | address | address where an IExternalPriceFeed implementation is located | 

**Returns**

price the latest price of the inserted price feed

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddress(uint8 _index, address _newPriceFeed) public onlyOwner returns (uint256) {
        require(_index < priceFeeds.length, "Out of bounds when setting the price feed");
        checkContract(_newPriceFeed);
        priceFeeds[_index] = IExternalPriceFeed(_newPriceFeed);
        (uint256 price, bool success) = priceFeeds[_index].latestAnswer();
        require(success, "PriceFeed: Price feed must be working");
        emit PriceFeedUpdated(_index, _newPriceFeed);
        return price;
    }
```
</details>

---    

> ### _storePrice

```solidity
function _storePrice(uint256 _currentPrice) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _currentPrice | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _storePrice(uint256 _currentPrice) internal {
        lastGoodPrice = _currentPrice;
        emit LastGoodPriceUpdated(_currentPrice);
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
