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

import { Decimal } from "@sovryn-zero/lib-base";

import { deployAndSetupContracts, setSilent, OracleAddresses, MyntAddresses } from "./utils/deploy";
import { _LiquityDeploymentJSON } from "./src/contracts";

import accounts from "./accounts.json";
import { BorrowerOperations, CommunityIssuance, ZEROToken, ZUSDToken, UpgradableProxy, Ownable } from "./types";

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

// const deployerAccount = process.env.DEPLOYER_PRIVATE_KEY || Wallet.createRandom().privateKey;
const deployerPrivateKeys: { [key: string]: string | undefined } = {
  dev: process.env.DEPLOYER_PK_TESTNET,
  rsktestnet: process.env.DEPLOYER_PK_TESTNET,
  rsksovryntestnet: process.env.DEPLOYER_PK_TESTNET,
  rskforkedtestnet: process.env.DEPLOYER_PK_TESTNET,
  rsksovrynmainnet: process.env.DEPLOYER_PK_MAINNET,
  rskforkedmainnet: process.env.DEPLOYER_PK_MAINNET,
};

const devChainRichAccount = "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";

const governanceAddresses = {
  mainnet: "",
  rsksovrynmainnet: "0x967c84b731679E36A344002b8E3CE50620A7F69f",
  dev: "0x0000000000000000000000000000000000000003"
};

const feeSharingCollectorAddresses = {
  mainnet: "",
  rsksovrynmainnet: "0x115cAF168c51eD15ec535727F64684D33B7b08D1",
  rsktestnet: "0xedD92fb7C556E4A4faf8c4f5A90f471aDCD018f4",
  dev: ""
};

const wrbtcAddresses = {
  mainnet: "",
  rsksovrynmainnet: "0x542fda317318ebf1d3deaf76e0b632741a7e677d",
  rsktestnet: "0x69FE5cEC81D5eF92600c1A0dB1F11986AB3758Ab",
  dev: ""
};

const marketMakerAddresses = {
  mainnet: "0x0000000000000000000000000000000000000001",
  rskforkedmainnet: "0x0000000000000000000000000000000000000001",
  rsktestnet: "0x0000000000000000000000000000000000000001",
  rskforkedtestnet: "0x0000000000000000000000000000000000000001",
  dev: "0x0000000000000000000000000000000000000003"
};

const presaleAddresses = {
  mainnet: "0x0000000000000000000000000000000000000001",
  rskforkedmainnet: "0x0000000000000000000000000000000000000001",
  rsktestnet: "0x0000000000000000000000000000000000000001",
  rskforkedtestnet: "0x0000000000000000000000000000000000000001",
  dev: ""
};

const zusdTokenAddresses = {
  rsktestnet: "0xe67cbA98C183A1693fC647d63AeeEC4053656dBB",
  dev: ""
};

const oracleAddresses: Record<string, OracleAddresses> = {
  mainnet: {
    mocOracleAddress: "",
    rskOracleAddress: ""
  },
  rsksovrynmainnet: {
    mocOracleAddress: "0x972a21C61B436354C0F35836195D7B67f54E482C",
    rskOracleAddress: "0x99eD262dbd8842442cd22d4c6885936DB38245E6"
  },
  rskforkedmainnet: {
    mocOracleAddress: "0x972a21C61B436354C0F35836195D7B67f54E482C",
    rskOracleAddress: "0x99eD262dbd8842442cd22d4c6885936DB38245E6"
  },
  rsktestnet: {
    mocOracleAddress: "0xb76c405Dfd042D88FD7b8dd2e5d66fe7974A1458",
    rskOracleAddress: "0xE00243Bc6912BF148302e8478996c98c22fE8739"
  },
  rskforkedtestnet: {
    mocOracleAddress: "0xb76c405Dfd042D88FD7b8dd2e5d66fe7974A1458",
    rskOracleAddress: "0xE00243Bc6912BF148302e8478996c98c22fE8739"
  },
  dev: {
    mocOracleAddress: "",
    rskOracleAddress: ""
  }
};

