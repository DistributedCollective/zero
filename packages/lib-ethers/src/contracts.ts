import { JsonFragment, LogDescription } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/abstract-provider";

import {
  Contract,
  ContractInterface,
  ContractFunction,
  Overrides,
  CallOverrides,
  PopulatedTransaction,
  ContractTransaction
} from "@ethersproject/contracts";

import activePool from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/ActivePool.json";
import borrowerOperations from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/BorrowerOperations.json";
import troveManager from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/TroveManager.json";
import troveManagerRedeemOps from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/TroveManagerRedeemOps.json";
import zusdToken from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/ZUSDToken.json";
import nueToken from "@sovryn-zero/contracts/artifacts/contracts/Dependencies/IERC20.sol/IERC20.json"
import collSurplusPool from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/CollSurplusPool.json";
import communityIssuance from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/CommunityIssuance.json";
import defaultPool from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/DefaultPool.json";
import zeroToken from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/ZEROToken.json";
import hintHelpers from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/HintHelpers.json";
import zeroStaking from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/ZEROStaking.json";
import multiTroveGetter from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/MultiTroveGetter.json";
import priceFeed from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/PriceFeed.json";
import priceFeedTestnet from "@sovryn-zero/contracts/deployment/rskSovrynTestnet/PriceFeedTestnet.json";
import sortedTroves from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/SortedTroves.json";
import stabilityPool from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/StabilityPool.json";
import gasPool from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/GasPool.json";
import liquityBaseParams from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/LiquityBaseParams.json";
import feeDistributor from "@sovryn-zero/contracts/deployment/rskSovrynMainnet/FeeDistributor.json";

import {
  ActivePool,
  BorrowerOperations,
  TroveManager,
  TroveManagerRedeemOps,
  ZUSDToken,
  CollSurplusPool,
  CommunityIssuance,
  DefaultPool,
  ZEROToken,
  HintHelpers,
  ZEROStaking,
  MultiTroveGetter,
  PriceFeed,
  PriceFeedTestnet,
  SortedTroves,
  StabilityPool,
  GasPool,
  LiquityBaseParams,
  IERC20,
  FeeDistributor
} from "../types";

import { EthersProvider, EthersSigner } from "./types";

export interface _TypedLogDescription<T> extends Omit<LogDescription, "args"> {
  args: T;
}

type BucketOfFunctions = Record<string, (...args: unknown[]) => never>;

// Removes unsafe index signatures from an Ethers contract type
export type _TypeSafeContract<T> = Pick<
  T,
  {
    [P in keyof T]: BucketOfFunctions extends T[P] ? never : P;
  } extends {
    [_ in keyof T]: infer U;
  }
    ? U
    : never
>;

type EstimatedContractFunction<R = unknown, A extends unknown[] = unknown[], O = Overrides> = (
  overrides: O,
  adjustGas: (gas: BigNumber) => BigNumber,
  ...args: A
) => Promise<R>;

type CallOverridesArg = [overrides?: CallOverrides];

type TypedContract<T extends Contract, U, V> = _TypeSafeContract<T> &
  U &
  {
    [P in keyof V]: V[P] extends (...args: infer A) => unknown
      ? (...args: A) => Promise<ContractTransaction>
      : never;
  } & {
    readonly callStatic: {
      [P in keyof V]: V[P] extends (...args: [...infer A, never]) => infer R
        ? (...args: [...A, ...CallOverridesArg]) => R
        : never;
    };

    readonly estimateAndPopulate: {
      [P in keyof V]: V[P] extends (...args: [...infer A, infer O | undefined]) => unknown
        ? EstimatedContractFunction<PopulatedTransaction, A, O>
        : never;
    };
  };

const buildEstimatedFunctions = <T>(
  estimateFunctions: Record<string, ContractFunction<BigNumber>>,
  functions: Record<string, ContractFunction<T>>
): Record<string, EstimatedContractFunction<T>> =>
  Object.fromEntries(
    Object.keys(estimateFunctions).map(functionName => [
      functionName,
      async (overrides, adjustEstimate, ...args) => {
        if (overrides.gasLimit === undefined) {
          const estimatedGas = await estimateFunctions[functionName](...args, overrides);

          overrides = {
            ...overrides,
            gasLimit: adjustEstimate(estimatedGas).add(10000),
          };
        }

        return functions[functionName](...args, overrides);
      }
    ])
  );

export class _LiquityContract extends Contract {
  readonly estimateAndPopulate: Record<string, EstimatedContractFunction<PopulatedTransaction>>;
  
