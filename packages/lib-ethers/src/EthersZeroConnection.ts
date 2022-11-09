import { BigNumber } from "@ethersproject/bignumber";
import { Block, BlockTag } from "@ethersproject/abstract-provider";
import { Signer } from "@ethersproject/abstract-signer";

import devOrNull from "../deployments/dev.json";
import rsktestnet from "../deployments/default/rsktestnet.json";
import rskdev from "../deployments/rskdev.json";
import rskMainnet from "../deployments/default/rsksovrynmainnet.json";

import { EthersProvider, EthersSigner } from "./types";

import {
  _connectToContracts,
  _ZeroContractAddresses,
  _ZeroContracts,
  _ZeroDeploymentJSON
} from "./contracts";

import { _connectToMulticall, _Multicall } from "./_Multicall";

const dev = devOrNull as _ZeroDeploymentJSON | null;

const deployments = {
  [rsktestnet.chainId]: rsktestnet,
  [rskMainnet.chainId]: rskMainnet,
  ...(rskdev ? { [rskdev.chainId]: rskdev } : {}),

  ...(dev !== null ? { [dev.chainId]: dev } : {})
};

declare const brand: unique symbol;

const branded = <T>(t: Omit<T, typeof brand>): T => t as T;

/**
 * Information about a connection to the Zero protocol.
 *
 * @remarks
 * Provided for debugging / informational purposes.
 *
 * Exposed through {@link ReadableEthersZero.connection} and {@link EthersZero.connection}.
 *
 * @public
 */
export interface EthersZeroConnection extends EthersZeroConnectionOptionalParams {
  /** Ethers `Provider` used for connecting to the network. */
  readonly provider: EthersProvider;

  /** Ethers `Signer` used for sending transactions. */
  readonly signer?: EthersSigner;

  /** Chain ID of the connected network. */
  readonly chainId: number;

  /** Version of the Zero contracts (Git commit hash). */
  readonly version: string;

  /** Date when the Zero contracts were deployed. */
  readonly deploymentDate: Date;

  /** Number of block in which the first Zero contract was deployed. */
  readonly startBlock: number;

  /** Time period (in seconds) after `deploymentDate` during which redemptions are disabled. */
  readonly bootstrapPeriod: number;

  /** A mapping of Zero contracts' names to their addresses. */
  readonly addresses: Record<string, string>;

  /** @internal */
  readonly _priceFeedIsTestnet: boolean;

  /** @internal */
  readonly _isDev: boolean;

  /** @internal */
  readonly [brand]: unique symbol;
}

/** @internal */
export interface _InternalEthersZeroConnection extends EthersZeroConnection {
  readonly addresses: _ZeroContractAddresses;
  readonly _contracts: _ZeroContracts;
  readonly _multicall?: _Multicall;
}

const connectionFrom = (
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  _contracts: _ZeroContracts,
  _multicall: _Multicall | undefined,
  { deploymentDate, ...deployment }: _ZeroDeploymentJSON,
  optionalParams?: EthersZeroConnectionOptionalParams
): _InternalEthersZeroConnection => {
  if (
    optionalParams &&
    optionalParams.useStore !== undefined &&
    !validStoreOptions.includes(optionalParams.useStore)
  ) {
    throw new Error(`Invalid useStore value ${optionalParams.useStore}`);
  }

  return branded({
    provider,
    signer,
    _contracts,
    _multicall,
    deploymentDate: new Date(deploymentDate),
    ...deployment,
    ...optionalParams
  });
};

/** @internal */
export const _getContracts = (connection: EthersZeroConnection): _ZeroContracts =>
  (connection as _InternalEthersZeroConnection)._contracts;

const getMulticall = (connection: EthersZeroConnection): _Multicall | undefined =>
  (connection as _InternalEthersZeroConnection)._multicall;

const numberify = (bigNumber: BigNumber) => bigNumber.toNumber();

const getTimestampFromBlock = ({ timestamp }: Block) => timestamp;

/** @internal */
export const _getBlockTimestamp = (
  connection: EthersZeroConnection,
  blockTag: BlockTag = "latest"
): Promise<number> =>
  // Get the timestamp via a contract call whenever possible, to make it batchable with other calls
  getMulticall(connection)?.getCurrentBlockTimestamp({ blockTag }).then(numberify) ??
  _getProvider(connection).getBlock(blockTag).then(getTimestampFromBlock);

const panic = <T>(e: unknown): T => {
  throw e;
};

/** @internal */
export const _requireSigner = (connection: EthersZeroConnection): EthersSigner =>
  connection.signer ?? panic(new Error("Must be connected through a Signer"));

/** @internal */
export const _getProvider = (connection: EthersZeroConnection): EthersProvider =>
  connection.provider;

// TODO parameterize error message?
/** @internal */
export const _requireAddress = (
  connection: EthersZeroConnection,
  overrides?: { from?: string }
): string =>
  overrides?.from ?? connection.userAddress ?? panic(new Error("A user address is required"));

/** @internal */
export const _requireFrontendAddress = (connection: EthersZeroConnection): string =>
  connection.frontendTag ?? panic(new Error("A frontend address is required"));

