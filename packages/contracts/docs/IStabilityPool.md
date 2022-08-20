# IStabilityPool.sol

View Source: [contracts/Interfaces/IStabilityPool.sol](../contracts/Interfaces/IStabilityPool.sol)

**↘ Derived Contracts: [StabilityPool](StabilityPool.md)**

**IStabilityPool**

**Events**

```js
event StabilityPoolETHBalanceUpdated(uint256  _newBalance);
event StabilityPoolZUSDBalanceUpdated(uint256  _newBalance);
event BorrowerOperationsAddressChanged(address  _newBorrowerOperationsAddress);
event TroveManagerAddressChanged(address  _newTroveManagerAddress);
event ActivePoolAddressChanged(address  _newActivePoolAddress);
event DefaultPoolAddressChanged(address  _newDefaultPoolAddress);
event ZUSDTokenAddressChanged(address  _newZUSDTokenAddress);
event SortedTrovesAddressChanged(address  _newSortedTrovesAddress);
event PriceFeedAddressChanged(address  _newPriceFeedAddress);
event CommunityIssuanceAddressChanged(address  _newCommunityIssuanceAddress);
event P_Updated(uint256  _P);
event S_Updated(uint256  _S, uint128  _epoch, uint128  _scale);
event G_Updated(uint256  _G, uint128  _epoch, uint128  _scale);
event EpochUpdated(uint128  _currentEpoch);
event ScaleUpdated(uint128  _currentScale);
event FrontEndRegistered(address indexed _frontEnd, uint256  _kickbackRate);
event FrontEndTagSet(address indexed _depositor, address indexed _frontEnd);
event DepositSnapshotUpdated(address indexed _depositor, uint256  _P, uint256  _S, uint256  _G);
event FrontEndSnapshotUpdated(address indexed _frontEnd, uint256  _P, uint256  _G);
event UserDepositChanged(address indexed _depositor, uint256  _newDeposit);
event FrontEndStakeChanged(address indexed _frontEnd, uint256  _newFrontEndStake, address  _depositor);
event ETHGainWithdrawn(address indexed _depositor, uint256  _ETH, uint256  _ZUSDLoss);
event ZEROPaidToDepositor(address indexed _depositor, uint256  _ZERO);
event ZEROPaidToFrontEnd(address indexed _frontEnd, uint256  _ZERO);
event EtherSent(address  _to, uint256  _amount);
```

## Functions

