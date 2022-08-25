# BorrowerOperations.sol

View Source: [contracts/BorrowerOperations.sol](../contracts/BorrowerOperations.sol)

**↗ Extends: [LiquityBase](LiquityBase.md), [BorrowerOperationsStorage](BorrowerOperationsStorage.md), [CheckContract](CheckContract.md), [IBorrowerOperations](IBorrowerOperations.md)**

**BorrowerOperations**

**Enums**
### BorrowerOperation

```js
enum BorrowerOperation {
 openTrove,
 closeTrove,
 adjustTrove
}
```

## Structs
### LocalVariables_adjustTrove

```js
struct LocalVariables_adjustTrove {
 uint256 price,
 uint256 collChange,
 uint256 netDebtChange,
 bool isCollIncrease,
 uint256 debt,
 uint256 coll,
 uint256 oldICR,
 uint256 newICR,
 uint256 newTCR,
 uint256 ZUSDFee,
 uint256 newDebt,
 uint256 newColl,
 uint256 stake,
 uint256 newNICR,
 bool isRecoveryMode
}
```

### LocalVariables_openTrove

```js
struct LocalVariables_openTrove {
 uint256 price,
 uint256 ZUSDFee,
 uint256 netDebt,
 uint256 compositeDebt,
 uint256 ICR,
 uint256 NICR,
 uint256 stake,
 uint256 arrayIndex
}
```

### ContractsCache

```js
struct ContractsCache {
 contract ITroveManager troveManager,
 contract IActivePool activePool,
 contract IZUSDToken zusdToken
}
```

**Events**

```js
event FeeDistributorAddressChanged(address  _feeDistributorAddress);
event TroveManagerAddressChanged(address  _newTroveManagerAddress);
event ActivePoolAddressChanged(address  _activePoolAddress);
event DefaultPoolAddressChanged(address  _defaultPoolAddress);
event StabilityPoolAddressChanged(address  _stabilityPoolAddress);
event GasPoolAddressChanged(address  _gasPoolAddress);
event CollSurplusPoolAddressChanged(address  _collSurplusPoolAddress);
event PriceFeedAddressChanged(address  _newPriceFeedAddress);
event SortedTrovesAddressChanged(address  _sortedTrovesAddress);
event ZUSDTokenAddressChanged(address  _zusdTokenAddress);
event ZEROStakingAddressChanged(address  _zeroStakingAddress);
event TroveCreated(address indexed _borrower, uint256  arrayIndex);
event TroveUpdated(address indexed _borrower, uint256  _debt, uint256  _coll, uint256  stake, enum BorrowerOperations.BorrowerOperation  operation);
event ZUSDBorrowingFeePaid(address indexed _borrower, uint256  _ZUSDFee);
```

## Functions

