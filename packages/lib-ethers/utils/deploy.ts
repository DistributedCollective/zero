import assert from "assert";
import { Signer } from "@ethersproject/abstract-signer";
import { ContractFactory, ContractTransaction, Overrides } from "@ethersproject/contracts";
import { Wallet } from "@ethersproject/wallet";
import { Decimal } from "@liquity/lib-base";
import { Contract } from "ethers";
import {
  _connectToContracts, _LiquityContractAddresses,
  _LiquityContracts,
  _LiquityDeploymentJSON,
  _priceFeedIsTestnet as checkPriceFeedIsTestnet
} from "../src/contracts";
import { PriceFeed } from "../types";

let silent = true;

export type OracleAddresses = {
  mocOracleAddress: string;
  rskOracleAddress: string;
} | undefined;

export const log = (...args: unknown[]): void => {
  if (!silent) {
    console.log(...args);
  }
};

export const setSilent = (s: boolean): void => {
  silent = s;
};

const deployContractAndGetBlockNumber = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  contractName: string,
  ...args: unknown[]
): Promise<[contract: Contract, blockNumber: number]> => {
  log(`Deploying ${contractName} ...`);
  const contract = await (await getContractFactory(contractName, deployer)).deploy(...args);

  log(`Waiting for transaction ${contract.deployTransaction.hash} ...`);
  const receipt = await contract.deployTransaction.wait();

  log({
    contractAddress: contract.address,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toNumber()
  });

  log();

  return [contract, receipt.blockNumber];
};

const deployContract: (
  ...p: Parameters<typeof deployContractAndGetBlockNumber>
) => Promise<string> = (...p) =>
  deployContractAndGetBlockNumber(...p).then(([contract]) => contract.address);

const deployContractWithProxy: (
  ...p: Parameters<typeof deployContractAndGetBlockNumber>
) => Promise<string> = async (...p) => {
  const [contract] = await deployContractAndGetBlockNumber(...p);

  log(`Deploying Proxy for ${p[2]} ...`);
  const proxyContract = await (await p[1]("UpgradableProxy", p[0])).deploy(p[3]);

  log(`Waiting for transaction ${proxyContract.deployTransaction.hash} ...`);
  const receipt = await proxyContract.deployTransaction.wait();

  log(`Setting implementation address to proxy: ${contract.address} ...`);
  const setImplementation = await proxyContract.setImplementation(contract.address);

  log(`Waiting for transaction ${setImplementation.hash} ...`);
  const setImplementationReceipt = await setImplementation.wait();

  log({
    contractAddress: proxyContract.address,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toNumber() + setImplementationReceipt.gasUsed.toNumber()
  });

  log();

  return proxyContract.address;
};

const deployContracts = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  priceFeedIsTestnet = true,
  overrides?: Overrides
): Promise<{addresses: _LiquityContractAddresses, startBlock: number}> => {

  const [gasPool, startBlock] = await deployContractAndGetBlockNumber(deployer, getContractFactory, "GasPool", {
    ...overrides
  })

  const addresses = {
    activePool: await deployContractWithProxy(deployer, getContractFactory, "ActivePool", {
      ...overrides
    }),
    borrowerOperations: await deployContractWithProxy(deployer, getContractFactory, "BorrowerOperations", {
      ...overrides
    }),
    troveManager: await deployContractWithProxy(deployer, getContractFactory, "TroveManager", {
      ...overrides
    }),
    troveManagerRedeemOps: await deployContract(deployer, getContractFactory, "TroveManagerRedeemOps", { ...overrides }),
    collSurplusPool: await deployContractWithProxy(deployer, getContractFactory, "CollSurplusPool", {
      ...overrides
    }),
    communityIssuance: await deployContractWithProxy(deployer, getContractFactory, "CommunityIssuance", {
      ...overrides
    }),
    defaultPool: await deployContractWithProxy(deployer, getContractFactory, "DefaultPool", {
      ...overrides
    }),
    hintHelpers: await deployContractWithProxy(deployer, getContractFactory, "HintHelpers", { ...overrides }),
    lockupContractFactory: await deployContractWithProxy(
      deployer,
      getContractFactory,
      "LockupContractFactory",
      { ...overrides }
    ),
    zeroStaking: await deployContractWithProxy(deployer, getContractFactory, "ZEROStaking", { ...overrides }),
    priceFeed: priceFeedIsTestnet ? 
      await deployContract(deployer, getContractFactory, "PriceFeedTestnet", { ...overrides }) :
      await deployContractWithProxy(deployer, getContractFactory, "PriceFeed", { ...overrides }),
    sortedTroves: await deployContractWithProxy(deployer, getContractFactory, "SortedTroves", {
      ...overrides
    }),
    stabilityPool: await deployContractWithProxy(deployer, getContractFactory, "StabilityPool", {
      ...overrides
    }),
    gasPool: gasPool.address,
    liquityBaseParams: await deployContractWithProxy(deployer, getContractFactory, "LiquityBaseParams", {
      ...overrides
    }),
    sovStakersIssuance: await deployContractWithProxy(deployer, getContractFactory, "SovStakersIssuance", {
      ...overrides
    })
  };

  return {
    addresses: {
      ...addresses,
      zusdToken: await deployContractWithProxy(deployer, getContractFactory, "ZUSDToken", { ...overrides }),

      zeroToken: await deployContractWithProxy(deployer, getContractFactory, "ZEROToken", { ...overrides }),

      multiTroveGetter: await deployContractWithProxy(deployer, getContractFactory, "MultiTroveGetter", {
        ...overrides
      })
    },

    startBlock
  };
};

