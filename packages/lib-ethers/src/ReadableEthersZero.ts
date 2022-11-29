import { BigNumber } from "@ethersproject/bignumber";

import {
  Decimal,
  Fees,
  FrontendStatus,
  ZeroStore,
  ZEROStake,
  ReadableZero,
  StabilityDeposit,
  LoC,
  LoCListingParams,
  LoCWithPendingRedistribution,
  UserLoC,
  UserLoCStatus,
  _CachedReadableZero,
  _ZeroReadCache
} from "@sovryn-zero/lib-base";

import { MultiLoCGetter } from "../types";

import { EthersCallOverrides, EthersProvider, EthersSigner } from "./types";

import {
  EthersZeroConnection,
  EthersZeroConnectionOptionalParams,
  EthersZeroStoreOption,
  _connect,
  _getBlockTimestamp,
  _getContracts,
  _requireAddress,
  _requireFrontendAddress
} from "./EthersZeroConnection";

import { BlockPolledZeroStore } from "./BlockPolledZeroStore";

// TODO: these are constant in the contracts, so it doesn't make sense to make a call for them,
// but to avoid having to update them here when we change them in the contracts, we could read
// them once after deployment and save them to ZeroDeployment.
const MINUTE_DECAY_FACTOR = Decimal.from("0.999037758833783000");
const BETA = Decimal.from(2);

enum BackendLoCStatus {
  nonExistent,
  active,
  closedByOwner,
  closedByLiquidation,
  closedByRedemption
}

const panic = <T>(error: Error): T => {
  throw error;
};

const userLoCStatusFrom = (backendStatus: BackendLoCStatus): UserLoCStatus =>
  backendStatus === BackendLoCStatus.nonExistent
    ? "nonExistent"
    : backendStatus === BackendLoCStatus.active
    ? "open"
    : backendStatus === BackendLoCStatus.closedByOwner
    ? "closedByOwner"
    : backendStatus === BackendLoCStatus.closedByLiquidation
    ? "closedByLiquidation"
    : backendStatus === BackendLoCStatus.closedByRedemption
    ? "closedByRedemption"
    : panic(new Error(`invalid backendStatus ${backendStatus}`));

const decimalify = (bigNumber: BigNumber) => Decimal.fromBigNumberString(bigNumber.toHexString());
const convertToDate = (timestamp: number) => new Date(timestamp * 1000);

const validSortingOptions = ["ascendingCollateralRatio", "descendingCollateralRatio"];

const expectPositiveInt = <K extends string>(obj: { [P in K]?: number }, key: K) => {
  if (obj[key] !== undefined) {
    if (!Number.isInteger(obj[key])) {
      throw new Error(`${key} must be an integer`);
    }

    if (obj[key] < 0) {
      throw new Error(`${key} must not be negative`);
    }
  }
};

/**
 * Ethers-based implementation of {@link @sovryn-zero/lib-base#ReadableZero}.
 *
 * @public
 */
export class ReadableEthersZero implements ReadableZero {
  readonly connection: EthersZeroConnection;

  /** @internal */
  constructor(connection: EthersZeroConnection) {
    this.connection = connection;
  }

  /** @internal */
  static _from(
    connection: EthersZeroConnection & { useStore: "blockPolled" }
  ): ReadableEthersZeroWithStore<BlockPolledZeroStore>;

  /** @internal */
  static _from(connection: EthersZeroConnection): ReadableEthersZero;

  /** @internal */
  static _from(connection: EthersZeroConnection): ReadableEthersZero {
    const readable = new ReadableEthersZero(connection);

    return connection.useStore === "blockPolled"
      ? new _BlockPolledReadableEthersZero(readable)
      : readable;
  }

