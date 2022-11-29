import assert from "assert";
import { Signer } from "@ethersproject/abstract-signer";
import { ContractFactory, ContractTransaction, Overrides } from "@ethersproject/contracts";
import { Contract, ethers } from "ethers";
import {
  _connectToContracts,
  _ZeroContractAddresses,
  _ZeroContracts,
  _ZeroDeploymentJSON,
  _priceFeedIsTestnet as checkPriceFeedIsTestnet
} from "../src/contracts";
import { PriceFeed } from "../types";
import upgradeableProxy from "../abi/LoCManagerRedeemOps.json";
import { Ownable } from "../types";

let silent = true;

export type OracleAddresses =
  | {
      mocOracleAddress: string;
      rskOracleAddress: string;
    }
  | undefined;

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
  zusdTokenAddress?: string,
  isMainnet?: boolean,
  notTestnet?: boolean,
  overrides?: Overrides
): Promise<{ addresses: Omit<_ZeroContractAddresses, "nueToken">; startBlock: number }> => {
  const [gasPool, startBlock] = await deployContractAndGetBlockNumber(
    deployer,
    getContractFactory,
    "GasPool",
    {
      ...overrides
    }
  );

  const addresses = {
    activePool: await deployContractWithProxy(deployer, getContractFactory, "ActivePool", {
      ...overrides
    }),
    borrowerOperations: await deployContractWithProxy(
      deployer,
      getContractFactory,
      "BorrowerOperations",
      {
        ...overrides
      }
    ),
    locManager: await deployContractWithProxy(deployer, getContractFactory, "LoCManager", {
      ...overrides
    }),

    locManagerRedeemOps: isMainnet || notTestnet
      ? await deployContract(deployer, getContractFactory, "LoCManagerRedeemOps", { ...overrides })
      : await deployContract(deployer, getContractFactory, "LoCManagerRedeemOpsTestnet", {
          ...overrides
        }),
    collSurplusPool: await deployContractWithProxy(deployer, getContractFactory, "CollSurplusPool", {
      ...overrides
    }),
    communityIssuance: await deployContractWithProxy(
      deployer,
      getContractFactory,
      "CommunityIssuance",
      {
        ...overrides
      }
    ),
    defaultPool: await deployContractWithProxy(deployer, getContractFactory, "DefaultPool", {
      ...overrides
    }),
    hintHelpers: await deployContractWithProxy(deployer, getContractFactory, "HintHelpers", {
      ...overrides
    }),
    zeroStaking: await deployContractWithProxy(deployer, getContractFactory, "ZEROStaking", {
      ...overrides
    }),
    priceFeed: priceFeedIsTestnet
      ? await deployContract(deployer, getContractFactory, "PriceFeedTestnet", { ...overrides })
      : await deployContractWithProxy(deployer, getContractFactory, "PriceFeed", { ...overrides }),
    sortedLoCs: await deployContractWithProxy(deployer, getContractFactory, "SortedLoCs", {
      ...overrides
    }),
    stabilityPool: await deployContractWithProxy(deployer, getContractFactory, "StabilityPool", {
      ...overrides
    }),
    gasPool: gasPool.address,
    zeroBaseParams: await deployContractWithProxy(
      deployer,
      getContractFactory,
      "ZeroBaseParams",
      {
        ...overrides
      }
    ),
    feeDistributor: await deployContractWithProxy(deployer, getContractFactory, "FeeDistributor", {
      ...overrides
    })
  };

  return {
    addresses: {
      ...addresses,
      zusdToken: (zusdTokenAddress ??= await deployContractWithProxy(
        deployer,
        getContractFactory,
        "ZUSDToken",
        {
          ...overrides
        }
      )),

      zeroToken: await deployContractWithProxy(deployer, getContractFactory, "ZEROToken", {
        ...overrides
      }),

      multiLoCGetter: await deployContractWithProxy(
        deployer,
        getContractFactory,
        "MultiLoCGetter",
        {
          ...overrides
        }
      )
    },

    startBlock
  };
};

