# StabilityPoolLib



> ZERO-SDK Liquidation Lib

library containing basic operations regarding ZERO Stability Pool



## Methods

### provideToSP

```solidity
function provideToSP(uint256 _amount, address _stabilityPoolAddress) internal
```

Adds the corresponding amount of ZERO to stability pool



#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | amount of ZUSD to be deposited |
| _stabilityPoolAddress | address | address of Stability Pool Contract |

### withdrawFromSP

```solidity
function withdrawFromSP(uint256 _amount, address _stabilityPoolAddress) internal
```

Withdraws the corresponding amount of ZERO from stability pool



#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | amount of ZUSD to be withdrawn |
| _stabilityPoolAddress | address | address of Stability Pool Contract |

### withdrawRBTCGainToTrove

```solidity
function withdrawRBTCGainToTrove(address _stabilityPoolAddress) internal
```

Withdraws all gains from the stability pool and adds them as a collateral to the credit line



#### Parameters

| Name | Type | Description |
|---|---|---|
| _stabilityPoolAddress | address | address of Stability Pool Contract |




