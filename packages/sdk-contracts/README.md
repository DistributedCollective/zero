# @sovryn-zero/sdk-contracts
  SDK contract (Library) consisting of utilities for the Sovryn Zero Protocol

## Quickstart
  Installation:

  ```shell 
  npm install @sovryn-zero/contracts @sovryn-zero/sdk-contracts
  ```
=======
## PROJECT DESCRIPTION
  Sovryn ZERO Solidity Contracts SDK is a set of solidity libraries that users can import and use in their contracts.
>>>>>>> Stashed changes

### **Test**
<!-- How to run all the tests, e.g. local, testnet, forked mainnet; as well as solidity contracts coverage reportn - use package.json scripts and hardhat tasks for that -->

## Overview
  All contracts are in the form of libraries, each one containing set of functionalities related to utilities of the Sovryn Zero ecosystem.

  The library cover several major utilities such as:

  1. **BorrowerLib.sol** - Borrower operations (Opening, Adjusting line of credit)
  2. **LiquidationLib.sol** - Liquidation & Redemption operations.
  3. **StabilityPoolLib.sol** - Pool Stability operations.
  4. **TroveStatiscticsLib.sol** - View function related to the troves (get nominal collateral ratio, borrowing fee calculation, get borrower's debt of the troves).