- [setAddresses(address _feeDistributorAddress, address _liquityBaseParamsAddress, address _troveManagerAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _sortedTrovesAddress, address _zusdTokenAddress, address _zeroStakingAddress)](#setaddresses)
- [setMassetAddress(address _massetAddress)](#setmassetaddress)
- [openTrove(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#opentrove)
- [openNueTrove(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#opennuetrove)
- [_openTrove(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint, address _tokensRecipient)](#_opentrove)
- [addColl(address _upperHint, address _lowerHint)](#addcoll)
- [moveETHGainToTrove(address _borrower, address _upperHint, address _lowerHint)](#moveethgaintotrove)
- [withdrawColl(uint256 _collWithdrawal, address _upperHint, address _lowerHint)](#withdrawcoll)
- [withdrawZUSD(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#withdrawzusd)
- [repayZUSD(uint256 _ZUSDAmount, address _upperHint, address _lowerHint)](#repayzusd)
- [adjustTrove(uint256 _maxFeePercentage, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint)](#adjusttrove)
- [adjustNueTrove(uint256 _maxFeePercentage, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint)](#adjustnuetrove)
- [_adjustTrove(address _borrower, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint256 _maxFeePercentage)](#_adjusttrove)
- [_adjustSenderTrove(address _borrower, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint256 _maxFeePercentage, address _tokensRecipient)](#_adjustsendertrove)
- [closeTrove()](#closetrove)
- [closeNueTrove()](#closenuetrove)
- [_closeTrove()](#_closetrove)
- [claimCollateral()](#claimcollateral)
- [_triggerBorrowingFee(ITroveManager _troveManager, IZUSDToken _zusdToken, uint256 _ZUSDAmount, uint256 _maxFeePercentage)](#_triggerborrowingfee)
- [_getUSDValue(uint256 _coll, uint256 _price)](#_getusdvalue)
- [_getCollChange(uint256 _collReceived, uint256 _requestedCollWithdrawal)](#_getcollchange)
- [_updateTroveFromAdjustment(ITroveManager _troveManager, address _borrower, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease)](#_updatetrovefromadjustment)
- [_moveTokensAndETHfromAdjustment(IActivePool _activePool, IZUSDToken _zusdToken, address _borrower, uint256 _collChange, bool _isCollIncrease, uint256 _ZUSDChange, bool _isDebtIncrease, uint256 _netDebtChange, address _tokensRecipient)](#_movetokensandethfromadjustment)
- [_activePoolAddColl(IActivePool _activePool, uint256 _amount)](#_activepooladdcoll)
- [_withdrawZUSD(IActivePool _activePool, IZUSDToken _zusdToken, address _account, uint256 _ZUSDAmount, uint256 _netDebtIncrease)](#_withdrawzusd)
- [_repayZUSD(IActivePool _activePool, IZUSDToken _zusdToken, address _account, uint256 _ZUSD)](#_repayzusd)
- [_requireSingularCollChange(uint256 _collWithdrawal)](#_requiresingularcollchange)
- [_requireCallerIsBorrower(address _borrower)](#_requirecallerisborrower)
- [_requireNonZeroAdjustment(uint256 _collWithdrawal, uint256 _ZUSDChange)](#_requirenonzeroadjustment)
- [_requireTroveisActive(ITroveManager _troveManager, address _borrower)](#_requiretroveisactive)
- [_requireTroveisNotActive(ITroveManager _troveManager, address _borrower)](#_requiretroveisnotactive)
- [_requireNonZeroDebtChange(uint256 _ZUSDChange)](#_requirenonzerodebtchange)
- [_requireNotInRecoveryMode(uint256 _price)](#_requirenotinrecoverymode)
- [_requireNoCollWithdrawal(uint256 _collWithdrawal)](#_requirenocollwithdrawal)
- [_requireValidAdjustmentInCurrentMode(bool _isRecoveryMode, uint256 _collWithdrawal, bool _isDebtIncrease, struct BorrowerOperations.LocalVariables_adjustTrove _vars)](#_requirevalidadjustmentincurrentmode)
- [_requireICRisAboveMCR(uint256 _newICR)](#_requireicrisabovemcr)
- [_requireICRisAboveCCR(uint256 _newICR)](#_requireicrisaboveccr)
- [_requireNewICRisAboveOldICR(uint256 _newICR, uint256 _oldICR)](#_requirenewicrisaboveoldicr)
- [_requireNewTCRisAboveCCR(uint256 _newTCR)](#_requirenewtcrisaboveccr)
- [_requireAtLeastMinNetDebt(uint256 _netDebt)](#_requireatleastminnetdebt)
- [_requireValidZUSDRepayment(uint256 _currentDebt, uint256 _debtRepayment)](#_requirevalidzusdrepayment)
- [_requireCallerIsStabilityPool()](#_requirecallerisstabilitypool)
- [_requireSufficientZUSDBalance(IZUSDToken _zusdToken, address _borrower, uint256 _debtRepayment)](#_requiresufficientzusdbalance)
- [_requireValidMaxFeePercentage(uint256 _maxFeePercentage, bool _isRecoveryMode)](#_requirevalidmaxfeepercentage)
- [_getNewNominalICRFromTroveChange(uint256 _coll, uint256 _debt, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease)](#_getnewnominalicrfromtrovechange)
- [_getNewICRFromTroveChange(uint256 _coll, uint256 _debt, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease, uint256 _price)](#_getnewicrfromtrovechange)
- [_getNewTroveAmounts(uint256 _coll, uint256 _debt, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease)](#_getnewtroveamounts)
- [_getNewTCRFromTroveChange(uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease, uint256 _price)](#_getnewtcrfromtrovechange)
- [getCompositeDebt(uint256 _debt)](#getcompositedebt)
- [BORROWING_FEE_FLOOR()](#borrowing_fee_floor)

---    

> ### setAddresses

```solidity
function setAddresses(address _feeDistributorAddress, address _liquityBaseParamsAddress, address _troveManagerAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _sortedTrovesAddress, address _zusdTokenAddress, address _zeroStakingAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _feeDistributorAddress | address |  | 
| _liquityBaseParamsAddress | address |  | 
| _troveManagerAddress | address |  | 
| _activePoolAddress | address |  | 
| _defaultPoolAddress | address |  | 
| _stabilityPoolAddress | address |  | 
| _gasPoolAddress | address |  | 
| _collSurplusPoolAddress | address |  | 
| _priceFeedAddress | address |  | 
| _sortedTrovesAddress | address |  | 
| _zusdTokenAddress | address |  | 
| _zeroStakingAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setAddresses(
        address _feeDistributorAddress,
        address _liquityBaseParamsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedTrovesAddress,
        address _zusdTokenAddress,
        address _zeroStakingAddress
    ) external override onlyOwner {
        // This makes impossible to open a trove with zero withdrawn ZUSD
        assert(MIN_NET_DEBT > 0);

        checkContract(_feeDistributorAddress);
        checkContract(_liquityBaseParamsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);
        checkContract(_defaultPoolAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_gasPoolAddress);
        checkContract(_collSurplusPoolAddress);
        checkContract(_priceFeedAddress);
        checkContract(_sortedTrovesAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_zeroStakingAddress);

        feeDistributor = IFeeDistributor(_feeDistributorAddress);
        liquityBaseParams = ILiquityBaseParams(_liquityBaseParamsAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        activePool = IActivePool(_activePoolAddress);
        defaultPool = IDefaultPool(_defaultPoolAddress);
        stabilityPoolAddress = _stabilityPoolAddress;
        gasPoolAddress = _gasPoolAddress;
        collSurplusPool = ICollSurplusPool(_collSurplusPoolAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        zeroStakingAddress = _zeroStakingAddress;
        zeroStaking = IZEROStaking(_zeroStakingAddress);

        emit FeeDistributorAddressChanged(_feeDistributorAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit GasPoolAddressChanged(_gasPoolAddress);
        emit CollSurplusPoolAddressChanged(_collSurplusPoolAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit SortedTrovesAddressChanged(_sortedTrovesAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit ZEROStakingAddressChanged(_zeroStakingAddress);
    }
```
</details>

---    

> ### setMassetAddress

```solidity
function setMassetAddress(address _massetAddress) external nonpayable onlyOwner 
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _massetAddress | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function setMassetAddress(address _massetAddress) external onlyOwner {
        masset = IMasset(_massetAddress);
    }
```
</details>

---    

> ### openTrove

```solidity
function openTrove(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 
| _ZUSDAmount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function openTrove(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        _openTrove(_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint, msg.sender);
    }
```
</details>

---    

> ### openNueTrove

```solidity
function openNueTrove(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 
| _ZUSDAmount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function openNueTrove(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        require(address(masset) != address(0), "Masset address not set");

        _openTrove(_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint, address(this));
        require(zusdToken.transfer(address(masset), _ZUSDAmount), "Couldn't execute ZUSD transfer");
        masset.onTokensMinted(_ZUSDAmount, address(zusdToken), abi.encode(msg.sender));
    }
```
</details>

---    

> ### _openTrove

```solidity
function _openTrove(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint, address _tokensRecipient) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 
| _ZUSDAmount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 
| _tokensRecipient | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _openTrove(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint,
        address _tokensRecipient
    ) internal {
        ContractsCache memory contractsCache = ContractsCache(troveManager, activePool, zusdToken);
        LocalVariables_openTrove memory vars;

        vars.price = priceFeed.fetchPrice();
        bool isRecoveryMode = _checkRecoveryMode(vars.price);

        _requireValidMaxFeePercentage(_maxFeePercentage, isRecoveryMode);
        _requireTroveisNotActive(contractsCache.troveManager, msg.sender);

        vars.ZUSDFee;
        vars.netDebt = _ZUSDAmount;

        if (!isRecoveryMode) {
            vars.ZUSDFee = _triggerBorrowingFee(
                contractsCache.troveManager,
                contractsCache.zusdToken,
                _ZUSDAmount,
                _maxFeePercentage
            );
            vars.netDebt = vars.netDebt.add(vars.ZUSDFee);
        }
        _requireAtLeastMinNetDebt(vars.netDebt);

        // ICR is based on the composite debt, i.e. the requested ZUSD amount + ZUSD borrowing fee + ZUSD gas comp.
        vars.compositeDebt = _getCompositeDebt(vars.netDebt);
        assert(vars.compositeDebt > 0);

        vars.ICR = LiquityMath._computeCR(msg.value, vars.compositeDebt, vars.price);
        vars.NICR = LiquityMath._computeNominalCR(msg.value, vars.compositeDebt);

        if (isRecoveryMode) {
            _requireICRisAboveCCR(vars.ICR);
        } else {
            _requireICRisAboveMCR(vars.ICR);
            uint256 newTCR = _getNewTCRFromTroveChange(
                msg.value,
                true,
                vars.compositeDebt,
                true,
                vars.price
            ); // bools: coll increase, debt increase
            _requireNewTCRisAboveCCR(newTCR);
        }

        // Set the trove struct's properties
        contractsCache.troveManager.setTroveStatus(msg.sender, 1);
        contractsCache.troveManager.increaseTroveColl(msg.sender, msg.value);
        contractsCache.troveManager.increaseTroveDebt(msg.sender, vars.compositeDebt);

        contractsCache.troveManager.updateTroveRewardSnapshots(msg.sender);
        vars.stake = contractsCache.troveManager.updateStakeAndTotalStakes(msg.sender);

        sortedTroves.insert(msg.sender, vars.NICR, _upperHint, _lowerHint);
        vars.arrayIndex = contractsCache.troveManager.addTroveOwnerToArray(msg.sender);
        emit TroveCreated(msg.sender, vars.arrayIndex);

        // Move the ether to the Active Pool, and mint the ZUSDAmount to the borrower
        _activePoolAddColl(contractsCache.activePool, msg.value);
        _withdrawZUSD(
            contractsCache.activePool,
            contractsCache.zusdToken,
            _tokensRecipient,
            _ZUSDAmount,
            vars.netDebt
        );
        // Move the ZUSD gas compensation to the Gas Pool
        _withdrawZUSD(
            contractsCache.activePool,
            contractsCache.zusdToken,
            gasPoolAddress,
            ZUSD_GAS_COMPENSATION,
            ZUSD_GAS_COMPENSATION
        );

        emit TroveUpdated(
            msg.sender,
            vars.compositeDebt,
            msg.value,
            vars.stake,
            BorrowerOperation.openTrove
        );
        emit ZUSDBorrowingFeePaid(msg.sender, vars.ZUSDFee);
    }
```
</details>

---    

> ### addColl

```solidity
function addColl(address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function addColl(address _upperHint, address _lowerHint) external payable override {
        _adjustTrove(msg.sender, 0, 0, false, _upperHint, _lowerHint, 0);
    }
```
</details>

---    

> ### moveETHGainToTrove

```solidity
function moveETHGainToTrove(address _borrower, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function moveETHGainToTrove(
        address _borrower,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        _requireCallerIsStabilityPool();
        _adjustTrove(_borrower, 0, 0, false, _upperHint, _lowerHint, 0);
    }
```
</details>

---    

> ### withdrawColl

```solidity
function withdrawColl(uint256 _collWithdrawal, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collWithdrawal | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function withdrawColl(
        uint256 _collWithdrawal,
        address _upperHint,
        address _lowerHint
    ) external override {
        _adjustTrove(msg.sender, _collWithdrawal, 0, false, _upperHint, _lowerHint, 0);
    }
```
</details>

---    

> ### withdrawZUSD

```solidity
function withdrawZUSD(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 
| _ZUSDAmount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function withdrawZUSD(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external override {
        _adjustTrove(msg.sender, 0, _ZUSDAmount, true, _upperHint, _lowerHint, _maxFeePercentage);
    }
```
</details>

---    

> ### repayZUSD

```solidity
function repayZUSD(uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDAmount | uint256 |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function repayZUSD(
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external override {
        _adjustTrove(msg.sender, 0, _ZUSDAmount, false, _upperHint, _lowerHint, 0);
    }
```
</details>

---    

> ### adjustTrove

```solidity
function adjustTrove(uint256 _maxFeePercentage, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 
| _collWithdrawal | uint256 |  | 
| _ZUSDChange | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function adjustTrove(
        uint256 _maxFeePercentage,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        _adjustTrove(
            msg.sender,
            _collWithdrawal,
            _ZUSDChange,
            _isDebtIncrease,
            _upperHint,
            _lowerHint,
            _maxFeePercentage
        );
    }
```
</details>

---    

> ### adjustNueTrove

```solidity
function adjustNueTrove(uint256 _maxFeePercentage, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint) external payable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 
| _collWithdrawal | uint256 |  | 
| _ZUSDChange | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function adjustNueTrove(
        uint256 _maxFeePercentage,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        require(address(masset) != address(0), "Masset address not set");

        if (!_isDebtIncrease && _ZUSDChange > 0) {
            masset.redeemByBridge(address(zusdToken), _ZUSDChange, msg.sender);
        }
        _adjustSenderTrove(
            msg.sender,
            _collWithdrawal,
            _ZUSDChange,
            _isDebtIncrease,
            _upperHint,
            _lowerHint,
            _maxFeePercentage,
            address(this)
        );
        if (_isDebtIncrease && _ZUSDChange > 0) {
            require(
                zusdToken.transfer(address(masset), _ZUSDChange),
                "Couldn't execute ZUSD transfer"
            );
            masset.onTokensMinted(_ZUSDChange, address(zusdToken), abi.encode(msg.sender));
        }
    }
```
</details>

---    

> ### _adjustTrove

```solidity
function _adjustTrove(address _borrower, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint256 _maxFeePercentage) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _collWithdrawal | uint256 |  | 
| _ZUSDChange | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 
| _maxFeePercentage | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _adjustTrove(
        address _borrower,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint,
        uint256 _maxFeePercentage
    ) internal {
        _adjustSenderTrove(
            _borrower,
            _collWithdrawal,
            _ZUSDChange,
            _isDebtIncrease,
            _upperHint,
            _lowerHint,
            _maxFeePercentage,
            msg.sender
        );
    }
```
</details>

---    

> ### _adjustSenderTrove

```solidity
function _adjustSenderTrove(address _borrower, uint256 _collWithdrawal, uint256 _ZUSDChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint256 _maxFeePercentage, address _tokensRecipient) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 
| _collWithdrawal | uint256 |  | 
| _ZUSDChange | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _upperHint | address |  | 
| _lowerHint | address |  | 
| _maxFeePercentage | uint256 |  | 
| _tokensRecipient | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _adjustSenderTrove(
        address _borrower,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint,
        uint256 _maxFeePercentage,
        address _tokensRecipient
    ) internal {
        ContractsCache memory contractsCache = ContractsCache(troveManager, activePool, zusdToken);
        LocalVariables_adjustTrove memory vars;

        vars.price = priceFeed.fetchPrice();
        vars.isRecoveryMode = _checkRecoveryMode(vars.price);

        if (_isDebtIncrease) {
            _requireValidMaxFeePercentage(_maxFeePercentage, vars.isRecoveryMode);
            _requireNonZeroDebtChange(_ZUSDChange);
        }
        _requireSingularCollChange(_collWithdrawal);
        _requireNonZeroAdjustment(_collWithdrawal, _ZUSDChange);
        _requireTroveisActive(contractsCache.troveManager, _borrower);

        // Confirm the operation is either a borrower adjusting their own trove, or a pure ETH transfer from the Stability Pool to a trove
        assert(
            msg.sender == _borrower ||
                (msg.sender == stabilityPoolAddress && msg.value > 0 && _ZUSDChange == 0)
        );

        contractsCache.troveManager.applyPendingRewards(_borrower);

        // Get the collChange based on whether or not ETH was sent in the transaction
        (vars.collChange, vars.isCollIncrease) = _getCollChange(msg.value, _collWithdrawal);

        vars.netDebtChange = _ZUSDChange;

        // If the adjustment incorporates a debt increase and system is in Normal Mode, then trigger a borrowing fee
        if (_isDebtIncrease && !vars.isRecoveryMode) {
            vars.ZUSDFee = _triggerBorrowingFee(
                contractsCache.troveManager,
                contractsCache.zusdToken,
                _ZUSDChange,
                _maxFeePercentage
            );
            vars.netDebtChange = vars.netDebtChange.add(vars.ZUSDFee); // The raw debt change includes the fee
        }

        vars.debt = contractsCache.troveManager.getTroveDebt(_borrower);
        vars.coll = contractsCache.troveManager.getTroveColl(_borrower);

        // Get the trove's old ICR before the adjustment, and what its new ICR will be after the adjustment
        vars.oldICR = LiquityMath._computeCR(vars.coll, vars.debt, vars.price);
        vars.newICR = _getNewICRFromTroveChange(
            vars.coll,
            vars.debt,
            vars.collChange,
            vars.isCollIncrease,
            vars.netDebtChange,
            _isDebtIncrease,
            vars.price
        );
        assert(_collWithdrawal <= vars.coll);

        // Check the adjustment satisfies all conditions for the current system mode
        _requireValidAdjustmentInCurrentMode(
            vars.isRecoveryMode,
            _collWithdrawal,
            _isDebtIncrease,
            vars
        );

        // When the adjustment is a debt repayment, check it's a valid amount and that the caller has enough ZUSD
        if (!_isDebtIncrease && _ZUSDChange > 0) {
            _requireAtLeastMinNetDebt(_getNetDebt(vars.debt).sub(vars.netDebtChange));
            _requireValidZUSDRepayment(vars.debt, vars.netDebtChange);
            _requireSufficientZUSDBalance(contractsCache.zusdToken, _borrower, vars.netDebtChange);
        }

        (vars.newColl, vars.newDebt) = _updateTroveFromAdjustment(
            contractsCache.troveManager,
            _borrower,
            vars.collChange,
            vars.isCollIncrease,
            vars.netDebtChange,
            _isDebtIncrease
        );
        vars.stake = contractsCache.troveManager.updateStakeAndTotalStakes(_borrower);

        // Re-insert trove in to the sorted list
        vars.newNICR = _getNewNominalICRFromTroveChange(
            vars.coll,
            vars.debt,
            vars.collChange,
            vars.isCollIncrease,
            vars.netDebtChange,
            _isDebtIncrease
        );
        sortedTroves.reInsert(_borrower, vars.newNICR, _upperHint, _lowerHint);

        emit TroveUpdated(
            _borrower,
            vars.newDebt,
            vars.newColl,
            vars.stake,
            BorrowerOperation.adjustTrove
        );
        emit ZUSDBorrowingFeePaid(msg.sender, vars.ZUSDFee);

        // Use the unmodified _ZUSDChange here, as we don't send the fee to the user
        _moveTokensAndETHfromAdjustment(
            contractsCache.activePool,
            contractsCache.zusdToken,
            msg.sender,
            vars.collChange,
            vars.isCollIncrease,
            _ZUSDChange,
            _isDebtIncrease,
            vars.netDebtChange,
            _tokensRecipient
        );
    }
```
</details>

---    

> ### closeTrove

```solidity
function closeTrove() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function closeTrove() external override {
        _closeTrove();
    }
```
</details>

---    

> ### closeNueTrove

```solidity
function closeNueTrove() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function closeNueTrove() external override {
        require(address(masset) != address(0), "Masset address not set");

        uint256 debt = troveManager.getTroveDebt(msg.sender);

        masset.redeemByBridge(address(zusdToken), debt.sub(ZUSD_GAS_COMPENSATION), msg.sender);
        _closeTrove();
    }
```
</details>

---    

> ### _closeTrove

```solidity
function _closeTrove() internal nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _closeTrove() internal {
        ITroveManager troveManagerCached = troveManager;
        IActivePool activePoolCached = activePool;
        IZUSDToken zusdTokenCached = zusdToken;

        _requireTroveisActive(troveManagerCached, msg.sender);
        uint256 price = priceFeed.fetchPrice();
        _requireNotInRecoveryMode(price);

        troveManagerCached.applyPendingRewards(msg.sender);

        uint256 coll = troveManagerCached.getTroveColl(msg.sender);
        uint256 debt = troveManagerCached.getTroveDebt(msg.sender);

        _requireSufficientZUSDBalance(zusdTokenCached, msg.sender, debt.sub(ZUSD_GAS_COMPENSATION));

        uint256 newTCR = _getNewTCRFromTroveChange(coll, false, debt, false, price);
        _requireNewTCRisAboveCCR(newTCR);

        troveManagerCached.removeStake(msg.sender);
        troveManagerCached.closeTrove(msg.sender);

        emit TroveUpdated(msg.sender, 0, 0, 0, BorrowerOperation.closeTrove);

        // Burn the repaid ZUSD from the user's balance and the gas compensation from the Gas Pool
        _repayZUSD(activePoolCached, zusdTokenCached, msg.sender, debt.sub(ZUSD_GAS_COMPENSATION));
        _repayZUSD(activePoolCached, zusdTokenCached, gasPoolAddress, ZUSD_GAS_COMPENSATION);

        // Send the collateral back to the user
        activePoolCached.sendETH(msg.sender, coll);
    }
```
</details>

---    

> ### claimCollateral

```solidity
function claimCollateral() external nonpayable
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function claimCollateral() external override {
        // send ETH from CollSurplus Pool to owner
        collSurplusPool.claimColl(msg.sender);
    }
```
</details>

---    

> ### _triggerBorrowingFee

```solidity
function _triggerBorrowingFee(ITroveManager _troveManager, IZUSDToken _zusdToken, uint256 _ZUSDAmount, uint256 _maxFeePercentage) internal nonpayable
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 
| _zusdToken | IZUSDToken |  | 
| _ZUSDAmount | uint256 |  | 
| _maxFeePercentage | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _triggerBorrowingFee(
        ITroveManager _troveManager,
        IZUSDToken _zusdToken,
        uint256 _ZUSDAmount,
        uint256 _maxFeePercentage
    ) internal returns (uint256) {
        _troveManager.decayBaseRateFromBorrowing(); // decay the baseRate state variable
        uint256 ZUSDFee = _troveManager.getBorrowingFee(_ZUSDAmount);

        _requireUserAcceptsFee(ZUSDFee, _ZUSDAmount, _maxFeePercentage);
        _zusdToken.mint(address(feeDistributor), ZUSDFee);
        feeDistributor.distributeFees();

        return ZUSDFee;
    }
```
</details>

---    

> ### _getUSDValue

```solidity
function _getUSDValue(uint256 _coll, uint256 _price) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _coll | uint256 |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getUSDValue(uint256 _coll, uint256 _price) internal pure returns (uint256) {
        uint256 usdValue = _price.mul(_coll).div(DECIMAL_PRECISION);

        return usdValue;
    }
```
</details>

---    

> ### _getCollChange

```solidity
function _getCollChange(uint256 _collReceived, uint256 _requestedCollWithdrawal) internal pure
returns(collChange uint256, isCollIncrease bool)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collReceived | uint256 |  | 
| _requestedCollWithdrawal | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getCollChange(uint256 _collReceived, uint256 _requestedCollWithdrawal)
        internal
        pure
        returns (uint256 collChange, bool isCollIncrease)
    {
        if (_collReceived != 0) {
            collChange = _collReceived;
            isCollIncrease = true;
        } else {
            collChange = _requestedCollWithdrawal;
        }
    }
```
</details>

---    

> ### _updateTroveFromAdjustment

```solidity
function _updateTroveFromAdjustment(ITroveManager _troveManager, address _borrower, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease) internal nonpayable
returns(uint256, uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 
| _borrower | address |  | 
| _collChange | uint256 |  | 
| _isCollIncrease | bool |  | 
| _debtChange | uint256 |  | 
| _isDebtIncrease | bool |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _updateTroveFromAdjustment(
        ITroveManager _troveManager,
        address _borrower,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) internal returns (uint256, uint256) {
        uint256 newColl = (_isCollIncrease)
            ? _troveManager.increaseTroveColl(_borrower, _collChange)
            : _troveManager.decreaseTroveColl(_borrower, _collChange);
        uint256 newDebt = (_isDebtIncrease)
            ? _troveManager.increaseTroveDebt(_borrower, _debtChange)
            : _troveManager.decreaseTroveDebt(_borrower, _debtChange);

        return (newColl, newDebt);
    }
```
</details>

---    

> ### _moveTokensAndETHfromAdjustment

```solidity
function _moveTokensAndETHfromAdjustment(IActivePool _activePool, IZUSDToken _zusdToken, address _borrower, uint256 _collChange, bool _isCollIncrease, uint256 _ZUSDChange, bool _isDebtIncrease, uint256 _netDebtChange, address _tokensRecipient) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _zusdToken | IZUSDToken |  | 
| _borrower | address |  | 
| _collChange | uint256 |  | 
| _isCollIncrease | bool |  | 
| _ZUSDChange | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _netDebtChange | uint256 |  | 
| _tokensRecipient | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _moveTokensAndETHfromAdjustment(
        IActivePool _activePool,
        IZUSDToken _zusdToken,
        address _borrower,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        uint256 _netDebtChange,
        address _tokensRecipient
    ) internal {
        if (_isDebtIncrease) {
            _withdrawZUSD(_activePool, _zusdToken, _tokensRecipient, _ZUSDChange, _netDebtChange);
        } else {
            _repayZUSD(_activePool, _zusdToken, _borrower, _ZUSDChange);
        }

        if (_isCollIncrease) {
            _activePoolAddColl(_activePool, _collChange);
        } else {
            _activePool.sendETH(_borrower, _collChange);
        }
    }
```
</details>

---    

> ### _activePoolAddColl

```solidity
function _activePoolAddColl(IActivePool _activePool, uint256 _amount) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _amount | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _activePoolAddColl(IActivePool _activePool, uint256 _amount) internal {
        (bool success, ) = address(_activePool).call{value: _amount}("");
        require(success, "BorrowerOps: Sending ETH to ActivePool failed");
    }
```
</details>

---    

> ### _withdrawZUSD

```solidity
function _withdrawZUSD(IActivePool _activePool, IZUSDToken _zusdToken, address _account, uint256 _ZUSDAmount, uint256 _netDebtIncrease) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _zusdToken | IZUSDToken |  | 
| _account | address |  | 
| _ZUSDAmount | uint256 |  | 
| _netDebtIncrease | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _withdrawZUSD(
        IActivePool _activePool,
        IZUSDToken _zusdToken,
        address _account,
        uint256 _ZUSDAmount,
        uint256 _netDebtIncrease
    ) internal {
        _activePool.increaseZUSDDebt(_netDebtIncrease);
        _zusdToken.mint(_account, _ZUSDAmount);
    }
```
</details>

---    

> ### _repayZUSD

```solidity
function _repayZUSD(IActivePool _activePool, IZUSDToken _zusdToken, address _account, uint256 _ZUSD) internal nonpayable
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _activePool | IActivePool |  | 
| _zusdToken | IZUSDToken |  | 
| _account | address |  | 
| _ZUSD | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _repayZUSD(
        IActivePool _activePool,
        IZUSDToken _zusdToken,
        address _account,
        uint256 _ZUSD
    ) internal {
        _activePool.decreaseZUSDDebt(_ZUSD);
        _zusdToken.burn(_account, _ZUSD);
    }
```
</details>

---    

> ### _requireSingularCollChange

```solidity
function _requireSingularCollChange(uint256 _collWithdrawal) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collWithdrawal | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireSingularCollChange(uint256 _collWithdrawal) internal view {
        require(
            msg.value == 0 || _collWithdrawal == 0,
            "BorrowerOperations: Cannot withdraw and add coll"
        );
    }
```
</details>

---    

> ### _requireCallerIsBorrower

```solidity
function _requireCallerIsBorrower(address _borrower) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsBorrower(address _borrower) internal view {
        require(
            msg.sender == _borrower,
            "BorrowerOps: Caller must be the borrower for a withdrawal"
        );
    }
```
</details>

---    

> ### _requireNonZeroAdjustment

```solidity
function _requireNonZeroAdjustment(uint256 _collWithdrawal, uint256 _ZUSDChange) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collWithdrawal | uint256 |  | 
| _ZUSDChange | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireNonZeroAdjustment(uint256 _collWithdrawal, uint256 _ZUSDChange) internal view {
        require(
            msg.value != 0 || _collWithdrawal != 0 || _ZUSDChange != 0,
            "BorrowerOps: There must be either a collateral change or a debt change"
        );
    }
```
</details>

---    

> ### _requireTroveisActive

```solidity
function _requireTroveisActive(ITroveManager _troveManager, address _borrower) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireTroveisActive(ITroveManager _troveManager, address _borrower) internal view {
        uint256 status = _troveManager.getTroveStatus(_borrower);
        require(status == 1, "BorrowerOps: Trove does not exist or is closed");
    }
```
</details>

---    

> ### _requireTroveisNotActive

```solidity
function _requireTroveisNotActive(ITroveManager _troveManager, address _borrower) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _troveManager | ITroveManager |  | 
| _borrower | address |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireTroveisNotActive(ITroveManager _troveManager, address _borrower) internal view {
        uint256 status = _troveManager.getTroveStatus(_borrower);
        require(status != 1, "BorrowerOps: Trove is active");
    }
```
</details>

---    

> ### _requireNonZeroDebtChange

```solidity
function _requireNonZeroDebtChange(uint256 _ZUSDChange) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _ZUSDChange | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireNonZeroDebtChange(uint256 _ZUSDChange) internal pure {
        require(_ZUSDChange > 0, "BorrowerOps: Debt increase requires non-zero debtChange");
    }
```
</details>

---    

> ### _requireNotInRecoveryMode

```solidity
function _requireNotInRecoveryMode(uint256 _price) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireNotInRecoveryMode(uint256 _price) internal view {
        require(
            !_checkRecoveryMode(_price),
            "BorrowerOps: Operation not permitted during Recovery Mode"
        );
    }
```
</details>

---    

> ### _requireNoCollWithdrawal

```solidity
function _requireNoCollWithdrawal(uint256 _collWithdrawal) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collWithdrawal | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireNoCollWithdrawal(uint256 _collWithdrawal) internal pure {
        require(
            _collWithdrawal == 0,
            "BorrowerOps: Collateral withdrawal not permitted Recovery Mode"
        );
    }
```
</details>

---    

> ### _requireValidAdjustmentInCurrentMode

```solidity
function _requireValidAdjustmentInCurrentMode(bool _isRecoveryMode, uint256 _collWithdrawal, bool _isDebtIncrease, struct BorrowerOperations.LocalVariables_adjustTrove _vars) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _isRecoveryMode | bool |  | 
| _collWithdrawal | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _vars | struct BorrowerOperations.LocalVariables_adjustTrove |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireValidAdjustmentInCurrentMode(
        bool _isRecoveryMode,
        uint256 _collWithdrawal,
        bool _isDebtIncrease,
        LocalVariables_adjustTrove memory _vars
    ) internal view {
        /*
         *In Recovery Mode, only allow:
         *
         * - Pure collateral top-up
         * - Pure debt repayment
         * - Collateral top-up with debt repayment
         * - A debt increase combined with a collateral top-up which makes the ICR >= 150% and improves the ICR (and by extension improves the TCR).
         *
         * In Normal Mode, ensure:
         *
         * - The new ICR is above MCR
         * - The adjustment won't pull the TCR below CCR
         */
        if (_isRecoveryMode) {
            _requireNoCollWithdrawal(_collWithdrawal);
            if (_isDebtIncrease) {
                _requireICRisAboveCCR(_vars.newICR);
                _requireNewICRisAboveOldICR(_vars.newICR, _vars.oldICR);
            }
        } else {
            // if Normal Mode
            _requireICRisAboveMCR(_vars.newICR);
            _vars.newTCR = _getNewTCRFromTroveChange(
                _vars.collChange,
                _vars.isCollIncrease,
                _vars.netDebtChange,
                _isDebtIncrease,
                _vars.price
            );
            _requireNewTCRisAboveCCR(_vars.newTCR);
        }
    }
```
</details>

---    

> ### _requireICRisAboveMCR

```solidity
function _requireICRisAboveMCR(uint256 _newICR) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _newICR | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireICRisAboveMCR(uint256 _newICR) internal view {
        require(
            _newICR >= liquityBaseParams.MCR(),
            "BorrowerOps: An operation that would result in ICR < MCR is not permitted"
        );
    }
```
</details>

---    

> ### _requireICRisAboveCCR

```solidity
function _requireICRisAboveCCR(uint256 _newICR) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _newICR | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireICRisAboveCCR(uint256 _newICR) internal view {
        require(
            _newICR >= liquityBaseParams.CCR(),
            "BorrowerOps: Operation must leave trove with ICR >= CCR"
        );
    }
```
</details>

---    

> ### _requireNewICRisAboveOldICR

```solidity
function _requireNewICRisAboveOldICR(uint256 _newICR, uint256 _oldICR) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _newICR | uint256 |  | 
| _oldICR | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireNewICRisAboveOldICR(uint256 _newICR, uint256 _oldICR) internal pure {
        require(
            _newICR >= _oldICR,
            "BorrowerOps: Cannot decrease your Trove's ICR in Recovery Mode"
        );
    }
```
</details>

---    

> ### _requireNewTCRisAboveCCR

```solidity
function _requireNewTCRisAboveCCR(uint256 _newTCR) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _newTCR | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireNewTCRisAboveCCR(uint256 _newTCR) internal view {
        require(
            _newTCR >= liquityBaseParams.CCR(),
            "BorrowerOps: An operation that would result in TCR < CCR is not permitted"
        );
    }
```
</details>

---    

> ### _requireAtLeastMinNetDebt

```solidity
function _requireAtLeastMinNetDebt(uint256 _netDebt) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _netDebt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireAtLeastMinNetDebt(uint256 _netDebt) internal pure {
        require(
            _netDebt >= MIN_NET_DEBT,
            "BorrowerOps: Trove's net debt must be greater than minimum"
        );
    }
```
</details>

---    

> ### _requireValidZUSDRepayment

```solidity
function _requireValidZUSDRepayment(uint256 _currentDebt, uint256 _debtRepayment) internal pure
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _currentDebt | uint256 |  | 
| _debtRepayment | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireValidZUSDRepayment(uint256 _currentDebt, uint256 _debtRepayment) internal pure {
        require(
            _debtRepayment <= _currentDebt.sub(ZUSD_GAS_COMPENSATION),
            "BorrowerOps: Amount repaid must not be larger than the Trove's debt"
        );
    }
```
</details>

---    

> ### _requireCallerIsStabilityPool

```solidity
function _requireCallerIsStabilityPool() internal view
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "BorrowerOps: Caller is not Stability Pool");
    }
```
</details>

---    

> ### _requireSufficientZUSDBalance

```solidity
function _requireSufficientZUSDBalance(IZUSDToken _zusdToken, address _borrower, uint256 _debtRepayment) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _zusdToken | IZUSDToken |  | 
| _borrower | address |  | 
| _debtRepayment | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireSufficientZUSDBalance(
        IZUSDToken _zusdToken,
        address _borrower,
        uint256 _debtRepayment
    ) internal view {
        require(
            _zusdToken.balanceOf(_borrower) >= _debtRepayment,
            "BorrowerOps: Caller doesnt have enough ZUSD to make repayment"
        );
    }
```
</details>

---    

> ### _requireValidMaxFeePercentage

```solidity
function _requireValidMaxFeePercentage(uint256 _maxFeePercentage, bool _isRecoveryMode) internal view
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _maxFeePercentage | uint256 |  | 
| _isRecoveryMode | bool |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _requireValidMaxFeePercentage(uint256 _maxFeePercentage, bool _isRecoveryMode)
        internal
        view
    {
        if (_isRecoveryMode) {
            require(
                _maxFeePercentage <= DECIMAL_PRECISION,
                "Max fee percentage must less than or equal to 100%"
            );
        } else {
            require(
                _maxFeePercentage >= liquityBaseParams.BORROWING_FEE_FLOOR() &&
                    _maxFeePercentage <= DECIMAL_PRECISION,
                "Max fee percentage must be between 0.5% and 100%"
            );
        }
    }
```
</details>

---    

> ### _getNewNominalICRFromTroveChange

```solidity
function _getNewNominalICRFromTroveChange(uint256 _coll, uint256 _debt, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _coll | uint256 |  | 
| _debt | uint256 |  | 
| _collChange | uint256 |  | 
| _isCollIncrease | bool |  | 
| _debtChange | uint256 |  | 
| _isDebtIncrease | bool |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getNewNominalICRFromTroveChange(
        uint256 _coll,
        uint256 _debt,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) internal pure returns (uint256) {
        (uint256 newColl, uint256 newDebt) = _getNewTroveAmounts(
            _coll,
            _debt,
            _collChange,
            _isCollIncrease,
            _debtChange,
            _isDebtIncrease
        );

        uint256 newNICR = LiquityMath._computeNominalCR(newColl, newDebt);
        return newNICR;
    }
```
</details>

---    

> ### _getNewICRFromTroveChange

```solidity
function _getNewICRFromTroveChange(uint256 _coll, uint256 _debt, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease, uint256 _price) internal pure
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _coll | uint256 |  | 
| _debt | uint256 |  | 
| _collChange | uint256 |  | 
| _isCollIncrease | bool |  | 
| _debtChange | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getNewICRFromTroveChange(
        uint256 _coll,
        uint256 _debt,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease,
        uint256 _price
    ) internal pure returns (uint256) {
        (uint256 newColl, uint256 newDebt) = _getNewTroveAmounts(
            _coll,
            _debt,
            _collChange,
            _isCollIncrease,
            _debtChange,
            _isDebtIncrease
        );

        uint256 newICR = LiquityMath._computeCR(newColl, newDebt, _price);
        return newICR;
    }
```
</details>

---    

> ### _getNewTroveAmounts

```solidity
function _getNewTroveAmounts(uint256 _coll, uint256 _debt, uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease) internal pure
returns(uint256, uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _coll | uint256 |  | 
| _debt | uint256 |  | 
| _collChange | uint256 |  | 
| _isCollIncrease | bool |  | 
| _debtChange | uint256 |  | 
| _isDebtIncrease | bool |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getNewTroveAmounts(
        uint256 _coll,
        uint256 _debt,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) internal pure returns (uint256, uint256) {
        uint256 newColl = _coll;
        uint256 newDebt = _debt;

        newColl = _isCollIncrease ? _coll.add(_collChange) : _coll.sub(_collChange);
        newDebt = _isDebtIncrease ? _debt.add(_debtChange) : _debt.sub(_debtChange);

        return (newColl, newDebt);
    }
```
</details>

---    

> ### _getNewTCRFromTroveChange

```solidity
function _getNewTCRFromTroveChange(uint256 _collChange, bool _isCollIncrease, uint256 _debtChange, bool _isDebtIncrease, uint256 _price) internal view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _collChange | uint256 |  | 
| _isCollIncrease | bool |  | 
| _debtChange | uint256 |  | 
| _isDebtIncrease | bool |  | 
| _price | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function _getNewTCRFromTroveChange(
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease,
        uint256 _price
    ) internal view returns (uint256) {
        uint256 totalColl = getEntireSystemColl();
        uint256 totalDebt = getEntireSystemDebt();

        totalColl = _isCollIncrease ? totalColl.add(_collChange) : totalColl.sub(_collChange);
        totalDebt = _isDebtIncrease ? totalDebt.add(_debtChange) : totalDebt.sub(_debtChange);

        uint256 newTCR = LiquityMath._computeCR(totalColl, totalDebt, _price);
        return newTCR;
    }
```
</details>

---    

> ### getCompositeDebt

```solidity
function getCompositeDebt(uint256 _debt) external view
returns(uint256)
```

**Arguments**

| Name        | Type           | Description  |
| ------------- |------------- | -----|
| _debt | uint256 |  | 

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function getCompositeDebt(uint256 _debt) external view override returns (uint256) {
        return _getCompositeDebt(_debt);
    }
```
</details>

---    

> ### BORROWING_FEE_FLOOR

```solidity
function BORROWING_FEE_FLOOR() external view
returns(uint256)
```

<details>
	<summary><strong>Source Code</strong></summary>

```javascript
function BORROWING_FEE_FLOOR() external view override returns (uint256) {
        return liquityBaseParams.BORROWING_FEE_FLOOR();
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
