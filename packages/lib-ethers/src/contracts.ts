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

import activePoolAbi from "../abi/ActivePool.json";
import borrowerOperationsAbi from "../abi/BorrowerOperations.json";
import locManagerAbi from "../abi/LoCManager.json";
import locManagerRedeemOpsAbi from "../abi/LoCManagerRedeemOps.json";
import zusdTokenAbi from "../abi/ZUSDToken.json";
import nueTokenAbi from "../abi/IERC20.json";
import collSurplusPoolAbi from "../abi/CollSurplusPool.json";
import communityIssuanceAbi from "../abi/CommunityIssuance.json";
import defaultPoolAbi from "../abi/DefaultPool.json";
import zeroTokenAbi from "../abi/ZEROToken.json";
import hintHelpersAbi from "../abi/HintHelpers.json";
import zeroStakingAbi from "../abi/ZEROStaking.json";
import multiLoCGetterAbi from "../abi/MultiLoCGetter.json";
import priceFeedAbi from "../abi/PriceFeed.json";
import priceFeedTestnetAbi from "../abi/PriceFeedTestnet.json";
import sortedLoCsAbi from "../abi/SortedLoCs.json";
import stabilityPoolAbi from "../abi/StabilityPool.json";
import gasPoolAbi from "../abi/GasPool.json";
import zeroBaseParamsAbi from "../abi/ZeroBaseParams.json";
import feeDistributorAbi from "../abi/FeeDistributor.json";

import {
  ActivePool,
  BorrowerOperations,
  LoCManager,
  LoCManagerRedeemOps,
  ZUSDToken,
  CollSurplusPool,
  CommunityIssuance,
  DefaultPool,
  ZEROToken,
  HintHelpers,
  ZEROStaking,
  MultiLoCGetter,
  PriceFeed,
  PriceFeedTestnet,
  SortedLoCs,
  StabilityPool,
  GasPool,
  ZeroBaseParams,
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

export class _ZeroContract extends Contract {
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
export type _TypedZeroContract<T = unknown, U = unknown> = TypedContract<_ZeroContract, T, U>;

/** @internal */
export interface _ZeroContracts {
  activePool: ActivePool;
  borrowerOperations: BorrowerOperations;
  locManager: LoCManager;
  locManagerRedeemOps: LoCManagerRedeemOps;
  zusdToken: ZUSDToken;
  nueToken?: IERC20;
  collSurplusPool: CollSurplusPool;
  communityIssuance: CommunityIssuance;
  defaultPool: DefaultPool;
  zeroToken: ZEROToken;
  hintHelpers: HintHelpers;
  zeroStaking: ZEROStaking;
  multiLoCGetter: MultiLoCGetter;
  priceFeed: PriceFeed | PriceFeedTestnet;
  sortedLoCs: SortedLoCs;
  stabilityPool: StabilityPool;
  gasPool: GasPool;
  zeroBaseParams: ZeroBaseParams;
  feeDistributor: FeeDistributor;
}

/** @internal */
export const _priceFeedIsTestnet = (
  priceFeed: PriceFeed | PriceFeedTestnet
): priceFeed is PriceFeedTestnet => "setPrice" in priceFeed;

type ZeroContractsKey = keyof _ZeroContracts;

/** @internal */
export type _ZeroContractAddresses = Record<ZeroContractsKey, string>;
type ZeroContractAbis = Record<ZeroContractsKey, JsonFragment[]>;

const getAbi = (priceFeedIsTestnet: boolean): ZeroContractAbis => ({
  activePool: activePoolAbi,
  borrowerOperations: borrowerOperationsAbi,
  locManager: locManagerAbi,
  locManagerRedeemOps: locManagerRedeemOpsAbi,
  zusdToken: zusdTokenAbi,
  nueToken: nueTokenAbi,
  communityIssuance: communityIssuanceAbi,
  defaultPool: defaultPoolAbi,
  zeroToken: zeroTokenAbi,
  hintHelpers: hintHelpersAbi,
  zeroStaking: zeroStakingAbi,
  multiLoCGetter: multiLoCGetterAbi,
  priceFeed: priceFeedIsTestnet ? priceFeedTestnetAbi : priceFeedAbi,
  sortedLoCs: sortedLoCsAbi,
  stabilityPool: stabilityPoolAbi,
  gasPool: gasPoolAbi,
  collSurplusPool: collSurplusPoolAbi,
  zeroBaseParams: zeroBaseParamsAbi,
  feeDistributor: feeDistributorAbi,
});

const mapZeroContracts = <T, U>(
  contracts: Record<ZeroContractsKey, T>,
  f: (t: T, key: ZeroContractsKey) => U
) =>
  Object.fromEntries(
    Object.entries(contracts).map(([key, t]) => [key, f(t, key as ZeroContractsKey)])
  ) as Record<ZeroContractsKey, U>;

/** @internal */
export interface _ZeroDeploymentJSON {
  readonly chainId: number;
  readonly addresses: _ZeroContractAddresses;
  readonly version: string;
  readonly deploymentDate: number;
  readonly startBlock: number;
  readonly bootstrapPeriod: number;
  readonly governanceAddress: string;
  readonly sovFeeCollectorAddress?: string;
  readonly wrbtcAddress?: string;
  readonly presaleAddress?: string;
  readonly marketMakerAddress?: string;
  readonly _priceFeedIsTestnet: boolean;
  readonly _isDev: boolean;
}

/** @internal */
export const _connectToContracts = (
  signerOrProvider: EthersSigner | EthersProvider,
  { addresses, _priceFeedIsTestnet }: _ZeroDeploymentJSON
): _ZeroContracts => {
  const abi = getAbi(_priceFeedIsTestnet);

  return mapZeroContracts(
    addresses,
    (address, key) =>
      new _ZeroContract(address, abi[key], signerOrProvider) as _TypedZeroContract
  ) as _ZeroContracts;
};
