# MultiTroveGetter.sol

View Source: [contracts/MultiTroveGetter.sol](../contracts/MultiTroveGetter.sol)

**↗ Extends: [MultiTroveGetterStorage](MultiTroveGetterStorage.md)**

**MultiTroveGetter**

## Structs
### CombinedTroveData

```js
struct CombinedTroveData {
 address owner,
 uint256 debt,
 uint256 coll,
 uint256 stake,
 uint256 snapshotETH,
 uint256 snapshotZUSDDebt
}
```

## Functions

- [setAddresses(TroveManager _troveManager, ISortedTroves _sortedTroves)](#setaddresses)
- [getMultipleSortedTroves(int256 _startIdx, uint256 _count)](#getmultiplesortedtroves)
- [_getMultipleSortedTrovesFromHead(uint256 _startIdx, uint256 _count)](#_getmultiplesortedtrovesfromhead)
- [_getMultipleSortedTrovesFromTail(uint256 _startIdx, uint256 _count)](#_getmultiplesortedtrovesfromtail)

---    

> ### setAddresses

```solidity
function setAddresses(TroveManager _troveManager, ISortedTroves _sortedTroves) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | TroveManager |  | 
| _sortedTroves | ISortedTroves |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(TroveManager _troveManager, ISortedTroves _sortedTroves) public onlyOwner {
        troveManager = _troveManager;
        sortedTroves = _sortedTroves;
    }
```
</details>

---    

> ### getMultipleSortedTroves

```solidity
function getMultipleSortedTroves(int256 _startIdx, uint256 _count) external view
returns(_troves struct MultiTroveGetter.CombinedTroveData[])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _startIdx | int256 |  | 
| _count | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getMultipleSortedTroves(int256 _startIdx, uint256 _count)
        external
        view
        returns (CombinedTroveData[] memory _troves)
    {
        uint256 startIdx;
        bool descend;

        if (_startIdx >= 0) {
            startIdx = uint256(_startIdx);
            descend = true;
        } else {
            startIdx = uint256(-(_startIdx + 1));
            descend = false;
        }

        uint256 sortedTrovesSize = sortedTroves.getSize();

        if (startIdx >= sortedTrovesSize) {
            _troves = new CombinedTroveData[](0);
        } else {
            uint256 maxCount = sortedTrovesSize - startIdx;

            if (_count > maxCount) {
                _count = maxCount;
            }

            if (descend) {
                _troves = _getMultipleSortedTrovesFromHead(startIdx, _count);
            } else {
                _troves = _getMultipleSortedTrovesFromTail(startIdx, _count);
            }
        }
    }
```
</details>

---    

> ### _getMultipleSortedTrovesFromHead

```solidity
function _getMultipleSortedTrovesFromHead(uint256 _startIdx, uint256 _count) internal view
returns(_troves struct MultiTroveGetter.CombinedTroveData[])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _startIdx | uint256 |  | 
| _count | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getMultipleSortedTrovesFromHead(uint256 _startIdx, uint256 _count)
        internal
        view
        returns (CombinedTroveData[] memory _troves)
    {
        address currentTroveowner = sortedTroves.getFirst();

        for (uint256 idx = 0; idx < _startIdx; ++idx) {
            currentTroveowner = sortedTroves.getNext(currentTroveowner);
        }

        _troves = new CombinedTroveData[](_count);

        for (uint256 idx = 0; idx < _count; ++idx) {
            _troves[idx].owner = currentTroveowner;
            (
                _troves[idx].debt,
                _troves[idx].coll,
                _troves[idx].stake,
                /* status */
                /* arrayIndex */
                ,

            ) = troveManager.Troves(currentTroveowner);
            (_troves[idx].snapshotETH, _troves[idx].snapshotZUSDDebt) = troveManager.rewardSnapshots(
                currentTroveowner
            );

            currentTroveowner = sortedTroves.getNext(currentTroveowner);
        }
    }
```
</details>

---    

> ### _getMultipleSortedTrovesFromTail

```solidity
function _getMultipleSortedTrovesFromTail(uint256 _startIdx, uint256 _count) internal view
returns(_troves struct MultiTroveGetter.CombinedTroveData[])
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _startIdx | uint256 |  | 
| _count | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getMultipleSortedTrovesFromTail(uint256 _startIdx, uint256 _count)
        internal
        view
        returns (CombinedTroveData[] memory _troves)
    {
        address currentTroveowner = sortedTroves.getLast();

        for (uint256 idx = 0; idx < _startIdx; ++idx) {
            currentTroveowner = sortedTroves.getPrev(currentTroveowner);
        }

        _troves = new CombinedTroveData[](_count);

        for (uint256 idx = 0; idx < _count; ++idx) {
            _troves[idx].owner = currentTroveowner;
            (
                _troves[idx].debt,
                _troves[idx].coll,
                _troves[idx].stake,
                /* status */
                /* arrayIndex */
                ,

            ) = troveManager.Troves(currentTroveowner);
            (_troves[idx].snapshotETH, _troves[idx].snapshotZUSDDebt) = troveManager.rewardSnapshots(
                currentTroveowner
            );

            currentTroveowner = sortedTroves.getPrev(currentTroveowner);
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