const connectContracts = async (
  {
    activePool,
    borrowerOperations,
    troveManager,
    troveManagerRedeemOps,
    zusdToken,
    collSurplusPool,
    communityIssuance,
    defaultPool,
    zeroToken,
    hintHelpers,
    lockupContractFactory,
    zeroStaking,
    multiTroveGetter,
    priceFeed,
    sortedTroves,
    stabilityPool,
    gasPool,
    liquityBaseParams,
    sovStakersIssuance
  }: _LiquityContracts,
  deployer: Signer,
  sovCommunityPotAddress: string,
  liquidityMiningAddress: string,
  presaleAddress: string,
  marketMakerAddress?: string,
  overrides?: Overrides
) => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  const txCount = await deployer.provider.getTransactionCount(deployer.getAddress());

  const connections: ((nonce: number) => Promise<ContractTransaction>)[] = [
    nonce => 
      zusdToken.initialize(troveManager.address, stabilityPool.address, borrowerOperations.address, {
        ...overrides,
        nonce
      }),
    
    nonce =>
      liquityBaseParams.initialize({
        ...overrides,
        nonce
      }),

    nonce =>
      zeroToken.initialize(
        zeroStaking.address,
        marketMakerAddress?marketMakerAddress:gasPool.address,
        presaleAddress,
        {
          ...overrides,
          nonce
        }
      ),
    
    nonce =>
        sortedTroves.setParams(1e6, troveManager.address, borrowerOperations.address, {
          ...overrides,
          nonce
        }),

    nonce =>
      troveManager.setAddresses(
        troveManagerRedeemOps.address,
        liquityBaseParams.address,
        borrowerOperations.address,
        activePool.address,
        defaultPool.address,
        stabilityPool.address,
        gasPool.address,
        collSurplusPool.address,
        priceFeed.address,
        zusdToken.address,
        sortedTroves.address,
        zeroToken.address,
        zeroStaking.address,
        { ...overrides, nonce }
      ),

    nonce =>
      borrowerOperations.setAddresses(
        liquityBaseParams.address,
        troveManager.address,
        activePool.address,
        defaultPool.address,
        stabilityPool.address,
        gasPool.address,
        collSurplusPool.address,
        priceFeed.address,
        sortedTroves.address,
        zusdToken.address,
        zeroStaking.address,
        { ...overrides, nonce }
      ),

    nonce =>
      stabilityPool.setAddresses(
        liquityBaseParams.address,
        borrowerOperations.address,
        troveManager.address,
        activePool.address,
        zusdToken.address,
        sortedTroves.address,
        priceFeed.address,
        communityIssuance.address,
        { ...overrides, nonce }
      ),

    nonce =>
      activePool.setAddresses(
        borrowerOperations.address,
        troveManager.address,
        stabilityPool.address,
        defaultPool.address,
        { ...overrides, nonce }
      ),

    nonce =>
      defaultPool.setAddresses(troveManager.address, activePool.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      collSurplusPool.setAddresses(
        borrowerOperations.address,
        troveManager.address,
        activePool.address,
        { ...overrides, nonce }
      ),

    nonce =>
      hintHelpers.setAddresses(liquityBaseParams.address, sortedTroves.address, troveManager.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      zeroStaking.setAddresses(
        zeroToken.address,
        zusdToken.address,
        troveManager.address,
        borrowerOperations.address,
        activePool.address,
        { ...overrides, nonce }
      ),

    nonce =>
      lockupContractFactory.setZEROTokenAddress(zeroToken.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      communityIssuance.initialize(zeroToken.address, stabilityPool.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      sovStakersIssuance.initialize(zeroToken.address, sovCommunityPotAddress, {
        ...overrides,
        nonce
      }),

    nonce =>
      multiTroveGetter.setAddresses(troveManager.address, sortedTroves.address, {
        ...overrides,
        nonce
      }),
    
  ];

  // RSK node cannot accept more than 4 pending txs so we cannot send all the
  // connections in parallel
  log(`${connections.length} connections need to be made`);
  for (let connectionIndex = 0; connectionIndex < connections.length; connectionIndex++) {
    log(`Connecting ${connectionIndex}`);
    const connectionTx = await connections[connectionIndex](txCount + connectionIndex);
    await connectionTx.wait().then(() => log(`Connected ${connectionIndex}`));
  }
};

const transferOwnership = async (
  {
    activePool,
    borrowerOperations,
    troveManager,
    collSurplusPool,
    communityIssuance,
    defaultPool,
    hintHelpers,
    lockupContractFactory,
    zeroStaking,
    multiTroveGetter,
    priceFeed,
    sortedTroves,
    stabilityPool,
    liquityBaseParams
  }: _LiquityContracts,
  deployer: Signer,
  governanceAddress: string,
  priceFeedIsTestnet: boolean,
  overrides?: Overrides
) => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  const txCount = await deployer.provider.getTransactionCount(deployer.getAddress());

  let transactions: ((nonce: number) => Promise<ContractTransaction>)[] = [
    nonce =>
    activePool.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    borrowerOperations.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    troveManager.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    collSurplusPool.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    communityIssuance.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    defaultPool.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    hintHelpers.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    lockupContractFactory.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    zeroStaking.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    multiTroveGetter.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    stabilityPool.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    sortedTroves.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
    nonce =>
    liquityBaseParams.setOwner(governanceAddress, {
      ...overrides,
      nonce
    }),
  ];
  if (!priceFeedIsTestnet) {
    transactions = [...transactions, 
      nonce =>
      (priceFeed as PriceFeed).setOwner(governanceAddress, {
        ...overrides,
        nonce
      })
    ];
}
  
  // RSK node cannot accept more than 4 pending txs so we cannot send all the
  // connections in parallel
  log(`Transferring ownership to ${transactions.length} contracts`);
  for (let transactionsIndex = 0; transactionsIndex < transactions.length; transactionsIndex++) {
    log(`Transferring ownership ${transactionsIndex}`);
    const tx = await transactions[transactionsIndex](txCount + transactionsIndex);
    await tx.wait().then(() => log(`Transferred ownership ${transactionsIndex}`));
  }
}

export const deployAndSetupContracts = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  externalPriceFeeds: OracleAddresses = undefined,

  _isDev = true,
  governanceAddress?: string,
  sovCommunityPotAddress?: string,
  liquidityMiningAddress?: string,
  presaleAddress?: string,
  marketMakerAddress?: string,
  overrides?: Overrides
): Promise<_LiquityDeploymentJSON> => {

  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  governanceAddress ??= await deployer.getAddress();
  sovCommunityPotAddress ??= await deployContract(deployer, getContractFactory, "MockFeeSharingProxy", { ...overrides });
  //TODO replace with mocked liquidity mining 
  liquidityMiningAddress ??= await deployContract(deployer, getContractFactory, "MockBalanceRedirectPresale", { ...overrides });
  presaleAddress ??= await deployContract(deployer, getContractFactory, "MockBalanceRedirectPresale", { ...overrides });

  log("Deploying contracts...");
  log();

  const _priceFeedIsTestnet = externalPriceFeeds === undefined;

  const deployment: _LiquityDeploymentJSON = {
    chainId: await deployer.getChainId(),
    version: "unknown",
    deploymentDate: new Date().getTime(),
    bootstrapPeriod: 0,
    totalStabilityPoolZEROReward: "0",
    governanceAddress,
    sovCommunityPotAddress, 
    liquidityMiningAddress,
    presaleAddress,
    marketMakerAddress,
    _priceFeedIsTestnet,
    _isDev,

    ...await deployContracts(deployer, getContractFactory, _priceFeedIsTestnet, overrides)
  };

  const contracts = _connectToContracts(deployer, deployment);

  log("Connecting contracts...");
  await connectContracts(contracts, deployer, sovCommunityPotAddress, liquidityMiningAddress, presaleAddress, marketMakerAddress, overrides);

  if (externalPriceFeeds !== undefined) {
    assert(!checkPriceFeedIsTestnet(contracts.priceFeed));

    console.log("Deploying external price feeds");
    const mocMedianizerAddress = await deployContract(deployer, getContractFactory, "MoCMedianizer", externalPriceFeeds.mocOracleAddress, {...overrides});
    const rskPriceFeedAddress = await deployContract(deployer, getContractFactory, "RskOracle", externalPriceFeeds.rskOracleAddress, {...overrides});

    console.log(`Hooking up PriceFeed with oracles: MocMedianizer => ${mocMedianizerAddress}, RskPriceFeed => ${rskPriceFeedAddress}`);
    const tx = await contracts.priceFeed.setAddresses(mocMedianizerAddress, rskPriceFeedAddress, {...overrides});
    await tx.wait();
  }

  log("Transferring Ownership...");
  await transferOwnership(contracts, deployer, governanceAddress, _priceFeedIsTestnet, overrides);

  const zeroTokenDeploymentTime = await contracts.zeroToken.getDeploymentStartTime();
  const bootstrapPeriod = await contracts.troveManager.BOOTSTRAP_PERIOD();
  const totalStabilityPoolZEROReward = await contracts.communityIssuance.ZEROSupplyCap();

  return {
    ...deployment,
    deploymentDate: zeroTokenDeploymentTime.toNumber() * 1000,
    bootstrapPeriod: bootstrapPeriod.toNumber(),
    totalStabilityPoolZEROReward: `${Decimal.fromBigNumberString(
      totalStabilityPoolZEROReward.toHexString()
    )}`,
  };
};
