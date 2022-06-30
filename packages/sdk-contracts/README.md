# SOVRYN SOLIDITY SDK

## PROJECT DESCRIPTION
  SDK consisting of utilities for the Sovryn Protocol
## CONTRACTS ARCHITECTURE
  All contracts are in the form of libraries, each one containing set of functionalities related to one product of the Sovryn ecosystem.

## STATE-MACHINE/INTERACTION/FLOW DIAGRAMS (where applicable)

## DEVELOPMENT INFORMATION

### **Setup**
<!-- How to setup and initialize the project's data from the repo using npm -->

```shell
  yarn
```

### **Test**
<!-- How to run all the tests, e.g. local, testnet, forked mainnet; as well as solidity contracts coverage reportn - use package.json scripts and hardhat tasks for that -->

```shell
  npx hardhat test
```

#### __**Test with gas report**__

```shell
  REPORT_GAS=true npx hardhat test
```

#### __**Performance optimization**__

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

### **Deployment**
<!-- How to deploy and initialize the project's contracts (use hardhat_deploy plugin) and offchain data as needed (.env secrets etc.) -->

### **Hardhat Tasks**
<!-- How to setup and initialize the project's data - use hardhat_deploy plugin -->
