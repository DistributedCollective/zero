# Zero: Decentralized Borrowing Protocol

![Tests](https://github.com/DistributedCollective/zero/actions/workflows/test-contracts.yml/badge.svg)

Zero is a decentralized protocol based on [Liquity](https://github.com/liquity/dev) that allows RBTC holders to obtain maximum liquidity against their collateral without paying interest. After locking up RBTC as collateral in a smart contract and creating an individual position called a "Line of Credit" aka "Trove", the user can get instant liquidity by minting ZUSD, a USD-pegged stablecoin. Each Line of Credit is required to be collateralized at a minimum collateral ratio of 110%. Any owner of ZUSD can redeem their stablecoins for the underlying collateral at any time. The redemption mechanism and algorithmically adjusted fees guarantee a minimum stablecoin value of 1 USD.

An unprecedented liquidation mechanism based on incentivized stability pool deposits and a redistribution cycle from riskier to safer Lines of Credit provides stability at a much lower collateral ratio than current systems. Stability is maintained via economically-driven user interactions and arbitrage rather than by active governance or monetary interventions.

## More information

Visit the [Sovryn website](https://www.sovryn.app/zero) to find out more and join the discussion.

## Zero System Summary

- [Zero: Decentralized Borrowing Protocol](#zero-decentralized-borrowing-protocol)
  - [More information](#more-information)
  - [Zero System Summary](#zero-system-summary)
  - [Zero Overview](#zero-overview)
  - [Liquidation and the Stability Pool](#liquidation-and-the-stability-pool)
    - [Liquidation gas costs](#liquidation-gas-costs)
    - [Liquidation Logic](#liquidation-logic)
      - [Liquidations in Normal Mode: TCR >= 150%](#liquidations-in-normal-mode-tcr--150)
      - [Liquidations in Recovery Mode: TCR < 150%](#liquidations-in-recovery-mode-tcr--150)
  - [Gains From Liquidations](#gains-from-liquidations)
  - [ZUSD Token Redemption](#zusd-token-redemption)
    - [Partial redemption](#partial-redemption)
    - [Full redemption](#full-redemption)
    - [Redemptions create a price floor](#redemptions-create-a-price-floor)
  - [Recovery Mode](#recovery-mode)
  - [Project Structure](#project-structure)
    - [Directories](#directories)
    - [Branches](#branches)
  - [Core System Architecture](#core-system-architecture)
    - [Core Smart Contracts](#core-smart-contracts)
    - [Data and Value Silo Contracts](#data-and-value-silo-contracts)
    - [Contract Interfaces](#contract-interfaces)
    - [PriceFeed and Oracle](#pricefeed-and-oracle)
    - [PriceFeed Logic](#pricefeed-logic)
    - [Testnet PriceFeed and PriceFeed tests](#testnet-pricefeed-and-pricefeed-tests)
    - [PriceFeed limitations and known issues](#pricefeed-limitations-and-known-issues)
    - [Keeping a sorted list of lines of credit ordered by ICR](#keeping-a-sorted-list-of-lines-of-credit-ordered-by-icr)
    - [Flow of RBTC in Zero](#flow-of-rbtc-in-zero)
    - [Flow of ZUSD tokens in Zero](#flow-of-zusd-tokens-in-zero)
  - [Expected User Behaviors](#expected-user-behaviors)
  - [Contract Ownership and Function Permissions](#contract-ownership-and-function-permissions)
  - [Deployment to a Development Blockchain](#deployment-to-a-development-blockchain)
  - [Running Tests](#running-tests)
    - [Brownie Tests](#brownie-tests)
    - [RSK Regtest node](#rsk-regtest-node)
  - [System Quantities - Units and Representation](#system-quantities---units-and-representation)
    - [Integer representations of decimals](#integer-representations-of-decimals)
  - [Public Data](#public-data)
  - [Public User-Facing Functions](#public-user-facing-functions)
    - [Borrower (Trove) Operations - `BorrowerOperations.sol`](#borrower-trove-operations---borroweroperationssol)
    - [Line of Credit Manager Functions - `TroveManager.sol`](#line-of-credit-manager-functions---trovemanagersol)
    - [Hint Helper Functions - `HintHelpers.sol`](#hint-helper-functions---hinthelperssol)
    - [Stability Pool Functions - `StabilityPool.sol`](#stability-pool-functions---stabilitypoolsol)
    - [ZUSD token `ZUSDToken.sol`](#zusd-token-zusdtokensol)
  - [Supplying Hints to Line of Credit operations](#supplying-hints-to-line-of-credit--operations)
    - [Example Borrower Operations with Hints](#example-borrower-operations-with-hints)
      - [Opening a Line of Credit](#opening-a-line-of-credit)
      - [Adjusting a Line of Credit](#adjusting-a-line-of-credit)
    - [Hints for `redeemCollateral`](#hints-for-redeemcollateral)
      - [First redemption hint](#first-redemption-hint)
      - [Partial redemption hints](#partial-redemption-hints)
      - [Example Redemption with hints](#example-redemption-with-hints)
  - [Gas compensation](#gas-compensation)
    - [Gas compensation schedule](#gas-compensation-schedule)
    - [Liquidation](#liquidation)
    - [Gas compensation and redemptions](#gas-compensation-and-redemptions)
    - [Gas compensation helper functions](#gas-compensation-helper-functions)
  - [The Stability Pool](#the-stability-pool)
    - [Mixed liquidations: offset and redistribution](#mixed-liquidations-offset-and-redistribution)
    - [Stability Pool deposit losses and RBTC gains - implementation](#stability-pool-deposit-losses-and-rbtc-gains---implementation)
    - [Stability Pool example](#stability-pool-example)
    - [Stability Pool implementation](#stability-pool-implementation)
    - [How deposits and RBTC gains are tracked](#how-deposits-and-rbtc-gains-are-tracked)
  - [Zero System Fees](#zero-system-fees)
    - [Redemption Fee](#redemption-fee)
    - [Borrowing fee](#borrowing-fee)
    - [Fee Schedule](#fee-schedule)
    - [Intuition behind fees](#intuition-behind-fees)
    - [Fee decay Implementation](#fee-decay-implementation)
    - [Staking SOV and earning fees](#staking-sov-and-earning-fees)
  - [Redistributions and Corrected Stakes](#redistributions-and-corrected-stakes)
    - [Corrected Stake Solution](#corrected-stake-solution)
  - [Math Proofs](#math-proofs)
  - [Definitions](#definitions)
  - [Development](#development)
    - [Prerequisites](#prerequisites)
      - [Making node-gyp work](#making-node-gyp-work)
    - [Clone & Install](#clone--install)
    - [Top-level scripts](#top-level-scripts)
      - [Run all tests](#run-all-tests)
      - [Deploy contracts to a testnet](#deploy-contracts-to-a-testnet)
      - [Start a local blockchain and deploy the contracts](#start-a-local-blockchain-and-deploy-the-contracts)
      - [Start dev-frontend in development mode](#start-dev-frontend-in-development-mode)
      - [Start dev-frontend in demo mode](#start-dev-frontend-in-demo-mode)
      - [Build dev-frontend for production](#build-dev-frontend-for-production)
    - [Configuring your custom frontend](#configuring-your-custom-frontend)
  - [Running a frontend with Docker](#running-a-frontend-with-docker)
    - [Prerequisites](#prerequisites-1)
    - [Running with `docker`](#running-with-docker)
    - [Configuring a public frontend](#configuring-a-public-frontend)
      - [FRONTEND_TAG](#frontend_tag)
      - [INFURA_API_KEY](#infura_api_key)
    - [Setting a kickback rate](#setting-a-kickback-rate)
    - [Setting a kickback rate with Gnosis Safe](#setting-a-kickback-rate-with-gnosis-safe)
    - [Next steps for hosting a frontend](#next-steps-for-hosting-a-frontend)
      - [Example 1: using static website hosting](#example-1-using-static-website-hosting)
      - [Example 2: wrapping the frontend container in HTTPS](#example-2-wrapping-the-frontend-container-in-https)
  - [Disclaimer](#disclaimer)


## Zero Overview

Zero is a collateralized debt platform. Users can lock up collateral (RBTC), issue stablecoins (ZUSD) to their own RSK address, and subsequently transfer those stablecoins to any other RSK address. The individual collateralized debt positions are called Lines of Credit (aka Troves).

The stablecoins are economically geared towards maintaining a value of 1 ZUSD = 1 USD, due to the following properties:

1. The system is always designed to be over-collateralized - the dollar value of the locked RBTC exceeds the dollar value of the issued ZUSD

2. The stablecoins are fully redeemable - users can always swap $x worth of ZUSD for $x worth of RBTC (minus fees) directly with the system.

3. The system algorithmically controls the generation of ZUSD through a variable borrowing fee.

After opening a Line of Credit with some RBTC, users may issue ("borrow") tokens such that the collateral ratio of their Line of Credit remains above 110% e.g. a user with $1000 worth of RBTC in a Line of Credit can issue up to 909.09 ZUSD.

ZUSD is freely transferable - anyone with an RSK address can send or receive ZUSD tokens, whether they have an open Line of Credit or not. The ZUSD are burned upon repayment of a Line of Credit's debt.

The Zero system regularly updates the RBTC:USD price via a decentralized data feed. When a Line of Credit falls below a minimum collateralization ratio (MCR) of 110%, it is considered under-collateralized and is vulnerable to liquidation.

## Liquidation and the Stability Pool

Zero utilizes a two-step liquidation mechanism in the following order of priority: 

1. Offset under-collateralized lines of credit against the Stability Pool containing ZUSD tokens

2. Redistribute under-collateralized lines of credit to other borrowers if the Stability Pool is emptied

Zero primarily uses the ZUSD tokens in its Stability Pool to absorb the under-collateralized debt i.e. to repay the liquidated borrower's liability.

Any user may deposit ZUSD tokens to the Stability Pool. This allows them to earn the collateral from the liquidated Line of Credit. When a liquidation occurs, the liquidated debt is canceled with the same amount of ZUSD in the Stability Pool (which is burned as a result). The liquidated RBTC is then proportionally distributed to Stability Pool depositors.

Stability Pool depositors can expect to earn net gains from liquidations. In most cases, the value of the liquidated RBTC will be greater than the value of the canceled debt (since a liquidated Line of Credit will likely have an individiual collateralization ratio [ICR] just slightly below 110%).

Suppose the liquidated debt is higher than the amount of ZUSD in the Stability Pool. In that case, the system tries to cancel as much debt as possible with the ZUSD from the Stability Pool. Then, the system redistributes the remaining liquidated collateral and debt across all active Lines of Credit.

Anyone may call the public `liquidateTroves()` function, which will check for under-collateralized Lines of Credit and liquidate them. Alternatively, they can call `batchLiquidateTroves()` with a custom list of Line of Credit addresses to attempt to liquidate.

### Liquidation gas costs

Currently, mass liquidations performed via the above functions cost 60-65k gas per Line of Credit. Thus the system can liquidate up to a maximum of 95-105 Lines of Credit in a single transaction.

### Liquidation Logic

The precise behavior of liquidations depends on the ICR of the Line of Credit being liquidated and global system conditions: the total collateralization ratio (TCR) of the system, the size of the Stability Pool, etc.

Here is the liquidation logic for a single Line of Credit in Normal Mode and Recovery Mode. `SP.ZUSD` represents the ZUSD in the Stability Pool.

#### Liquidations in Normal Mode: TCR >= 150%

| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Condition | Liquidation behavior                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ICR < MCR & SP.ZUSD >= Line of Credit.debt                                                                                                                                                                                                                                                                                                                                        | ZUSD in the StabilityPool equal to the Line of Credit's debt is offset with the Line of Credit's debt. The Line of Credit's RBTC collateral is shared between depositors.                                                                                                                                                                      |
| ICR < MCR & SP.ZUSD < Line of Credit.debt                                                                                                                                                                                                                                                                                                                                         | The total StabilityPool ZUSD is offset with an equal amount of debt from the Line of Credit. A fraction of the Line of Credit's collateral (equal to the ratio of its offset debt to its entire debt) is shared between depositors. The remaining debt and collateral (minus RBTC gas compensation) is redistributed to active Lines of Credit |
| ICR < MCR & SP.ZUSD = 0                                                                                                                                                                                                                                                                                                                                                           | Redistribute all debt and collateral (minus RBTC gas compensation) to activate the Line of Credit.                                                                                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                                                                                                                   |
| ICR  >= MCR                                                                                                                                                                                                                                                                                                                                                                       | Do nothing.                                                                                                                                                                                                                                                                                                                                    |
#### Liquidations in Recovery Mode: TCR < 150%

| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Condition | Liquidation behavior                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ICR <=100%                                                                                                                                                                                                                                                                                                                                                                        | Redistribute all debt and collateral (minus RBTC gas compensation) to active the Line of Credit.                                                                                                                                                                                                                                                                                                                                       |
| 100% < ICR < MCR & SP.ZUSD > Line of Credit.debt                                                                                                                                                                                                                                                                                                                                  | ZUSD in the StabilityPool equal to the Line of Credit's debt is offset with the Line of Credit's debt. The Line of Credit's RBTC collateral (minus RBTC gas compensation) is shared between depositors.                                                                                                                                                                                                                                |
| 100% < ICR < MCR & SP.ZUSD < Line of Credit.debt                                                                                                                                                                                                                                                                                                                                  | The total StabilityPool ZUSD is offset with an equal amount of debt from the Line of Credit. A fraction of the Line of Credit's collateral (equal to the ratio of its offset debt to its entire debt) is shared between depositors. The remaining debt and collateral (minus RBTC gas compensation) is redistributed to active lines of credit                                                                                         |
| MCR <= ICR < TCR & SP.ZUSD >= Line of Credit.debt                                                                                                                                                                                                                                                                                                                                 | The StabilityPool ZUSD is offset with an equal amount of debt from the Line of Credit. A fraction of RBTC collateral with a dollar value equal to `1.1 * debt` is shared between depositors. Nothing is redistributed to another active Line of Credit. Since its ICR was > 1.1, the Line of Credit has a collateral remainder, which is sent to the `CollSurplusPool` and is claimable by the borrower. The Line of Credit is closed. |
| MCR <= ICR < TCR & SP.ZUSD  < Line of Credit .debt                                                                                                                                                                                                                                                                                                                                | Do nothing.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ICR >= TCR                                                                                                                                                                                                                                                                                                                                                                        | Do nothing.                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Gains From Liquidations

Stability Pool depositors gain RBTC over time, as liquidated debt is canceled with their deposit. When they withdraw all or part of their deposited tokens or top up their deposit, the system sends them their accumulated RBTC gains.

Similarly, a Line of Credit's accumulated gains from liquidations are automatically applied to the Line of Credit when the owner performs any operation e.g. adding/withdrawing collateral or borrowing/repaying ZUSD.

## ZUSD Redemption

Any ZUSD holder (whether or not they have an active Line of Credit) may redeem their ZUSD directly with the system. Their ZUSD is exchanged for RBTC, at face value: redeeming x ZUSD tokens returns $x worth of RBTC (minus a [redemption fee](#redemption-fee)).

When ZUSD is redeemed for RBTC, the system cancels the ZUSD with debt from a Line of Credit, and the RBTC is drawn from the Line of Credit's collateral.

To fulfill the redemption request, Lines of Credit are redeemed in ascending order of their collateralization ratio.

A redemption sequence of `n` steps will **fully** redeem from up to `n-1` Line of Credit, and **partially** redeems from up to 1 Line of Credit, which is always the last Line of Credit in the redemption sequence.

Redemptions are blocked when TCR < 110% (there is no need to restrict ICR < TCR). At that point, TCR redemptions would likely be unprofitable, as ZUSD is probably trading above $1 if the system has crashed that badly, but it could be a way for an attacker with a lot of ZUSD to lower the TCR even further.

Note that redemptions are disabled during the first 14 days of operation since the deployment of the Zero protocol to protect the monetary system in its infancy.

### Partial redemption

Most redemption transactions will include a partial redemption since the amount redeemed is unlikely to perfectly match the total debt of a series of Lines of Credit.

The partially redeemed Line of Credit is re-inserted into the sorted list of Lines of Credit and remains active, with reduced collateral and debt.

### Full redemption

A Line of Credit is defined as "fully redeemed from" when the redemption has caused (debt-20) of its debt to absorb (debt-20) ZUSD. Then, its 20 ZUSD Liquidation Reserve is canceled with its remaining 20 debt: the Liquidation Reserve is burned from the gas address, and the 20 debt is zeroed.

Before closing, we must handle the Line of Credit **collateral surplus**: that is, the excess RBTC collateral remaining after redemption due to its initial over-collateralization.

This collateral surplus is sent to the `CollSurplusPool`, and the borrower can reclaim it later. The Line of Credit is then fully closed.

### Redemptions create a price floor

Economically, the redemption mechanism creates a hard price floor for ZUSD, ensuring that the market price of ZUSD stays at or near 1 USD. 

## Recovery Mode

Recovery Mode kicks in when the system's total collateralization ratio (TCR) falls below 150%.

During Recovery Mode, liquidation conditions are relaxed, and the system blocks borrower transactions that would further decrease the TCR. New ZUSD may only be issued by adjusting existing Lines of Credit to improve their ICR or by opening a new Line of Credit with an ICR of >=150%. In general, if an existing Line of Credit's adjustment reduces its ICR, the transaction is only executed if the resulting TCR is above 150%

Recovery Mode is structured to incentivize borrowers to behave in ways that promptly raise the TCR back above 150%, and to incentivize ZUSD holders to replenish the Stability Pool.

Economically, Recovery Mode is designed to encourage collateral top-ups and debt repayments. It also acts as a self-negating deterrent: the possibility of it occurring actually guides the system away from ever reaching it.

## Project Structure

### Directories

- `packages/dev-frontend/` - Zero Beta: a fully functional React app used for interfacing with the smart contracts during development
- `packages/fuzzer/` - A very simple, purpose-built tool based on Zero middleware for randomly interacting with the system
- `packages/lib-base/` - Common interfaces and classes shared by the other `lib-` packages
- `packages/lib-ethers/` - [ethers](https://github.com/ethers-io/ethers.js)-based middleware that can read Zero state and send transactions
- `packages/lib-react/` - Components and hooks that React-based apps can use to view Zero contract state
- `packages/providers/` - Subclassed Ethers providers used by the frontend
- `packages/contracts/` - The backend development folder that contains the Hardhat project, contracts, and tests
- `packages/contracts/contracts/` - The core back end smart contracts written in Solidity
- `packages/contracts/test/` - JS test suite for the system. Tests run in Mocha/Chai
- `packages/contracts/tests/` - Python test suite for the system. Tests run in Brownie
- `packages/contracts/gasTest/` - Non-assertive tests that return gas costs for Zero operations under various scenarios
- `packages/contracts/fuzzTests/` - Echidna tests, and naive "random operation" tests 
- `packages/contracts/migrations/` - contains the Hardhat script for deploying the smart contracts to the blockchain
- `packages/contracts/utils/` - external Hardhat and node scripts - deployment helpers, gas calculators, etc
- `packages/contracts/mathProofs/` - core mathematical proofs of Zero properties, and a derivation of the scalable Stability Pool staking formula

Backend development is done in the Hardhat framework and allows Zero to be deployed on the Hardhat EVM network for fast compilation and test execution.

### Branches

As of 2021-01-18, the current working branch is `main`. The `master` branch is out of date.

## Core System Architecture

The core Zero system consists of several smart contracts, which are deployable to the RSK blockchain.

All application logic and data are contained in these contracts - there is no need for a separate database or backend logic running on a web server. In effect, the RSK network is itself the Zero backend. As such, all balances and contract data are public.

Contract ownership is granted to the [TimelockOwner](https://github.com/DistributedCollective/Sovryn-smart-contracts/blob/development/contracts/governance/Timelock.sol) contract so that Sovryn's governance system can update the logic of the Zero contracts.

The three main contracts - `BorrowerOperations.sol`, `TroveManager.sol` and `StabilityPool.sol` - hold the user-facing public functions, and contain most of the internal system logic. Together they control Line of Credit state updates and movements of RBTC and ZUSD tokens around the system.

### Core Smart Contracts

`BorrowerOperations.sol` - contains the basic operations by which borrowers interact with their Line of Credit: Line of Credit creation, RBTC top-up/withdrawal, stablecoin issuance, and repayment. It also sends borrowing fees to the `sovFeeCollector`. BorrowerOperations functions call into the Line of Credit Manager, telling it to update the Line of Credit state, where necessary. BorrowerOperations functions also call into the various Pools, telling them to move RBTC/Tokens between Pools or between Pool <> user, where necessary.

`TroveManager.sol` - contains functionality for liquidations and redemptions. It sends redemption fees to the `sovFeeCollector`. It also contains the state of each Line of Credit  i.e. a record of the Line of Credit’s collateral and debt. The TroveManager does not hold value (i.e. RBTC / other tokens). TroveManager functions call into the various Pools to tell them to move RBTC/tokens between Pools, where necessary.

`LiquityBase.sol` - Both TroveManager and BorrowerOperations inherit from the parent contract `LiquityBase`, which contains global constants and some common functions.

`StabilityPool.sol` - contains functionality for Stability Pool operations: making deposits and withdrawing compounded deposits and accumulated RBTC gains. Holds the ZUSD Stability Pool deposits, and the RBTC gains from liquidations, for depositors.

`ZUSDToken.sol` - the stablecoin token contract, which implements the ERC20 fungible token standard in conjunction with EIP-2612 and a mechanism that blocks (accidental) transfers to addresses like the StabilityPool and address(0) that are not supposed to receive funds through direct transfers. The contract mints, burns, and transfers ZUSD tokens.

`SortedTroves.sol` - a doubly-linked list that stores addresses of the Line of Credit owners, sorted by their individual collateralization ratio (ICR). It inserts and re-inserts Lines of Credit at the correct position, based on their ICR.

`PriceFeed.sol` - Contains functionality for obtaining the current RBTC:USD price, which the system uses for calculating collateralization ratios.

`HintHelpers.sol` - Helper contract, containing the read-only functionality for calculating accurate hints to be supplied to borrower operations and redemptions.

### Data and Value Silo Contracts

Along with `StabilityPool.sol`, these contracts hold RBTC and/or tokens for their respective parts of the system and contain minimal logic:

`ActivePool.sol` - holds the total RBTC balance and records the total stablecoin debt of the active Lines of Credit.

`DefaultPool.sol` - holds the total RBTC balance and records the total stablecoin debt of the liquidated Lines of Credit that are pending redistribution to the active Lines of Credit. If a Line of Credit has pending RBTC/debt “rewards” in the DefaultPool, they will be applied to the Line of Credit when it next undergoes a borrower operation, a redemption, or a liquidation.

`CollSurplusPool.sol` - holds the RBTC surplus from Lines of Credit that have been fully redeemed from as well as from Lines of Credit with an ICR > MCR that were liquidated in Recovery Mode. Sends the surplus back to the owning borrower when told by `BorrowerOperations.sol`.

`GasPool.sol` - holds the total ZUSD liquidation reserves. ZUSD is moved into the `GasPool` when a Line of Credit is opened, and moved out when a Line of Credit is liquidated or closed.

### Contract Interfaces

`ITroveManager.sol`, `IPool.sol` etc. These provide a specification for a contract’s functions without implementation. They are similar to interfaces in Java or C#.

### PriceFeed and Oracle

Zero functions that require the most current RBTC:USD price data fetch the price dynamically, as needed, via the core `PriceFeed.sol` contract using the MoC Medianizer RBTC:USD reference contract as its primary and RSK's RBTC:USD price feed as its secondary (fallback) data source. PriceFeed is stateful i.e. it records the last good price that may come from either of the two sources based on the contract's current state.

The current `PriceFeed.sol` contract has an external `fetchPrice()` function that is called by core Zero functions which require a current RBTC:USD price. `fetchPrice()` calls each oracle's proxy, asserts on the responses, and converts returned prices to 18 digits.

### PriceFeed Logic

The PriceFeed contract uses the main price feed and fallback to the backup one in case of an error. If both fail, return the last good price seen.

### Testnet PriceFeed and PriceFeed tests

The `PriceFeedTestnet.sol` is a mock PriceFeed for testnet and general back-end testing purposes, with no oracle connection. It contains a manual price setter, `setPrice()`, and a getter, `getPrice()`, which returns the latest stored price.

The mainnet PriceFeed is tested in `test/PriceFeedTest.js`, using `ExternalPriceFeedTester` contract as mocks for primary and secondary price feeds.

### PriceFeed limitations and known issues

The purpose of the PriceFeed is to have some resilience in case of MoC Medianizer failure/timeout and the chance of recovery.

The PriceFeed logic consists of automatic on-chain decision-making for obtaining fallback price data from RSK Oracle and, if possible, returning to MoC Medianizer if/when it recovers.

### Keeping a sorted list of Lines of Credit ordered by ICR

Zero relies on a particular data structure: a sorted doubly-linked list of lines of credit that remains ordered by individual collateralization ratio (ICR) i.e. the amount of collateral (in USD) divided by the amount of debt (in ZUSD).

This ordered list is critical for gas-efficient redemption sequences and the `liquidateTroves` sequence, both of which target Lines of Credit in ascending order of ICR.

The sorted doubly-linked list is found in `SortedTroves.sol`. 

Nodes map to active Lines of Credit in the system - the ID property is the address of a Line of Credit owner. The list accepts positional hints for efficient O(1) insertion - please see the [hints](#supplying-hints-to-cdp-operations) section for more details.

ICRs are computed dynamically at runtime and not stored on the node. This is because ICRs of active Lines of Credit change dynamically, when:

- The RBTC:USD price varies, altering the USD value of the collateral of every Line of Credit
- A liquidation that redistributes collateral and debt to active Lines of Credit occurs

The list relies on the fact that a collateral and debt redistribution due to a liquidation preserves the ordering of all active lines of credit (though it does decrease the ICR of each active Line of Credit above the MCR).

The fact that ordering is maintained as redistributions occur is not immediately obvious: please see the [mathematical proof](https://github.com/DistributedCollective/zero/blob/main/papers) which shows that this holds in Zero.

A node inserted based on current ICR will maintain the correct position relative to its peers as liquidation gains accumulate, as long as its raw collateral and debt balances have not changed.

Nodes also remain sorted as the RBTC:USD price varies, since price fluctuations change the collateral value of each Line of Credit by the same proportion.

Thus, nodes need only be re-inserted to the sorted list upon a Line of Credit operation - when the owner adds/removes collateral or debt to/from their Line of Credit.

### Flow of RBTC in Zero

RBTC in the system lives in three Pools: the ActivePool, the DefaultPool, and the StabilityPool. When an operation is made, RBTC is transferred in one of three ways:

- From a user to a Pool
- From a Pool to a user
- From one Pool to another Pool

RBTC is recorded on an _individual_ level, but stored in _aggregate_ in a Pool. An active Line of Credit with collateral and debt has a struct in the Line of Credit Manager that stores its RBTC collateral value in a uint, but its actual RBTC is in the balance of the ActivePool contract.

Likewise, the StabilityPool holds the total accumulated RBTC gains from liquidations for all depositors.

**Borrower Operations**

| Function                      | RBTC quantity                       | Path                                       |
| ----------------------------- | ----------------------------------- | ------------------------------------------ |
| openTrove                     | msg.value                           | msg.sender->BorrowerOperations->ActivePool |
| addColl                       | msg.value                           | msg.sender->BorrowerOperations->ActivePool |
| withdrawColl                  | _collWithdrawal parameter           | ActivePool->msg.sender                     |
| adjustTrove: adding RBTC      | msg.value                           | msg.sender->BorrowerOperations->ActivePool |
| adjustTrove: withdrawing RBTC | _collWithdrawal parameter           | ActivePool->msg.sender                     |
| closeTrove                    | All remaining                       | ActivePool->msg.sender                     |
| claimCollateral               | CollSurplusPool.balance[msg.sender] | CollSurplusPool->msg.sender                |

**Trove Manager**

| Function                               | RBTC quantity                          | Path                        |
| -------------------------------------- | -------------------------------------- | --------------------------- |
| liquidate (offset)                     | collateral to be offset                | ActivePool->StabilityPool   |
| liquidate (redistribution)             | collateral to be redistributed         | ActivePool->DefaultPool     |
| liquidateTroves (offset)               | collateral to be offset                | ActivePool->StabilityPool   |
| liquidateTroves (redistribution)       | collateral to be redistributed         | ActivePool->DefaultPool     |
| batchLiquidateTroves (offset)          | collateral to be offset                | ActivePool->StabilityPool   |
| batchLiquidateTroves (redistribution). | collateral to be redistributed         | ActivePool->DefaultPool     |
| redeemCollateral                       | collateral to be swapped with redeemer | ActivePool->msg.sender      |
| redeemCollateral                       | redemption fee                         | ActivePool->sovFeeCollector |
| redeemCollateral                       | Line of Credit's collateral surplus    | ActivePool->CollSurplusPool |

**Stability Pool**

| Function                | RBTC quantity                     | Path                                              |
| ----------------------- | --------------------------------- | ------------------------------------------------- |
| provideToSP             | depositor's accumulated RBTC gain | StabilityPool -> msg.sender                       |
| withdrawFromSP          | depositor's accumulated RBTC gain | StabilityPool -> msg.sender                       |
| withdrawRBTCGainToTrove | depositor's accumulated RBTC gain | StabilityPool -> BorrowerOperations -> ActivePool |

### Flow of ZUSD tokens in Zero

When a user borrows from their Line of Credit, ZUSD tokens are minted to their own address, and a debt is recorded on the Line of Credit. Conversely, when they repay their Line of Credit’s ZUSD debt, ZUSD is burned from their address, and the debt on their Line of Credit is reduced.

Redemptions burn ZUSD from the redeemer’s balance, and reduce the debt of the Line of Credit redeemed against.

Liquidations that involve a Stability Pool offset burn ZUSD from the Stability Pool’s balance, and reduce the ZUSD debt of the liquidated Line of Credit.

The only time ZUSD is transferred to/from a Zero contract, is when a user deposits ZUSD to, or withdraws ZUSD from, the StabilityPool.

**Borrower Operations**

| Function                      | ZUSD Quantity | ERC20 Operation                      |
| ----------------------------- | ------------- | ------------------------------------ |
| openTrove                     | Drawn ZUSD    | ZUSD._mint(msg.sender, _ZUSDAmount)  |
|                               | Borrowing fee | ZUSD._mint(FeeDistributor,  ZUSDFee) |
| withdrawZUSD                  | Drawn ZUSD    | ZUSD._mint(msg.sender, _ZUSDAmount)  |
|                               | Borrowing fee | ZUSD._mint(FeeDistributor,  ZUSDFee) |
| repayZUSD                     | Repaid ZUSD   | ZUSD._burn(msg.sender, _ZUSDAmount)  |
| adjustTrove: withdrawing ZUSD | Drawn ZUSD    | ZUSD._mint(msg.sender, _ZUSDAmount)  |
|                               | Borrowing fee | ZUSD._mint(FeeDistributor,  ZUSDFee) |
| adjustTrove: repaying ZUSD    | Repaid ZUSD   | ZUSD._burn(msg.sender, _ZUSDAmount)  |
| closeTrove                    | Repaid ZUSD   | ZUSD._burn(msg.sender, _ZUSDAmount)  |

**Trove Manager**

| Function                      | ZUSD Quantity            | ERC20 Operation                                  |
| ----------------------------- | ------------------------ | ------------------------------------------------ |
| liquidate (offset)            | ZUSD to offset with debt | ZUSD._burn(stabilityPoolAddress, _debtToOffset); |
| liquidateTroves (offset)      | ZUSD to offset with debt | ZUSD._burn(stabilityPoolAddress, _debtToOffset); |
| batchLiquidateTroves (offset) | ZUSD to offset with debt | ZUSD._burn(stabilityPoolAddress, _debtToOffset); |
| redeemCollateral              | ZUSD to redeem           | ZUSD._burn(msg.sender, _ZUSD)                    |

**Stability Pool**

| Function       | ZUSD Quantity    | ERC20 Operation                                            |
| -------------- | ---------------- | ---------------------------------------------------------- |
| provideToSP    | deposit / top-up | ZUSD._transfer(msg.sender, stabilityPoolAddress, _amount); |
| withdrawFromSP | withdrawal       | ZUSD._transfer(stabilityPoolAddress, msg.sender, _amount); |

## Expected User Behaviors

Generally, borrowers call functions that trigger Line of Credit operations on their own Line of Credit. Stability Pool users (who may or may not also be borrowers) call functions that trigger Stability Pool operations, such as depositing or withdrawing tokens to/from the Stability Pool.

Anyone may call the public liquidation functions, and attempt to liquidate one or several Lines of Credit.

ZUSD token holders may also redeem their tokens, and swap an amount of tokens 1-for-1 in value (minus fees) with RBTC.

SOV holders may stake their SOV, to earn a share of the system fee revenue, in RBTC and ZUSD.

## Contract Ownership and Function Permissions

All the core smart contracts inherit from the OpenZeppelin `Ownable.sol` contract template. As such all contracts have a single owning address, which is the deploying address. The contract's ownership is transferred to Sovryn's governance system thorough it's TimelockOwner contract.

Several public and external functions have modifiers such as `requireCallerIsTroveManager`, `requireCallerIsActivePool`, etc - ensuring they can only be called by the respective permitted contract.

## Deployment to a Development Blockchain

The Hardhat migrations script and deployment helpers in `utils/deploymentHelpers.js` deploy all contracts, and connect all contracts to their dependency contracts, by setting the necessary deployed addresses.

The project is deployed on the RSK testnet.

## Running Tests

Run all tests with `npx hardhat test`, or run a specific test with `npx hardhat test ./test/contractTest.js`

Tests are run against the Hardhat EVM.

### Brownie Tests

**⚠ These tests are not working and might not be supported due to the fact they require some accounts to be preloaded in a specific way and rskj does not support it out of the box. This tests exercise the system in a way that's already covered by the JS tests.**

There are some special tests that are using Brownie framework.

To test, install brownie with:
```
python3 -m pip install --user pipx
python3 -m pipx ensurepath

pipx install eth-brownie
```

and add numpy with:
```
pipx inject eth-brownie numpy
```

Add OpenZeppelin package:
```
brownie pm install OpenZeppelin/openzeppelin-contracts@3.3.0
```

Run, from `packages/contracts/`:
```
brownie test -s
```

### RSK Regtest node

Add the local node as a `live` network at `~/.brownie/network-config.yaml`:
```
(...)
      - name: Local RSK
        chainid: 31
        id: rsk-testnet
        host: http://localhost:4444
```

Make sure state is cleaned up first:
```
rm -Rf build/deployments/*
```

Start RSK node from this repo’s root with:
```
yarn start-dev-chain:rsk
```

Then, again from `packages/contracts/`, run it with:
```
brownie test -s --network rsk-testnet
```

To stop the RSK node, you can do it with:
```
yarn stop-dev-chain
```

## System Quantities - Units and Representation

### Integer representations of decimals

Several ratios and the RBTC:USD price are integer representations of decimals, to 18 digits of precision. For example:

| **uint representation of decimal** | **Number**    |
| ---------------------------------- | ------------- |
| 1100000000000000000                | 1.1           |
| 200000000000000000000              | 200           |
| 1000000000000000000                | 1             |
| 5432100000000000000                | 5.4321        |
| 34560000000                        | 0.00000003456 |
| 370000000000000000000              | 370           |
| 1                                  | 1e-18         |

etc.

## Public Data

All data structures with the ‘public’ visibility specifier are ‘gettable’, with getters automatically generated by the compiler. Simply call `TroveManager::MCR()` to get the MCR, etc.

## Public User-Facing Functions

### Borrower (Trove) Operations - `BorrowerOperations.sol`

`openTrove(uint _maxFeePercentage, uint _ZUSDAmount, address _upperHint, address _lowerHint)`: payable function that creates a Line of Credit for the caller with the requested debt, and the RBTC received as collateral. Successful execution is conditional mainly on the resulting collateralization ratio which must exceed the minimum (110% in Normal Mode, 150% in Recovery Mode). In addition to the requested debt, extra debt is issued to pay the issuance fee, and cover the gas compensation. The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee. 

`addColl(address _upperHint, address _lowerHint))`: payable function that adds the received RBTC to the caller's active Line of Credit.

`withdrawColl(uint _amount, address _upperHint, address _lowerHint)`: withdraws `_amount` of collateral from the caller’s Line of Credit. Executes only if the user has an active Line of Credit, the withdrawal would not pull the user’s Line of Credit below the minimum collateralization ratio, and the resulting total collateralization ratio of the system is above 150%. 

`function withdrawZUSD(uint _maxFeePercentage, uint _ZUSDAmount, address _upperHint, address _lowerHint)`: issues `_amount` of ZUSD from the caller’s Line of Credit to the caller. Executes only if the Line of Credit's collateralization ratio would remain above the minimum, and the resulting total collateralization ratio is above 150%. The borrower has to provide a `_maxFeePercentage` that they are willing to accept in case of a fee slippage i.e. when a redemption transaction is processed first, driving up the borrowing fee.

`repayZUSD(uint _amount, address _upperHint, address _lowerHint)`: repay `_amount` of ZUSD to the caller’s Line of Credit, subject to leaving 20 ZUSD debt in the Line of Credit (which corresponds to the 20 ZUSD gas compensation).

`_adjustTrove(address _borrower, uint _collWithdrawal, uint _debtChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint _maxFeePercentage)`: enables a borrower to simultaneously change both their collateral and debt, subject to all the restrictions that apply to individual increases/decreases of each quantity with the following particularity: if the adjustment reduces the collateralization ratio of the Line of Credit, the function only executes if the resulting total collateralization ratio is above 150%. The borrower has to provide a `_maxFeePercentage` that they are willing to accept in case of a fee slippage i.e. when a redemption transaction is processed first, driving up the borrowing fee. The parameter is ignored if the debt is not increased with the transaction.

`closeTrove()`: allows a borrower to repay all debt, withdraw all their collateral, and close their Line of Credit. Requires the borrower to have a ZUSD balance sufficient to repay their Line of Credit's debt, excluding gas compensation - i.e. `(debt - 20)` ZUSD.

`claimCollateral(address _user)`: when a borrower’s Line of Credit has been fully redeemed from and closed, or liquidated in Recovery Mode with a collateralization ratio above 110%, this function allows the borrower to claim their RBTC collateral surplus that remains in the system (collateral - debt upon redemption; collateral - 110% of the debt upon liquidation).

### Line of Credit Manager Functions - `TroveManager.sol`

`liquidate(address _borrower)`: callable by anyone, attempts to liquidate the Line of Credit of `_user`. Executes successfully if `_user`’s Line of Credit meets the conditions for liquidation (e.g. in Normal Mode, it liquidates if the Line of Credit's ICR < the system Critical Collateral Ratio [CCR]).  

`liquidateTroves(uint n)`: callable by anyone, checks for under-collateralized Lines of Credit below MCR and liquidates up to `n`, starting from the Line of Credit  with the lowest collateralization ratio; subject to gas constraints and the actual number of under-collateralized Lines of Credit. The gas costs of `liquidateTroves(uint n)` mainly depend on the number of Lines of Credit that are liquidated, and whether the Lines of Credit are offset against the Stability Pool or redistributed. For n=1, the gas costs per liquidated Line of Credit are roughly between 215K-400K, for n=5 between 80K-115K, for n=10 between 70K-82K, and for n=50 between 60K-65K.

`batchLiquidateTroves(address[] calldata _troveArray)`: callable by anyone, accepts a custom list of Line of Credit addresses as an argument. Steps through the provided list and attempts to liquidate every Line of Credit, until it reaches the end or it runs out of gas. A Line of Credit is liquidated only if it meets the conditions for liquidation. For a batch of 10 Lines of Credit, the gas costs per liquidated Line of Credit are roughly between 75K-83K, for a batch of 50 Lines of Credit between 54K-69K.

`redeemCollateral(uint _ZUSDAmount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint _partialRedemptionHintNICR, uint _maxIterations, uint _maxFeePercentage)`: redeems `_ZUSDamount` of ZUSD for RBTC from the system. Decreases the caller’s ZUSD balance, and sends them the corresponding amount of RBTC. Executes successfully if the caller has sufficient ZUSD to redeem. The number of Lines of Credit redeemed from is capped by `_maxIterations`. The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage i.e. when another redemption transaction is processed first, driving up the redemption fee.

`getCurrentICR(address _user, uint _price)`: computes the user’s individual collateralization ratio (ICR) based on their total collateral and total ZUSD debt. Returns 2^256 -1 if they have 0 debt.

`getTroveOwnersCount()`: get the number of active lines of credit in the system.

`getPendingRBTCReward(address _borrower)`: get the pending RBTC reward from liquidation redistribution events, for the given Line of Credit .

`getPendingZUSDDebtReward(address _borrower)`: get the pending Line of Credit debt "reward" (i.e. the amount of extra debt assigned to the Line of Credit) from liquidation redistribution events.

`getEntireDebtAndColl(address _borrower)`: returns a Line of Credit’s entire debt and collateral balance, which respectively include any pending debt rewards and RBTC rewards from prior redistributions.

`getEntireSystemColl()`:  Returns the systemic entire collateral allocated to Lines of Credit i.e. the sum of the RBTC in the Active Pool and the Default Pool.

`getEntireSystemDebt()` Returns the systemic entire debt assigned to Lines of Credit i.e. the sum of the ZUSDDebt in the Active Pool and the Default Pool.

`getTCR()`: returns the total collateralization ratio (TCR) of the system. The TCR is based on the the entire system debt and collateral (including pending rewards).

`checkRecoveryMode()`: reveals whether or not the system is in Recovery Mode (i.e. whether the Total Collateralization Ratio (TCR) is below the Critical Collateralization Ratio (CCR)).

### Hint Helper Functions - `HintHelpers.sol`

`function getApproxHint(uint _CR, uint _numTrials, uint _inputRandomSeed)`: helper function, returns a positional hint for the sorted list. Used for transactions that must efficiently re-insert a Line of Credit  to the sorted list.

`getRedemptionHints(uint _ZUSDamount, uint _price, uint _maxIterations)`: helper function specifically for redemptions. Returns three hints:

- `firstRedemptionHint` is a positional hint for the first redeemable Line of Credit (i.e. Line of Credit with the lowest ICR >= MCR).
- `partialRedemptionHintNICR` is the final nominal ICR of the last Line of Credit after being hit by partial redemption, or zero in case of no partial redemption (see [Hints for `redeemCollateral`](#hints-for-redeemcollateral)).
- `truncatedZUSDamount` is the maximum amount that can be redeemed out of the the provided `_ZUSDamount`. This can be lower than `_ZUSDamount` when redeeming the full amount would leave the last Line of Credit of the redemption sequence with less debt than the minimum allowed value.

The number of Lines of Credit to consider for redemption can be capped by passing a non-zero value as `_maxIterations`, while passing zero will leave it uncapped.

### Stability Pool Functions - `StabilityPool.sol`

`provideToSP(uint _amount, address _frontEndTag)`: allows stablecoin holders to deposit `_amount` of ZUSD to the Stability Pool. It sends `_amount` of ZUSD from their address to the Pool, and tops up their ZUSD deposit by `_amount` and their tagged frontend’s stake by `_amount`. If the depositor already has a non-zero deposit, it sends their accumulated RBTC gains to their address.

`withdrawFromSP(uint _amount)`: allows a ZUSD holder to withdraw `_amount` of ZUSD from the Stability Pool, up to the value of their remaining Stability Pool deposit. It decreases their ZUSD balance by `_amount`. It sends the depositor’s accumulated RBTC gains to their address. If the user makes a partial withdrawal, their deposit remainder will earn further gains. To prevent potential loss evasion by depositors, withdrawals from the Stability Pool are suspended when there are liquidable Lines of Credit with ICR < 110% in the system.

`withdrawRBTCGainToTrove(address _hint)`: sends the user's entire accumulated RBTC gain to the user's active Line of Credit, and updates their Stability Pool deposit with its accumulated loss from debt absorptions.

`getDepositorRBTCGain(address _depositor)`: returns the accumulated RBTC gain for a given Stability Pool depositor

`getCompoundedZUSDDeposit(address _depositor)`: returns the remaining deposit amount for a given Stability Pool depositor

### ZUSD token `ZUSDToken.sol`

Standard ERC20 and EIP2612 (`permit()` ) functionality.

**Note**: `permit()` can be front-run, as it does not require that the permitted spender be the `msg.sender`.

This allows flexibility, as it means that _anyone_ can submit a Permit signed by A that allows B to spend a portion of A's tokens.

The end result is the same for the signer A and spender B, but does mean that a `permit` transaction could be front-run and revert - which may hamper the execution flow of a contract that is intended to handle the submission of a Permit on-chain.

For more details please see the original proposal EIP-2612:
https://eips.ethereum.org/EIPS/eip-2612

## Supplying Hints to Line of Credit operations

Troves in Zero are recorded in a sorted doubly linked list, sorted by their NICR, from high to low. NICR stands for the nominal collateral ratio that is simply the amount of collateral (in RBTC) multiplied by 100e18 and divided by the amount of debt (in ZUSD), without taking the RBTC:USD price into account. Given that all Lines of Credit are equally affected by RBTC price changes, they do not need to be sorted by their real ICR.

All Line of Credit operations that change the collateralization ratio need to either insert or reinsert the Line of Credit to the `SortedTroves` list. To reduce the computational complexity (and gas cost) of the insertion to the linked list, two ‘hints’ may be provided.

A hint is the address of a Line of Credit with a position in the sorted list close to the correct insert position.

All Line of Credit operations take two ‘hint’ arguments: a `_lowerHint` referring to the `nextId` and an `_upperHint` referring to the `prevId` of the two adjacent nodes in the linked list that are (or would become) the neighbors of the given Line of Credit. Taking both direct neighbors as hints has the advantage of being much more resilient to situations where a neighbor gets moved or removed before the caller's transaction is processed: the transaction would only fail if both neighboring lines of credit are affected during the pendency of the transaction.

The better the ‘hint’ is, the shorter the list traversal, and the cheaper the gas cost of the function call. `SortedList::findInsertPosition(uint256 _NICR, address _prevId, address _nextId)` that is called by the Line of Credit operation firsts check if `prevId` is still existant and valid (larger NICR than the provided `_NICR`) and then descends the list starting from `prevId`. If the check fails, the function further checks if `nextId` is still existant and valid (smaller NICR than the provided `_NICR`) and then ascends list starting from `nextId`. 

The `HintHelpers::getApproxHint(...)` function can be used to generate a useful hint pointing to a Line of Credit relatively close to the target position, which can then be passed as an argument to the desired Line of Credit operation or to `SortedTroves::findInsertPosition(...)` to get its two direct neighbors as ‘exact‘ hints (based on the current state of the system).

`getApproxHint(uint _CR, uint _numTrials, uint _inputRandomSeed)` randomly selects `numTrials` amount of Lines of Credit, and returns the one with the closest position in the list to where a Line of Credit with a nominal collateralization ratio of `_CR` should be inserted. It can be shown mathematically that for `numTrials = k * sqrt(n)`, the function's gas cost is with very high probability worst case `O(sqrt(n)) if k >= 10`. For scalability reasons (Infura is able to serve up to ~4900 trials), the function also takes a random seed `_inputRandomSeed` to make sure that calls with different seeds may lead to different results, allowing for better approximations through multiple consecutive runs.

**Line of Credit operation without a hint**

1. User performs Line of Credit operation in their browser.
2. Call the Line of Credit operation with `_lowerHint = _upperHint = userAddress`.

Gas cost will be worst case `O(n)`, where n is the size of the `SortedTroves` list.

**Line of Credit operation with hints**

1. User performs Line of Credit operation in their browser.
2. The frontend computes a new collateralization ratio locally, based on the change in collateral and/or debt.
3. Call `HintHelpers::getApproxHint(...)`, passing it the computed nominal collateralization ratio. Returns an address close to the correct insert position.
4. Call `SortedTroves::findInsertPosition(uint256 _NICR, address _prevId, address _nextId)`, passing it the same approximate hint via both `_prevId` and `_nextId` and the new nominal collateralization ratio via `_NICR`. 
5. Pass the ‘exact‘ hint in the form of the two direct neighbors, i.e. `_nextId` as `_lowerHint` and `_prevId` as `_upperHint`, to the Line of Credit operation function call. (Note that the hint may become slightly inexact due to pending transactions that are processed first, though this is gracefully handled by the system that can ascend or descend the list as needed to find the right position.)

Gas cost of steps 2-4 will be free, and step 5 will be `O(1)`.

Hints allow cheaper Line of Credit operations for the user, at the expense of a slightly longer time to completion, due to the need to await the result of the two read calls in steps 1 and 2 - which may be sent as JSON-RPC requests to Infura, unless the Frontend Operator is running a full RSK node.

### Example Borrower Operations with Hints

#### Opening a Line of Credit 
```
  const toWei = web3.utils.toWei
  const toBN = web3.utils.toBN

  const ZUSDAmount = toBN(toWei('2500')) // borrower wants to withdraw 2500 ZUSD
  const RBTCColl = toBN(toWei('5')) // borrower wants to lock 5 RBTC collateral

  // Call deployed Line of Credit Manager contract to read the liquidation reserve and latest borrowing fee
  const liquidationReserve = await Line of Credit Manager.ZUSD_GAS_COMPENSATION()
  const expectedFee = await Line of Credit Manager.getBorrowingFeeWithDecay(ZUSDAmount)
  
  // Total debt of the new Line of Credit = ZUSD amount drawn, plus fee, plus the liquidation reserve
  const expectedDebt = ZUSDAmount.add(expectedFee).add(liquidationReserve)

  // Get the nominal NICR of the new Line of Credit 
  const _1e20 = toBN(toWei('100'))
  let NICR = RBTCColl.mul(_1e20).div(expectedDebt)

  // Get an approximate address hint from the deployed HintHelper contract. Use (15 * number of Lines of Credit) trials 
  // to get an approx. hint that is close to the right position.
  let numTroves = await sortedTroves.getSize()
  let numTrials = numTroves.mul(toBN('15'))
  let { 0: approxHint } = await hintHelpers.getApproxHint(NICR, numTrials, 42)  // random seed of 42

  // Use the approximate hint to get the exact upper and lower hints from the deployed SortedTroves contract
  let { 0: upperHint, 1: lowerHint } = await sortedTroves.findInsertPosition(NICR, approxHint, approxHint)

  // Finally, call openTrove with the exact upperHint and lowerHint
  const maxFee = '5'.concat('0'.repeat(16)) // Slippage protection: 5%
  await borrowerOperations.openTrove(maxFee, ZUSDAmount, upperHint, lowerHint, { value: RBTCColl })
```

#### Adjusting a Line of Credit 
```
  const collIncrease = toBN(toWei('1'))  // borrower wants to add 1 RBTC
  const ZUSDRepayment = toBN(toWei('230')) // borrower wants to repay 230 ZUSD

  // Get Line of Credit's current debt and collateral
  const {0: debt, 1: coll} = await Line of Credit Manager.getEntireDebtAndColl(borrower)
  
  const newDebt = debt.sub(ZUSDRepayment)
  const newColl = coll.add(collIncrease)

  NICR = newColl.mul(_1e20).div(newDebt)

  // Get an approximate address hint from the deployed HintHelper contract. Use (15 * number of Lines of Credit) trials 
  // to get an approx. hint that is close to the right position.
  numTroves = await sortedTroves.getSize()
  numTrials = numTroves.mul(toBN('15'))
  ({0: approxHint} = await hintHelpers.getApproxHint(NICR, numTrials, 42))

  // Use the approximate hint to get the exact upper and lower hints from the deployed SortedTroves contract
  ({ 0: upperHint, 1: lowerHint } = await sortedTroves.findInsertPosition(NICR, approxHint, approxHint))

  // Call adjustTrove with the exact upperHint and lowerHint
  await borrowerOperations.adjustTrove(maxFee, 0, ZUSDRepayment, false, upperHint, lowerHint, {value: collIncrease})
```

### Hints for `redeemCollateral`

`TroveManager::redeemCollateral` as a special case requires additional hints:
- `_firstRedemptionHint` hints at the position of the first Line of Credit that will be redeemed from,
- `_lowerPartialRedemptionHint` hints at the `nextId` neighbor of the last redeemed Line of Credit upon reinsertion, if it's partially redeemed,
- `_upperPartialRedemptionHint` hints at the `prevId` neighbor of the last redeemed Line of Credit upon reinsertion, if it's partially redeemed,
- `_partialRedemptionHintNICR` ensures that the transaction won't run out of gas if neither `_lowerPartialRedemptionHint` nor `_upperPartialRedemptionHint` are  valid anymore.

`redeemCollateral` will only redeem from Lines of Credit that have an ICR >= MCR. In other words, if there are Lines of Credit at the bottom of the SortedTroves list that are below the minimum collateralization ratio (which can happen after an RBTC:USD price drop), they will be skipped. To make this more gas-efficient, the position of the first redeemable Line of Credit should be passed as `_firstRedemptionHint`.

#### First redemption hint

The first redemption hint is the address of the Line of Credit from which to start the redemption sequence i.e the address of the first Line of Credit in the system with ICR >= 110%.

If when the transaction is confirmed the address is in fact not valid - the system will start from the lowest ICR Line of Credit in the system, and step upwards until it finds the first Line of Credit with ICR >= 110% to redeem from. In this case, since the number of lines of credit below 110% will be limited due to ongoing liquidations, there's a good chance that the redemption transaction still succeed. 

#### Partial redemption hints

All Lines of Credit that are fully redeemed from in a redemption sequence are left with zero debt, and are closed. The remaining collateral (the difference between the orginal collateral and the amount used for the redemption) will be claimable by the owner.

It’s likely that the last Line of Credit in the redemption sequence would be partially redeemed from i.e. only some of its debt cancelled with ZUSD. In this case, it should be reinserted somewhere between top and bottom of the list. The `_lowerPartialRedemptionHint` and `_upperPartialRedemptionHint` hints passed to `redeemCollateral` describe the future neighbors the expected reinsert position.

However, if between the off-chain hint computation and on-chain execution a different transaction changes the state of a Line of Credit that would otherwise be hit by the redemption sequence, then the off-chain hint computation could end up totally inaccurate. This could lead to the whole redemption sequence reverting due to out-of-gas error.

To mitigate this, another hint needs to be provided: `_partialRedemptionHintNICR`, the expected nominal ICR of the final partially-redeemed-from Line of Credit. The on-chain redemption function checks whether, after redemption, the nominal ICR of this Line of Credit would equal the nominal ICR hint.

If not, the redemption sequence doesn’t perform the final partial redemption, and terminates early. This ensures that the transaction doesn’t revert, and most of the requested ZUSD redemption can be fulfilled.

#### Example Redemption with hints
```
 // Get the redemptions hints from the deployed HintHelpers contract
  const redemptionhint = await hintHelpers.getRedemptionHints(ZUSDAmount, price, 50)

  const { 0: firstRedemptionHint, 1: partialRedemptionNewICR, 2: truncatedZUSDAmount } = redemptionhint

  // Get the approximate partial redemption hint
  const { hintAddress: approxPartialRedemptionHint } = await contracts.hintHelpers.getApproxHint(partialRedemptionNewICR, numTrials, 42)
  
  /* Use the approximate partial redemption hint to get the exact partial redemption hint from the 
  * deployed SortedTroves contract
  */
  const exactPartialRedemptionHint = (await sortedTroves.findInsertPosition(partialRedemptionNewICR,
    approxPartialRedemptionHint,
    approxPartialRedemptionHint))

  /* Finally, perform the on-chain redemption, passing the truncated ZUSD amount, the correct hints, and the expected
  * ICR of the final partially redeemed Line of Credit in the sequence. 
  */
  await Line of Credit Manager.redeemCollateral(truncatedZUSDAmount,
    firstRedemptionHint,
    exactPartialRedemptionHint[0],
    exactPartialRedemptionHint[1],
    partialRedemptionNewICR,
    0, maxFee,
    { from: redeemer },
  )
```

## Gas compensation

In Zero, we want to maximize liquidation throughput, and ensure that undercollateralized Lines of Credit are liquidated promptly by “liquidators” - agents who may (or may not) also hold Stability Pool deposits, and who expect to profit from liquidations.

However, gas costs in RSK can be substantial. If the gas costs of our public liquidation functions are too high, this may discourage liquidators from calling them, and leave the system holding too many undercollateralized Lines of Credit for too long.

The protocol thus directly compensates liquidators for their gas costs, to incentivize prompt liquidations in both normal and extreme periods of high gas prices. Liquidators should be confident that they will at least break even by making liquidation transactions.

Gas compensation is paid in a mix of ZUSD and RBTC. While the RBTC is taken from the liquidated Line of Credit, the ZUSD is provided by the borrower. When a borrower first issues debt, some ZUSD is reserved as a Liquidation Reserve. A liquidation transaction thus draws RBTC from the Line(s) of Credit it liquidates, and sends both the reserved ZUSD and the compensation in RBTC to the caller, and liquidates the remainder.

When a liquidation transaction liquidates multiple Lines of Credit, each Line of Credit contributes ZUSD and RBTC towards the total compensation for the transaction.

Gas compensation per liquidated Line of Credit is given by the formula:

Gas compensation = `20 ZUSD + 0.5% of Line of Credit’s collateral (RBTC)`

The intentions behind this formula are:
- To ensure that smaller Lines of Credit are liquidated promptly in normal times, at least.
- To ensure that larger Lines of Credit are liquidated promptly even in extreme high gas price periods. The larger the Line of Credit, the stronger the incentive to liquidate it.

### Gas compensation schedule

When a borrower opens a Line of Credit, an additional 20 ZUSD debt is issued, and 20 ZUSD is minted and sent to a dedicated contract (`GasPool`) for gas compensation - the "gas pool".

When a borrower closes their active Line of Credit, this gas compensation is refunded: 20 ZUSD is burned from the gas pool's balance, and the corresponding 20 ZUSD debt on the Line of Credit is cancelled.

The purpose of the 20 ZUSD Liquidation Reserve is to provide a minimum level of gas compensation, regardless of the Line of Credit's collateral size or the current RBTC price.

### Liquidation

When a Line of Credit is liquidated, 0.5% of its collateral is sent to the liquidator, along with the 20 ZUSD Liquidation Reserve. Thus, a liquidator always receives `{20 ZUSD + 0.5% collateral}` per Line of Credit that they liquidate. The collateral remainder of the Line of Credit is then either offset, redistributed, or a combination of both, depending on the amount of ZUSD in the Stability Pool.

### Gas compensation and redemptions

When a Line of Credit is redeemed from, the redemption is made only against (debt - 20), not the entire debt.

But if the redemption causes an amount (debt - 20) to be cancelled, the Line of Credit is then closed: the 20 ZUSD Liquidation Reserve is cancelled with its remaining 20 debt. That is, the gas compensation is burned from the gas pool, and the 20 debt is zeroed. The RBTC collateral surplus from the Line of Credit remains in the system, to be later claimed by its owner.

### Gas compensation helper functions

Gas compensation functions are found in the parent _LiquityBase.sol_ contract:

`_getCollGasCompensation(uint _entireColl)` returns the amount of RBTC to be drawn from a Line of Credit's collateral and sent as gas compensation. 

`_getCompositeDebt(uint _debt)` returns the composite debt (drawn debt + gas compensation) of a Line of Credit, for the purpose of ICR calculation.

## The Stability Pool

Any ZUSD holder may deposit ZUSD to the Stability Pool. It is designed to absorb debt from liquidations, and reward depositors with the liquidated collateral, shared between depositors in proportion to their deposit size.

Since liquidations are expected to occur at an ICR of just below 110%, and even in most extreme cases, still above 100%, a depositor can expect to receive a net gain from most liquidations. When that holds, the dollar value of the RBTC gain from a liquidation exceeds the dollar value of the ZUSD loss (assuming the price of ZUSD is 1 USD).  

We define the **collateral surplus** in a liquidation as `$(RBTC) - debt`, where `$(...)` represents the dollar value.

At a ZUSD price of 1 USD, lines of credit with `ICR > 100%` have a positive collateral surplus.

After one or more liquidations, a deposit will have absorbed ZUSD losses, and received RBTC gains. The remaining reduced deposit is the **compounded deposit**.

Stability Providers expect a positive ROI on their initial deposit. That is:

`$(RBTC Gain + compounded deposit) > $(initial deposit)`

### Mixed liquidations: offset and redistribution

When a liquidation hits the Stability Pool, it is known as an **offset**: the debt of the Line of Credit is offset against the ZUSD in the Stability Pool. When **x** ZUSD debt is offset, the debt is cancelled, and **x** ZUSD in the Stability Pool is burned. When the ZUSD Stability Pool is greater than the debt of the Line of Credit, all the Line of Credit's debt is cancelled, and all its RBTC is shared between depositors. This is a **pure offset**.

It can happen that the ZUSD in the Stability Pool is less than the debt of a Line of Credit. In this case, the the whole Stability Pool will be used to offset a fraction of the Line of Credit’s debt, and an equal fraction of the Line of Credit’s RBTC collateral will be assigned to Stability Providers. The remainder of the Line of Credit’s debt and RBTC gets redistributed to active Lines of Credit. This is a **mixed offset and redistribution**.

Because the RBTC collateral fraction matches the offset debt fraction, the effective ICR of the collateral and debt that is offset, is equal to the ICR of the Line of Credit. So, for depositors, the ROI per liquidation depends only on the ICR of the liquidated Line of Credit.

### Stability Pool deposit losses and RBTC gains - implementation

Deposit functionality is handled by `StabilityPool.sol` (`provideToSP`, `withdrawFromSP`, etc).  StabilityPool also handles the liquidation calculation, and holds the ZUSD and RBTC balances.

When a liquidation is offset with the Stability Pool, debt from the liquidation is cancelled with an equal amount of ZUSD in the pool, which is burned. 

Individual deposits absorb the debt from the liquidated Line of Credit in proportion to their deposit as a share of total deposits.
 
Similarly the liquidated Line of Credit’s RBTC is assigned to depositors in the same proportion.

For example: a liquidation that empties 30% of the Stability Pool will reduce each deposit by 30%, no matter the size of the deposit.

### Stability Pool example

Here’s an example of the Stability Pool absorbing liquidations. The Stability Pool contains 3 depositors, A, B and C, and the RBTC:USD price is 100.

There are two Lines of Credit to be liquidated, T1 and T2:

|     | Line of Credit | Collateral (RBTC) | Debt (ZUSD) | ICR         | $(RBTC) ($) | Collateral surplus ($) |
| --- | -------------- | ----------------- | ----------- | ----------- | ----------- | ---------------------- |
|     | T1             | 1.6               | 150         | 1.066666667 | 160         | 10                     |
|     | T2             | 2.45              | 225         | 1.088888889 | 245         | 20                     |

Here are the deposits, before any liquidations occur:

| Depositor | Deposit | Share  |
| --------- | ------- | ------ |
| A         | 100     | 0.1667 |
| B         | 200     | 0.3333 |
| C         | 300     | 0.5    |
| Total     | 600     | 1      |

Now, the first liquidation T1 is absorbed by the Pool: 150 debt is cancelled with 150 Pool ZUSD, and its 1.6 RBTC is split between depositors. We see the gains earned by A, B, C, are in proportion to their share of the total ZUSD in the Stability Pool:

| Deposit | Debt absorbed from T1 | Deposit after | Total RBTC gained | $(deposit + RBTC gain) ($) | Current ROI   |
| ------- | --------------------- | ------------- | ----------------- | -------------------------- | ------------- |
| A       | 25                    | 75            | 0.2666666667      | 101.6666667                | 0.01666666667 |
| B       | 50                    | 150           | 0.5333333333      | 203.3333333                | 0.01666666667 |
| C       | 75                    | 225           | 0.8               | 305                        | 0.01666666667 |
| Total   | 150                   | 450           | 1.6               | 610                        | 0.01666666667 |

And now the second liquidation, T2, occurs: 225 debt is cancelled with 225 Pool ZUSD, and 2.45 RBTC is split between depositors. The accumulated RBTC gain includes all RBTC gain from T1 and T2.

| Depositor | Debt absorbed from T2 | Deposit after | Accumulated RBTC | $(deposit + RBTC gain) ($) | Current ROI |
| --------- | --------------------- | ------------- | ---------------- | -------------------------- | ----------- |
| A         | 37.5                  | 37.5          | 0.675            | 105                        | 0.05        |
| B         | 75                    | 75            | 1.35             | 210                        | 0.05        |
| C         | 112.5                 | 112.5         | 2.025            | 315                        | 0.05        |
| Total     | 225                   | 225           | 4.05             | 630                        | 0.05        |

It’s clear that:

- Each depositor gets the same ROI from a given liquidation
- Depositors return increases over time, as the deposits absorb liquidations with a positive collateral surplus

Eventually, a deposit can be fully “used up” in absorbing debt, and reduced to 0. This happens whenever a liquidation occurs that empties the Stability Pool. A deposit stops earning RBTC gains when it has been reduced to 0.

### Stability Pool implementation

A depositor obtains their compounded deposits and corresponding RBTC gain in a “pull-based” manner. The system calculates the depositor’s compounded deposit and accumulated RBTC gain when the depositor makes an operation that changes their ZUSD deposit.

Depositors deposit ZUSD via `provideToSP`, and withdraw with `withdrawFromSP`. Their accumulated RBTC gain is paid out every time they make a deposit operation - so RBTC payout is triggered by both deposit withdrawals and top-ups.

### How deposits and RBTC gains are tracked

We use a highly scalable method of tracking deposits and RBTC gains that has O(1) complexity. 

When a liquidation occurs, rather than updating each depositor’s deposit and RBTC gain, we simply update two intermediate variables: a product `P`, and a sum `S`.

A mathematical manipulation allows us to factor out the initial deposit, and accurately track all depositors’ compounded deposits and accumulated RBTC gains over time, as liquidations occur, using just these two variables. When depositors join the Pool, they get a snapshot of `P` and `S`.

The formula for a depositor’s accumulated RBTC gain is derived here:

[Scalable reward distribution for compounding, decreasing stake](https://github.com/DistributedCollective/zero/blob/main/packages/contracts/mathProofs/Scalable%20Compounding%20Stability%20Pool%20Deposits.pdf)

Each liquidation updates `P` and `S`. After a series of liquidations, a compounded deposit and corresponding RBTC gain can be calculated using the initial deposit, the depositor’s snapshots, and the current values of `P` and `S`.

Any time a depositor updates their deposit (withdrawal, top-up) their RBTC gain is paid out, and they receive new snapshots of `P` and `S`.

This is similar in spirit to the simpler [Scalable Reward Distribution on the Ethereum Network by Bogdan Batog et al](http://batog.info/papers/scalable-reward-distribution.pdf), however, the mathematics is more involved as we handle a compounding, decreasing stake, and a corresponding RBTC reward.

## Zero System Fees

Zero generates fee revenue from certain operations. Fees are captured by SOV stakers.

An SOV holder may stake their SOV, and earn a share of all system fees, proportional to their share of the total SOV staked. This is described in the [Sovryn governance documentation](https://wiki.sovryn.app/en/governance/about-sovryn-governance).

Zero generates revenue in two ways: redemptions, and borrowing ZUSD.

Redemptions fees are paid in RBTC. Borrowing fees (when a user opens a Line of Credit, or borrows more ZUSD from their existing Line of Credit) are paid in ZUSD.

### Redemption Fee

The redemption fee is taken as a cut of the total RBTC drawn from the system in a redemption. It is based on the current redemption rate.

In the `TroveManager`, `redeemCollateral` calculates the RBTC fee and transfers it to the `sovFeeCollector`.

### Borrowing fee

The borrowing fee is charged on the ZUSD drawn by the user and is added to the Line of Credit's ZUSD debt. It is based on the current borrowing rate.

When new ZUSD are drawn via one of the `BorrowerOperations` functions `openTrove`, `withdrawZUSD` or `adjustTrove`, an extra amount `ZUSDFee` is minted, and an equal amount of debt is added to the user’s Line of Credit. The `ZUSDFee` is transferred to the `sovFeeCollector`.

### Fee Schedule

Redemption and issuance fees are based on the `baseRate` state variable in TroveManager, which is dynamically updated. The `baseRate` increases with each redemption, and decays according to time passed since the last fee event i.e. the last redemption or issuance of ZUSD.

The current fee schedule:

Upon each redemption:
- `baseRate` is decayed based on time passed since the last fee event
- `baseRate` is incremented by an amount proportional to the fraction of the total ZUSD supply that was redeemed
- The redemption rate is given by `min{REDEMPTION_FEE_FLOOR + baseRate * RBTCdrawn, DECIMAL_PRECISION}`

Upon each debt issuance:
- `baseRate` is decayed based on time passed since the last fee event
- The borrowing rate is given by `min{BORROWING_FEE_FLOOR + baseRate * newDebtIssued, MAX_BORROWING_FEE}`

`REDEMPTION_FEE_FLOOR` and `BORROWING_FEE_FLOOR` are both set to 0.5%, while `MAX_BORROWING_FEE` is 5% and `DECIMAL_PRECISION` is 100%.

### Intuition behind fees

The larger the redemption volume, the greater the fee percentage.

The longer the time delay since the last operation, the more the `baseRate` decreases.

The intent is to throttle large redemptions with higher fees, and to throttle borrowing directly after large redemption volumes. The `baseRate` decay over time ensures that the fee for both borrowers and redeemers will “cool down”, while redemptions volumes are low.

Furthermore, the fees cannot become smaller than 0.5%, which in the case of redemptions protects the redemption facility from being front-run by arbitrageurs that are faster than the price feed. The 5% maximum on the issuance is meant to keep the system (somewhat) attractive for new borrowers even in phases where the monetary supply is contracting due to redemptions.

### Fee decay Implementation

Time is measured in units of minutes. The `baseRate` decay is based on `block.timestamp - lastFeeOpTime`. If less than a minute has passed since the last fee event, then `lastFeeOpTime` is not updated. This prevents “base rate griefing” i.e. it prevents an attacker stopping the `baseRate` from decaying by making a series of redemptions or issuing ZUSD with time intervals of < 1 minute.

The decay parameter is tuned such that the fee changes by a factor of 0.99 per hour, i.e. it loses 1% of its current value per hour. At that rate, after one week, the baseRate decays to 18% of its prior value. The exact decay parameter is subject to change, and will be fine-tuned via economic modelling.

### Staking SOV and earning fees

SOV holders may `stake` and `unstake` their SOV in the `Staking` contract in exchange for Voting Power. 

When a fee event occurs, the fee in ZUSD or RBTC is sent to the staking contract, and a reward-per-unit-staked sum (`F_RBTC`, or `F_ZUSD`) is incremented. An SOV stake earns a share of the fee equal to its share of the total SOV Voting Power, at the instant the fee occurred.

This staking formula and implementation follows the basic [“Batog” pull-based reward distribution](http://batog.info/papers/scalable-reward-distribution.pdf).

## Redistributions and Corrected Stakes

When a liquidation occurs and the Stability Pool is empty or smaller than the liquidated debt, the redistribution mechanism should distribute the remaining collateral and debt of the liquidated Line of Credit to all active Lines of Credit in the system, in proportion to their collateral.

For two Lines of Credit A and B with collateral `A.coll > B.coll`, Line of Credit A should earn a bigger share of the liquidated collateral and debt.

In Zero it is important that all active Lines of Credit remain ordered by their ICR. We have proven that redistribution of the liquidated debt and collateral proportional to active Lines of Credit collateral preserves the ordering of active Lines of Credit by ICR as liquidations occur over time. Please see the [proofs section](https://github.com/DistributedCollective/zero/tree/main/packages/contracts/mathProofs).

However, when it comes to implementation, RSK gas costs make it too expensive to loop over all Lines of Credit and write new data to storage for each one. When a Line of Credit receives redistribution rewards, the system does not update the Line of Credit's collateral and debt properties - instead, the Line of Credit’s rewards remain "pending" until the borrower's next operation.

These “pending rewards” can not be accounted for in future reward calculations in a scalable way.

However: the ICR of a Line of Credit is always calculated as the ratio of its total collateral to its total debt. So, a Line of Credit’s ICR calculation **does** include all its previous accumulated rewards.

**This causes a problem: redistributions proportional to initial collateral can break Line of Credit ordering.**

Consider the case where new Line of Credit is created after all active Lines of Credit have received a redistribution from a liquidation. This “fresh” Line of Credit  has then experienced fewer rewards than the older Lines of Credit, and thus, it receives a disproportionate share of subsequent rewards, relative to its total collateral.

The fresh Line of Credit would earn rewards based on its **entire** collateral, whereas old lines of credit would earn rewards based only on **some portion** of their collateral - since a part of their collateral is pending, and not included in the Line of Credit’s `coll` property.

This can break the ordering of Lines of Credit by ICR - see the [proofs section](https://github.com/DistributedCollective/zero/tree/main/packages/contracts/mathProofs).

### Corrected Stake Solution

We use a corrected stake to account for this discrepancy, and ensure that newer Lines of Credit earn the same liquidation rewards per unit of total collateral, as do older Lines of Credit with pending rewards. Thus the corrected stake ensures the sorted list remains ordered by ICR, as liquidation events occur over time.

When a Line of Credit is opened, its stake is calculated based on its collateral, and snapshots of the entire system collateral and debt which were taken immediately after the last liquidation.

A Line of Credit’s stake is given by:

```
stake = _coll.mul(totalStakesSnapshot).div(totalCollateralSnapshot)
```

It then earns redistribution rewards based on this corrected stake. A newly opened Line of Credit’s stake will be less than its raw collateral, if the system contains active Lines of Credit with pending redistribution rewards when it was made.

Whenever a borrower adjusts their Line of Credit’s collateral, their pending rewards are applied, and a fresh corrected stake is computed.

To convince yourself this corrected stake preserves ordering of active Lines of Credit by ICR, please see the [proofs section](https://github.com/DistributedCollective/zero/blob/main/papers).

## Math Proofs

The Zero implementation relies on some important system properties and mathematical derivations.

In particular, we have:

- Proofs that Line of Credit ordering is maintained throughout a series of liquidations and new Line of Credit openings
- A derivation of a formula and implementation for a highly scalable (O(1) complexity) reward distribution in the Stability Pool, involving compounding and decreasing stakes.

PDFs of these can be found in https://github.com/DistributedCollective/zero/blob/main/papers

## Definitions

_**Line of Credit:**_ a collateralized debt position, aka "Trove", bound to a single RSK address. Also referred to as a “CDP” in similar protocols.

_**ZUSD**_:  The stablecoin that may be issued from a user's collateralized debt position and freely transferred/traded to any RSK address. Intended to maintain parity with the US dollar, and can always be redeemed directly with the system: 1 ZUSD is always exchangeable for 1 USD worth of RBTC, minus a redemption fee.

_**Active Line of Credit:**_ an RSK address owns an “active Line of Credit” if there is a node in the `SortedTroves` list with ID equal to the address, and non-zero collateral is recorded on the Line of Credit struct for that address.

_**Closed Line of Credit:**_ a Line of Credit that was once active, but now has zero debt and zero collateral recorded on its struct, and there is no node in the `SortedTroves` list with ID equal to the owning address.

_**Active collateral:**_ the amount of RBTC collateral recorded on a Line of Credit’s struct

_**Active debt:**_ the amount of ZUSD debt recorded on a Line of Credit’s struct

_**Entire collateral:**_ the sum of a Line of Credit’s active collateral plus its pending collateral rewards accumulated from distributions

_**Entire debt:**_ the sum of a Line of Credit’s active debt plus its pending debt rewards accumulated from distributions

_**Individual collateralization ratio (ICR):**_ a Line of Credit's ICR is the ratio of the dollar value of its entire collateral at the current RBTC:USD price, to its entire debt

_**Nominal collateralization ratio (nominal ICR, NICR):**_ a Line of Credit's nominal ICR is its entire collateral (in RBTC) multiplied by 100e18 and divided by its entire debt.

_**Total active collateral:**_ the sum of active collateral over all Lines of Credit. Equal to the RBTC in the ActivePool.

_**Total active debt:**_ the sum of active debt over all Lines of Credit. Equal to the ZUSD in the ActivePool.

_**Total defaulted collateral:**_ the total RBTC collateral in the DefaultPool

_**Total defaulted debt:**_ the total ZUSD debt in the DefaultPool

_**Entire system collateral:**_ the sum of the collateral in the ActivePool and DefaultPool

_**Entire system debt:**_ the sum of the debt in the ActivePool and DefaultPool

_**Total collateralization ratio (TCR):**_ the ratio of the dollar value of the entire system collateral at the current RBTC:USD price, to the entire system debt

_**Critical collateralization ratio (CCR):**_ 150%. When the TCR is below the CCR, the system enters Recovery Mode.

_**Borrower:**_ an externally owned account or contract that locks collateral in a Line of Credit and issues ZUSD tokens to their own address. They “borrow” ZUSD against their RBTC collateral.

_**Depositor:**_ an externally owned account or contract that has assigned ZUSD to the Stability Pool, in order to earn returns from liquidations.

_**Redemption:**_ the act of swapping ZUSD with the system, in return for an equivalent value of RBTC. Any account with a ZUSD balance may redeem them, whether or not they are a borrower.

When ZUSD is redeemed for RBTC, the RBTC is always withdrawn from the lowest collateral Lines of Credit, in ascending order of their collateralization ratio. A redeemer can not selectively target Lines of Credit with which to swap ZUSD for RBTC.

_**Repayment:**_ when a borrower sends ZUSD to their own Line of Credit, reducing their debt, and increasing their collateralization ratio.

_**Retrieval:**_ when a borrower with an active Line of Credit withdraws some or all of their RBTC collateral from their own Line of Credit, either reducing their collateralization ratio, or closing their Line of Credit (if they have zero debt and withdraw all their RBTC)

_**Liquidation:**_ the act of force-closing an undercollateralized Line of Credit and redistributing its collateral and debt. When the Stability Pool is sufficiently large, the liquidated debt is offset with the Stability Pool, and the RBTC distributed to depositors. If the liquidated debt can not be offset with the Stability Pool, the system redistributes the liquidated collateral and debt directly to the active Lines of Credit with >110% collateralization ratio.

Liquidation functionality is permissionless and publicly available - anyone may liquidate an undercollateralized Line of Credit, or batch liquidate Lines of Credit in ascending order of collateralization ratio.

_**Collateral Surplus**_: The difference between the dollar value of a Line of Credit's RBTC collateral, and the dollar value of its ZUSD debt. In a full liquidation, this is the net gain earned by the recipients of the liquidation.

_**Offset:**_ cancellation of liquidated debt with ZUSD in the Stability Pool, and assignment of liquidated collateral to Stability Pool depositors, in proportion to their deposit.

_**Redistribution:**_ assignment of liquidated debt and collateral directly to active Lines of Credit, in proportion to their collateral.

_**Pure offset:**_  when a Line of Credit's debt is entirely cancelled with ZUSD in the Stability Pool, and all of its liquidated RBTC collateral is assigned to Stability Pool depositors.

_**Mixed offset and redistribution:**_  When the Stability Pool ZUSD only covers a fraction of the liquidated Line of Credit's debt. This fraction of debt is cancelled with ZUSD in the Stability Pool, and an equal fraction of the Line of Credit's collateral is assigned to depositors. The remaining collateral & debt is redistributed directly to active Lines of Credit.

_**Gas compensation:**_ A refund, in ZUSD and RBTC, automatically paid to the caller of a liquidation function, intended to at least cover the gas cost of the transaction. Designed to ensure that liquidators are not dissuaded by potentially high gas costs.

## Development

The Zero monorepo is based on Yarn's [workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) feature. You might be able to install some of the packages individually with npm, but to make all interdependent packages see each other, you'll need to use Yarn.

In addition, some package scripts require Docker to be installed (Docker Desktop on Windows and Mac, Docker Engine on Linux).

### Prerequisites

You'll need to install the following:

- [Git](https://help.github.com/en/github/getting-started-with-github/set-up-git) (of course)
- [Node v12.x](https://nodejs.org/dist/latest-v12.x/)
- [Docker](https://docs.docker.com/get-docker/)
- [Yarn](https://classic.yarnpkg.com/en/docs/install)

#### Making node-gyp work

Zero indirectly depends on some packages with native addons. To make sure these can be built, you'll have to take some additional steps. Refer to the subsection of [Installation](https://github.com/nodejs/node-gyp#installation) in node-gyp's README that corresponds to your operating system.

Note: you can skip the manual installation of node-gyp itself (`npm install -g node-gyp`), but you will need to install its prerequisites to make sure Zero can be installed.

### Clone & Install

```
git clone https://github.com/DistributedCollective/zero.git zero
cd zero
yarn
```

### Top-level scripts

There are a number of scripts in the top-level package.json file to ease development, which you can run with yarn.

#### Run all tests

```
yarn test
```

#### Deploy contracts to a testnet

E.g.:

```
yarn deploy --network ropsten
```

Supported networks are currently: rsk testnet, rsk mainnet. The above command will deploy into the default channel (the one that's used by the public dev-frontend). To deploy into the internal channel instead:

```
yarn deploy --network ropsten --channel internal
```

You can optionally specify an explicit gas price too:

```
yarn deploy --network ropsten --gas-price 20
```

After a successful deployment, the addresses of the newly deployed contracts will be written to a version-controlled JSON file under `packages/lib/deployments/default`.

To publish a new deployment, you must execute the above command for all of the following combinations:

| Network    | Channel  |
| ---------- | -------- |
| rsktestnet | default  |
| rsktestnet | internal |
| rskmainnet | default  |

At some point in the future, we will make this process automatic. Once you're done deploying to all the networks, execute the following command:

```
yarn save-live-version
```

This copies the contract artifacts to a version controlled area (`packages/lib/live`) then checks that you really did deploy to all the networks. Next you need to commit and push all changed files. The repo's GitHub workflow will then build a new Docker image of the frontend interfacing with the new addresses.

#### Start a local blockchain and deploy the contracts

```
yarn start-dev-chain
```

Starts an RSK node in a Docker container, running the [private development chain](https://github.com/rsksmart/rskj), then deploys the contracts to this chain.

You may want to use this before starting the dev-frontend in development mode. To use the newly deployed contracts, switch MetaMask to the built-in "Localhost 8545" network.

> Q: How can I get RBTC on the local blockchain?  
> A: There are some already unlocked accounts 

Once you no longer need the local node, stop it with:

```
yarn stop-dev-chain
```

#### Start dev-frontend in development mode

```
yarn start-dev-frontend
```

This will start dev-frontend in development mode on http://localhost:3000. The app will automatically be reloaded if you change a source file under `packages/dev-frontend`.

If you make changes to a different package under `packages`, it is recommended to rebuild the entire project with `yarn prepare` in the root directory of the repo. This makes sure that a change in one package doesn't break another.

To stop the dev-frontend running in this mode, bring up the terminal in which you've started the command and press Ctrl+C.

#### Start dev-frontend in demo mode

This will automatically start the local blockchain, so you need to make sure that's not already running before you run the following command.

```
yarn start-demo
```

This spawns a modified version of dev-frontend that ignores MetaMask, and directly uses the local blockchain node. Every time the page is reloaded (at http://localhost:3000), a new random account is created with a balance of 100 RBTC. Additionally, transactions are automatically signed, so you no longer need to accept wallet confirmations. This lets you play around with Zero more freely.

When you no longer need the demo mode, press Ctrl+C in the terminal then run:

```
yarn stop-demo
```

#### Build dev-frontend for production

In a freshly cloned & installed monorepo, or if you have only modified code inside the dev-frontend package:

```
yarn build
```

If you have changed something in one or more packages apart from dev-frontend, it's best to use:

```
yarn rebuild
```

This combines the top-level `prepare` and `build` scripts.

You'll find the output in `packages/dev-frontend/build`.

### Configuring your custom frontend

Your custom built frontend can be configured by putting a file named `config.json` inside the same directory as `index.html` built in the previous step. The format of this file is:

```
{
  "frontendTag": "0x2781fD154358b009abf6280db4Ec066FCC6cb435",
  "infuraApiKey": "158b6511a5c74d1ac028a8a2afe8f626"
}
```

## Running a frontend with Docker

The quickest way to get a frontend up and running is to use the [prebuilt image](https://hub.docker.com/r/liquity/dev-frontend) available on Docker Hub.

### Prerequisites

You will need to have [Docker](https://docs.docker.com/get-docker/) installed.

### Running with `docker`

```
docker pull liquity/dev-frontend
docker run --name Zero -d --rm -p 3000:80 liquity/dev-frontend
```

This will start serving your frontend using HTTP on port 3000. If everything went well, you should be able to open http://localhost:3000/ in your browser. To use a different port, just replace 3000 with your desired port number.

To stop the service:

```
docker kill liquity
```

### Configuring a public frontend

If you're planning to publicly host a frontend, you might need to pass the Docker container some extra configuration in the form of environment variables.

#### INFURA_API_KEY

This is an optional parameter. If you'd like your frontend to use Infura's [WebSocket endpoint](https://infura.io/docs/RSK#section/Websockets) for receiving blockchain events, set this variable to an Infura Project ID.

### Next steps for hosting a frontend

You'll need to decide how you want to host your frontend. There are way too many options to list here, so these are going to be just a few examples.

#### Example 1: using static website hosting

A frontend doesn't require any database or server-side computation, so the easiest way to host it is to use a service that lets you upload a folder of static files (HTML, CSS, JS, etc).

To obtain the files you need to upload, you need to extract them from a frontend Docker container. If you were following the guide for setting a kickback rate and haven't stopped the container yet, then you already have one! Otherwise, you can create it with a command like this (remember to use your own `FRONTEND_TAG` and `INFURA_API_KEY`):

```
docker run --name Zero -d --rm \
  -e FRONTEND_TAG=0x2781fD154358b009abf6280db4Ec066FCC6cb435 \
  -e INFURA_API_KEY=158b6511a5c74d1ac028a8a2afe8f626 \
  liquity/dev-frontend
```

While the container is running, use `docker cp` to extract the frontend's files to a folder of your choosing. For example to extract them to a new folder named "devui" inside the current folder, run:

```
docker cp liquity:/usr/share/nginx/html ./devui
```

Upload the contents of this folder to your chosen hosting service (or serve them using your own infrastructure), and you're set!

#### Example 2: wrapping the frontend container in HTTPS

If you have command line access to a server with Docker installed, hosting a frontend from a Docker container is a viable option.

The frontend Docker container simply serves files using plain HTTP, which is susceptible to man-in-the-middle attacks. Therefore it is highly recommended to wrap it in HTTPS using a reverse proxy. You can find an example docker-compose config [here](packages/dev-frontend/docker-compose-example/docker-compose.yml) that secures the frontend using [SWAG (Secure Web Application Gateway)](https://github.com/linuxserver/docker-swag) and uses [watchtower](https://github.com/containrrr/watchtower) for automatically updating the frontend image to the latest version on Docker Hub.

Remember to customize both [docker-compose.yml](packages/dev-frontend/docker-compose-example/docker-compose.yml) and the [site config](packages/dev-frontend/docker-compose-example/config/nginx/site-confs/liquity.example.com).



## Disclaimer

The content of this readme document (“Readme”) is of purely informational nature. In particular, none of the content of the Readme shall be understood as advice provided by Sovryn, any Zero Project Team member or other contributor to the Readme, nor does any of these persons warrant the actuality and accuracy of the Readme.

Please read this Disclaimer carefully before accessing, interacting with, or using the Zero Protocol software, consisting of the Zero Protocol technology stack (in particular its smart contracts) as well as any other Zero technology such as e.g., the launch kit for frontend operators (together the “Zero Protocol Software”). 

While Sovryn developed the Zero Protocol Software, the Zero Protocol Software runs in a fully decentralized and autonomous manner on the RSK network. Any and all functionalities of the Zero Protocol Software, including ZUSD, are of purely technical nature and there is no claim towards any private individual or legal entity in this regard.

SOVRYN IS NOT LIABLE TO ANY USER FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE, IN CONNECTION WITH THE USE OR INABILITY TO USE THE ZERO PROTOCOL SOFTWARE (INCLUDING BUT NOT LIMITED TO LOSS OF RBTC, ZUSD, OR SOV, NON-ALLOCATION OF TECHNICAL FEES TO SOV HOLDERS, LOSS OF DATA, BUSINESS INTERRUPTION, DATA BEING RENDERED INACCURATE OR OTHER LOSSES SUSTAINED BY A USER OR THIRD PARTIES AS A RESULT OF THE ZERO PROTOCOL SOFTWARE AND/OR ANY ACTIVITY OF A FRONTEND OPERATOR OR A FAILURE OF THE ZERO PROTOCOL SOFTWARE TO OPERATE WITH ANY OTHER SOFTWARE).

The Zero Protocol Software has been developed and published under the GNU GPL v3 open-source license, which forms an integral part of this disclaimer. 

THE ZERO PROTOCOL SOFTWARE HAS BEEN PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. THE ZERO PROTOCOL SOFTWARE IS HIGHLY EXPERIMENTAL AND ANY REAL RBTC AND/OR ZUSD AND/OR SOV SENT, STAKED, OR DEPOSITED TO THE ZERO PROTOCOL SOFTWARE ARE AT RISK OF BEING LOST INDEFINITELY, WITHOUT ANY KIND OF CONSIDERATION.

There are no official frontend operators, and the use of any frontend is made by users at their own risk. To assess the trustworthiness of a frontend operator lies in the sole responsibility of the users and must be made carefully.

User is solely responsible for complying with applicable law when interacting (in particular, when using RBTC, ZUSD, SOV, or other Token) with the Zero Protocol Software whatsoever.
