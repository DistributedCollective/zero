# @sovryn-zero/sdk-contracts  

[![GitHub license](https://img.shields.io/github/license/DistributedCollective/zero)](/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/DistributedCollective/zero)](https://github.com/DistributedCollective/zero/stargazers)
[![ZERO README](https://img.shields.io/badge/readme-gray?style=flat&logo=ZeroMQ&logoColor=green&link=/README.md)](/README.md)  

  SDK contract (Library) consisting of utilities for the Sovryn Zero Protocol

## Quickstart
### Installation:

  ```shell 
  npm install @sovryn-zero/contracts @sovryn-zero/sdk-contracts
  ```

  To install early access releases (pre-releases) - use a specific version to install:  
  ```
  npm install @sovryn-zero/sdk-contracts@1.0.0-early.access.0
  ```  

  The actual early access release version is [here](https://github.com/DistributedCollective/zero/blob/sdk-early-access/packages/sdk-contracts/package.json#L3).  

## Project Description
  Sovryn ZERO Solidity Contracts SDK is a set of solidity libraries that users can import and use in their contracts.
  Stashed changes

## Overview
  All contracts are libraries, each containing set of functionalities related to utilities of the Sovryn Zero ecosystem.

  The library cover several major utilities such as:

  1. **[BorrowerLib.sol](docs/BorrowerLib.md)** - Borrower operations (Opening, Adjusting line of credit)
  2. **[LiquidationLib.sol](docs/LiquidationLib.md)** - Liquidation & Redemption operations.
  3. **[StabilityPoolLib.sol](docs/StabilityPoolLib.md)** - Pool Stability operations.
  4. **[TroveStatiscticsLib.sol](docs/TroveStatisticsLib.md)** - View function related to the troves (get nominal collateral ratio, borrowing fee calculation, get borrower's debt of the troves).
   
  **[ZERO Contracts Addresses](docs/Addresses.md)**

## Demo
  **[TestIntegration.sol](docs/IntegrationExample.md)** provides a sample integration