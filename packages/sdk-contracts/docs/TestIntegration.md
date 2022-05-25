# TestIntegration









## Methods

### testAddCollateral

```solidity
function testAddCollateral() external payable
```






### testBorrowerLiquidation

```solidity
function testBorrowerLiquidation(address borrower) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| borrower | address | undefined |

### testCalculateBorrowingFee

```solidity
function testCalculateBorrowingFee(uint256 _ZUSDDebt) external view returns (uint256 borrowingFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ZUSDDebt | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| borrowingFee | uint256 | undefined |

### testCloseCreditLineAndWithdrawCollateral

```solidity
function testCloseCreditLineAndWithdrawCollateral() external nonpayable
```






### testGetEntireDebtAndColl

```solidity
function testGetEntireDebtAndColl(address _borrower) external view returns (uint256 debt, uint256 coll, uint256 pendingZUSDDebtReward, uint256 pendingRBTCReward)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| debt | uint256 | undefined |
| coll | uint256 | undefined |
| pendingZUSDDebtReward | uint256 | undefined |
| pendingRBTCReward | uint256 | undefined |

### testGetNominalICR

```solidity
function testGetNominalICR(address _borrower) external view returns (uint256 collateralRatio)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| collateralRatio | uint256 | undefined |

### testNPositionsLiquidation

```solidity
function testNPositionsLiquidation(uint256 maxLiquidations) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| maxLiquidations | uint256 | undefined |

### testOpenCreditLine

```solidity
function testOpenCreditLine(uint256 _maxFeePercentage, uint256 _ZUSDAmount) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFeePercentage | uint256 | undefined |
| _ZUSDAmount | uint256 | undefined |

### testProvideToSP

```solidity
function testProvideToSP(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined |

### testRedeemCollateral

```solidity
function testRedeemCollateral(address _hintHelpersAddress, address _priceFeedAddress, uint256 _ZUSDAmount, uint256 _maxFeePercentage) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _hintHelpersAddress | address | undefined |
| _priceFeedAddress | address | undefined |
| _ZUSDAmount | uint256 | undefined |
| _maxFeePercentage | uint256 | undefined |

### testRepayZUSD

```solidity
function testRepayZUSD(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined |

### testWithdrawCollateral

```solidity
function testWithdrawCollateral(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined |

### testWithdrawFromSP

```solidity
function testWithdrawFromSP(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined |

### testWithdrawRBTCGainToTrove

```solidity
function testWithdrawRBTCGainToTrove() external nonpayable
```






### testWithdrawZUSD

```solidity
function testWithdrawZUSD(uint256 _maxFee, uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | undefined |
| _amount | uint256 | undefined |