const myntAddresses: Record<string, MyntAddresses> = {
  rsksovrynmainnet: {
    massetManagerAddress: "",
    nueTokenAddress: ""
  },
  rskforkedmainnet: {
    massetManagerAddress: "",
    nueTokenAddress: ""
  },
  rsktestnet: {
    massetManagerAddress: "0xac2d05A148aB512EDEDc7280c00292ED33d31f1A",
    nueTokenAddress: "0x007b3AA69A846cB1f76b60b3088230A52D2A83AC"
  },
  rskforkedtestnet: {
    massetManagerAddress: "0xac2d05A148aB512EDEDc7280c00292ED33d31f1A",
    nueTokenAddress: "0x007b3AA69A846cB1f76b60b3088230A52D2A83AC"
  },
}

const hasOracles = (network: string): boolean => network in oracleAddresses;

const hasGovernance = (network: string): network is keyof typeof governanceAddresses =>
  network in governanceAddresses;

const hasFeeSharingCollector = (network: string): network is keyof typeof feeSharingCollectorAddresses =>
  network in feeSharingCollectorAddresses;

const hasWrbtc = (network: string): network is keyof typeof wrbtcAddresses =>
  network in wrbtcAddresses;

const hasPresale = (network: string): network is keyof typeof presaleAddresses =>
  network in presaleAddresses;

const hasMarketMaker = (network: string): network is keyof typeof marketMakerAddresses =>
  network in marketMakerAddresses;

const hasZusdToken = (network: string): network is keyof typeof zusdTokenAddresses =>
  network in zusdTokenAddresses;

const hasMyntAddresses = (network: string): boolean => network in myntAddresses;

const getDeployerAccount = (network: string) => {
  return deployerPrivateKeys[network];
}

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: accounts.slice(0, numAccounts),

      gas: 13e6, // tx gas limit
      blockGasLimit: 13e6,
      initialBaseFeePerGas: 0,

      // Let Ethers throw instead of Buidler EVM
      // This is closer to what will happen in production
      throwOnCallFailures: false,
      throwOnTransactionFailures: false
    },

    dev: {
      url: "http://localhost:4444",
      accounts: [getDeployerAccount("dev") || Wallet.createRandom().privateKey, devChainRichAccount, ...generateRandomAccounts(numAccounts - 2)]
    },

    rskdev: {
      url: "http://127.0.0.1:8545/",
      accounts: [getDeployerAccount("dev") || Wallet.createRandom().privateKey],
      // regtest default prefunded account
      //from: "0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826"
      from: "0xeb19817335e5565cf9c4a791d58c2bfa0ce032c7",
      chainId: 30
    },
    
    rsktestnet: {
      url: "https://public-node.testnet.rsk.co",
      accounts: [getDeployerAccount("rsktestnet") || ""],
      chainId: 31,
      gasMultiplier: 1.25
    },
    rsksovryntestnet: {
      url: "https://testnet.sovryn.app/rpc",
      accounts: [getDeployerAccount("rsktestnet") || ""],
      chainId: 31,
      gasMultiplier: 1.25
      //timeout: 20000, // increase if needed; 20000 is the default value
      //allowUnlimitedContractSize, //EIP170 contrtact size restriction temporal testnet workaround
    },
    rskforkedtestnet: { // run in CLI: npx hardhat node --fork https://testnet.sovryn.app/rpc --no-deploy
      url: "http://127.0.0.1:8545/",
      accounts: [getDeployerAccount("rsktestnet") || Wallet.createRandom().privateKey],
      // regtest default prefunded account
      //from: "0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826"
      from: "0xeb19817335e5565cf9c4a791d58c2bfa0ce032c7",
      chainId: 31337,
      gasMultiplier: 1.25
    },
    rsksovrynmainnet: { 
      url: "https://mainnet.sovryn.app/rpc",
      chainId: 30,
      accounts: [getDeployerAccount("rsksovrynmainnet") || ""]
      //timeout: 20000, // increase if needed; 20000 is the default value
    },
    rskforkedmainnet: { // run in CLI: npx hardhat node --fork https://mainnet4.sovryn.app/rpc --no-deploy --port 4444
      url: "http://localhost:4444/",
      accounts: [getDeployerAccount("rsksovrynmainnet") || Wallet.createRandom().privateKey],
      // regtest default prefunded account
      //from: "0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826"
      from: "0xeb19817335e5565cf9c4a791d58c2bfa0ce032c7",
      chainId: 31337
    },
  },
  paths: {
    artifacts,
    cache
  },
  mocha: {
    timeout: 60000
  }
};