- [setAddresses(address _liquityBaseParamsAddress, address _borrowerOperationsAddress, address _troveManagerAddress, address _activePoolAddress, address _zusdTokenAddress, address _sortedTrovesAddress, address _priceFeedAddress, address _communityIssuanceAddress)](#setaddresses)
- [provideToSP(uint256 _amount, address _frontEndTag)](#providetosp)
- [withdrawFromSP(uint256 _amount)](#withdrawfromsp)
- [withdrawETHGainToTrove(address _upperHint, address _lowerHint)](#withdrawethgaintotrove)
- [registerFrontEnd(uint256 _kickbackRate)](#registerfrontend)
- [offset(uint256 _debt, uint256 _coll)](#offset)
- [getETH()](#geteth)
- [getTotalZUSDDeposits()](#gettotalzusddeposits)
- [getDepositorETHGain(address _depositor)](#getdepositorethgain)
- [getDepositorZEROGain(address _depositor)](#getdepositorzerogain)
- [getFrontEndZEROGain(address _frontEnd)](#getfrontendzerogain)
- [getCompoundedZUSDDeposit(address _depositor)](#getcompoundedzusddeposit)
- [getCompoundedFrontEndStake(address _frontEnd)](#getcompoundedfrontendstake)

---    

> ### setAddresses

Called only once on init, to set addresses of other Liquity contracts. Callable only by owner

```solidity
function setAddresses(address _liquityBaseParamsAddress, address _borrowerOperationsAddress, address _troveManagerAddress, address _activePoolAddress, address _zusdTokenAddress, address _sortedTrovesAddress, address _priceFeedAddress, address _communityIssuanceAddress) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _liquityBaseParamsAddress | address | LiquidityBaseParams contract address | 
| _borrowerOperationsAddress | address | BorrowerOperations contract address | 
| _troveManagerAddress | address | TroveManager contract address | 
| _activePoolAddress | address | ActivePool contract address | 
| _zusdTokenAddress | address | ZUSDToken contract address | 
| _sortedTrovesAddress | address | SortedTroves contract address | 
| _priceFeedAddress | address | PriceFeed contract address | 
| _communityIssuanceAddress | address | CommunityIssuanceAddress | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _liquityBaseParamsAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _zusdTokenAddress,
        address _sortedTrovesAddress,
        address _priceFeedAddress,
        address _communityIssuanceAddress
    ) external;
```
</details>

---    

> ### provideToSP

Initial checks:
  - Frontend is registered or zero address
  - Sender is not a registered frontend
  - _amount is not zero
  ---
  - Triggers a ZERO issuance, based on time passed since the last issuance. The ZERO issuance is shared between *all* depositors and front ends
  - Tags the deposit with the provided front end tag param, if it's a new deposit
  - Sends depositor's accumulated gains (ZERO, ETH) to depositor
  - Sends the tagged front end's accumulated ZERO gains to the tagged front end
  - Increases deposit and tagged front end's stake, and takes new snapshots for each.

```solidity
function provideToSP(uint256 _amount, address _frontEndTag) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 | amount to provide | 
| _frontEndTag | address | frontend address to receive accumulated ZERO gains | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function provideToSP(uint _amount, address _frontEndTag) external;
```
</details>

---    

> ### withdrawFromSP

Initial checks:
    - _amount is zero or there are no under collateralized troves left in the system
    - User has a non zero deposit
    ---
    - Triggers a ZERO issuance, based on time passed since the last issuance. The ZERO issuance is shared between *all* depositors and front ends
    - Removes the deposit's front end tag if it is a full withdrawal
    - Sends all depositor's accumulated gains (ZERO, ETH) to depositor
    - Sends the tagged front end's accumulated ZERO gains to the tagged front end
    - Decreases deposit and tagged front end's stake, and takes new snapshots for each.

    If _amount > userDeposit, the user withdraws all of their compounded deposit.

```solidity
function withdrawFromSP(uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 | amount to withdraw | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function withdrawFromSP(uint _amount) external;
```
</details>

---    

> ### withdrawETHGainToTrove

Initial checks:
    - User has a non zero deposit
    - User has an open trove
    - User has some ETH gain
    ---
    - Triggers a ZERO issuance, based on time passed since the last issuance. The ZERO issuance is shared between *all* depositors and front ends
    - Sends all depositor's ZERO gain to  depositor
    - Sends all tagged front end's ZERO gain to the tagged front end
    - Transfers the depositor's entire ETH gain from the Stability Pool to the caller's trove
    - Leaves their compounded deposit in the Stability Pool
    - Updates snapshots for deposit and tagged front end stake

```solidity
function withdrawETHGainToTrove(address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _upperHint | address | upper trove id hint | 
| _lowerHint | address | lower trove id hint | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function withdrawETHGainToTrove(address _upperHint, address _lowerHint) external;
```
</details>

---    

> ### registerFrontEnd

Initial checks:
    - Frontend (sender) not already registered
    - User (sender) has no deposit
    - _kickbackRate is in the range [0, 100%]
    ---
    Front end makes a one-time selection of kickback rate upon registering

```solidity
function registerFrontEnd(uint256 _kickbackRate) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _kickbackRate | uint256 | kickback rate selected by frontend | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function registerFrontEnd(uint _kickbackRate) external;
```
</details>

---    

> ### offset

Initial checks:
    - Caller is TroveManager
    ---
    Cancels out the specified debt against the ZUSD contained in the Stability Pool (as far as possible)
    and transfers the Trove's ETH collateral from ActivePool to StabilityPool.
    Only called by liquidation functions in the TroveManager.

```solidity
function offset(uint256 _debt, uint256 _coll) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _debt | uint256 | debt to cancel | 
| _coll | uint256 | collateral to transfer | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function offset(uint _debt, uint _coll) external;
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
function getETH() external view returns (uint);
```
</details>

---    

> ### getTotalZUSDDeposits

```solidity
function getTotalZUSDDeposits() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getTotalZUSDDeposits() external view returns (uint);
```
</details>

---    

> ### getDepositorETHGain

Calculates the ETH gain earned by the deposit since its last snapshots were taken.

```solidity
function getDepositorETHGain(address _depositor) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address | address to calculate ETH gain | 

**Returns**

ETH gain from given depositor

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getDepositorETHGain(address _depositor) external view returns (uint);
```
</details>

---    

> ### getDepositorZEROGain

Calculate the ZERO gain earned by a deposit since its last snapshots were taken.
    If not tagged with a front end, the depositor gets a 100% cut of what their deposit earned.
    Otherwise, their cut of the deposit's earnings is equal to the kickbackRate, set by the front end through
    which they made their deposit.

```solidity
function getDepositorZEROGain(address _depositor) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address | address to calculate ETH gain | 

**Returns**

ZERO gain from given depositor

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getDepositorZEROGain(address _depositor) external view returns (uint);
```
</details>

---    

> ### getFrontEndZEROGain

```solidity
function getFrontEndZEROGain(address _frontEnd) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _frontEnd | address | front end address | 

**Returns**

the ZERO gain earned by the front end.

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getFrontEndZEROGain(address _frontEnd) external view returns (uint);
```
</details>

---    

> ### getCompoundedZUSDDeposit

```solidity
function getCompoundedZUSDDeposit(address _depositor) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address | depositor address | 

**Returns**

the user's compounded deposit.

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getCompoundedZUSDDeposit(address _depositor) external view returns (uint);
```
</details>

---    

> ### getCompoundedFrontEndStake

The front end's compounded stake is equal to the sum of its depositors' compounded deposits.

```solidity
function getCompoundedFrontEndStake(address _frontEnd) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _frontEnd | address | front end address | 

**Returns**

the front end's compounded stake.

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getCompoundedFrontEndStake(address _frontEnd) external view returns (uint);
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
