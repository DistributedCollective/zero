# @sovryn-zero/sdk-contracts
  SDK contract (Library) consisting of utilities for the Sovryn Zero Protocol

## Quickstart
  Installation:

  ```shell 
  npm install --save @sovryn-zero/sdk-contracts
  ```

  An alternative to npm is to use the GitHub Repository ( `DistributedCollective/zero` ) to retrieve the library. When doing this, make sure to specify the tag for a release such as `v1.0.0`, instead of using the `main` branch.

## Overview
  All contracts are in the form of libraries, each one containing set of functionalities related to utilities of the Sovryn Zero ecosystem.

  The library cover several major utilities such as:

  1. **BorrowerLib.sol** - Borrower operations (Opening, Adjusting line of credit)
  2. **LiquidationLib.sol** - Liquidation & Redemption operations.
  3. **StabilityPoolLib.sol** - Pool Stability operations.
  4. **TroveStatiscticsLib.sol** - View function related to the troves (get nominal collateral ratio, borrowing fee calculation, get borrower's debt of the troves).