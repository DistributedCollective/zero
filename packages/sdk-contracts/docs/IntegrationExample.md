# Integration Example
Contract that is dedicated for integration example.

## Methods

## openCreditLine
```solidity
function openCreditLine(address priceFeedAddress address borrowerContractAddress) external payable
```

Opens a credit line with amount equal to 90% of the collateral value.

#### Parameters

| Name | Type | Description |
|---|---|---|
| priceFeedAddress | address | address of PriceFeeds to query the BTC Price |
| borrowerContractAddress | address | address of Borrower |