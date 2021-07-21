import { Signer } from "@ethersproject/abstract-signer";
import { ContractFactory, ContractTransaction, Overrides } from "@ethersproject/contracts";
import { Wallet } from "@ethersproject/wallet";
import { Decimal } from "@liquity/lib-base";
import { Contract } from "ethers";
import {
  _connectToContracts, _LiquityContractAddresses,
  _LiquityContracts,
  _LiquityDeploymentJSON
} from "../src/contracts";
import { PriceFeed } from "../types";
import { createUniswapV2Pair } from "./UniswapV2Factory";

let silent = true;

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
): Promise<[addresses: Omit<_LiquityContractAddresses, "uniToken">, startBlock: number]> => {

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
    lqtyStaking: await deployContractWithProxy(deployer, getContractFactory, "LQTYStaking", { ...overrides }),
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
    unipool: await deployContract(deployer, getContractFactory, "Unipool", { ...overrides }),
    liquityBaseParams: await deployContractWithProxy(deployer, getContractFactory, "LiquityBaseParams", {
      ...overrides
    }),
  };

  return [
    {
      ...addresses,
      lusdToken: await deployContractWithProxy(deployer, getContractFactory, "LUSDToken", { ...overrides }),

      lqtyToken: await deployContractWithProxy(deployer, getContractFactory, "LQTYToken", { ...overrides }),

      multiTroveGetter: await deployContractWithProxy(deployer, getContractFactory, "MultiTroveGetter", {
        ...overrides
      })
    },

    startBlock
  ];
};

const connectContracts = async (
  {
    activePool,
    borrowerOperations,
    troveManager,
    troveManagerRedeemOps,
    lusdToken,
    collSurplusPool,
    communityIssuance,
    defaultPool,
    lqtyToken,
    hintHelpers,
    lockupContractFactory,
    lqtyStaking,
    multiTroveGetter,
    priceFeed,
    sortedTroves,
    stabilityPool,
    gasPool,
    unipool,
    uniToken,
    liquityBaseParams
  }: _LiquityContracts,
  deployer: Signer,
  overrides?: Overrides
) => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  const txCount = await deployer.provider.getTransactionCount(deployer.getAddress());

  const connections: ((nonce: number) => Promise<ContractTransaction>)[] = [
    nonce => 
      lusdToken.initialize(troveManager.address, stabilityPool.address, borrowerOperations.address, {
        ...overrides,
        nonce
      }),
    
    nonce =>
      liquityBaseParams.initialize({
        ...overrides,
        nonce
      }),

    nonce =>
      lqtyToken.initialize(
        communityIssuance.address,
        lqtyStaking.address,
        lockupContractFactory.address,
        Wallet.createRandom().address, // _bountyAddress (TODO: parameterize this)
        unipool.address, // _lpRewardsAddress
        Wallet.createRandom().address, // _multisigAddress (TODO: parameterize this)
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
        lusdToken.address,
        sortedTroves.address,
        lqtyToken.address,
        lqtyStaking.address,
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
        lusdToken.address,
        lqtyStaking.address,
        { ...overrides, nonce }
      ),

    nonce =>
      stabilityPool.setAddresses(
        liquityBaseParams.address,
        borrowerOperations.address,
        troveManager.address,
        activePool.address,
        lusdToken.address,
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
      lqtyStaking.setAddresses(
        lqtyToken.address,
        lusdToken.address,
        troveManager.address,
        borrowerOperations.address,
        activePool.address,
        { ...overrides, nonce }
      ),

    nonce =>
      lockupContractFactory.setLQTYTokenAddress(lqtyToken.address, {
        ...overrides,
        nonce
      }),


    nonce =>
      communityIssuance.setAddresses(lqtyToken.address, stabilityPool.address, {
        ...overrides,
        nonce
      }),

    nonce =>
      multiTroveGetter.setAddresses(troveManager.address, sortedTroves.address, {
        ...overrides,
        nonce
      }),
    
    nonce =>
      unipool.setParams(lqtyToken.address, uniToken.address, 2 * 30 * 24 * 60 * 60, {
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
    lqtyStaking,
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
    lqtyStaking.setOwner(governanceAddress, {
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

const deployMockUniToken = (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  overrides?: Overrides
) =>
  deployContract(
    deployer,
    getContractFactory,
    "ERC20Mock",
    "Mock Uniswap V2",
    "UNI-V2",
    Wallet.createRandom().address, // initialAccount
    0, // initialBalance
    { ...overrides }
  );

export const deployAndSetupContracts = async (
  deployer: Signer,
  governanceAddress: string,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  _priceFeedIsTestnet = true,
  _isDev = true,
  wethAddress?: string,
  overrides?: Overrides
): Promise<_LiquityDeploymentJSON> => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  log("Deploying contracts...");
  log();

  const deployment: _LiquityDeploymentJSON = {
    chainId: await deployer.getChainId(),
    version: "unknown",
    deploymentDate: new Date().getTime(),
    bootstrapPeriod: 0,
    totalStabilityPoolLQTYReward: "0",
    liquidityMiningLQTYRewardRate: "0",
    _priceFeedIsTestnet,
    _uniTokenIsMock: !wethAddress,
    _isDev,

    ...(await deployContracts(deployer, getContractFactory, _priceFeedIsTestnet, overrides).then(
      async ([addresses, startBlock]) => ({
        startBlock,

        addresses: {
          ...addresses,

          uniToken: await (wethAddress
            ? createUniswapV2Pair(deployer, wethAddress, addresses.lusdToken, overrides)
            : deployMockUniToken(deployer, getContractFactory, overrides))
        }
      })
    ))
  };

  const contracts = _connectToContracts(deployer, deployment);

  log("Connecting contracts...");
  await connectContracts(contracts, deployer, overrides);

  log("Transferring Ownership...");
  await transferOwnership(contracts, deployer, governanceAddress, _priceFeedIsTestnet, overrides);

  const lqtyTokenDeploymentTime = await contracts.lqtyToken.getDeploymentStartTime();
  const bootstrapPeriod = await contracts.troveManager.BOOTSTRAP_PERIOD();
  const totalStabilityPoolLQTYReward = await contracts.communityIssuance.LQTYSupplyCap();
  const liquidityMiningLQTYRewardRate = await contracts.unipool.rewardRate();

  return {
    ...deployment,
    deploymentDate: lqtyTokenDeploymentTime.toNumber() * 1000,
    bootstrapPeriod: bootstrapPeriod.toNumber(),
    totalStabilityPoolLQTYReward: `${Decimal.fromBigNumberString(
      totalStabilityPoolLQTYReward.toHexString()
    )}`,
    liquidityMiningLQTYRewardRate: `${Decimal.fromBigNumberString(
      liquidityMiningLQTYRewardRate.toHexString()
    )}`
  };
};
