# FeeDistributor.sol

View Source: [contracts/FeeDistributor.sol](../contracts/FeeDistributor.sol)

**↗ Extends: [CheckContract](CheckContract.md), [FeeDistributorStorage](FeeDistributorStorage.md), [IFeeDistributor](IFeeDistributor.md)**

**FeeDistributor**

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
- [setFeeToSOVCollector(uint256 FEE_TO_SOV_COLLECTOR_)](#setfeetosovcollector)
- [distributeFees()](#distributefees)
- [_distributeZUSD(uint256 toDistribute)](#_distributezusd)
- [_distributeRBTC(uint256 toDistribute)](#_distributerbtc)
- [_requireCallerIsActivePool()](#_requirecallerisactivepool)
- [constructor()](#constructor)

---    

> ### setAddresses

```solidity
function setAddresses(address _sovFeeCollectorAddress, address _zeroStakingAddress, address _borrowerOperationsAddress, address _troveManagerAddress, address _wrbtcAddress, address _zusdTokenAddress, address _activePoolAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _sovFeeCollectorAddress | address |  | 
| _zeroStakingAddress | address |  | 
| _borrowerOperationsAddress | address |  | 
| _troveManagerAddress | address |  | 
| _wrbtcAddress | address |  | 
| _zusdTokenAddress | address |  | 
| _activePoolAddress | address |  | 

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
    ) external override onlyOwner {
        checkContract(_sovFeeCollectorAddress);
        checkContract(_zeroStakingAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_wrbtcAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_activePoolAddress);

        sovFeeCollector = IFeeSharingProxy(_sovFeeCollectorAddress);
        zeroStaking = IZEROStaking(_zeroStakingAddress);
        borrowerOperations = IBorrowerOperations(_borrowerOperationsAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        wrbtc = IWrbtc(_wrbtcAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        activePoolAddress = _activePoolAddress;

        // Not entirely removing this as per request from @light
        FEE_TO_SOV_COLLECTOR = LiquityMath.DECIMAL_PRECISION; // 100%

        emit SOVFeeCollectorAddressChanged(_sovFeeCollectorAddress);
        emit ZeroStakingAddressChanged(_zeroStakingAddress);
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit WrbtcAddressChanged(_wrbtcAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit ActivePoolAddressSet(_activePoolAddress);
    }
```
</details>

---    

> ### setFeeToSOVCollector

```solidity
function setFeeToSOVCollector(uint256 FEE_TO_SOV_COLLECTOR_) public nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| FEE_TO_SOV_COLLECTOR_ | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setFeeToSOVCollector(uint256 FEE_TO_SOV_COLLECTOR_) public onlyOwner {
        FEE_TO_SOV_COLLECTOR = FEE_TO_SOV_COLLECTOR_;
    }
```
</details>

---    

> ### distributeFees

```solidity
function distributeFees() public nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function distributeFees() public override {
        require(
            msg.sender == address(borrowerOperations) || msg.sender == address(troveManager),
            "FeeDistributor: invalid caller"
        );
        uint256 zusdtoDistribute = zusdToken.balanceOf(address(this));
        uint256 rbtcToDistribute = address(this).balance;
        if (zusdtoDistribute != 0) {
            _distributeZUSD(zusdtoDistribute);
        }
        if (rbtcToDistribute != 0) {
            _distributeRBTC(rbtcToDistribute);
        }
    }
```
</details>

---    

> ### _distributeZUSD

```solidity
function _distributeZUSD(uint256 toDistribute) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| toDistribute | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _distributeZUSD(uint256 toDistribute) internal {
        // Send fee to the SOVFeeCollector address
        uint256 feeToSovCollector = toDistribute.mul(FEE_TO_SOV_COLLECTOR).div(
            LiquityMath.DECIMAL_PRECISION
        );
        zusdToken.approve(address(sovFeeCollector), feeToSovCollector);
        sovFeeCollector.transferTokens(address(zusdToken), uint96(feeToSovCollector));

        // Send fee to ZERO staking contract
        uint256 feeToZeroStaking = toDistribute.sub(feeToSovCollector);
        if (feeToZeroStaking != 0) {
            require(
                zusdToken.transfer(address(zeroStaking), feeToZeroStaking),
                "Coudn't execute ZUSD transfer"
            );
            zeroStaking.increaseF_ZUSD(feeToZeroStaking);
        }
        emit ZUSDDistributed(toDistribute);
    }
```
</details>

---    

> ### _distributeRBTC

```solidity
function _distributeRBTC(uint256 toDistribute) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| toDistribute | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _distributeRBTC(uint256 toDistribute) internal {
        // Send fee to the SOVFeeCollector address
        uint256 feeToSovCollector = toDistribute.mul(FEE_TO_SOV_COLLECTOR).div(
            LiquityMath.DECIMAL_PRECISION
        );
        wrbtc.deposit{value: feeToSovCollector}();
        wrbtc.approve(address(sovFeeCollector), feeToSovCollector);
        sovFeeCollector.transferTokens(address(wrbtc), uint96(feeToSovCollector));

        // Send the ETH fee to the ZERO staking contract
        uint256 feeToZeroStaking = toDistribute.sub(feeToSovCollector);
        if (feeToZeroStaking != 0) {
            (bool success, ) = address(zeroStaking).call{value: feeToZeroStaking}("");
            require(success, "FeeDistributor: sending ETH failed");
            zeroStaking.increaseF_ETH(feeToZeroStaking);
        }
        emit RBTCistributed(toDistribute);
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
        require(msg.sender == activePoolAddress, "FeeDistributor: caller is not ActivePool");
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
