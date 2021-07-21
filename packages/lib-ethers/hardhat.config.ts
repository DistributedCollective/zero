import assert from "assert";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import "colors";

import { JsonFragment } from "@ethersproject/abi";
import { Wallet } from "@ethersproject/wallet";
import { Signer } from "@ethersproject/abstract-signer";
import { ContractFactory, Overrides } from "@ethersproject/contracts";

import { task, HardhatUserConfig, types, extendEnvironment } from "hardhat/config";
import { HardhatRuntimeEnvironment, NetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";

import { Decimal } from "@liquity/lib-base";

import { deployAndSetupContracts, setSilent } from "./utils/deploy";
import { _connectToContracts, _LiquityDeploymentJSON, _priceFeedIsTestnet } from "./src/contracts";

import accounts from "./accounts.json";

dotenv.config();

const numAccounts = 100;

const useLiveVersionEnv = (process.env.USE_LIVE_VERSION ?? "false").toLowerCase();
const useLiveVersion = !["false", "no", "0"].includes(useLiveVersionEnv);

const contractsDir = path.join("..", "contracts");
const artifacts = path.join(contractsDir, "artifacts");
const cache = path.join(contractsDir, "cache");

const contractsVersion = fs
  .readFileSync(path.join(useLiveVersion ? "live" : artifacts, "version"))
  .toString()
  .trim();

if (useLiveVersion) {
  console.log(`Using live version of contracts (${contractsVersion}).`.cyan);
}

const generateRandomAccounts = (numberOfAccounts: number) => {
  const accounts = new Array<string>(numberOfAccounts);

  for (let i = 0; i < numberOfAccounts; ++i) {
    accounts[i] = Wallet.createRandom().privateKey;
  }

  return accounts;
};
const deployerAccount = process.env.DEPLOYER_PRIVATE_KEY || Wallet.createRandom().privateKey;
const devChainRichAccount = "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";

const infuraApiKey = "ad9cef41c9c844a7b54d10be24d416e5";

const infuraNetwork = (name: string): { [name: string]: NetworkUserConfig } => ({
  [name]: {
    url: `https://${name}.infura.io/v3/${infuraApiKey}`,
    accounts: [deployerAccount]
  }
});

const governanceAddress = {
  mainnet: "0x0000000000000000000000000000000000000001",
  testnet: "0x0000000000000000000000000000000000000002",
  dev: "0x0000000000000000000000000000000000000003",
}

const oracleAddresses = {
  mainnet: {
    mocOracleAddress: "", 
    rskOracleAddress: ""
  },
  testnet: {
    mocOracleAddress: "", 
    rskOracleAddress: ""
  },
  dev: {
    mocOracleAddress: "", 
    rskOracleAddress: ""
  }
};

const hasOracles = (network: string): network is keyof typeof oracleAddresses =>
  network in oracleAddresses;

const wethAddresses = {
  mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  ropsten: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
  rinkeby: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
  goerli: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  kovan: "0xd0A1E359811322d97991E03f863a0C30C2cF029C"
};

const hasWETH = (network: string): network is keyof typeof wethAddresses => network in wethAddresses;

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: accounts.slice(0, numAccounts),

      gas: 12e6, // tx gas limit
      blockGasLimit: 12e6,

      // Let Ethers throw instead of Buidler EVM
      // This is closer to what will happen in production
      throwOnCallFailures: false,
      throwOnTransactionFailures: false
    },

    dev: {
      url: "http://localhost:4444",
      accounts: [deployerAccount, devChainRichAccount, ...generateRandomAccounts(numAccounts - 2)]
    },

    rskdev: {
      url: "http://localhost:4444",
      // regtest default prefunded account
      from: "0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826",
    },

    ...infuraNetwork("ropsten"),
    ...infuraNetwork("rinkeby"),
    ...infuraNetwork("goerli"),
    ...infuraNetwork("kovan"),
    ...infuraNetwork("mainnet")
  },

  paths: {
    artifacts,
    cache
  }
};

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    deployLiquity: (
      deployer: Signer,
      governanceAddress: string,
      useRealPriceFeed?: boolean,
      wethAddress?: string,
      overrides?: Overrides
    ) => Promise<_LiquityDeploymentJSON>;
  }
}

