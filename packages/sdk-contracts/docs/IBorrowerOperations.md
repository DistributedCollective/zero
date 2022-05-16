# IBorrowerOperations





Common interface for the Trove Manager.



## Methods

### BORROWING_FEE_FLOOR

```solidity
function BORROWING_FEE_FLOOR() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### addColl

```solidity
function addColl(address _upperHint, address _lowerHint) external payable
```

payable function that adds the received Ether to the caller&#39;s active Trove.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### adjustNueTrove

```solidity
function adjustNueTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable
```

enables a borrower to simultaneously change both their collateral and debt, subject to all the restrictions that apply to individual increases/decreases of each quantity with the following particularity:  if the adjustment reduces the collateralization ratio of the Trove, the function only executes if the resulting total collateralization ratio is above 150%.  The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.  The parameter is ignored if the debt is not increased with the transaction. This method is identical to `adjustTrove()`, but operates on NUE tokens instead of ZUSD.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage |
| _collWithdrawal | uint256 | collateral amount to withdraw  |
| _debtChange | uint256 | ZUSD amount to change  |
| isDebtIncrease | bool | indicates if increases debt |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### adjustTrove

```solidity
function adjustTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable
```

enables a borrower to simultaneously change both their collateral and debt, subject to all the restrictions that apply to individual increases/decreases of each quantity with the following particularity:  if the adjustment reduces the collateralization ratio of the Trove, the function only executes if the resulting total collateralization ratio is above 150%.  The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.  The parameter is ignored if the debt is not increased with the transaction.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage |
| _collWithdrawal | uint256 | collateral amount to withdraw  |
| _debtChange | uint256 | ZUSD amount to change  |
| isDebtIncrease | bool | indicates if increases debt |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### claimCollateral

```solidity
function claimCollateral() external nonpayable
```

when a borrower’s Trove has been fully redeemed from and closed, or liquidated in Recovery Mode with a collateralization ratio above 110%,  this function allows the borrower to claim their ETH collateral surplus that remains in the system (collateral - debt upon redemption; collateral - 110% of the debt upon liquidation). 




### closeNueTrove

```solidity
function closeNueTrove() external nonpayable
```

allows a borrower to repay all debt, withdraw all their collateral, and close their Trove.  Requires the borrower have a NUE balance sufficient to repay their trove&#39;s debt, excluding gas compensation - i.e. `(debt - 50)` NUE. This method is identical to `closeTrove()`, but operates on NUE tokens instead of ZUSD.




### closeTrove

```solidity
function closeTrove() external nonpayable
```

allows a borrower to repay all debt, withdraw all their collateral, and close their Trove.  Requires the borrower have a ZUSD balance sufficient to repay their trove&#39;s debt, excluding gas compensation - i.e. `(debt - 50)` ZUSD.




### getCompositeDebt

```solidity
function getCompositeDebt(uint256 _debt) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _debt | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### moveETHGainToTrove

```solidity
function moveETHGainToTrove(address _user, address _upperHint, address _lowerHint) external payable
```

send ETH as collateral to a trove. Called by only the Stability Pool.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | user trove address |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### openNueTrove