  constructor(
    addressOrName: string,
    contractInterface: ContractInterface,
    signerOrProvider?: EthersSigner | EthersProvider
  ) {
    super(addressOrName, contractInterface, signerOrProvider);

    // this.estimateAndCall = buildEstimatedFunctions(this.estimateGas, this);
    this.estimateAndPopulate = buildEstimatedFunctions(this.estimateGas, this.populateTransaction);
  }

  extractEvents(logs: Log[], name: string): _TypedLogDescription<unknown>[] {
    return logs
      .filter(log => log.address === this.address)
      .map(log => this.interface.parseLog(log))
      .filter(e => e.name === name);
  }
}

/** @internal */
export type _TypedLiquityContract<T = unknown, U = unknown> = TypedContract<_LiquityContract, T, U>;

/** @internal */
export interface _LiquityContracts {
  activePool: ActivePool;
  borrowerOperations: BorrowerOperations;
  troveManager: TroveManager;
  troveManagerRedeemOps: TroveManagerRedeemOps;
  zusdToken: ZUSDToken;
  nueToken?: IERC20;
  collSurplusPool: CollSurplusPool;
  communityIssuance: CommunityIssuance;
  defaultPool: DefaultPool;
  zeroToken: ZEROToken;
  hintHelpers: HintHelpers;
  zeroStaking: ZEROStaking;
  multiTroveGetter: MultiTroveGetter;
  priceFeed: PriceFeed | PriceFeedTestnet;
  sortedTroves: SortedTroves;
  stabilityPool: StabilityPool;
  gasPool: GasPool;
  liquityBaseParams: LiquityBaseParams;
  feeDistributor: FeeDistributor;
}

/** @internal */
export const _priceFeedIsTestnet = (
  priceFeed: PriceFeed | PriceFeedTestnet
): priceFeed is PriceFeedTestnet => "setPrice" in priceFeed;

type LiquityContractsKey = keyof _LiquityContracts;

/** @internal */
export type _LiquityContractAddresses = Record<LiquityContractsKey, string>;
type LiquityContractAbis = Record<LiquityContractsKey, JsonFragment[]>;

const getAbi = (priceFeedIsTestnet: boolean): LiquityContractAbis => ({
  activePool: activePool.abi,
  borrowerOperations: borrowerOperations.abi,
  troveManager: troveManager.abi,
  troveManagerRedeemOps: troveManagerRedeemOps.abi,
  zusdToken: zusdToken.abi,
  nueToken: nueToken.abi,
  communityIssuance: communityIssuance.abi,
  defaultPool: defaultPool.abi,
  zeroToken: zeroToken.abi,
  hintHelpers: hintHelpers.abi,
  zeroStaking: zeroStaking.abi,
  multiTroveGetter: multiTroveGetter.abi,
  priceFeed: priceFeedIsTestnet ? priceFeedTestnet.abi : priceFeed.abi,
  sortedTroves: sortedTroves.abi,
  stabilityPool: stabilityPool.abi,
  gasPool: gasPool.abi,
  collSurplusPool: collSurplusPool.abi,
  liquityBaseParams: liquityBaseParams.abi,
  feeDistributor: feeDistributor.abi,
});

const mapLiquityContracts = <T, U>(
  contracts: Record<LiquityContractsKey, T>,
  f: (t: T, key: LiquityContractsKey) => U
) =>
  Object.fromEntries(
    Object.entries(contracts).map(([key, t]) => [key, f(t, key as LiquityContractsKey)])
  ) as Record<LiquityContractsKey, U>;

/** @internal */
export interface _LiquityDeploymentJSON {
  readonly chainId: number;
  readonly addresses: _LiquityContractAddresses;
  readonly version: string;
  readonly deploymentDate: number;
  readonly startBlock: number;
  readonly bootstrapPeriod: number;
  readonly governanceAddress: string;
  readonly feeSharingCollectorAddress?: string;
  readonly wrbtcAddress?: string;
  readonly presaleAddress?: string;
  readonly marketMakerAddress?: string;
  readonly myntMassetManagerAddress?: string;
  readonly myntNueTokenAddress?: string;
  readonly _priceFeedIsTestnet: boolean;
  readonly _isDev: boolean;
}

/** @internal */
export const _connectToContracts = (
  signerOrProvider: EthersSigner | EthersProvider,
  { addresses, _priceFeedIsTestnet }: _LiquityDeploymentJSON
): _LiquityContracts => {
  const abi = getAbi(_priceFeedIsTestnet);

  return mapLiquityContracts(
    addresses,
    (address, key) =>
      new _LiquityContract(address, abi[key], signerOrProvider) as _TypedLiquityContract
  ) as _LiquityContracts;
};