const connectContracts = async (
  {
    activePool,
    borrowerOperations,
    locManager,
    locManagerRedeemOps,
    zusdToken,
    collSurplusPool,
    communityIssuance,
    defaultPool,
    zeroToken,
    hintHelpers,
    zeroStaking,
    multiLoCGetter,
    priceFeed,
    sortedLoCs,
    stabilityPool,
    gasPool,
    zeroBaseParams,
    feeDistributor
  }: _ZeroContracts,
  deployer: Signer,
  governanceAddress: string,
  sovFeeCollectorAddress: string,
  wrbtcAddress: string,
  presaleAddress: string,
  marketMakerAddress?: string,
  zusdTokenAddress?: string,
  overrides?: Overrides
) => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  const txCount = await deployer.provider.getTransactionCount(deployer.getAddress());

  let connections: ((nonce: number) => Promise<ContractTransaction>)[] = [
    nonce =>
      zeroBaseParams.initialize({
        ...overrides,
        nonce
      }),

    nonce =>
      zeroToken.initialize(
        zeroStaking.address,
        marketMakerAddress ? marketMakerAddress : gasPool.address,
        presaleAddress,
        {
          ...overrides,
          nonce
        }
      ),

    nonce =>
      sortedLoCs.setParams(1e6, locManager.address, borrowerOperations.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      locManager.setAddresses(
        feeDistributor.address,
        locManagerRedeemOps.address,
        zeroBaseParams.address,
        borrowerOperations.address,
        activePool.address,
        defaultPool.address,
        stabilityPool.address,
        gasPool.address,
        collSurplusPool.address,
        priceFeed.address,
        zusdToken.address,
        sortedLoCs.address,
        zeroToken.address,
        zeroStaking.address,
        { ...overrides, nonce }
      ),

    nonce =>
      borrowerOperations.setAddresses(
        feeDistributor.address,
        zeroBaseParams.address,
        locManager.address,
        activePool.address,
        defaultPool.address,
        stabilityPool.address,
        gasPool.address,
        collSurplusPool.address,
        priceFeed.address,
        sortedLoCs.address,
        zusdToken.address,
        zeroStaking.address,
        { ...overrides, nonce }
      ),

    nonce =>
      stabilityPool.setAddresses(
        zeroBaseParams.address,
        borrowerOperations.address,
        locManager.address,
        activePool.address,
        zusdToken.address,
        sortedLoCs.address,
        priceFeed.address,
        communityIssuance.address,
        { ...overrides, nonce }
      ),

    nonce =>
      activePool.setAddresses(
        borrowerOperations.address,
        locManager.address,
        stabilityPool.address,
        defaultPool.address,
        { ...overrides, nonce }
      ),

    nonce =>
      defaultPool.setAddresses(locManager.address, activePool.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      collSurplusPool.setAddresses(
        borrowerOperations.address,
        locManager.address,
        activePool.address,
        { ...overrides, nonce }
      ),

    nonce =>
      hintHelpers.setAddresses(
        zeroBaseParams.address,
        sortedLoCs.address,
        locManager.address,
        {
          ...overrides,
          nonce
        }
      ),

    nonce =>
      zeroStaking.setAddresses(
        zeroToken.address,
        zusdToken.address,
        feeDistributor.address,
        activePool.address,
        { ...overrides, nonce }
      ),

    nonce =>
      communityIssuance.initialize(zeroToken.address, stabilityPool.address, governanceAddress, {
        ...overrides,
        nonce
      }),

    nonce =>
      multiLoCGetter.setAddresses(locManager.address, sortedLoCs.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      feeDistributor.setAddresses(
        sovFeeCollectorAddress,
        zeroStaking.address,
        borrowerOperations.address,
        locManager.address,
        wrbtcAddress,
        zusdToken.address,
        activePool.address,
        { ...overrides, nonce }
      )
  ];
  // Initialize zero token if no address in config file for this network context
  if (!zusdTokenAddress) {
    connections = [
      nonce =>
        zusdToken.initialize(
          locManager.address,
          stabilityPool.address,
          borrowerOperations.address,
          {
            ...overrides,
            nonce
          }
        ),
      ...connections
    ];
  }

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
    locManager,
    locManagerRedeemOps,
    zusdToken,
    zeroToken,
    collSurplusPool,
    communityIssuance,
    defaultPool,
    hintHelpers,
    zeroStaking,
    multiLoCGetter,
    priceFeed,
    sortedLoCs,
    stabilityPool,
    zeroBaseParams,
    feeDistributor
  }: _ZeroContracts,
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
      feeDistributor.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce =>
      locManager.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce =>
      locManagerRedeemOps.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce =>
      zusdToken.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce  => //zeroToken is not ownable and can't add due to the contract size limit (EIP-170) - requires optimization first
    /*(hardhat.ethers.getContractAt(upgradeableProxy, zeroToken.address, deployer) as unknown as Ownable)*/
      (new ethers.Contract(zeroToken.address, upgradeableProxy, deployer) as unknown as Ownable)
      .setOwner(governanceAddress, {
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
      zeroStaking.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce =>
      multiLoCGetter.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce =>
      stabilityPool.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce =>
      sortedLoCs.setOwner(governanceAddress, {
        ...overrides,
        nonce
      }),
    nonce =>
      zeroBaseParams.setOwner(governanceAddress, {
        ...overrides,
        nonce
      })
  ];
  if (!priceFeedIsTestnet) {
    transactions = [
      ...transactions,
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
    const receipt = await tx.wait();
    log({
      blockNumber: tx.blockNumber,
      gasUsed: receipt.gasUsed.toNumber()
    });
  }
};

export const deployAndSetupContracts = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  externalPriceFeeds: OracleAddresses = undefined,

  _isDev = true,
  governanceAddress?: string,
  sovFeeCollectorAddress?: string,
  wrbtcAddress?: string,
  presaleAddress?: string,
  marketMakerAddress?: string,
  zusdTokenAddress?: string,
  isMainnet?: boolean,
  notTestnet?: boolean,
  overrides?: Overrides
): Promise<_ZeroDeploymentJSON> => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  governanceAddress ??= await deployer.getAddress();
  sovFeeCollectorAddress ??= await deployContract(
    deployer,
    getContractFactory,
    "MockFeeSharingProxy",
    { ...overrides }
  );
  wrbtcAddress ??= await deployContract(deployer, getContractFactory, "WRBTCTokenTester", {
    ...overrides
  });
  presaleAddress ??= await deployContract(
    deployer,
    getContractFactory,
    "MockBalanceRedirectPresale",
    { ...overrides }
  );
  marketMakerAddress ??= await deployContract(
    deployer,
    getContractFactory,
    "MockBalanceRedirectPresale",
    { ...overrides }
  );

  log("Deploying contracts...");
  log();

  const _priceFeedIsTestnet = externalPriceFeeds === undefined;

  const deployment: _ZeroDeploymentJSON = {
    chainId: await deployer.getChainId(),
    version: "unknown",
    deploymentDate: new Date().getTime(),
    bootstrapPeriod: 0,
    governanceAddress,
    sovFeeCollectorAddress,
    wrbtcAddress,
    presaleAddress,
    marketMakerAddress,
    _priceFeedIsTestnet,
    _isDev,

    ...(await deployContracts(
      deployer,
      getContractFactory,
      _priceFeedIsTestnet,
      zusdTokenAddress,
      isMainnet,
      notTestnet,
      overrides
    ))
  } as _ZeroDeploymentJSON;

  const contracts = _connectToContracts(deployer, deployment);

  log("Connecting contracts...");
  await connectContracts(
    contracts,
    deployer,
    governanceAddress,
    sovFeeCollectorAddress,
    wrbtcAddress,
    presaleAddress,
    marketMakerAddress,
    zusdTokenAddress,
    overrides
  );

  if (externalPriceFeeds !== undefined) {
    assert(!checkPriceFeedIsTestnet(contracts.priceFeed));

    console.log("Deploying external price feeds");
    const mocMedianizerAddress = await deployContract(
      deployer,
      getContractFactory,
      "MoCMedianizer",
      externalPriceFeeds.mocOracleAddress,
      { ...overrides }
    );
    const rskPriceFeedAddress = await deployContract(
      deployer,
      getContractFactory,
      "RskOracle",
      externalPriceFeeds.rskOracleAddress,
      { ...overrides }
    );

    console.log(
      `Hooking up PriceFeed with oracles: MocMedianizer => ${mocMedianizerAddress}, RskPriceFeed => ${rskPriceFeedAddress}`
    );
    const tx = await contracts.priceFeed.setAddresses(mocMedianizerAddress, rskPriceFeedAddress, {
      ...overrides
    });
    await tx.wait();
  }

  log("Transferring Ownership...");
  await transferOwnership(contracts, deployer, governanceAddress, _priceFeedIsTestnet, overrides);

  const zeroTokenDeploymentTime = await contracts.zeroToken.getDeploymentStartTime();
  const bootstrapPeriod = await contracts.locManager.BOOTSTRAP_PERIOD();

  return {
    ...deployment,
    deploymentDate: zeroTokenDeploymentTime.toNumber() * 1000,
    bootstrapPeriod: bootstrapPeriod.toNumber()
  };
};
