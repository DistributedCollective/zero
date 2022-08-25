# StabilityPool.sol

View Source: [contracts/StabilityPool.sol](../contracts/StabilityPool.sol)

**↗ Extends: [LiquityBase](LiquityBase.md), [StabilityPoolStorage](StabilityPoolStorage.md), [CheckContract](CheckContract.md), [IStabilityPool](IStabilityPool.md)**

**StabilityPool**

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
- [getETH()](#geteth)
- [getTotalZUSDDeposits()](#gettotalzusddeposits)
- [provideToSP(uint256 _amount, address _frontEndTag)](#providetosp)
- [withdrawFromSP(uint256 _amount)](#withdrawfromsp)
- [withdrawETHGainToTrove(address _upperHint, address _lowerHint)](#withdrawethgaintotrove)
- [_triggerZEROIssuance(ICommunityIssuance _communityIssuance)](#_triggerzeroissuance)
- [_updateG(uint256 _ZEROIssuance)](#_updateg)
- [_computeZEROPerUnitStaked(uint256 _ZEROIssuance, uint256 _totalZUSDDeposits)](#_computezeroperunitstaked)
- [offset(uint256 _debtToOffset, uint256 _collToAdd)](#offset)
- [_computeRewardsPerUnitStaked(uint256 _collToAdd, uint256 _debtToOffset, uint256 _totalZUSDDeposits)](#_computerewardsperunitstaked)
- [_updateRewardSumAndProduct(uint256 _ETHGainPerUnitStaked, uint256 _ZUSDLossPerUnitStaked)](#_updaterewardsumandproduct)
- [_moveOffsetCollAndDebt(uint256 _collToAdd, uint256 _debtToOffset)](#_moveoffsetcollanddebt)
- [_decreaseZUSD(uint256 _amount)](#_decreasezusd)
- [getDepositorETHGain(address _depositor)](#getdepositorethgain)
- [_getETHGainFromSnapshots(uint256 initialDeposit, struct StabilityPoolStorage.Snapshots snapshots)](#_getethgainfromsnapshots)
- [getDepositorZEROGain(address _depositor)](#getdepositorzerogain)
- [getFrontEndZEROGain(address _frontEnd)](#getfrontendzerogain)
- [_getZEROGainFromSnapshots(uint256 initialStake, struct StabilityPoolStorage.Snapshots snapshots)](#_getzerogainfromsnapshots)
- [getCompoundedZUSDDeposit(address _depositor)](#getcompoundedzusddeposit)
- [getCompoundedFrontEndStake(address _frontEnd)](#getcompoundedfrontendstake)
- [_getCompoundedStakeFromSnapshots(uint256 initialStake, struct StabilityPoolStorage.Snapshots snapshots)](#_getcompoundedstakefromsnapshots)
- [_sendZUSDtoStabilityPool(address _address, uint256 _amount)](#_sendzusdtostabilitypool)
- [_sendETHGainToDepositor(uint256 _amount)](#_sendethgaintodepositor)
- [_sendZUSDToDepositor(address _depositor, uint256 ZUSDWithdrawal)](#_sendzusdtodepositor)
- [registerFrontEnd(uint256 _kickbackRate)](#registerfrontend)
- [_setFrontEndTag(address _depositor, address _frontEndTag)](#_setfrontendtag)
- [_updateDepositAndSnapshots(address _depositor, uint256 _newValue)](#_updatedepositandsnapshots)
- [_updateFrontEndStakeAndSnapshots(address _frontEnd, uint256 _newValue)](#_updatefrontendstakeandsnapshots)
- [_payOutZEROGains(ICommunityIssuance _communityIssuance, address _depositor, address _frontEnd)](#_payoutzerogains)
- [_requireCallerIsActivePool()](#_requirecallerisactivepool)
- [_requireCallerIsTroveManager()](#_requirecalleristrovemanager)
- [_requireNoUnderCollateralizedTroves()](#_requirenoundercollateralizedtroves)
- [_requireUserHasDeposit(uint256 _initialDeposit)](#_requireuserhasdeposit)
- [_requireUserHasNoDeposit(address _address)](#_requireuserhasnodeposit)
- [_requireNonZeroAmount(uint256 _amount)](#_requirenonzeroamount)
- [_requireUserHasTrove(address _depositor)](#_requireuserhastrove)
- [_requireUserHasETHGain(address _depositor)](#_requireuserhasethgain)
- [_requireFrontEndNotRegistered(address _address)](#_requirefrontendnotregistered)
- [_requireFrontEndIsRegisteredOrZero(address _address)](#_requirefrontendisregisteredorzero)
- [_requireValidKickbackRate(uint256 _kickbackRate)](#_requirevalidkickbackrate)
- [constructor()](#constructor)

---    

> ### setAddresses

```solidity
function setAddresses(address _liquityBaseParamsAddress, address _borrowerOperationsAddress, address _troveManagerAddress, address _activePoolAddress, address _zusdTokenAddress, address _sortedTrovesAddress, address _priceFeedAddress, address _communityIssuanceAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _liquityBaseParamsAddress | address |  | 
| _borrowerOperationsAddress | address |  | 
| _troveManagerAddress | address |  | 
| _activePoolAddress | address |  | 
| _zusdTokenAddress | address |  | 
| _sortedTrovesAddress | address |  | 
| _priceFeedAddress | address |  | 
| _communityIssuanceAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction setAddresses(
        address _liquityBaseParamsAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _zusdTokenAddress,
        address _sortedTrovesAddress,
        address _priceFeedAddress,
        address _communityIssuanceAddress
    )
        external
        override
        onlyOwner
    {
        checkContract(_liquityBaseParamsAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_sortedTrovesAddress);
        checkContract(_priceFeedAddress);
        checkContract(_communityIssuanceAddress);

        P = DECIMAL_PRECISION;

        liquityBaseParams = ILiquityBaseParams(_liquityBaseParamsAddress);
        borrowerOperations = IBorrowerOperations(_borrowerOperationsAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        activePool = IActivePool(_activePoolAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        communityIssuance = ICommunityIssuance(_communityIssuanceAddress);

        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit SortedTrovesAddressChanged(_sortedTrovesAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit CommunityIssuanceAddressChanged(_communityIssuanceAddress);

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
nction getETH() external view override returns (uint) {
        return ETH;
    }

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
nction getTotalZUSDDeposits() external view override returns (uint) {
        return totalZUSDDeposits;
    }

```
</details>

---    

> ### provideToSP

```solidity
function provideToSP(uint256 _amount, address _frontEndTag) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 
| _frontEndTag | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction provideToSP(uint _amount, address _frontEndTag) external override {
        _requireFrontEndIsRegisteredOrZero(_frontEndTag);
        _requireFrontEndNotRegistered(msg.sender);
        _requireNonZeroAmount(_amount);

        uint initialDeposit = deposits[msg.sender].initialValue;

        ICommunityIssuance communityIssuanceCached = communityIssuance;

        _triggerZEROIssuance(communityIssuanceCached);

        if (initialDeposit == 0) {_setFrontEndTag(msg.sender, _frontEndTag);}
        uint depositorETHGain = getDepositorETHGain(msg.sender);
        uint compoundedZUSDDeposit = getCompoundedZUSDDeposit(msg.sender);
        uint ZUSDLoss = initialDeposit.sub(compoundedZUSDDeposit); // Needed only for event log

        // First pay out any ZERO gains
        address frontEnd = deposits[msg.sender].frontEndTag;
        _payOutZEROGains(communityIssuanceCached, msg.sender, frontEnd);

        // Update front end stake
        uint compoundedFrontEndStake = getCompoundedFrontEndStake(frontEnd);
        uint newFrontEndStake = compoundedFrontEndStake.add(_amount);
        _updateFrontEndStakeAndSnapshots(frontEnd, newFrontEndStake);
        emit FrontEndStakeChanged(frontEnd, newFrontEndStake, msg.sender);

        _sendZUSDtoStabilityPool(msg.sender, _amount);

        uint newDeposit = compoundedZUSDDeposit.add(_amount);
        _updateDepositAndSnapshots(msg.sender, newDeposit);
        emit UserDepositChanged(msg.sender, newDeposit);

        emit ETHGainWithdrawn(msg.sender, depositorETHGain, ZUSDLoss); // ZUSD Loss required for event log

        _sendETHGainToDepositor(depositorETHGain);
     }

```
</details>

---    

> ### withdrawFromSP

```solidity
function withdrawFromSP(uint256 _amount) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction withdrawFromSP(uint _amount) external override {
        if (_amount !=0) {_requireNoUnderCollateralizedTroves();}
        uint initialDeposit = deposits[msg.sender].initialValue;
        _requireUserHasDeposit(initialDeposit);

        ICommunityIssuance communityIssuanceCached = communityIssuance;

        _triggerZEROIssuance(communityIssuanceCached);

        uint depositorETHGain = getDepositorETHGain(msg.sender);

        uint compoundedZUSDDeposit = getCompoundedZUSDDeposit(msg.sender);
        uint ZUSDtoWithdraw = LiquityMath._min(_amount, compoundedZUSDDeposit);
        uint ZUSDLoss = initialDeposit.sub(compoundedZUSDDeposit); // Needed only for event log

        // First pay out any ZERO gains
        address frontEnd = deposits[msg.sender].frontEndTag;
        _payOutZEROGains(communityIssuanceCached, msg.sender, frontEnd);

        // Update front end stake
        uint compoundedFrontEndStake = getCompoundedFrontEndStake(frontEnd);
        uint newFrontEndStake = compoundedFrontEndStake.sub(ZUSDtoWithdraw);
        _updateFrontEndStakeAndSnapshots(frontEnd, newFrontEndStake);
        emit FrontEndStakeChanged(frontEnd, newFrontEndStake, msg.sender);

        _sendZUSDToDepositor(msg.sender, ZUSDtoWithdraw);

        // Update deposit
        uint newDeposit = compoundedZUSDDeposit.sub(ZUSDtoWithdraw);
        _updateDepositAndSnapshots(msg.sender, newDeposit);
        emit UserDepositChanged(msg.sender, newDeposit);

        emit ETHGainWithdrawn(msg.sender, depositorETHGain, ZUSDLoss);  // ZUSD Loss required for event log

        _sendETHGainToDepositor(depositorETHGain);
    }

```
</details>

---    

> ### withdrawETHGainToTrove

```solidity
function withdrawETHGainToTrove(address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction withdrawETHGainToTrove(address _upperHint, address _lowerHint) external override {
        uint initialDeposit = deposits[msg.sender].initialValue;
        _requireUserHasDeposit(initialDeposit);
        _requireUserHasTrove(msg.sender);
        _requireUserHasETHGain(msg.sender);

        ICommunityIssuance communityIssuanceCached = communityIssuance;

        _triggerZEROIssuance(communityIssuanceCached);

        uint depositorETHGain = getDepositorETHGain(msg.sender);

        uint compoundedZUSDDeposit = getCompoundedZUSDDeposit(msg.sender);
        uint ZUSDLoss = initialDeposit.sub(compoundedZUSDDeposit); // Needed only for event log

        // First pay out any ZERO gains
        address frontEnd = deposits[msg.sender].frontEndTag;
        _payOutZEROGains(communityIssuanceCached, msg.sender, frontEnd);

        // Update front end stake
        uint compoundedFrontEndStake = getCompoundedFrontEndStake(frontEnd);
        uint newFrontEndStake = compoundedFrontEndStake;
        _updateFrontEndStakeAndSnapshots(frontEnd, newFrontEndStake);
        emit FrontEndStakeChanged(frontEnd, newFrontEndStake, msg.sender);

        _updateDepositAndSnapshots(msg.sender, compoundedZUSDDeposit);

        /* Emit events before transferring ETH gain to Trove.
         This lets the event log make more sense (i.e. so it appears that first the ETH gain is withdrawn
        and then it is deposited into the Trove, not the other way around). */
        emit ETHGainWithdrawn(msg.sender, depositorETHGain, ZUSDLoss);
        emit UserDepositChanged(msg.sender, compoundedZUSDDeposit);

        ETH = ETH.sub(depositorETHGain);
        emit StabilityPoolETHBalanceUpdated(ETH);
        emit EtherSent(msg.sender, depositorETHGain);

        borrowerOperations.moveETHGainToTrove{ value: depositorETHGain }(msg.sender, _upperHint, _lowerHint);
    }

```
</details>

---    

> ### _triggerZEROIssuance

```solidity
function _triggerZEROIssuance(ICommunityIssuance _communityIssuance) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _communityIssuance | ICommunityIssuance |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _triggerZEROIssuance(ICommunityIssuance _communityIssuance) internal {
        uint ZEROIssuance = _communityIssuance.issueZERO();
       _updateG(ZEROIssuance);
    }

```
</details>

---    

> ### _updateG

```solidity
function _updateG(uint256 _ZEROIssuance) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZEROIssuance | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _updateG(uint _ZEROIssuance) internal {
        uint totalZUSD = totalZUSDDeposits; // cached to save an SLOAD
        /*
        * When total deposits is 0, G is not updated. In this case, the ZERO issued can not be obtained by later
        * depositors - it is missed out on, and remains in the balanceof the CommunityIssuance contract.
        *
        */
        if (totalZUSD == 0 || _ZEROIssuance == 0) {return;}

        uint ZEROPerUnitStaked;
        ZEROPerUnitStaked =_computeZEROPerUnitStaked(_ZEROIssuance, totalZUSD);

        uint marginalZEROGain = ZEROPerUnitStaked.mul(P);
        epochToScaleToG[currentEpoch][currentScale] = epochToScaleToG[currentEpoch][currentScale].add(marginalZEROGain);

        emit G_Updated(epochToScaleToG[currentEpoch][currentScale], currentEpoch, currentScale);
    }

```
</details>

---    

> ### _computeZEROPerUnitStaked

```solidity
function _computeZEROPerUnitStaked(uint256 _ZEROIssuance, uint256 _totalZUSDDeposits) internal nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZEROIssuance | uint256 |  | 
| _totalZUSDDeposits | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _computeZEROPerUnitStaked(uint _ZEROIssuance, uint _totalZUSDDeposits) internal returns (uint) {
        /*  
        * Calculate the ZERO-per-unit staked.  Division uses a "feedback" error correction, to keep the 
        * cumulative error low in the running total G:
        *
        * 1) Form a numerator which compensates for the floor division error that occurred the last time this 
        * function was called.  
        * 2) Calculate "per-unit-staked" ratio.
        * 3) Multiply the ratio back by its denominator, to reveal the current floor division error.
        * 4) Store this error for use in the next correction when this function is called.
        * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
        */
        uint ZERONumerator = _ZEROIssuance.mul(DECIMAL_PRECISION).add(lastZEROError);

        uint ZEROPerUnitStaked = ZERONumerator.div(_totalZUSDDeposits);
        lastZEROError = ZERONumerator.sub(ZEROPerUnitStaked.mul(_totalZUSDDeposits));

        return ZEROPerUnitStaked;
    }

```
</details>

---    

> ### offset

```solidity
function offset(uint256 _debtToOffset, uint256 _collToAdd) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _debtToOffset | uint256 |  | 
| _collToAdd | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction offset(uint _debtToOffset, uint _collToAdd) external override {
        _requireCallerIsTroveManager();
        uint totalZUSD = totalZUSDDeposits; // cached to save an SLOAD
        if (totalZUSD == 0 || _debtToOffset == 0) { return; }

        _triggerZEROIssuance(communityIssuance);

        (uint ETHGainPerUnitStaked,
            uint ZUSDLossPerUnitStaked) = _computeRewardsPerUnitStaked(_collToAdd, _debtToOffset, totalZUSD);

        _updateRewardSumAndProduct(ETHGainPerUnitStaked, ZUSDLossPerUnitStaked);  // updates S and P

        _moveOffsetCollAndDebt(_collToAdd, _debtToOffset);
    }

```
</details>

---    

> ### _computeRewardsPerUnitStaked

```solidity
function _computeRewardsPerUnitStaked(uint256 _collToAdd, uint256 _debtToOffset, uint256 _totalZUSDDeposits) internal nonpayable
returns(ETHGainPerUnitStaked uint256, ZUSDLossPerUnitStaked uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collToAdd | uint256 |  | 
| _debtToOffset | uint256 |  | 
| _totalZUSDDeposits | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _computeRewardsPerUnitStaked(
        uint _collToAdd,
        uint _debtToOffset,
        uint _totalZUSDDeposits
    )
        internal
        returns (uint ETHGainPerUnitStaked, uint ZUSDLossPerUnitStaked)
    {
        /*
        * Compute the ZUSD and ETH rewards. Uses a "feedback" error correction, to keep
        * the cumulative error in the P and S state variables low:
        *
        * 1) Form numerators which compensate for the floor division errors that occurred the last time this 
        * function was called.  
        * 2) Calculate "per-unit-staked" ratios.
        * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
        * 4) Store these errors for use in the next correction when this function is called.
        * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
        */
        uint ETHNumerator = _collToAdd.mul(DECIMAL_PRECISION).add(lastETHError_Offset);

        assert(_debtToOffset <= _totalZUSDDeposits);
        if (_debtToOffset == _totalZUSDDeposits) {
            ZUSDLossPerUnitStaked = DECIMAL_PRECISION;  // When the Pool depletes to 0, so does each deposit 
            lastZUSDLossError_Offset = 0;
        } else {
            uint ZUSDLossNumerator = _debtToOffset.mul(DECIMAL_PRECISION).sub(lastZUSDLossError_Offset);
            /*
            * Add 1 to make error in quotient positive. We want "slightly too much" ZUSD loss,
            * which ensures the error in any given compoundedZUSDDeposit favors the Stability Pool.
            */
            ZUSDLossPerUnitStaked = (ZUSDLossNumerator.div(_totalZUSDDeposits)).add(1);
            lastZUSDLossError_Offset = (ZUSDLossPerUnitStaked.mul(_totalZUSDDeposits)).sub(ZUSDLossNumerator);
        }

        ETHGainPerUnitStaked = ETHNumerator.div(_totalZUSDDeposits);
        lastETHError_Offset = ETHNumerator.sub(ETHGainPerUnitStaked.mul(_totalZUSDDeposits));

        return (ETHGainPerUnitStaked, ZUSDLossPerUnitStaked);
    }

```
</details>

---    

> ### _updateRewardSumAndProduct

```solidity
function _updateRewardSumAndProduct(uint256 _ETHGainPerUnitStaked, uint256 _ZUSDLossPerUnitStaked) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ETHGainPerUnitStaked | uint256 |  | 
| _ZUSDLossPerUnitStaked | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _updateRewardSumAndProduct(uint _ETHGainPerUnitStaked, uint _ZUSDLossPerUnitStaked) internal {
        uint currentP = P;
        uint newP;

        assert(_ZUSDLossPerUnitStaked <= DECIMAL_PRECISION);
        /*
        * The newProductFactor is the factor by which to change all deposits, due to the depletion of Stability Pool ZUSD in the liquidation.
        * We make the product factor 0 if there was a pool-emptying. Otherwise, it is (1 - ZUSDLossPerUnitStaked)
        */
        uint newProductFactor = uint(DECIMAL_PRECISION).sub(_ZUSDLossPerUnitStaked);

        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;
        uint currentS = epochToScaleToSum[currentEpochCached][currentScaleCached];

        /*
        * Calculate the new S first, before we update P.
        * The ETH gain for any given depositor from a liquidation depends on the value of their deposit
        * (and the value of totalDeposits) prior to the Stability being depleted by the debt in the liquidation.
        *
        * Since S corresponds to ETH gain, and P to deposit loss, we update S first.
        */
        uint marginalETHGain = _ETHGainPerUnitStaked.mul(currentP);
        uint newS = currentS.add(marginalETHGain);
        epochToScaleToSum[currentEpochCached][currentScaleCached] = newS;
        emit S_Updated(newS, currentEpochCached, currentScaleCached);

        // If the Stability Pool was emptied, increment the epoch, and reset the scale and product P
        if (newProductFactor == 0) {
            currentEpoch = currentEpochCached.add(1);
            emit EpochUpdated(currentEpoch);
            currentScale = 0;
            emit ScaleUpdated(currentScale);
            newP = DECIMAL_PRECISION;

        // If multiplying P by a non-zero product factor would reduce P below the scale boundary, increment the scale
        } else if (currentP.mul(newProductFactor).div(DECIMAL_PRECISION) < SCALE_FACTOR) {
            newP = currentP.mul(newProductFactor).mul(SCALE_FACTOR).div(DECIMAL_PRECISION); 
            currentScale = currentScaleCached.add(1);
            emit ScaleUpdated(currentScale);
        } else {
            newP = currentP.mul(newProductFactor).div(DECIMAL_PRECISION);
        }

        assert(newP > 0);
        P = newP;

        emit P_Updated(newP);
    }

```
</details>

---    

> ### _moveOffsetCollAndDebt

```solidity
function _moveOffsetCollAndDebt(uint256 _collToAdd, uint256 _debtToOffset) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collToAdd | uint256 |  | 
| _debtToOffset | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _moveOffsetCollAndDebt(uint _collToAdd, uint _debtToOffset) internal {
        IActivePool activePoolCached = activePool;

        // Cancel the liquidated ZUSD debt with the ZUSD in the stability pool
        activePoolCached.decreaseZUSDDebt(_debtToOffset);
        _decreaseZUSD(_debtToOffset);

        // Burn the debt that was successfully offset
        zusdToken.burn(address(this), _debtToOffset);

        activePoolCached.sendETH(address(this), _collToAdd);
    }

```
</details>

---    

> ### _decreaseZUSD

```solidity
function _decreaseZUSD(uint256 _amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _decreaseZUSD(uint _amount) internal {
        uint newTotalZUSDDeposits = totalZUSDDeposits.sub(_amount);
        totalZUSDDeposits = newTotalZUSDDeposits;
        emit StabilityPoolZUSDBalanceUpdated(newTotalZUSDDeposits);
    }

```
</details>

---    

> ### getDepositorETHGain

```solidity
function getDepositorETHGain(address _depositor) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getDepositorETHGain(address _depositor) public view override returns (uint) {
        uint initialDeposit = deposits[_depositor].initialValue;

        if (initialDeposit == 0) { return 0; }

        Snapshots memory snapshots = depositSnapshots[_depositor];

        uint ETHGain = _getETHGainFromSnapshots(initialDeposit, snapshots);
        return ETHGain;
    }

```
</details>

---    

> ### _getETHGainFromSnapshots

```solidity
function _getETHGainFromSnapshots(uint256 initialDeposit, struct StabilityPoolStorage.Snapshots snapshots) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| initialDeposit | uint256 |  | 
| snapshots | struct StabilityPoolStorage.Snapshots |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _getETHGainFromSnapshots(uint initialDeposit, Snapshots memory snapshots) internal view returns (uint) {
        /*
        * Grab the sum 'S' from the epoch at which the stake was made. The ETH gain may span up to one scale change.
        * If it does, the second portion of the ETH gain is scaled by 1e9.
        * If the gain spans no scale change, the second portion will be 0.
        */
        uint128 epochSnapshot = snapshots.epoch;
        uint128 scaleSnapshot = snapshots.scale;
        uint S_Snapshot = snapshots.S;
        uint P_Snapshot = snapshots.P;

        uint firstPortion = epochToScaleToSum[epochSnapshot][scaleSnapshot].sub(S_Snapshot);
        uint secondPortion = epochToScaleToSum[epochSnapshot][scaleSnapshot.add(1)].div(SCALE_FACTOR);

        uint ETHGain = initialDeposit.mul(firstPortion.add(secondPortion)).div(P_Snapshot).div(DECIMAL_PRECISION);

        return ETHGain;
    }

```
</details>

---    

> ### getDepositorZEROGain

```solidity
function getDepositorZEROGain(address _depositor) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getDepositorZEROGain(address _depositor) public view override returns (uint) {
        uint initialDeposit = deposits[_depositor].initialValue;
        if (initialDeposit == 0) {return 0;}

        address frontEndTag = deposits[_depositor].frontEndTag;

        /*
        * If not tagged with a front end, the depositor gets a 100% cut of what their deposit earned.
        * Otherwise, their cut of the deposit's earnings is equal to the kickbackRate, set by the front end through
        * which they made their deposit.
        */
        uint kickbackRate = frontEndTag == address(0) ? DECIMAL_PRECISION : frontEnds[frontEndTag].kickbackRate;

        Snapshots memory snapshots = depositSnapshots[_depositor];

        uint ZEROGain = kickbackRate.mul(_getZEROGainFromSnapshots(initialDeposit, snapshots)).div(DECIMAL_PRECISION);

        return ZEROGain;
    }

```
</details>

---    

> ### getFrontEndZEROGain

```solidity
function getFrontEndZEROGain(address _frontEnd) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _frontEnd | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getFrontEndZEROGain(address _frontEnd) public view override returns (uint) {
        uint frontEndStake = frontEndStakes[_frontEnd];
        if (frontEndStake == 0) { return 0; }

        uint kickbackRate = frontEnds[_frontEnd].kickbackRate;
        uint frontEndShare = uint(DECIMAL_PRECISION).sub(kickbackRate);

        Snapshots memory snapshots = frontEndSnapshots[_frontEnd];

        uint ZEROGain = frontEndShare.mul(_getZEROGainFromSnapshots(frontEndStake, snapshots)).div(DECIMAL_PRECISION);
        return ZEROGain;
    }

```
</details>

---    

> ### _getZEROGainFromSnapshots

```solidity
function _getZEROGainFromSnapshots(uint256 initialStake, struct StabilityPoolStorage.Snapshots snapshots) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| initialStake | uint256 |  | 
| snapshots | struct StabilityPoolStorage.Snapshots |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _getZEROGainFromSnapshots(uint initialStake, Snapshots memory snapshots) internal view returns (uint) {
       /*
        * Grab the sum 'G' from the epoch at which the stake was made. The ZERO gain may span up to one scale change.
        * If it does, the second portion of the ZERO gain is scaled by 1e9.
        * If the gain spans no scale change, the second portion will be 0.
        */
        uint128 epochSnapshot = snapshots.epoch;
        uint128 scaleSnapshot = snapshots.scale;
        uint G_Snapshot = snapshots.G;
        uint P_Snapshot = snapshots.P;

        uint firstPortion = epochToScaleToG[epochSnapshot][scaleSnapshot].sub(G_Snapshot);
        uint secondPortion = epochToScaleToG[epochSnapshot][scaleSnapshot.add(1)].div(SCALE_FACTOR);

        uint ZEROGain = initialStake.mul(firstPortion.add(secondPortion)).div(P_Snapshot).div(DECIMAL_PRECISION);

        return ZEROGain;
    }

```
</details>

---    

> ### getCompoundedZUSDDeposit

```solidity
function getCompoundedZUSDDeposit(address _depositor) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getCompoundedZUSDDeposit(address _depositor) public view override returns (uint) {
        uint initialDeposit = deposits[_depositor].initialValue;
        if (initialDeposit == 0) { return 0; }

        Snapshots memory snapshots = depositSnapshots[_depositor];

        uint compoundedDeposit = _getCompoundedStakeFromSnapshots(initialDeposit, snapshots);
        return compoundedDeposit;
    }

```
</details>

---    

> ### getCompoundedFrontEndStake

```solidity
function getCompoundedFrontEndStake(address _frontEnd) public view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _frontEnd | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction getCompoundedFrontEndStake(address _frontEnd) public view override returns (uint) {
        uint frontEndStake = frontEndStakes[_frontEnd];
        if (frontEndStake == 0) { return 0; }

        Snapshots memory snapshots = frontEndSnapshots[_frontEnd];

        uint compoundedFrontEndStake = _getCompoundedStakeFromSnapshots(frontEndStake, snapshots);
        return compoundedFrontEndStake;
    }

```
</details>

---    

> ### _getCompoundedStakeFromSnapshots

```solidity
function _getCompoundedStakeFromSnapshots(uint256 initialStake, struct StabilityPoolStorage.Snapshots snapshots) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| initialStake | uint256 |  | 
| snapshots | struct StabilityPoolStorage.Snapshots |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _getCompoundedStakeFromSnapshots(
        uint initialStake,
        Snapshots memory snapshots
    )
        internal
        view
        returns (uint)
    {
        uint snapshot_P = snapshots.P;
        uint128 scaleSnapshot = snapshots.scale;
        uint128 epochSnapshot = snapshots.epoch;

        // If stake was made before a pool-emptying event, then it has been fully cancelled with debt -- so, return 0
        if (epochSnapshot < currentEpoch) { return 0; }

        uint compoundedStake;
        uint128 scaleDiff = currentScale.sub(scaleSnapshot);

        /* Compute the compounded stake. If a scale change in P was made during the stake's lifetime,
        * account for it. If more than one scale change was made, then the stake has decreased by a factor of
        * at least 1e-9 -- so return 0.
        */
        if (scaleDiff == 0) {
            compoundedStake = initialStake.mul(P).div(snapshot_P);
        } else if (scaleDiff == 1) {
            compoundedStake = initialStake.mul(P).div(snapshot_P).div(SCALE_FACTOR);
        } else { // if scaleDiff >= 2
            compoundedStake = 0;
        }

        /*
        * If compounded deposit is less than a billionth of the initial deposit, return 0.
        *
        * NOTE: originally, this line was in place to stop rounding errors making the deposit too large. However, the error
        * corrections should ensure the error in P "favors the Pool", i.e. any given compounded deposit should slightly less
        * than it's theoretical value.
        *
        * Thus it's unclear whether this line is still really needed.
        */
        if (compoundedStake < initialStake.div(1e9)) {return 0;}

        return compoundedStake;
    }

```
</details>

---    

> ### _sendZUSDtoStabilityPool

```solidity
function _sendZUSDtoStabilityPool(address _address, uint256 _amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _address | address |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _sendZUSDtoStabilityPool(address _address, uint _amount) internal {
        zusdToken.sendToPool(_address, address(this), _amount);
        uint newTotalZUSDDeposits = totalZUSDDeposits.add(_amount);
        totalZUSDDeposits = newTotalZUSDDeposits;
        emit StabilityPoolZUSDBalanceUpdated(newTotalZUSDDeposits);
    }

```
</details>

---    

> ### _sendETHGainToDepositor

```solidity
function _sendETHGainToDepositor(uint256 _amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _sendETHGainToDepositor(uint _amount) internal {
        if (_amount == 0) {return;}
        uint newETH = ETH.sub(_amount);
        ETH = newETH;
        emit StabilityPoolETHBalanceUpdated(newETH);
        emit EtherSent(msg.sender, _amount);

        (bool success, ) = msg.sender.call{ value: _amount }("");
        require(success, "StabilityPool: sending ETH failed");
    }

```
</details>

---    

> ### _sendZUSDToDepositor

```solidity
function _sendZUSDToDepositor(address _depositor, uint256 ZUSDWithdrawal) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 
| ZUSDWithdrawal | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _sendZUSDToDepositor(address _depositor, uint ZUSDWithdrawal) internal {
        if (ZUSDWithdrawal == 0) {return;}

        zusdToken.returnFromPool(address(this), _depositor, ZUSDWithdrawal);
        _decreaseZUSD(ZUSDWithdrawal);
    }

```
</details>

---    

> ### registerFrontEnd

```solidity
function registerFrontEnd(uint256 _kickbackRate) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _kickbackRate | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction registerFrontEnd(uint _kickbackRate) external override {
        _requireFrontEndNotRegistered(msg.sender);
        _requireUserHasNoDeposit(msg.sender);
        _requireValidKickbackRate(_kickbackRate);

        frontEnds[msg.sender].kickbackRate = _kickbackRate;
        frontEnds[msg.sender].registered = true;

        emit FrontEndRegistered(msg.sender, _kickbackRate);
    }

```
</details>

---    

> ### _setFrontEndTag

```solidity
function _setFrontEndTag(address _depositor, address _frontEndTag) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 
| _frontEndTag | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _setFrontEndTag(address _depositor, address _frontEndTag) internal {
        deposits[_depositor].frontEndTag = _frontEndTag;
        emit FrontEndTagSet(_depositor, _frontEndTag);
    }

```
</details>

---    

> ### _updateDepositAndSnapshots

```solidity
function _updateDepositAndSnapshots(address _depositor, uint256 _newValue) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 
| _newValue | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _updateDepositAndSnapshots(address _depositor, uint _newValue) internal {
        deposits[_depositor].initialValue = _newValue;

        if (_newValue == 0) {
            delete deposits[_depositor].frontEndTag;
            delete depositSnapshots[_depositor];
            emit DepositSnapshotUpdated(_depositor, 0, 0, 0);
            return;
        }
        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;
        uint currentP = P;

        // Get S and G for the current epoch and current scale
        uint currentS = epochToScaleToSum[currentEpochCached][currentScaleCached];
        uint currentG = epochToScaleToG[currentEpochCached][currentScaleCached];

        // Record new snapshots of the latest running product P, sum S, and sum G, for the depositor
        depositSnapshots[_depositor].P = currentP;
        depositSnapshots[_depositor].S = currentS;
        depositSnapshots[_depositor].G = currentG;
        depositSnapshots[_depositor].scale = currentScaleCached;
        depositSnapshots[_depositor].epoch = currentEpochCached;

        emit DepositSnapshotUpdated(_depositor, currentP, currentS, currentG);
    }

```
</details>

---    

> ### _updateFrontEndStakeAndSnapshots

```solidity
function _updateFrontEndStakeAndSnapshots(address _frontEnd, uint256 _newValue) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _frontEnd | address |  | 
| _newValue | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _updateFrontEndStakeAndSnapshots(address _frontEnd, uint _newValue) internal {
        frontEndStakes[_frontEnd] = _newValue;

        if (_newValue == 0) {
            delete frontEndSnapshots[_frontEnd];
            emit FrontEndSnapshotUpdated(_frontEnd, 0, 0);
            return;
        }

        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;
        uint currentP = P;

        // Get G for the current epoch and current scale
        uint currentG = epochToScaleToG[currentEpochCached][currentScaleCached];

        // Record new snapshots of the latest running product P and sum G for the front end
        frontEndSnapshots[_frontEnd].P = currentP;
        frontEndSnapshots[_frontEnd].G = currentG;
        frontEndSnapshots[_frontEnd].scale = currentScaleCached;
        frontEndSnapshots[_frontEnd].epoch = currentEpochCached;

        emit FrontEndSnapshotUpdated(_frontEnd, currentP, currentG);
    }

```
</details>

---    

> ### _payOutZEROGains

```solidity
function _payOutZEROGains(ICommunityIssuance _communityIssuance, address _depositor, address _frontEnd) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _communityIssuance | ICommunityIssuance |  | 
| _depositor | address |  | 
| _frontEnd | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _payOutZEROGains(ICommunityIssuance _communityIssuance, address _depositor, address _frontEnd) internal {
        // Pay out front end's ZERO gain
        if (_frontEnd != address(0)) {
            uint frontEndZEROGain = getFrontEndZEROGain(_frontEnd);
            _communityIssuance.sendZERO(_frontEnd, frontEndZEROGain);
            emit ZEROPaidToFrontEnd(_frontEnd, frontEndZEROGain);
        }

        // Pay out depositor's ZERO gain
        uint depositorZEROGain = getDepositorZEROGain(_depositor);
        _communityIssuance.sendZERO(_depositor, depositorZEROGain);
        emit ZEROPaidToDepositor(_depositor, depositorZEROGain);
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
nction _requireCallerIsActivePool() internal view {
        require( msg.sender == address(activePool), "StabilityPool: Caller is not ActivePool");
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
nction _requireCallerIsTroveManager() internal view {
        require(msg.sender == address(troveManager), "StabilityPool: Caller is not TroveManager");
    }

```
</details>

---    

> ### _requireNoUnderCollateralizedTroves

```solidity
function _requireNoUnderCollateralizedTroves() internal nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _requireNoUnderCollateralizedTroves() internal {
        uint price = priceFeed.fetchPrice();
        address lowestTrove = sortedTroves.getLast();
        uint ICR = troveManager.getCurrentICR(lowestTrove, price);
        require(ICR >= liquityBaseParams.MCR(), "StabilityPool: Cannot withdraw while there are troves with ICR < MCR");
    }

```
</details>

---    

> ### _requireUserHasDeposit

```solidity
function _requireUserHasDeposit(uint256 _initialDeposit) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _initialDeposit | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _requireUserHasDeposit(uint _initialDeposit) internal pure {
        require(_initialDeposit > 0, 'StabilityPool: User must have a non-zero deposit');
    }

```
</details>

---    

> ### _requireUserHasNoDeposit

```solidity
function _requireUserHasNoDeposit(address _address) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _address | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _requireUserHasNoDeposit(address _address) internal view {
        uint initialDeposit = deposits[_address].initialValue;
        require(initialDeposit == 0, 'StabilityPool: User must have no deposit');
    }

```
</details>

---    

> ### _requireNonZeroAmount

```solidity
function _requireNonZeroAmount(uint256 _amount) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _requireNonZeroAmount(uint _amount) internal pure {
        require(_amount > 0, 'StabilityPool: Amount must be non-zero');
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
nction _requireUserHasTrove(address _depositor) internal view {
        require(troveManager.getTroveStatus(_depositor) == 1, "StabilityPool: caller must have an active trove to withdraw ETHGain to");
    }

```
</details>

---    

> ### _requireUserHasETHGain

```solidity
function _requireUserHasETHGain(address _depositor) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _depositor | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _requireUserHasETHGain(address _depositor) internal view {
        uint ETHGain = getDepositorETHGain(_depositor);
        require(ETHGain > 0, "StabilityPool: caller must have non-zero ETH Gain");
    }

```
</details>

---    

> ### _requireFrontEndNotRegistered

```solidity
function _requireFrontEndNotRegistered(address _address) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _address | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _requireFrontEndNotRegistered(address _address) internal view {
        require(!frontEnds[_address].registered, "StabilityPool: must not already be a registered front end");
    }

```
</details>

---    

> ### _requireFrontEndIsRegisteredOrZero

```solidity
function _requireFrontEndIsRegisteredOrZero(address _address) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _address | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction _requireFrontEndIsRegisteredOrZero(address _address) internal view {
        require(frontEnds[_address].registered || _address == address(0),
            "StabilityPool: Tag must be a registered front end, or the zero address");
    }

```
</details>

---    

> ### _requireValidKickbackRate

```solidity
function _requireValidKickbackRate(uint256 _kickbackRate) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _kickbackRate | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
nction  _requireValidKickbackRate(uint _kickbackRate) internal pure {
        require (_kickbackRate <= DECIMAL_PRECISION, "StabilityPool: Kickback rate must be in range [0,1]");
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
ceive() external payable {
        _requireCallerIsActivePool();
        ETH = ETH.add(msg.value);
        StabilityPoolETHBalanceUpdated(ETH);
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
