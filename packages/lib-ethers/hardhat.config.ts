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

import { deployAndSetupContracts, setSilent, OracleAddresses } from "./utils/deploy";
import { _LiquityDeploymentJSON } from "./src/contracts";

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

const governanceAddresses = {
  mainnet: "0x0000000000000000000000000000000000000001",
  rsktestnet: "0x0000000000000000000000000000000000000002",
  dev: "0x0000000000000000000000000000000000000003"
};

const sovCommunityPotAddresses = {
  mainnet: "",
  rsktestnet: "0x740E6f892C0132D659Abcd2B6146D237A4B6b653",
  dev: ""
};

const oracleAddresses : Record<string, OracleAddresses> = {
  mainnet: {
    mocOracleAddress: "",
    rskOracleAddress: ""
  },
  rsktestnet: {
    mocOracleAddress: "0x26a00aF444928d689DDEC7b4D17c0E4a8c9D407d",
    rskOracleAddress: "0xE00243Bc6912BF148302e8478996c98c22fE8739"
  },
  dev: {
    mocOracleAddress: "",
    rskOracleAddress: ""
  }
};

const hasOracles = (network: string): boolean => network in oracleAddresses;

const hasSovCommunityPot = (network: string): network is keyof typeof sovCommunityPotAddresses =>
  network in sovCommunityPotAddresses;

const hasGovernance = (network: string): network is keyof typeof governanceAddresses =>
  network in governanceAddresses;

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
      from: "0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826"
    },

    rsktestnet: {
      url: "https://public-node.testnet.rsk.co",
      accounts: [deployerAccount]
    },
    rsksovryntestnet: {
			url: "https://testnet.sovryn.app/rpc",
			accounts: { mnemonic: "brownie", count: 10 },
			chainId: 31,
			gasMultiplier: 1.25,
			//timeout: 20000, // increase if needed; 20000 is the default value
			//allowUnlimitedContractSize, //EIP170 contrtact size restriction temporal testnet workaround
		},
		rsksovrynmainnet: {
			url: "https://mainnet.sovryn.app/rpc",
			chainId: 30,
			//timeout: 20000, // increase if needed; 20000 is the default value
		}
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
      governanceAddress?: string,
      sovCommunityPotAddress?: string,
      externalPriceFeeds?: OracleAddresses,
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
    sovCommunityPotAddress,
    externalPriceFeeds,
    overrides?: Overrides
  ) => {
    const deployment = await deployAndSetupContracts(
      deployer,
      getContractFactory(env),
      externalPriceFeeds,
      env.network.name === "dev",
      governanceAddress,
      sovCommunityPotAddress,
      overrides
    );

    return { ...deployment, version: contractsVersion };
  };
});

type DeployParams = {
  channel: string;
  gasPrice?: number;
  useRealPriceFeed?: boolean;
  governanceAddress?: string;
  sovCommunityPotAddress?: string;
};

const defaultChannel = process.env.CHANNEL || "default";

task("deploy", "Deploys the contracts to the network")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .addOptionalParam("gasPrice", "Price to pay for 1 gas [Gwei]", undefined, types.float)
  .addOptionalParam(
    "useRealPriceFeed",
    "Deploy the production version of PriceFeed and connect it to MoC",
    undefined,
    types.boolean
  )
  .addOptionalParam(
    "governanceAddress",
    "Governance contract address to be the owner",
    undefined,
    types.string
  )
  .addOptionalParam(
    "sovCommunityPotAddress",
    "SOV Stakers pool contract address",
    undefined,
    types.string
  )
  .setAction(
    async (
      {
        channel,
        gasPrice,
        useRealPriceFeed,
        governanceAddress,
        sovCommunityPotAddress
      }: DeployParams,
      env
    ) => {
      const overrides = { gasPrice: gasPrice && Decimal.from(gasPrice).div(1000000000).hex };
      const [deployer] = await env.ethers.getSigners();

      useRealPriceFeed ??= env.network.name === "mainnet";

      if (useRealPriceFeed && !hasOracles(env.network.name)) {
        throw new Error(`PriceFeed not supported on ${env.network.name}`);
      }

      setSilent(false);
      governanceAddress ??= hasGovernance(env.network.name)
        ? governanceAddresses[env.network.name]
        : undefined;
      sovCommunityPotAddress ??= hasSovCommunityPot(env.network.name)
        ? sovCommunityPotAddresses[env.network.name]
        : undefined;

      const deployment = await env.deployLiquity(
        deployer,
        governanceAddress,
        sovCommunityPotAddress,
        useRealPriceFeed ? oracleAddresses[env.network.name] : undefined,
        overrides
      );

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
