<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@liquity/lib-ethers](./lib-ethers.md) &gt; [SendableEthersLiquity](./lib-ethers.sendableethersliquity.md) &gt; [borrowZUSD](./lib-ethers.sendableethersliquity.borrowzusd.md)

## SendableEthersLiquity.borrowZUSD() method

Adjust existing Trove by borrowing more ZUSD.

<b>Signature:</b>

```typescript
borrowZUSD(amount: Decimalish, maxBorrowingRate?: Decimalish, overrides?: EthersTransactionOverrides): Promise<SentEthersLiquityTransaction<TroveAdjustmentDetails>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  amount | [Decimalish](./lib-base.decimalish.md) | The amount of ZUSD to borrow. |
|  maxBorrowingRate | [Decimalish](./lib-base.decimalish.md) | Maximum acceptable [borrowing rate](./lib-base.fees.borrowingrate.md)<!-- -->. |
|  overrides | [EthersTransactionOverrides](./lib-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersLiquityTransaction](./lib-ethers.sentethersliquitytransaction.md)<!-- -->&lt;[TroveAdjustmentDetails](./lib-base.troveadjustmentdetails.md)<!-- -->&gt;&gt;

## Remarks

Equivalent to:

```typescript
adjustTrove({ borrowZUSD: amount }, maxBorrowingRate)

```
