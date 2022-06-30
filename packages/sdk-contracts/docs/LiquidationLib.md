# LiquidationLib



> ZERO-SDK Liquidation Lib

library containing basic Liquidation and redemption operations



## Methods

### liquidateBadPositions

```solidity
function liquidateBadPositions(address troveManagerContractAddress, uint256 maxLiquidations) internal
```

Liquidates bad credit lines in the protocol

*Closes a maximum number of n under-collateralized Troves, starting from the one with the lowest collateral ratio in the system, and moving upwards*

#### Parameters

| Name | Type | Description |
|---|---|---|
| troveManagerContractAddress | address | address of TroveManager library |
| maxLiquidations | uint256 | address of the borrower to be liquidated |

### liquidateBorrower

```solidity
function liquidateBorrower(address borrowerAddress, address troveManagerContractAddress) internal
```

Liquidates credit line of the borrower

*Closes the trove if its ICR is lower than the minimum collateral ratio.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| borrowerAddress | address | address of the borrower to be liquidated |
| troveManagerContractAddress | address | address of TroveManager library |

### redeemCollateral

```solidity
function redeemCollateral(address _troveManagerContractAddress, address _hintHelpersAddress, address _priceFeedAddress, uint256 _ZUSDAmount, uint256 _maxFeePercentage) internal
```

Redeems the corresponding ZUSD amount into rBTC



#### Parameters

| Name | Type | Description |
|---|---|---|
| _troveManagerContractAddress | address | address of TroveManager library |
| _hintHelpersAddress | address | address of the HintHelpers library |
| _priceFeedAddress | address | address of PriceFeed library |
| _ZUSDAmount | uint256 | amount of ZUSD to be redeemed |
| _maxFeePercentage | uint256 | max fee percentage of the ZUSD amount. If above this percentage, transaction will revert |