  /** @internal */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams: EthersZeroConnectionOptionalParams & { useStore: "blockPolled" }
  ): Promise<ReadableEthersZeroWithStore<BlockPolledZeroStore>>;

  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersZeroConnectionOptionalParams
  ): Promise<ReadableEthersZero>;

  /**
   * Connect to the Zero protocol and create a `ReadableEthersZero` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static async connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersZeroConnectionOptionalParams
  ): Promise<ReadableEthersZero> {
    return ReadableEthersZero._from(await _connect(signerOrProvider, optionalParams));
  }

  /**
   * Check whether this `ReadableEthersZero` is a {@link ReadableEthersZeroWithStore}.
   */
  hasStore(): this is ReadableEthersZeroWithStore;

  /**
   * Check whether this `ReadableEthersZero` is a
   * {@link ReadableEthersZeroWithStore}\<{@link BlockPolledZeroStore}\>.
   */
  hasStore(store: "blockPolled"): this is ReadableEthersZeroWithStore<BlockPolledZeroStore>;

  hasStore(): boolean {
    return false;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getTotalRedistributed} */
  async getTotalRedistributed(overrides?: EthersCallOverrides): Promise<LoC> {
    const { locManager } = _getContracts(this.connection);

    const [collateral, debt] = await Promise.all([
      locManager.L_BTC({ ...overrides }).then(decimalify),
      locManager.L_ZUSDDebt({ ...overrides }).then(decimalify)
    ]);

    return new LoC(collateral, debt);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getLoCBeforeRedistribution} */
  async getLoCBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<LoCWithPendingRedistribution> {
    address ??= _requireAddress(this.connection);
    const { locManager } = _getContracts(this.connection);

    const [loc, snapshot] = await Promise.all([
      locManager.LoCs(address, { ...overrides }),
      locManager.rewardSnapshots(address, { ...overrides })
    ]);

    if (loc.status === BackendLoCStatus.active) {
      return new LoCWithPendingRedistribution(
        address,
        userLoCStatusFrom(loc.status),
        decimalify(loc.coll),
        decimalify(loc.debt),
        decimalify(loc.stake),
        new LoC(decimalify(snapshot.BTC), decimalify(snapshot.ZUSDDebt))
      );
    } else {
      return new LoCWithPendingRedistribution(address, userLoCStatusFrom(loc.status));
    }
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getLoC} */
  async getLoC(address?: string, overrides?: EthersCallOverrides): Promise<UserLoC> {
    const [loc, totalRedistributed] = await Promise.all([
      this.getLoCBeforeRedistribution(address, overrides),
      this.getTotalRedistributed(overrides)
    ]);

    return loc.applyRedistribution(totalRedistributed);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getNumberOfLoCs} */
  async getNumberOfLoCs(overrides?: EthersCallOverrides): Promise<number> {
    const { locManager } = _getContracts(this.connection);

    return (await locManager.getLoCOwnersCount({ ...overrides })).toNumber();
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getPrice} */
  getPrice(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { priceFeed } = _getContracts(this.connection);

    return priceFeed.callStatic.fetchPrice({ ...overrides }).then(decimalify);
  }

  /** @internal */
  async _getActivePool(overrides?: EthersCallOverrides): Promise<LoC> {
    const { activePool } = _getContracts(this.connection);

    const [activeCollateral, activeDebt] = await Promise.all(
      [
        activePool.getBTC({ ...overrides }),
        activePool.getZUSDDebt({ ...overrides })
      ].map(getBigNumber => getBigNumber.then(decimalify))
    );

    return new LoC(activeCollateral, activeDebt);
  }

  /** @internal */
  async _getDefaultPool(overrides?: EthersCallOverrides): Promise<LoC> {
    const { defaultPool } = _getContracts(this.connection);

    const [liquidatedCollateral, closedDebt] = await Promise.all(
      [
        defaultPool.getBTC({ ...overrides }),
        defaultPool.getZUSDDebt({ ...overrides })
      ].map(getBigNumber => getBigNumber.then(decimalify))
    );

    return new LoC(liquidatedCollateral, closedDebt);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getTotal} */
  async getTotal(overrides?: EthersCallOverrides): Promise<LoC> {
    const [activePool, defaultPool] = await Promise.all([
      this._getActivePool(overrides),
      this._getDefaultPool(overrides)
    ]);

    return activePool.add(defaultPool);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getStabilityDeposit} */
  async getStabilityDeposit(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<StabilityDeposit> {
    address ??= _requireAddress(this.connection);
    const { stabilityPool } = _getContracts(this.connection);

    const [
      { frontEndTag, initialValue },
      currentZUSD,
      collateralGain,
      zeroReward
    ] = await Promise.all([
      stabilityPool.deposits(address, { ...overrides }),
      stabilityPool.getCompoundedZUSDDeposit(address, { ...overrides }),
      stabilityPool.getDepositorBTCGain(address, { ...overrides }),
      stabilityPool.getDepositorZEROGain(address, { ...overrides })
    ]);

    return new StabilityDeposit(
      decimalify(initialValue),
      decimalify(currentZUSD),
      decimalify(collateralGain),
      decimalify(zeroReward),
      frontEndTag
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getRemainingStabilityPoolZEROReward} */
  async getRemainingStabilityPoolZEROReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { communityIssuance } = _getContracts(this.connection);

    const issuanceCap = decimalify(await communityIssuance.ZEROSupplyCap());
    const totalZEROIssued = decimalify(await communityIssuance.totalZEROIssued({ ...overrides }));

    const remaining = issuanceCap.gt(totalZEROIssued)
      ? issuanceCap.sub(totalZEROIssued)
      : Decimal.from(0);

    return remaining;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZUSDInStabilityPool} */
  getZUSDInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { stabilityPool } = _getContracts(this.connection);

    return stabilityPool.getTotalZUSDDeposits({ ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZUSDBalance} */
  getZUSDBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { zusdToken } = _getContracts(this.connection);

    return zusdToken.balanceOf(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZEROBalance} */
  getZEROBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { zeroToken } = _getContracts(this.connection);

    return zeroToken.balanceOf(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getCollateralSurplusBalance} */
  getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { collSurplusPool } = _getContracts(this.connection);

    return collSurplusPool.getCollateral(address, { ...overrides }).then(decimalify);
  }

  /** @internal */
  getLoCs(
    params: LoCListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<LoCWithPendingRedistribution[]>;

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.(getLoCs:2)} */
  getLoCs(params: LoCListingParams, overrides?: EthersCallOverrides): Promise<UserLoC[]>;

  async getLoCs(
    params: LoCListingParams,
    overrides?: EthersCallOverrides
  ): Promise<UserLoC[]> {
    const { multiLoCGetter } = _getContracts(this.connection);

    expectPositiveInt(params, "first");
    expectPositiveInt(params, "startingAt");

    if (!validSortingOptions.includes(params.sortedBy)) {
      throw new Error(
        `sortedBy must be one of: ${validSortingOptions.map(x => `"${x}"`).join(", ")}`
      );
    }

    const [totalRedistributed, backendLoCs] = await Promise.all([
      params.beforeRedistribution ? undefined : this.getTotalRedistributed({ ...overrides }),
      multiLoCGetter.getMultipleSortedLoCs(
        params.sortedBy === "descendingCollateralRatio"
          ? params.startingAt ?? 0
          : -((params.startingAt ?? 0) + 1),
        params.first,
        { ...overrides }
      )
    ]);

    const locs = mapBackendLoCs(backendLoCs);

    if (totalRedistributed) {
      return locs.map(loc => loc.applyRedistribution(totalRedistributed));
    } else {
      return locs;
    }
  }

  /** @internal */
  async _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    const { locManager } = _getContracts(this.connection);

    const [lastFeeOperationTime, baseRateWithoutDecay] = await Promise.all([
      locManager.lastFeeOperationTime({ ...overrides }),
      locManager.baseRate({ ...overrides }).then(decimalify)
    ]);

    return (blockTimestamp, recoveryMode) =>
      new Fees(
        baseRateWithoutDecay,
        MINUTE_DECAY_FACTOR,
        BETA,
        convertToDate(lastFeeOperationTime.toNumber()),
        convertToDate(blockTimestamp),
        recoveryMode
      );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getFees} */
  async getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    const [createFees, total, price, blockTimestamp] = await Promise.all([
      this._getFeesFactory(overrides),
      this.getTotal(overrides),
      this.getPrice(overrides),
      _getBlockTimestamp(this.connection, overrides?.blockTag)
    ]);

    return createFees(blockTimestamp, total.collateralRatioIsBelowCritical(price));
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZEROStake} */
  async getZEROStake(address?: string, overrides?: EthersCallOverrides): Promise<ZEROStake> {
    address ??= _requireAddress(this.connection);
    const { zeroStaking } = _getContracts(this.connection);

    const [stakedZERO, collateralGain, zusdGain] = await Promise.all(
      [
        zeroStaking.stakes(address, { ...overrides }),
        zeroStaking.getPendingBTCGain(address, { ...overrides }),
        zeroStaking.getPendingZUSDGain(address, { ...overrides })
      ].map(getBigNumber => getBigNumber.then(decimalify))
    );

    return new ZEROStake(stakedZERO, collateralGain, zusdGain);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getTotalStakedZERO} */
  async getTotalStakedZERO(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { zeroStaking } = _getContracts(this.connection);

    return zeroStaking.totalZEROStaked({ ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getFrontendStatus} */
  async getFrontendStatus(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<FrontendStatus> {
    address ??= _requireFrontendAddress(this.connection);
    const { stabilityPool } = _getContracts(this.connection);

    const { registered, kickbackRate } = await stabilityPool.frontEnds(address, { ...overrides });

    return registered
      ? { status: "registered", kickbackRate: decimalify(kickbackRate) }
      : { status: "unregistered" };
  }
}

type Resolved<T> = T extends Promise<infer U> ? U : T;
type BackendLoCs = Resolved<ReturnType<MultiLoCGetter["getMultipleSortedLoCs"]>>;

const mapBackendLoCs = (locs: BackendLoCs): LoCWithPendingRedistribution[] =>
  locs.map(
    loc =>
      new LoCWithPendingRedistribution(
        loc.owner,
        "open", // These LoCs are coming from the SortedLoCs list, so they must be open
        decimalify(loc.coll),
        decimalify(loc.debt),
        decimalify(loc.stake),
        new LoC(decimalify(loc.snapshotBTC), decimalify(loc.snapshotZUSDDebt))
      )
  );

/**
 * Variant of {@link ReadableEthersZero} that exposes a {@link @sovryn-zero/lib-base#ZeroStore}.
 *
 * @public
 */
export interface ReadableEthersZeroWithStore<T extends ZeroStore = ZeroStore>
  extends ReadableEthersZero {
  /** An object that implements ZeroStore. */
  readonly store: T;
}

class BlockPolledZeroStoreBasedCache
  implements _ZeroReadCache<[overrides?: EthersCallOverrides]> {
  private _store: BlockPolledZeroStore;

  constructor(store: BlockPolledZeroStore) {
    this._store = store;
  }

  private _blockHit(overrides?: EthersCallOverrides): boolean {
    return (
      !overrides ||
      overrides.blockTag === undefined ||
      overrides.blockTag === this._store.state.blockTag
    );
  }

  private _userHit(address?: string, overrides?: EthersCallOverrides): boolean {
    return (
      this._blockHit(overrides) &&
      (address === undefined || address === this._store.connection.userAddress)
    );
  }

  private _frontendHit(address?: string, overrides?: EthersCallOverrides): boolean {
    return (
      this._blockHit(overrides) &&
      (address === undefined || address === this._store.connection.frontendTag)
    );
  }

  getTotalRedistributed(overrides?: EthersCallOverrides): LoC | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.totalRedistributed;
    }
  }

  getLoCBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): LoCWithPendingRedistribution | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.locBeforeRedistribution;
    }
  }

  getLoC(address?: string, overrides?: EthersCallOverrides): UserLoC | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.loc;
    }
  }

  getNumberOfLoCs(overrides?: EthersCallOverrides): number | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.numberOfLoCs;
    }
  }

  getPrice(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.price;
    }
  }

  getTotal(overrides?: EthersCallOverrides): LoC | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.total;
    }
  }

  getStabilityDeposit(
    address?: string,
    overrides?: EthersCallOverrides
  ): StabilityDeposit | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.stabilityDeposit;
    }
  }

  getRemainingStabilityPoolZEROReward(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.remainingStabilityPoolZEROReward;
    }
  }

  getZUSDInStabilityPool(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.zusdInStabilityPool;
    }
  }

  getZUSDBalance(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.zusdBalance;
    }
  }

  getZEROBalance(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.zeroBalance;
    }
  }

  getCollateralSurplusBalance(
    address?: string,
    overrides?: EthersCallOverrides
  ): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.collateralSurplusBalance;
    }
  }

  getFees(overrides?: EthersCallOverrides): Fees | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.fees;
    }
  }

  getZEROStake(address?: string, overrides?: EthersCallOverrides): ZEROStake | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.zeroStake;
    }
  }

  getTotalStakedZERO(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.totalStakedZERO;
    }
  }

  getFrontendStatus(
    address?: string,
    overrides?: EthersCallOverrides
  ): { status: "unregistered" } | { status: "registered"; kickbackRate: Decimal } | undefined {
    if (this._frontendHit(address, overrides)) {
      return this._store.state.frontend;
    }
  }

  getLoCs() {
    return undefined;
  }
}

class _BlockPolledReadableEthersZero
  extends _CachedReadableZero<[overrides?: EthersCallOverrides]>
  implements ReadableEthersZeroWithStore<BlockPolledZeroStore> {
  readonly connection: EthersZeroConnection;
  readonly store: BlockPolledZeroStore;

  constructor(readable: ReadableEthersZero) {
    const store = new BlockPolledZeroStore(readable);

    super(readable, new BlockPolledZeroStoreBasedCache(store));

    this.store = store;
    this.connection = readable.connection;
  }

  hasStore(store?: EthersZeroStoreOption): boolean {
    return store === undefined || store === "blockPolled";
  }

  _getActivePool(): Promise<LoC> {
    throw new Error("Method not implemented.");
  }

  _getDefaultPool(): Promise<LoC> {
    throw new Error("Method not implemented.");
  }

  _getFeesFactory(): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    throw new Error("Method not implemented.");
  }

  _getRemainingLiquidityMiningZERORewardCalculator(): Promise<(blockTimestamp: number) => Decimal> {
    throw new Error("Method not implemented.");
  }
}