type DeployLiquityParams = {
    deployer: Signer,
    governanceAddress?: string;
    feeSharingCollectorAddress?: string;
    wrbtcAddress?: string;
    externalPriceFeeds?: OracleAddresses;
    presaleAddress?: string;
    marketMakerAddress?: string;
    zusdTokenAddress?: string;
    massetManagerAddress?: string;
    nueTokenAddress?: string;
    isMainnet?: boolean;
    notTestnet?: boolean;
    overrides?: Overrides;
}

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    deployLiquity: (
      deployer: Signer,
      governanceAddress?: string,
      feeSharingCollectorAddress?: string,
      wrbtcAddress?: string,
      externalPriceFeeds?: OracleAddresses,
      presaleAddress?: string,
      marketMakerAddress?: string,
      zusdTokenAddress?: string,
      myntMassetManagerAddress?: string,
      myntNueTokenAddress?: string,
      isMainnet?: boolean,
      notTestnet?: boolean,
      overrides?: Overrides
    ) => Promise<_LiquityDeploymentJSON>;
  }
}

const getLiveArtifact = (name: string): { abi: JsonFragment[]; bytecode: string } =>
  require(`./live/${name}.json`);

const getDeploymentData = (network: string, channel: string): _LiquityDeploymentJSON => {
  const addresses = fs.readFileSync(path.join("deployments", channel, `${network}.json`));

  return JSON.parse(String(addresses));
};

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
    feeSharingCollectorAddress,
    wrbtcAddress,
    externalPriceFeeds,
    presaleAddress,
    marketMakerAddress,
    zusdTokenAddress,
    myntMassetManagerAddress,
    myntNueTokenAddress,
    isMainnet?: boolean,
    notTestnet?: boolean,
    overrides?: Overrides
  ) => {
    const deployment = await deployAndSetupContracts(
        deployer,
        getContractFactory(env),
        externalPriceFeeds,
        env.network.name === "dev",
        governanceAddress,
        feeSharingCollectorAddress,
        wrbtcAddress,
        presaleAddress,
        marketMakerAddress,
        zusdTokenAddress,
        myntMassetManagerAddress,
        myntNueTokenAddress,
        isMainnet,
        notTestnet,
        overrides
    );

    return { ...deployment, version: contractsVersion };
  };
});

type SetMassetManagerAddressParams = {
  address: string;
  nuetokenaddress: string;
  channel: string;
};

const defaultChannel = process.env.CHANNEL || "default";

task("setMassetManagerAddress", "Sets address of massetManager contract in order to support NUE troves")
  .addParam("address", "address of deployed MassetManagerProxy contract")
  .addParam("nuetokenaddress", "address of NUE token")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async ({ address, channel, nuetokenaddress }: SetMassetManagerAddressParams, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const deployment = getDeploymentData(hre.network.name, channel);
    const { borrowerOperations: borrowerOperationsAddress } = deployment.addresses;

    const borrowerOperations = ((await hre.ethers.getContractAt(
      "BorrowerOperations",
      borrowerOperationsAddress,
      deployer
    )) as unknown) as BorrowerOperations;

    const currentMassetAddress = await borrowerOperations.massetManager();
    console.log("Current massetManager address: ", currentMassetAddress);

    const tx = await borrowerOperations.setMassetManagerAddress(address);
    await tx.wait();

    const newMassetAddress = await borrowerOperations.massetManager();
    console.log("New massetManager address: ", newMassetAddress);

    deployment.addresses.nueToken = nuetokenaddress;

    fs.writeFileSync(
      path.join("deployments", channel, `${hre.network.name}.json`),
      JSON.stringify(deployment, undefined, 2)
    );
  });

