# BorrowerWrappersScript.sol

View Source: [contracts/Proxy/BorrowerWrappersScript.sol](../contracts/Proxy/BorrowerWrappersScript.sol)

**↗ Extends: [BorrowerOperationsScript](BorrowerOperationsScript.md), [ETHTransferScript](ETHTransferScript.md), [ZEROStakingScript](ZEROStakingScript.md)**

**BorrowerWrappersScript**

## Contract Members
**Constants & Variables**

```js
//public members
string public constant NAME;

//internal members
contract ITroveManager internal troveManager;
contract IStabilityPool internal stabilityPool;
contract IPriceFeed internal priceFeed;
contract IERC20 internal zusdToken;
contract IERC20 internal zeroToken;
contract IZEROStaking internal zeroStaking;

```

## Functions

- [constructor(address _borrowerOperationsAddress, address _troveManagerAddress, address _zeroStakingAddress, address _stabilityPoolAddress, address _priceFeedAddress, address _zusdTokenAddress, address _zeroTokenAddress)](#constructor)
- [claimCollateralAndOpenTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#claimcollateralandopentrove)
- [claimSPRewardsAndRecycle(uint256 _maxFee, address _upperHint, address _lowerHint)](#claimsprewardsandrecycle)
- [claimStakingGainsAndRecycle(uint256 _maxFee, address _upperHint, address _lowerHint)](#claimstakinggainsandrecycle)
- [_getNetZUSDAmount(uint256 _collateral)](#_getnetzusdamount)
- [_requireUserHasTrove(address _depositor)](#_requireuserhastrove)

---    

> ### constructor

```solidity
function (address _borrowerOperationsAddress, address _troveManagerAddress, address _zeroStakingAddress, address _stabilityPoolAddress, address _priceFeedAddress, address _zusdTokenAddress, address _zeroTokenAddress) public nonpayable BorrowerOperationsScript ZEROStakingScript 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrowerOperationsAddress | address |  | 
| _troveManagerAddress | address |  | 
| _zeroStakingAddress | address |  | 
| _stabilityPoolAddress | address |  | 
| _priceFeedAddress | address |  | 
| _zusdTokenAddress | address |  | 
| _zeroTokenAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
constructor(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _zeroStakingAddress,
        address _stabilityPoolAddress,
        address _priceFeedAddress,
        address _zusdTokenAddress,
        address _zeroTokenAddress
    )
        BorrowerOperationsScript(IBorrowerOperations(_borrowerOperationsAddress))
        ZEROStakingScript(_zeroStakingAddress)
        public
    {
        checkContract(_troveManagerAddress);
        ITroveManager troveManagerCached = ITroveManager(_troveManagerAddress);
        troveManager = troveManagerCached;

        IStabilityPool stabilityPoolCached = IStabilityPool(_stabilityPoolAddress);
        checkContract(_stabilityPoolAddress);
        stabilityPool = stabilityPoolCached;

        IPriceFeed priceFeedCached = IPriceFeed(_priceFeedAddress); 
        checkContract(_priceFeedAddress);
        priceFeed = priceFeedCached;

        checkContract(_zusdTokenAddress);
        zusdToken = IERC20(_zusdTokenAddress);

        checkContract(_zeroTokenAddress);
        zeroToken = IERC20(_zeroTokenAddress);

        IZEROStaking zeroStakingCached = IZEROStaking(_zeroStakingAddress);
        checkContract(_zeroStakingAddress);
        zeroStaking = zeroStakingCached;
    }
```
</details>

---    

> ### claimCollateralAndOpenTrove

```solidity
function claimCollateralAndOpenTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 |  | 
| _ZUSDAmount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function claimCollateralAndOpenTrove(uint _maxFee, uint _ZUSDAmount, address _upperHint, address _lowerHint) external payable {
        uint balanceBefore = address(this).balance;

        // Claim collateral
        borrowerOperations.claimCollateral();

        uint balanceAfter = address(this).balance;

        // already checked in CollSurplusPool
        assert(balanceAfter > balanceBefore);

        uint totalCollateral = balanceAfter.sub(balanceBefore).add(msg.value);

        // Open trove with obtained collateral, plus collateral sent by user
        borrowerOperations.openTrove{ value: totalCollateral }(_maxFee, _ZUSDAmount, _upperHint, _lowerHint);
    }
```
</details>

---    

> ### claimSPRewardsAndRecycle

```solidity
function claimSPRewardsAndRecycle(uint256 _maxFee, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function claimSPRewardsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = address(this).balance;
        uint zeroBalanceBefore = zeroToken.balanceOf(address(this));

        // Claim rewards
        stabilityPool.withdrawFromSP(0);

        uint collBalanceAfter = address(this).balance;
        uint zeroBalanceAfter = zeroToken.balanceOf(address(this));
        uint claimedCollateral = collBalanceAfter.sub(collBalanceBefore);

        // Add claimed ETH to trove, get more ZUSD and stake it into the Stability Pool
        if (claimedCollateral > 0) {
            _requireUserHasTrove(address(this));
            uint ZUSDAmount = _getNetZUSDAmount(claimedCollateral);
            borrowerOperations.adjustTrove{ value: claimedCollateral }(_maxFee, 0, ZUSDAmount, true, _upperHint, _lowerHint);
            // Provide withdrawn ZUSD to Stability Pool
            if (ZUSDAmount > 0) {
                stabilityPool.provideToSP(ZUSDAmount, address(0));
            }
        }

        // Stake claimed ZERO
        uint claimedZERO = zeroBalanceAfter.sub(zeroBalanceBefore);
        if (claimedZERO > 0) {
            zeroStaking.stake(claimedZERO);
        }
    }
```
</details>

---    

> ### claimStakingGainsAndRecycle

```solidity
function claimStakingGainsAndRecycle(uint256 _maxFee, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFee | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function claimStakingGainsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = address(this).balance;
        uint zusdBalanceBefore = zusdToken.balanceOf(address(this));
        uint zeroBalanceBefore = zeroToken.balanceOf(address(this));

        // Claim gains
        zeroStaking.unstake(0);

        uint gainedCollateral = address(this).balance.sub(collBalanceBefore); // stack too deep issues :'(
        uint gainedZUSD = zusdToken.balanceOf(address(this)).sub(zusdBalanceBefore);

        uint netZUSDAmount;
        // Top up trove and get more ZUSD, keeping ICR constant
        if (gainedCollateral > 0) {
            _requireUserHasTrove(address(this));
            netZUSDAmount = _getNetZUSDAmount(gainedCollateral);
            borrowerOperations.adjustTrove{ value: gainedCollateral }(_maxFee, 0, netZUSDAmount, true, _upperHint, _lowerHint);
        }

        uint totalZUSD = gainedZUSD.add(netZUSDAmount);
        if (totalZUSD > 0) {
            stabilityPool.provideToSP(totalZUSD, address(0));

            // Providing to Stability Pool also triggers ZERO claim, so stake it if any
            uint zeroBalanceAfter = zeroToken.balanceOf(address(this));
            uint claimedZERO = zeroBalanceAfter.sub(zeroBalanceBefore);
            if (claimedZERO > 0) {
                zeroStaking.stake(claimedZERO);
            }
        }

    }
```
</details>

---    

> ### _getNetZUSDAmount

```solidity
function _getNetZUSDAmount(uint256 _collateral) internal nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collateral | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getNetZUSDAmount(uint _collateral) internal returns (uint) {
        uint price = priceFeed.fetchPrice();
        uint ICR = troveManager.getCurrentICR(address(this), price);

        uint ZUSDAmount = _collateral.mul(price).div(ICR);
        uint borrowingRate = troveManager.getBorrowingRateWithDecay();
        uint netDebt = ZUSDAmount.mul(LiquityMath.DECIMAL_PRECISION).div(LiquityMath.DECIMAL_PRECISION.add(borrowingRate));

        return netDebt;
    }
```
</details>

---    

> ### _requireUserHasTrove

```solidity
function _requireUserHasTrove(address _depositor) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireUserHasTrove(address _depositor) internal view {
        require(troveManager.getTroveStatus(_depositor) == 1, "BorrowerWrappersScript: caller must have an active trove");
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
