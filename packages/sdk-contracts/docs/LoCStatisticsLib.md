# TroveStatisticsLib



> ZERO-SDK Liquidation Lib

library containing view functions regarding troves



## Methods

### calculateBorrowingFee

```solidity
function calculateBorrowingFee(address troveManagerContractAddress, uint256 _ZUSDDebt) internal view returns (uint256 borrowingFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| troveManagerContractAddress | address | address of TroveManager library |
| _ZUSDDebt | uint256 | debt parameter for which a fee will be calculated against |

#### Returns

| Name | Type | Description |
|---|---|---|
| borrowingFee | uint256 | calculated borrowing fee for the corresponding debt |

### getEntireDebtAndColl

```solidity
function getEntireDebtAndColl(address troveManagerContractAddress, address _borrower) internal view returns (uint256 debt, uint256 coll, uint256 pendingZUSDDebtReward, uint256 pendingRBTCReward)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| troveManagerContractAddress | address | address of TroveManager library |
| _borrower | address | address of the borrower |

#### Returns

| Name | Type | Description |
|---|---|---|
| debt | uint256 | of the troves of borrower |
| coll | uint256 | collateral of the troves of the borrower |
| pendingZUSDDebtReward | uint256 | sum of all ZUSD pending rewards from redistributions |
| pendingRBTCReward | uint256 | sum of all RBTC pending rewards from redistributions |

### getNominalICR

```solidity
function getNominalICR(address troveManagerContractAddress, address _borrower) internal view returns (uint256 collateralRatio)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| troveManagerContractAddress | address | address of TroveManager library |
| _borrower | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| collateralRatio | uint256 | the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove&#39;s pending coll and debt rewards from redistributions into account. |