type FundCommunityIssuance = {
  channel: string;
  amount: string;
};

task(
  "fundCommunityIssuance",
  "Sends funds to the community issuance contract so users can get rewards"
)
  .addParam("amount", "Amount to send", undefined, types.string)
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async ({ channel, amount }: FundCommunityIssuance, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const deployment = getDeploymentData(hre.network.name, channel);
    const {
      zeroToken: zeroTokenAddress,
      communityIssuance: communityIssuanceAddress
    } = deployment.addresses;

    const zeroToken = ((await hre.ethers.getContractAt(
      "ZEROToken",
      zeroTokenAddress,
      deployer
    )) as unknown) as ZEROToken;
    const communityIssuance = ((await hre.ethers.getContractAt(
      "CommunityIssuance",
      communityIssuanceAddress,
      deployer
    )) as unknown) as CommunityIssuance;

    const fundingWalletAddress = await communityIssuance.fundingWalletAddress();
    console.log(
      `Funding wallet address is ${fundingWalletAddress} and sender is ${deployer.address}`
    );

    const senderZeroBalance = await zeroToken.balanceOf(deployer.address);
    console.log(`Sender zero balance: ${senderZeroBalance}`);

    const communityIssuanceBalanceBefore = await zeroToken.balanceOf(communityIssuanceAddress);
    console.log(`Community issuance balance before: ${communityIssuanceBalanceBefore}`);

    console.log("Setting allowance");
    const allowance = await zeroToken.allowance(deployer.address, communityIssuanceAddress);
    console.log(`Current allowance: ${allowance}`);
    await (await zeroToken.increaseAllowance(communityIssuanceAddress, amount)).wait();
    console.log("Transferring zero");
    await (await communityIssuance.receiveZero(deployer.address, amount)).wait();
    const communityIssuanceBalanceAfter = await zeroToken.balanceOf(communityIssuanceAddress);
    console.log(`Community issuance balance after: ${communityIssuanceBalanceAfter}`);
  });

