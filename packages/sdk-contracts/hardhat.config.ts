import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/ethers-v5";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@primitivefi/hardhat-dodoc";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

export default {
  solidity: {
    compilers: [
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  dodoc: {
    runOnCompile: true, // if false then run `npx hardhat dodoc` in console to generate docs
    include: [], // [] == everything; input paths to limit dics to the domain contracts only
    outputDir: "docs",
    keepFileStructure: false,
    freshOutput: true,
  },
  external: {
    contracts: [
      {
        artifacts: "external-contracts/*.json",
      },
    ],
  },
} as HardhatUserConfig;
