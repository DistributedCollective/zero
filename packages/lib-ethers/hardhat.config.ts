import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import "colors";

import { JsonFragment } from "@ethersproject/abi";
import { Wallet } from "@ethersproject/wallet";
import { Signer } from "@ethersproject/abstract-signer";
import { ContractFactory, Overrides } from "@ethersproject/contracts";

import { task, HardhatUserConfig, types, extendEnvironment } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";

import { Decimal } from "@liquity/lib-base";

import { deployAndSetupContracts, setSilent, OracleAddresses } from "./utils/deploy";
import {  _LiquityDeploymentJSON } from "./src/contracts";

import accounts from "./accounts.json";
import { BorrowerOperations, CommunityIssuance, ZEROToken } from "./types";

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
  rsktestnet: "0x4D1A9fD1E1e67E83Ffe72Bdd769088d689993E4B",
  dev: "0x0000000000000000000000000000000000000003"
};

const sovFeeCollectorAddresses = {
  mainnet: "",
  rsktestnet: "0x85B19DD6E3c6cCC54D40c1bAEC15058962B8245b",
  dev: ""
};

const wrbtcAddresses = {
  mainnet: "",
  rsktestnet: "0x69FE5cEC81D5eF92600c1A0dB1F11986AB3758Ab",
  dev: ""
};

const marketMakerAddresses = {
  mainnet: "0x0000000000000000000000000000000000000001",
  rsktestnet: "0x93e58CD85406749B8F0aDE90caBB6bF6Ddb05f7d",
  dev: "0x0000000000000000000000000000000000000003"
};

const presaleAddresses = {
  mainnet: "0x0000000000000000000000000000000000000001",
  rsktestnet: "0xC4C82fE6d6D531cf7bE8DaC7F9F0Ba63FED4c8d0",
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

const hasGovernance = (network: string): network is keyof typeof governanceAddresses =>
  network in governanceAddresses;

const hasSovFeeCollector = (network: string): network is keyof typeof sovFeeCollectorAddresses =>
  network in sovFeeCollectorAddresses;

const hasWrbtc = (network: string): network is keyof typeof wrbtcAddresses =>
  network in wrbtcAddresses;

const hasPresale = (network: string): network is keyof typeof presaleAddresses =>
  network in presaleAddresses;

const hasMarketMaker = (network: string): network is keyof typeof marketMakerAddresses =>
  network in marketMakerAddresses;

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: accounts.slice(0, numAccounts),

      gas: 13e6, // tx gas limit
      blockGasLimit: 13e6,

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
  },
  mocha: {
    timeout: 60000
  }
};

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    deployLiquity: (
      deployer: Signer,
      governanceAddress?: string,
      sovFeeCollectorAddress?: string,
      wrbtcAddress?: string,
      externalPriceFeeds?: OracleAddresses,
      presaleAddress?: string,
      marketMakerAddress?: string,
      overrides?: Overrides
    ) => Promise<_LiquityDeploymentJSON>;
  }
}

const getLiveArtifact = (name: string): { abi: JsonFragment[]; bytecode: string } =>
  require(`./live/${name}.json`);

const getDeploymentData = (network: string, channel: string): _LiquityDeploymentJSON => {
  const addresses = fs.readFileSync(
    path.join("deployments", channel, `${network}.json`)
  );

  return JSON.parse(String(addresses))
}

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
    sovFeeCollectorAddress,
    wrbtcAddress,
    externalPriceFeeds,
    presaleAddress,
    marketMakerAddress,
    overrides?: Overrides
  ) => {
    const deployment = await deployAndSetupContracts(
      deployer,
      getContractFactory(env),
      externalPriceFeeds,
      env.network.name === "dev",
      governanceAddress,
      sovFeeCollectorAddress,
      wrbtcAddress,
      presaleAddress,
      marketMakerAddress,
      overrides
    );

    return { ...deployment, version: contractsVersion };
  };
});

type SetAddressParams = {
  address: string;
  nuetokenaddress: string;
  channel: string;
}

const defaultChannel = process.env.CHANNEL || "default";