const getLiveArtifact = (name: string): { abi: JsonFragment[]; bytecode: string } =>
  require(`./live/${name}.json`);

const getContractFactory: (
  env: HardhatRuntimeEnvironment
) => (name: string, signer: Signer) => Promise<ContractFactory> = useLiveVersion
  ? env => (name, signer) => {
      const { abi, bytecode } = getLiveArtifact(name);
      return env.ethers.getContractFactory(abi, bytecode, signer);
    }
  : env => env.ethers.getContractFactory;

extendEnvironment(env => {
  env.deployLiquity = async (
    deployer,
    governanceAddress,
    useRealPriceFeed = false,
    wethAddress = undefined,
    overrides?: Overrides
  ) => {
    const deployment = await deployAndSetupContracts(
      deployer,
      governanceAddress,
      getContractFactory(env),
      !useRealPriceFeed,
      env.network.name === "dev",
      wethAddress,
      overrides
    );

    return { ...deployment, version: contractsVersion };
  };
});

type DeployParams = {
  channel: string;
  gasPrice?: number;
  useRealPriceFeed?: boolean;
  createUniswapPair?: boolean;
};

const defaultChannel = process.env.CHANNEL || "default";

task("deploy", "Deploys the contracts to the network")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .addOptionalParam("gasPrice", "Price to pay for 1 gas [Gwei]", undefined, types.float)
  .addOptionalParam(
    "useRealPriceFeed",
    "Deploy the production version of PriceFeed and connect it to Chainlink",
    undefined,
    types.boolean
  )
  .addOptionalParam(
    "createUniswapPair",
    "Create a real Uniswap v2 WETH-LUSD pair instead of a mock ERC20 token",
    undefined,
    types.boolean
  )
  .setAction(
    async ({ channel, gasPrice, useRealPriceFeed, createUniswapPair }: DeployParams, env) => {
      const overrides = { gasPrice: gasPrice && Decimal.from(gasPrice).div(1000000000).hex };
      const [deployer] = await env.ethers.getSigners();

      useRealPriceFeed ??= env.network.name === "mainnet";

      if (useRealPriceFeed && !hasOracles(env.network.name)) {
        throw new Error(`PriceFeed not supported on ${env.network.name}`);
      }

      let wethAddress: string | undefined = undefined;
      if (createUniswapPair) {
        if (!hasWETH(env.network.name)) {
          throw new Error(`WETH not deployed on ${env.network.name}`);
        }
        wethAddress = wethAddresses[env.network.name];
      }

      setSilent(false);
      const governanceNetworkAddress = env.network.name === 'mainnet' ?
        governanceAddress['mainnet'] : env.network.name === 'testnet' ?
        governanceAddress['testnet'] : governanceAddress['dev'];
        
      const deployment = await env.deployLiquity(deployer, governanceNetworkAddress, useRealPriceFeed, wethAddress, overrides);

      if (useRealPriceFeed) {
        const contracts = _connectToContracts(deployer, deployment);

        assert(!_priceFeedIsTestnet(contracts.priceFeed));

        if (hasOracles(env.network.name)) {
          console.log(`Hooking up PriceFeed with oracles ...`);

          // TODO set oracles deployed addresses
          // const tx = await contracts.priceFeed.setAddresses(
          //   oracleAddresses[env.network.name].chainlink,
          //   tellorCallerAddress,
          //   overrides
          // );
          // await tx.wait();
        }
      }

      fs.mkdirSync(path.join("deployments", channel), { recursive: true });

      fs.writeFileSync(
        path.join("deployments", channel, `${env.network.name}.json`),
        JSON.stringify(deployment, undefined, 2)
      );

      console.log();
      console.log(deployment);
      console.log();
    }
  );

export default config;