type DeployParams = {
  channel: string;
  gasPrice?: number;
  useRealPriceFeed?: boolean;
  governanceAddress?: string;
  feeSharingCollectorAddress?: string;
  wrbtcAddress?: string;
  presaleAddress?: string;
  marketMakerAddress?: string;
  zusdTokenAddress?: string;
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
  .setAction(
    async (
      {
        channel,
        gasPrice,
        useRealPriceFeed,
        governanceAddress,
        feeSharingCollectorAddress,
        wrbtcAddress,
        presaleAddress,
        marketMakerAddress,
        zusdTokenAddress
      }: DeployParams,
      env
    ) => {
      const overrides = { gasPrice: gasPrice && Decimal.from(gasPrice).div(1000000000).hex };
      const [deployer] = await env.ethers.getSigners();

      const balBefore = await deployer.getBalance();

      console.log({
        balanceBefore: balBefore.toString()
      });

      const mainnets = ["mainnet", "rsksovrynmainnet", "rskmainnet", "rskforkedmainnet"];
      const testnets = ["rsksovryntestnet", "rsktestnet", "rskforkedtestnet"];

      const isMainnet: boolean = mainnets.indexOf(env.network.name) !== -1;
      useRealPriceFeed ??= isMainnet;

      const notTestnet: boolean = testnets.indexOf(env.network.name) == -1;

      if (useRealPriceFeed && !hasOracles(env.network.name)) {
        throw new Error(`PriceFeed not supported on ${env.network.name}`);
      }

      setSilent(false);
      governanceAddress ??= hasGovernance(env.network.name)
        ? governanceAddresses[env.network.name]
        : undefined;
      feeSharingCollectorAddress ??= hasFeeSharingCollector(env.network.name)
        ? feeSharingCollectorAddresses[env.network.name]
        : undefined;
      wrbtcAddress ??= hasWrbtc(env.network.name) ? wrbtcAddresses[env.network.name] : undefined;
      presaleAddress ??= hasPresale(env.network.name)
        ? presaleAddresses[env.network.name]
        : undefined;
      marketMakerAddress ??= hasMarketMaker(env.network.name)
        ? marketMakerAddresses[env.network.name]
        : undefined;
      zusdTokenAddress ??= hasZusdToken(env.network.name)
        ? zusdTokenAddresses[env.network.name]
        : undefined;
      const myntMassetManagerAddress = hasMyntAddresses(env.network.name) && myntAddresses[env.network.name]?.massetManagerAddress
        ? myntAddresses[env.network.name]?.massetManagerAddress
        : undefined;
      const myntNueTokenAddress = hasMyntAddresses(env.network.name) && myntAddresses[env.network.name]?.nueTokenAddress
        ? myntAddresses[env.network.name]?.nueTokenAddress
        : undefined;
      
      const deployment = await env.deployLiquity(
        deployer,
        governanceAddress,
        feeSharingCollectorAddress,
        wrbtcAddress,
        useRealPriceFeed ? oracleAddresses[env.network.name] : undefined,
        presaleAddress,
        marketMakerAddress,
        zusdTokenAddress,
        myntMassetManagerAddress,
        myntNueTokenAddress,
        isMainnet,
        notTestnet,
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
      console.log({ balanceSpent: balBefore.sub(await deployer.getBalance()).toString() });
    }
  );

type DeployZUSDToken = {
  doInitialize: boolean;
  channel: string;
};

task("deployNewZusdToken", "Deploys new ZUSD token and links it to previous deployment")
  .addFlag("doInitialize", "Will use ZUSDTokenTestnet contract to allow reinitialization which otherwise is invalid")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async ({ doInitialize, channel }: DeployZUSDToken, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const deployment = getDeploymentData(hre.network.name, channel);
    const {
      zusdToken: zusdTokenAddress,
      troveManager: troveManagerAddress,
      stabilityPool: stabilityPoolAddress,
      borrowerOperations: borrowerOperationsAddress
    } = deployment.addresses;

    console.log("Deploying new ZUSD token logic for testnet");
    // NOTE this script should only be executed on testnet
    const tokenContractName = doInitialize ? "ZUSDTokenTestnet" : "ZUSDToken";
    const zusdTokenFactory = await hre.ethers.getContractFactory(tokenContractName);
    const zusdTokenContract = await(await zusdTokenFactory.deploy()).deployed();

    const zusdTokenProxy = (await hre.ethers.getContractAt(
      "UpgradableProxy",
      zusdTokenAddress,
      deployer
    ) as unknown) as UpgradableProxy;

    //set new implementation
    const oldZUSDAddress = await zusdTokenProxy.getImplementation();
    await zusdTokenProxy.setImplementation(zusdTokenContract.address);
    console.log("Initializing new ZUSD token with the correct dependencies");

    const zusdToken = ((await hre.ethers.getContractAt(
      tokenContractName,
      zusdTokenAddress,
      deployer
    )) as unknown) as ZUSDToken;
    //call initialize on the new zusdToken by calling proxy - not possible

    if (doInitialize)
      await zusdToken.initialize(troveManagerAddress, stabilityPoolAddress, borrowerOperationsAddress);

    console.log("Changing old ZUSD address " + oldZUSDAddress + " to " + zusdTokenContract.address);
    const newZUSDAddress = await zusdTokenProxy.getImplementation();
    console.log("Implementation address changed to " + newZUSDAddress);
  });

task("getDeployedContractsOwners", "Prints the deployed contracts owner address")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async ({ channel }, hre) => {
    const liveNets = ["mainnet", "rsksovrynmainnet", "rskmainnet", "testnet", "rsktestnet", "rsksovryntestnet"];
    if (liveNets.indexOf(hre.network.name) === -1)
    {
      console.log("===========================================================");
      console.log("ALERT! Make sure the script is running on a proper network!");
      console.log("===========================================================");
    }
    const deployment = getDeploymentData(hre.network.name, channel);
    const obj = Object.entries(deployment.addresses);
    for await (const item of obj) {
      try {
          const owned = (await hre.ethers.getContractAt("Ownable", item[1]) as unknown) as Ownable;
          console.log(`${await owned.getOwner()} is owner of ${item[0]} (${item[1]})`);
      } catch(e) {
        console.log(`${item[0]} (${item[1]}) is NOT Ownable`);
      }
    }
  });

