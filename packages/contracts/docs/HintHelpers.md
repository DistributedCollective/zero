# HintHelpers.sol

View Source: [contracts/HintHelpers.sol](../contracts/HintHelpers.sol)

**↗ Extends: [LiquityBase](LiquityBase.md), [HintHelpersStorage](HintHelpersStorage.md), [CheckContract](CheckContract.md)**

**HintHelpers**

**Events**

```js
event SortedTrovesAddressChanged(address  _sortedTrovesAddress);
event TroveManagerAddressChanged(address  _troveManagerAddress);
```

## Functions

- [setAddresses(address _liquityBaseParamsAddress, address _sortedTrovesAddress, address _troveManagerAddress)](#setaddresses)
- [getRedemptionHints(uint256 _ZUSDamount, uint256 _price, uint256 _maxIterations)](#getredemptionhints)
- [getApproxHint(uint256 _CR, uint256 _numTrials, uint256 _inputRandomSeed)](#getapproxhint)
- [computeNominalCR(uint256 _coll, uint256 _debt)](#computenominalcr)
- [computeCR(uint256 _coll, uint256 _debt, uint256 _price)](#computecr)

---    

> ### setAddresses

```solidity
function setAddresses(address _liquityBaseParamsAddress, address _sortedTrovesAddress, address _troveManagerAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _liquityBaseParamsAddress | address |  | 
| _sortedTrovesAddress | address |  | 
| _troveManagerAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _liquityBaseParamsAddress,
        address _sortedTrovesAddress,
        address _troveManagerAddress
    )
        external
        onlyOwner
    {
        checkContract(_liquityBaseParamsAddress);
        checkContract(_sortedTrovesAddress);
        checkContract(_troveManagerAddress);

        liquityBaseParams = ILiquityBaseParams(_liquityBaseParamsAddress);
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        troveManager = ITroveManager(_troveManagerAddress);

        emit SortedTrovesAddressChanged(_sortedTrovesAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);

    }
```
</details>

---    

> ### getRedemptionHints

```solidity
function getRedemptionHints(uint256 _ZUSDamount, uint256 _price, uint256 _maxIterations) external view
returns(firstRedemptionHint address, partialRedemptionHintNICR uint256, truncatedZUSDamount uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDamount | uint256 |  | 
| _price | uint256 |  | 
| _maxIterations | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getRedemptionHints(
        uint _ZUSDamount, 
        uint _price,
        uint _maxIterations
    )
        external
        view
        returns (
            address firstRedemptionHint,
            uint partialRedemptionHintNICR,
            uint truncatedZUSDamount
        )
    {
        ISortedTroves sortedTrovesCached = sortedTroves;

        uint remainingZUSD = _ZUSDamount;
        address currentTroveuser = sortedTrovesCached.getLast();

        while (currentTroveuser != address(0) && troveManager.getCurrentICR(currentTroveuser, _price) < liquityBaseParams.MCR()) {
            currentTroveuser = sortedTrovesCached.getPrev(currentTroveuser);
        }

        firstRedemptionHint = currentTroveuser;

        if (_maxIterations == 0) {
            _maxIterations = uint(-1);
        }

        while (currentTroveuser != address(0) && remainingZUSD > 0 && _maxIterations-- > 0) {
            uint netZUSDDebt = _getNetDebt(troveManager.getTroveDebt(currentTroveuser))
                .add(troveManager.getPendingZUSDDebtReward(currentTroveuser));

            if (netZUSDDebt > remainingZUSD) {
                if (netZUSDDebt > MIN_NET_DEBT) {
                    uint maxRedeemableZUSD = LiquityMath._min(remainingZUSD, netZUSDDebt.sub(MIN_NET_DEBT));

                    uint ETH = troveManager.getTroveColl(currentTroveuser)
                        .add(troveManager.getPendingETHReward(currentTroveuser));

                    uint newColl = ETH.sub(maxRedeemableZUSD.mul(DECIMAL_PRECISION).div(_price));
                    uint newDebt = netZUSDDebt.sub(maxRedeemableZUSD);

                    uint compositeDebt = _getCompositeDebt(newDebt);
                    partialRedemptionHintNICR = LiquityMath._computeNominalCR(newColl, compositeDebt);

                    remainingZUSD = remainingZUSD.sub(maxRedeemableZUSD);
                }
                break;
            } else {
                remainingZUSD = remainingZUSD.sub(netZUSDDebt);
            }

            currentTroveuser = sortedTrovesCached.getPrev(currentTroveuser);
        }

        truncatedZUSDamount = _ZUSDamount.sub(remainingZUSD);
    }
```
</details>

---    

> ### getApproxHint

```solidity
function getApproxHint(uint256 _CR, uint256 _numTrials, uint256 _inputRandomSeed) external view
returns(hintAddress address, diff uint256, latestRandomSeed uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _CR | uint256 |  | 
| _numTrials | uint256 |  | 
| _inputRandomSeed | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getApproxHint(uint _CR, uint _numTrials, uint _inputRandomSeed)
        external
        view
        returns (address hintAddress, uint diff, uint latestRandomSeed)
    {
        uint arrayLength = troveManager.getTroveOwnersCount();

        if (arrayLength == 0) {
            return (address(0), 0, _inputRandomSeed);
        }

        hintAddress = sortedTroves.getLast();
        diff = LiquityMath._getAbsoluteDifference(_CR, troveManager.getNominalICR(hintAddress));
        latestRandomSeed = _inputRandomSeed;

        uint i = 1;

        while (i < _numTrials) {
            latestRandomSeed = uint(keccak256(abi.encodePacked(latestRandomSeed)));

            uint arrayIndex = latestRandomSeed % arrayLength;
            address currentAddress = troveManager.getTroveFromTroveOwnersArray(arrayIndex);
            uint currentNICR = troveManager.getNominalICR(currentAddress);

            // check if abs(current - CR) > abs(closest - CR), and update closest if current is closer
            uint currentDiff = LiquityMath._getAbsoluteDifference(currentNICR, _CR);

            if (currentDiff < diff) {
                diff = currentDiff;
                hintAddress = currentAddress;
            }
            i++;
        }
    }
```
</details>

---    

> ### computeNominalCR

```solidity
function computeNominalCR(uint256 _coll, uint256 _debt) external pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _coll | uint256 |  | 
| _debt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function computeNominalCR(uint _coll, uint _debt) external pure returns (uint) {
        return LiquityMath._computeNominalCR(_coll, _debt);
    }
```
</details>

---    

> ### computeCR

```solidity
function computeCR(uint256 _coll, uint256 _debt, uint256 _price) external pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _coll | uint256 |  | 
| _debt | uint256 |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function computeCR(uint _coll, uint _debt, uint _price) external pure returns (uint) {
        return LiquityMath._computeCR(_coll, _debt, _price);
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
