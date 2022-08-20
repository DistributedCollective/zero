# IFeeDistributor.sol

View Source: [contracts/Interfaces/IFeeDistributor.sol](../contracts/Interfaces/IFeeDistributor.sol)

**↘ Derived Contracts: [FeeDistributor](FeeDistributor.md)**

**IFeeDistributor**

**Events**

```js
event SOVFeeCollectorAddressChanged(address  _sovFeeCollectorAddress);
event ZeroStakingAddressChanged(address  _zeroStakingAddress);
event BorrowerOperationsAddressChanged(address  _borrowerOperationsAddress);
event TroveManagerAddressChanged(address  _troveManagerAddress);
event WrbtcAddressChanged(address  _wrbtcAddress);
event ZUSDTokenAddressChanged(address  _zusdTokenAddress);
event ActivePoolAddressSet(address  _activePoolAddress);
event ZUSDDistributed(uint256  _zusdDistributedAmount);
event RBTCistributed(uint256  _rbtcDistributedAmount);
```

## Functions

- [setAddresses(address _sovFeeCollectorAddress, address _zeroStakingAddress, address _borrowerOperationsAddress, address _troveManagerAddress, address _wrbtcAddress, address _zusdTokenAddress, address _activePoolAddress)](#setaddresses)
- [distributeFees()](#distributefees)

---    

> ### setAddresses

Called only once on init, to set addresses of other Zero contracts. Callable only by owner

```solidity
function setAddresses(address _sovFeeCollectorAddress, address _zeroStakingAddress, address _borrowerOperationsAddress, address _troveManagerAddress, address _wrbtcAddress, address _zusdTokenAddress, address _activePoolAddress) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _sovFeeCollectorAddress | address | SOVFeeCollector address | 
| _zeroStakingAddress | address | ZEROStaking contract address | 
| _borrowerOperationsAddress | address | borrowerOperations contract address | 
| _troveManagerAddress | address | TroveManager contract address | 
| _wrbtcAddress | address | wrbtc ERC20 contract address | 
| _zusdTokenAddress | address | ZUSDToken contract address | 
| _activePoolAddress | address | ActivePool contract address | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _sovFeeCollectorAddress,
        address _zeroStakingAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _wrbtcAddress,
        address _zusdTokenAddress,
        address _activePoolAddress
    ) external;
```
</details>

---    

> ### distributeFees

```solidity
function distributeFees() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function distributeFees() external;
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