task("setMassetAddress", "Sets address of masset contract in order to support NUE troves")
  .addParam("address", "address of deployed MassetProxy contract")
  .addParam("nuetokenaddress", "address of NUE token")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async (
    {
      address,
      channel,
      nuetokenaddress,
    }: SetAddressParams,
    hre
  ) => {
    const [deployer] = await hre.ethers.getSigners();
    const deployment = getDeploymentData(hre.network.name, channel)
    const { borrowerOperations: borrowerOperationsAddress } = deployment.addresses

    const borrowerOperations = await hre.ethers.getContractAt("BorrowerOperations", borrowerOperationsAddress, deployer) as unknown as  BorrowerOperations

    const currentMassetAddress = await borrowerOperations.masset()
    console.log("Current masset address: ", currentMassetAddress)

    const tx = await borrowerOperations.setMassetAddress(address) 
    await tx.wait()

    const newMassetAddress = await borrowerOperations.masset()
    console.log("New masset address: ", newMassetAddress)

    deployment.addresses.nueToken = nuetokenaddress

    fs.writeFileSync(
      path.join("deployments", channel, `${hre.network.name}.json`),
      JSON.stringify(deployment, undefined, 2)
    );
  })

type FundCommunityIssuance = {
  channel: string;
  amount: string;
}

task("fundCommunityIssuance", "Sends funds to the community issuance contract so users can get rewards")
  .addParam("amount", "Amount to send", undefined, types.string)
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async ({ channel, amount }: FundCommunityIssuance, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const deployment = getDeploymentData(hre.network.name, channel)
    const { zeroToken: zeroTokenAddress, communityIssuance: communityIssuanceAddress } = deployment.addresses

    const zeroToken = await hre.ethers.getContractAt("ZEROToken", zeroTokenAddress, deployer) as unknown as  ZEROToken
    const communityIssuance = await hre.ethers.getContractAt("CommunityIssuance", communityIssuanceAddress, deployer) as unknown as  CommunityIssuance

    const fundingWalletAddress = await communityIssuance.fundingWalletAddress()
    console.log(`Funding wallet address is ${fundingWalletAddress} and sender is ${deployer.address}`)

    const senderZeroBalance = await zeroToken.balanceOf(deployer.address)
    console.log(`Sender zero balance: ${senderZeroBalance}`)

    const communityIssuanceBalanceBefore = await zeroToken.balanceOf(communityIssuanceAddress)
    console.log(`Community issuance balance before: ${communityIssuanceBalanceBefore}`)

    console.log("Setting allowance")
    const allowance = await zeroToken.allowance(deployer.address, communityIssuanceAddress);
    console.log(`Current allowance: ${allowance}`)
    await (await zeroToken.increaseAllowance(communityIssuanceAddress, amount)).wait()
    console.log("Transferring zero")
    await (await communityIssuance.receiveZero(deployer.address, amount)).wait()
    const communityIssuanceBalanceAfter = await zeroToken.balanceOf(communityIssuanceAddress)
    console.log(`Community issuance balance after: ${communityIssuanceBalanceAfter}`)
  });

type DeployParams = {
  channel: string;
  gasPrice?: number;
  useRealPriceFeed?: boolean;
  governanceAddress?: string;
  sovFeeCollectorAddress?: string;
  wrbtcAddress?: string;
  presaleAddress?: string;
  marketMakerAddress?: string;
};

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
        sovFeeCollectorAddress,
        wrbtcAddress,
        presaleAddress,
        marketMakerAddress,
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
      sovFeeCollectorAddress ??= hasSovFeeCollector(env.network.name)
        ? sovFeeCollectorAddresses[env.network.name]
        : undefined;
        wrbtcAddress ??= hasWrbtc(env.network.name)
        ? wrbtcAddresses[env.network.name]
        : undefined;
      presaleAddress ??= hasPresale(env.network.name)
        ? presaleAddresses[env.network.name]
        : undefined;
      marketMakerAddress ??= hasMarketMaker(env.network.name)
        ? marketMakerAddresses[env.network.name]
        : undefined;

      const deployment = await env.deployLiquity(
        deployer,
        governanceAddress,
        sovFeeCollectorAddress,
        wrbtcAddress,
        useRealPriceFeed ? oracleAddresses[env.network.name] : undefined,
        presaleAddress,
        marketMakerAddress,
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
