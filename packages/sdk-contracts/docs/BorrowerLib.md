# BorrowerLib



> ZERO-SDK Borrower Lib

library containing basic Borrowing Operations from ZERO protocol



## Methods

### addCollateral

```solidity
function addCollateral(address borrowerContract) internal
```

adds the received rBTC to the caller&#39;s active Trove.



#### Parameters

| Name | Type | Description |
|---|---|---|
| borrowerContract | address | address of BorrowerOperations library |

### closeCreditLineAndWithdrawCollateral

```solidity
function closeCreditLineAndWithdrawCollateral(address borrowerContract) internal
```

Closes the credit line and withdraws the collateral



#### Parameters

| Name | Type | Description |
|---|---|---|
| borrowerContract | address | address of BorrowerOperations library |

### openCreditLineInZusd

```solidity
function openCreditLineInZusd(uint256 _maxFeePercentage, uint256 _ZUSDAmount, address borrowerContract) internal
```

Open a credit line by depositing amount of rBTC as a collateral



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFeePercentage | uint256 | maximum fee percentage that user is wishing to pay for opening the credit line |
| _ZUSDAmount | uint256 | amount of ZUSD to be borrowed |
| borrowerContract | address | address of BorrowerOperations library |

### repayZUSD

```solidity
function repayZUSD(uint256 _amount, address borrowerContract) internal
```

Repays ZUSD towards the open credit line of the borrower



#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | amount of ZUSD to be repayed |
| borrowerContract | address | address of BorrowerOperations library |

### withdrawCollateral

```solidity
function withdrawCollateral(uint256 _amount, address borrowerContract) internal
```

withdraws `_amount` of collateral from the caller’s Trove. Executes only if the user has an active Trove, the withdrawal would not pull the user’s Trove below the minimum collateralization ratio, and the resulting total collateralization ratio of the system is above 150%.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | collateral amount to withdraw |
| borrowerContract | address | address of BorrowerOperations library |

### withdrawZUSD

```solidity
function withdrawZUSD(uint256 _maxFeePercentage, uint256 _amount, address borrowerContract) internal
```

Issues the specified amount of ZUSD to the caller Executes only if the Trove&#39;s collateralization ratio would remain above the minimum, and the resulting total collateralization ratio is above 150%. The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFeePercentage | uint256 | maximum fee percentage that user is wishing to pay for opening the credit line |
| _amount | uint256 | amount of ZUSD to be withdrawn |
| borrowerContract | address | address of BorrowerOperations library |