```solidity
function openNueTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

payable function that creates a Trove for the caller with the requested debt, and the Ether received as collateral. Successful execution is conditional mainly on the resulting collateralization ratio which must exceed the minimum (110% in Normal Mode, 150% in Recovery Mode). In addition to the requested debt, extra debt is issued to pay the issuance fee, and cover the gas compensation.  The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee. This method is identical to `openTrove()`, but operates on NUE tokens instead of ZUSD.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage |
| _ZUSDAmount | uint256 | ZUSD requested debt  |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### openTrove

```solidity
function openTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable
```

payable function that creates a Trove for the caller with the requested debt, and the Ether received as collateral. Successful execution is conditional mainly on the resulting collateralization ratio which must exceed the minimum (110% in Normal Mode, 150% in Recovery Mode). In addition to the requested debt, extra debt is issued to pay the issuance fee, and cover the gas compensation.  The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee. 



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage |
| _ZUSDAmount | uint256 | ZUSD requested debt  |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### repayZUSD

```solidity
function repayZUSD(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

repay `_amount` of ZUSD to the caller’s Trove, subject to leaving 50 debt in the Trove (which corresponds to the 50 ZUSD gas compensation).



#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | ZUSD amount to repay |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### setAddresses

```solidity
function setAddresses(address _feeDistributorAddress, address _liquityBaseParamsAddress, address _troveManagerAddress, address _activePoolAddress, address _defaultPoolAddress, address _stabilityPoolAddress, address _gasPoolAddress, address _collSurplusPoolAddress, address _priceFeedAddress, address _sortedTrovesAddress, address _zusdTokenAddress, address _zeroStakingAddress) external nonpayable
```

Called only once on init, to set addresses of other Liquity contracts. Callable only by owner

*initializer function, checks addresses are contracts*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _feeDistributorAddress | address | feeDistributor contract address |
| _liquityBaseParamsAddress | address | LiquidityBaseParams contract address |
| _troveManagerAddress | address | TroveManager contract address |
| _activePoolAddress | address | ActivePool contract address |
| _defaultPoolAddress | address | DefaultPool contract address |
| _stabilityPoolAddress | address | StabilityPool contract address |
| _gasPoolAddress | address | GasPool contract address |
| _collSurplusPoolAddress | address | CollSurplusPool contract address |
| _priceFeedAddress | address | PrideFeed contract address |
| _sortedTrovesAddress | address | SortedTroves contract address |
| _zusdTokenAddress | address | ZUSDToken contract address |
| _zeroStakingAddress | address | ZEROStaking contract address |

### withdrawColl

```solidity
function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

withdraws `_amount` of collateral from the caller’s Trove.  Executes only if the user has an active Trove, the withdrawal would not pull the user’s Trove below the minimum collateralization ratio,  and the resulting total collateralization ratio of the system is above 150%. 



#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | collateral amount to withdraw  |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |

### withdrawZUSD

```solidity
function withdrawZUSD(uint256 _maxFee, uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```

issues `_amount` of ZUSD from the caller’s Trove to the caller.  Executes only if the Trove&#39;s collateralization ratio would remain above the minimum, and the resulting total collateralization ratio is above 150%.  The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | max fee percentage to acept in case of a fee slippage |
| _amount | uint256 | ZUSD amount to withdraw  |
| _upperHint | address | upper trove id hint |
| _lowerHint | address | lower trove id hint |



## Events

### ActivePoolAddressChanged

```solidity
event ActivePoolAddressChanged(address _activePoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _activePoolAddress  | address | undefined |

### CollSurplusPoolAddressChanged

```solidity
event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _collSurplusPoolAddress  | address | undefined |

### DefaultPoolAddressChanged

```solidity
event DefaultPoolAddressChanged(address _defaultPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _defaultPoolAddress  | address | undefined |

### FeeDistributorAddressChanged

```solidity
event FeeDistributorAddressChanged(address _feeDistributorAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _feeDistributorAddress  | address | undefined |

### GasPoolAddressChanged

```solidity
event GasPoolAddressChanged(address _gasPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _gasPoolAddress  | address | undefined |

### PriceFeedAddressChanged

```solidity
event PriceFeedAddressChanged(address _newPriceFeedAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newPriceFeedAddress  | address | undefined |

### SortedTrovesAddressChanged

```solidity
event SortedTrovesAddressChanged(address _sortedTrovesAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _sortedTrovesAddress  | address | undefined |

### StabilityPoolAddressChanged

```solidity
event StabilityPoolAddressChanged(address _stabilityPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _stabilityPoolAddress  | address | undefined |

### TroveCreated

```solidity
event TroveCreated(address indexed _borrower, uint256 arrayIndex)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower `indexed` | address | undefined |
| arrayIndex  | uint256 | undefined |

### TroveManagerAddressChanged

```solidity
event TroveManagerAddressChanged(address _newTroveManagerAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newTroveManagerAddress  | address | undefined |

### TroveUpdated

```solidity
event TroveUpdated(address indexed _borrower, uint256 _debt, uint256 _coll, uint256 stake, uint8 operation)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower `indexed` | address | undefined |
| _debt  | uint256 | undefined |
| _coll  | uint256 | undefined |
| stake  | uint256 | undefined |
| operation  | uint8 | undefined |

### ZEROStakingAddressChanged

```solidity
event ZEROStakingAddressChanged(address _zeroStakingAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _zeroStakingAddress  | address | undefined |

### ZUSDBorrowingFeePaid

```solidity
event ZUSDBorrowingFeePaid(address indexed _borrower, uint256 _ZUSDFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower `indexed` | address | undefined |
| _ZUSDFee  | uint256 | undefined |

### ZUSDTokenAddressChanged

```solidity
event ZUSDTokenAddressChanged(address _zusdTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _zusdTokenAddress  | address | undefined |