/** @internal */
export const _usingStore = (
  connection: EthersZeroConnection
): connection is EthersZeroConnection & { useStore: EthersZeroStoreOption } =>
  connection.useStore !== undefined;

/**
 * Thrown when trying to connect to a network where Zero is not deployed.
 *
 * @remarks
 * Thrown by {@link ReadableEthersZero.(connect:2)} and {@link EthersZero.(connect:2)}.
 *
 * @public
 */
export class UnsupportedNetworkError extends Error {
  /** Chain ID of the unsupported network. */
  readonly chainId: number;

  /** @internal */
  constructor(chainId: number) {
    super(`Unsupported network (chainId = ${chainId})`);
    this.name = "UnsupportedNetworkError";
    this.chainId = chainId;
  }
}

const getProviderAndSigner = (
  signerOrProvider: EthersSigner | EthersProvider
): [provider: EthersProvider, signer: EthersSigner | undefined] => {
  const provider: EthersProvider = Signer.isSigner(signerOrProvider)
    ? signerOrProvider.provider ?? panic(new Error("Signer must have a Provider"))
    : signerOrProvider;

  const signer = Signer.isSigner(signerOrProvider) ? signerOrProvider : undefined;

  return [provider, signer];
};

/** @internal */
export const _connectToDeployment = (
  deployment: _ZeroDeploymentJSON,
  signerOrProvider: EthersSigner | EthersProvider,
  optionalParams?: EthersZeroConnectionOptionalParams
): EthersZeroConnection =>
  connectionFrom(
    ...getProviderAndSigner(signerOrProvider),
    _connectToContracts(signerOrProvider, deployment),
    undefined,
    deployment,
    optionalParams
  );

/**
 * Possible values for the optional
 * {@link EthersZeroConnectionOptionalParams.useStore | useStore}
 * connection parameter.
 *
 * @remarks
 * Currently, the only supported value is `"blockPolled"`, in which case a
 * {@link BlockPolledZeroStore} will be created.
 *
 * @public
 */
export type EthersZeroStoreOption = "blockPolled";

const validStoreOptions = ["blockPolled"];

/**
 * Optional parameters of {@link ReadableEthersZero.(connect:2)} and
 * {@link EthersZero.(connect:2)}.
 *
 * @public
 */
export interface EthersZeroConnectionOptionalParams {
  /**
   * Address whose Trove, Stability Deposit, ZERO Stake and balances will be read by default.
   *
   * @remarks
   * For example {@link EthersZero.getTrove | getTrove(address?)} will return the Trove owned by
   * `userAddress` when the `address` parameter is omitted.
   *
   * Should be omitted when connecting through a {@link EthersSigner | Signer}. Instead `userAddress`
   * will be automatically determined from the `Signer`.
   */
  readonly userAddress?: string;

  /**
   * Address that will receive ZERO rewards from newly created Stability Deposits by default.
   *
   * @remarks
   * For example
   * {@link EthersZero.depositZUSDInStabilityPool | depositZUSDInStabilityPool(amount, frontendTag?)}
   * will tag newly made Stability Deposits with this address when its `frontendTag` parameter is
   * omitted.
   */
  readonly frontendTag?: string;

  /**
   * Create a {@link @sovryn-zero/lib-base#ZeroStore} and expose it as the `store` property.
   *
   * @remarks
   * When set to one of the available {@link EthersZeroStoreOption | options},
   * {@link ReadableEthersZero.(connect:2) | ReadableEthersZero.connect()} will return a
   * {@link ReadableEthersZeroWithStore}, while
   * {@link EthersZero.(connect:2) | EthersZero.connect()} will return an
   * {@link EthersZeroWithStore}.
   *
   * Note that the store won't start monitoring the blockchain until its
   * {@link @sovryn-zero/lib-base#ZeroStore.start | start()} function is called.
   */
  readonly useStore?: EthersZeroStoreOption;
}

/** @internal */
export function _connectByChainId<T>(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams: EthersZeroConnectionOptionalParams & { useStore: T }
): EthersZeroConnection & { useStore: T };

/** @internal */
export function _connectByChainId(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams?: EthersZeroConnectionOptionalParams
): EthersZeroConnection;

/** @internal */
export function _connectByChainId(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams?: EthersZeroConnectionOptionalParams
): EthersZeroConnection {
  const deployment: _ZeroDeploymentJSON =
    (deployments[chainId] as _ZeroDeploymentJSON) ?? panic(new UnsupportedNetworkError(chainId));

  return connectionFrom(
    provider,
    signer,
    _connectToContracts(signer ?? provider, deployment),
    _connectToMulticall(signer ?? provider, chainId),
    deployment,
    optionalParams
  );
}

/** @internal */
export const _connect = async (
  signerOrProvider: EthersSigner | EthersProvider,
  optionalParams?: EthersZeroConnectionOptionalParams
): Promise<EthersZeroConnection> => {
  const [provider, signer] = getProviderAndSigner(signerOrProvider);

  if (signer) {
    if (optionalParams?.userAddress !== undefined) {
      throw new Error("Can't override userAddress when connecting through Signer");
    }

    optionalParams = {
      ...optionalParams,
      userAddress: await signer.getAddress()
    };
  }

  return _connectByChainId(provider, signer, (await provider.getNetwork()).chainId, optionalParams);
};