// hh transferOwnership --new-owner 0xcf311e7375083b9513566a47b9f3e93f1fcdcfbf --network rsksovryntestnet
task("transferOwnership", "Transfers contracts ownership from EOA")
  .addParam("newOwner", "New owner of the contracts", undefined, types.string, false)
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async ({ newOwner, channel }, hre) => {
    const liveNets = ["mainnet", "rsksovrynmainnet", "rskmainnet", "testnet", "rsktestnet", "rsksovryntestnet"];
    const [deployer] = await hre.ethers.getSigners();
    if (liveNets.indexOf(hre.network.name) === -1)
    {
      console.log("===========================================================");
      console.log("ALERT! Make sure the script is running on a proper network:", liveNets);
      console.log("===========================================================");
    }
    const deployment = getDeploymentData(hre.network.name, channel);
    const obj = Object.entries(deployment.addresses);
    for await (const item of obj) {
      try {
        const owned = (await hre.ethers.getContractAt("Ownable", item[1], deployer) as unknown) as Ownable;
        const owner = await owned.getOwner();
        if (owner == deployer.address) {
          await (await owned.setOwner(newOwner)).wait();
          const _newOwner = await owned.getOwner();
          console.log(`${_newOwner} is the new owner of ${item[0]} (${item[1]})`);
        } else {
          console.log(`Deployer ${deployer.address} must be the current owner ${owner} of ${item[0]} (${item[1]})`);
        }
      } catch(e) {
        console.log(`${item[0]} (${item[1]}) is NOT Ownable`);
      }
    }
  });

task("getCurrentZUSDImplementation", "Logs to console current ZUSD implementation address")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .setAction(async ({ channel }: DeployZUSDToken, hre) => {

    const [deployer] = await hre.ethers.getSigners();
    const deployment = getDeploymentData(hre.network.name, channel);
    const { zusdToken: zusdTokenAddress, zeroToken: zeroTokenAddress } = deployment.addresses;

    const zusdTokenProxy = ((await hre.ethers.getContractAt(
      "UpgradableProxy",
      zusdTokenAddress,
      deployer
    )) as unknown) as UpgradableProxy;
    console.log("ZUSD Proxy adddress: " + zusdTokenProxy.address);

    const zusdImplementationAddress = await zusdTokenProxy.getImplementation();
    console.log("ZUSD implelentation address: " + zusdImplementationAddress);

    const zusdToken = ((await hre.ethers.getContractAt(
      "ZUSDToken",
      zusdTokenAddress,
      deployer
    )) as unknown) as ZUSDToken;

    const zeroToken = ((await hre.ethers.getContractAt(
      "ZEROToken",
      zeroTokenAddress,
      deployer
    )) as unknown) as ZEROToken;

    /*await zeroToken.mint("0x0", 100);
    await zeroToken.mint(deployer.address, 100);
    console.log("Try mint ZERO");*/
  });

export default config;
