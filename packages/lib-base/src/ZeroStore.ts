import assert from "assert";

import { Decimal } from "./Decimal";
import { StabilityDeposit } from "./StabilityDeposit";
import { LoC, LoCWithPendingRedistribution, UserLoC } from "./LoC";
import { Fees } from "./Fees";
import { ZEROStake } from "./ZEROStake";
import { FrontendStatus } from "./ReadableZero";

/**
 * State variables read from the blockchain.
 *
 * @public
 */
export interface ZeroStoreBaseState {
  /** Status of currently used frontend. */
  frontend: FrontendStatus;

  /** Status of user's own frontend. */
  ownFrontend: FrontendStatus;

  /** Number of LoCs that are currently open. */
  numberOfLoCs: number;

  /** User's native currency balance (e.g. Bitcoin). */
  accountBalance: Decimal;

  /** User's ZUSD token balance. */
  zusdBalance: Decimal;

  /** User's NUE token balance. */
  nueBalance: Decimal;

  /** User's ZERO token balance. */
  zeroBalance: Decimal;

  /**
   * Amount of leftover collateral available for withdrawal to the user.
   *
   * @remarks
   * See {@link ReadableZero.getCollateralSurplusBalance | getCollateralSurplusBalance()} for
   * more information.
   */
  collateralSurplusBalance: Decimal;

  /** Current price of the native currency (e.g. Bitcoin) in USD. */
  price: Decimal;

  /** Total amount of ZUSD currently deposited in the Stability Pool. */
  zusdInStabilityPool: Decimal;

  /** Total collateral and debt in the Zero system. */
  total: LoC;

  /**
   * Total collateral and debt per stake that has been liquidated through redistribution.
   *
   * @remarks
   * Needed when dealing with instances of {@link LoCWithPendingRedistribution}.
   */
  totalRedistributed: LoC;

  /**
   * User's LoC in its state after the last direct modification.
   *
   * @remarks
   * The current state of the user's LoC can be found as
   * {@link ZeroStoreDerivedState.loc | loc}.
   */
  locBeforeRedistribution: LoCWithPendingRedistribution;

  /** User's stability deposit. */
  stabilityDeposit: StabilityDeposit;

  /** Remaining ZERO that will be collectively rewarded to stability depositors. */
  remainingStabilityPoolZEROReward: Decimal;

  /** @internal */
  _feesInNormalMode: Fees;

  /** User's ZERO stake. */
  zeroStake: ZEROStake;

  /** Total amount of ZERO currently staked. */
  totalStakedZERO: Decimal;

  /** @internal */
  _riskiestLoCBeforeRedistribution: LoCWithPendingRedistribution;
}

/**
 * State variables derived from {@link ZeroStoreBaseState}.
 *
 * @public
 */
export interface ZeroStoreDerivedState {
  /** Current state of user's LoC */
  loc: UserLoC;

  /** Calculator for current fees. */
  fees: Fees;

  /**
   * Current borrowing rate.
   *
   * @remarks
   * A value between 0 and 1.
   *
   * @example
   * For example a value of 0.01 amounts to a origination fee of 1% of the borrowed amount.
   */
  originationRate: Decimal;

  /**
   * Current redemption rate.
   *
   * @remarks
   * Note that the actual rate paid by a redemption transaction will depend on the amount of ZUSD
   * being redeemed.
   *
   * Use {@link Fees.redemptionRate} to calculate a precise redemption rate.
   */
  redemptionRate: Decimal;

  /**
   * Whether there are any LoCs with collateral ratio below the
   * {@link MINIMUM_COLLATERAL_RATIO | minimum}.
   */
  haveUndercollateralizedLoCs: boolean;
}

/**
 * Type of {@link ZeroStore}'s {@link ZeroStore.state | state}.
 *
 * @remarks
 * It combines all properties of {@link ZeroStoreBaseState} and {@link ZeroStoreDerivedState}
 * with optional extra state added by the particular `ZeroStore` implementation.
 *
 * The type parameter `T` may be used to type the extra state.
 *
 * @public
 */
export type ZeroStoreState<T = unknown> = ZeroStoreBaseState & ZeroStoreDerivedState & T;

/**
 * Parameters passed to {@link ZeroStore} listeners.
 *
 * @remarks
 * Use the {@link ZeroStore.subscribe | subscribe()} function to register a listener.

 * @public
 */
export interface ZeroStoreListenerParams<T = unknown> {
  /** The entire previous state. */
  newState: ZeroStoreState<T>;

  /** The entire new state. */
  oldState: ZeroStoreState<T>;

  /** Only the state variables that have changed. */
  stateChange: Partial<ZeroStoreState<T>>;
}

const strictEquals = <T>(a: T, b: T) => a === b;
const eq = <T extends { eq(that: T): boolean }>(a: T, b: T) => a.eq(b);
const equals = <T extends { equals(that: T): boolean }>(a: T, b: T) => a.equals(b);

const frontendStatusEquals = (a: FrontendStatus, b: FrontendStatus) =>
  a.status === "unregistered"
    ? b.status === "unregistered"
    : b.status === "registered" && a.kickbackRate.eq(b.kickbackRate);

const showFrontendStatus = (x: FrontendStatus) =>
  x.status === "unregistered"
    ? '{ status: "unregistered" }'
    : `{ status: "registered", kickbackRate: ${x.kickbackRate} }`;

const wrap = <A extends unknown[], R>(f: (...args: A) => R) => (...args: A) => f(...args);

const difference = <T>(a: T, b: T) =>
  Object.fromEntries(
    Object.entries(a).filter(([key, value]) => value !== (b as Record<string, unknown>)[key])
  ) as Partial<T>;

/**
 * Abstract base class of Zero data store implementations.
 *
 * @remarks
 * The type parameter `T` may be used to type extra state added to {@link ZeroStoreState} by the
 * subclass.
 *
 * Implemented by {@link @sovryn-zero/lib-ethers#BlockPolledZeroStore}.
 *
 * @public
 */
export abstract class ZeroStore<T = unknown> {
  /** Turn console logging on/off. */
  logging = false;

  /**
   * Called after the state is fetched for the first time.
   *
   * @remarks
   * See {@link ZeroStore.start | start()}.
   */
  onLoaded?: () => void;

  /** @internal */
  protected _loaded = false;

  private _baseState?: ZeroStoreBaseState;
  private _derivedState?: ZeroStoreDerivedState;
  private _extraState?: T;

  private _updateTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private _listeners = new Set<(params: ZeroStoreListenerParams<T>) => void>();

  /**
   * The current store state.
   *
   * @remarks
   * Should not be accessed before the store is loaded. Assign a function to
   * {@link ZeroStore.onLoaded | onLoaded} to get a callback when this happens.
   *
   * See {@link ZeroStoreState} for the list of properties returned.
   */
  get state(): ZeroStoreState<T> {
    return Object.assign({}, this._baseState, this._derivedState, this._extraState);
  }

  /** @internal */
  protected abstract _doStart(): () => void;

  /**
   * Start monitoring the blockchain for Zero state changes.
   *
   * @remarks
   * The {@link ZeroStore.onLoaded | onLoaded} callback will be called after the state is fetched
   * for the first time.
   *
   * Use the {@link ZeroStore.subscribe | subscribe()} function to register listeners.
   *
   * @returns Function to stop the monitoring.
   */
  start(): () => void {
    const doStop = this._doStart();

    return () => {
      doStop();

      this._cancelUpdateIfScheduled();
    };
  }

  private _cancelUpdateIfScheduled() {
    if (this._updateTimeoutId !== undefined) {
      clearTimeout(this._updateTimeoutId);
    }
  }

  private _scheduleUpdate() {
    this._cancelUpdateIfScheduled();

    this._updateTimeoutId = setTimeout(() => {
      this._updateTimeoutId = undefined;
      this._update();
    }, 30000);
  }

  private _logUpdate<U>(name: string, next: U, show?: (next: U) => string): U {
    if (this.logging) {
      console.log(`${name} updated to ${show ? show(next) : next}`);
    }

    return next;
  }

  private _updateIfChanged<U>(
    equals: (a: U, b: U) => boolean,
    name: string,
    prev: U,
    next?: U,
    show?: (next: U) => string
  ): U {
    return next !== undefined && !equals(prev, next) ? this._logUpdate(name, next, show) : prev;
  }

  private _silentlyUpdateIfChanged<U>(equals: (a: U, b: U) => boolean, prev: U, next?: U): U {
    return next !== undefined && !equals(prev, next) ? next : prev;
  }

  private _updateFees(name: string, prev: Fees, next?: Fees): Fees {
    if (next && !next.equals(prev)) {
      // Filter out fee update spam that happens on every new block by only logging when string
      // representation changes.
      if (`${next}` !== `${prev}`) {
        this._logUpdate(name, next);
      }
      return next;
    } else {
      return prev;
    }
  }

  private _reduce(
    baseState: ZeroStoreBaseState,
    baseStateUpdate: Partial<ZeroStoreBaseState>
  ): ZeroStoreBaseState {
    return {
      frontend: this._updateIfChanged(
        frontendStatusEquals,
        "frontend",
        baseState.frontend,
        baseStateUpdate.frontend,
        showFrontendStatus
      ),

      ownFrontend: this._updateIfChanged(
        frontendStatusEquals,
        "ownFrontend",
        baseState.ownFrontend,
        baseStateUpdate.ownFrontend,
        showFrontendStatus
      ),

      numberOfLoCs: this._updateIfChanged(
        strictEquals,
        "numberOfLoCs",
        baseState.numberOfLoCs,
        baseStateUpdate.numberOfLoCs
      ),

      accountBalance: this._updateIfChanged(
        eq,
        "accountBalance",
        baseState.accountBalance,
        baseStateUpdate.accountBalance
      ),

      zusdBalance: this._updateIfChanged(
        eq,
        "zusdBalance",
        baseState.zusdBalance,
        baseStateUpdate.zusdBalance
      ),

      nueBalance: this._updateIfChanged(
        eq,
        "nueBalance",
        baseState.nueBalance,
        baseStateUpdate.nueBalance
      ),

      zeroBalance: this._updateIfChanged(
        eq,
        "zeroBalance",
        baseState.zeroBalance,
        baseStateUpdate.zeroBalance
      ),

      collateralSurplusBalance: this._updateIfChanged(
        eq,
        "collateralSurplusBalance",
        baseState.collateralSurplusBalance,
        baseStateUpdate.collateralSurplusBalance
      ),

      price: this._updateIfChanged(eq, "price", baseState.price, baseStateUpdate.price),

      zusdInStabilityPool: this._updateIfChanged(
        eq,
        "zusdInStabilityPool",
        baseState.zusdInStabilityPool,
        baseStateUpdate.zusdInStabilityPool
      ),

      total: this._updateIfChanged(equals, "total", baseState.total, baseStateUpdate.total),

      totalRedistributed: this._updateIfChanged(
        equals,
        "totalRedistributed",
        baseState.totalRedistributed,
        baseStateUpdate.totalRedistributed
      ),

      locBeforeRedistribution: this._updateIfChanged(
        equals,
        "locBeforeRedistribution",
        baseState.locBeforeRedistribution,
        baseStateUpdate.locBeforeRedistribution
      ),

      stabilityDeposit: this._updateIfChanged(
        equals,
        "stabilityDeposit",
        baseState.stabilityDeposit,
        baseStateUpdate.stabilityDeposit
      ),

      remainingStabilityPoolZEROReward: this._silentlyUpdateIfChanged(
        eq,
        baseState.remainingStabilityPoolZEROReward,
        baseStateUpdate.remainingStabilityPoolZEROReward
      ),

      _feesInNormalMode: this._silentlyUpdateIfChanged(
        equals,
        baseState._feesInNormalMode,
        baseStateUpdate._feesInNormalMode
      ),

      zeroStake: this._updateIfChanged(
        equals,
        "zeroStake",
        baseState.zeroStake,
        baseStateUpdate.zeroStake
      ),

      totalStakedZERO: this._updateIfChanged(
        eq,
        "totalStakedZERO",
        baseState.totalStakedZERO,
        baseStateUpdate.totalStakedZERO
      ),

      _riskiestLoCBeforeRedistribution: this._silentlyUpdateIfChanged(
        equals,
        baseState._riskiestLoCBeforeRedistribution,
        baseStateUpdate._riskiestLoCBeforeRedistribution
      )
    };
  }

  private _derive({
    locBeforeRedistribution,
    totalRedistributed,
    _feesInNormalMode,
    total,
    price,
    _riskiestLoCBeforeRedistribution
  }: ZeroStoreBaseState): ZeroStoreDerivedState {
    const fees = _feesInNormalMode._setRecoveryMode(total.collateralRatioIsBelowCritical(price));

    return {
      loc: locBeforeRedistribution.applyRedistribution(totalRedistributed),
      fees,
      originationRate: fees.originationRate(),
      redemptionRate: fees.redemptionRate(),
      haveUndercollateralizedLoCs: _riskiestLoCBeforeRedistribution
        .applyRedistribution(totalRedistributed)
        .collateralRatioIsBelowMinimum(price)
    };
  }

  private _reduceDerived(
    derivedState: ZeroStoreDerivedState,
    derivedStateUpdate: ZeroStoreDerivedState
  ): ZeroStoreDerivedState {
    return {
      fees: this._updateFees("fees", derivedState.fees, derivedStateUpdate.fees),

      loc: this._updateIfChanged(equals, "loc", derivedState.loc, derivedStateUpdate.loc),

      originationRate: this._silentlyUpdateIfChanged(
        eq,
        derivedState.originationRate,
        derivedStateUpdate.originationRate
      ),

      redemptionRate: this._silentlyUpdateIfChanged(
        eq,
        derivedState.redemptionRate,
        derivedStateUpdate.redemptionRate
      ),

      haveUndercollateralizedLoCs: this._updateIfChanged(
        strictEquals,
        "haveUndercollateralizedLoCs",
        derivedState.haveUndercollateralizedLoCs,
        derivedStateUpdate.haveUndercollateralizedLoCs
      )
    };
  }

  /** @internal */
  protected abstract _reduceExtra(extraState: T, extraStateUpdate: Partial<T>): T;

  private _notify(params: ZeroStoreListenerParams<T>) {
    // Iterate on a copy of `_listeners`, to avoid notifying any new listeners subscribed by
    // existing listeners, as that could result in infinite loops.
    //
    // Before calling a listener from our copy of `_listeners`, check if it has been removed from
    // the original set. This way we avoid calling listeners that have already been unsubscribed
    // by an earlier listener callback.
    [...this._listeners].forEach(listener => {
      if (this._listeners.has(listener)) {
        listener(params);
      }
    });
  }

  /**
   * Register a state change listener.
   *
   * @param listener - Function that will be called whenever state changes.
   * @returns Function to unregister this listener.
   */
  subscribe(listener: (params: ZeroStoreListenerParams<T>) => void): () => void {
    const uniqueListener = wrap(listener);

    this._listeners.add(uniqueListener);

    return () => {
      this._listeners.delete(uniqueListener);
    };
  }

  /** @internal */
  protected _load(baseState: ZeroStoreBaseState, extraState?: T): void {
    assert(!this._loaded);

    this._baseState = baseState;
    this._derivedState = this._derive(baseState);
    this._extraState = extraState;
    this._loaded = true;

    this._scheduleUpdate();

    if (this.onLoaded) {
      this.onLoaded();
    }
  }

  /** @internal */
  protected _update(
    baseStateUpdate?: Partial<ZeroStoreBaseState>,
    extraStateUpdate?: Partial<T>
  ): void {
    assert(this._baseState && this._derivedState);

    const oldState = this.state;

    if (baseStateUpdate) {
      this._baseState = this._reduce(this._baseState, baseStateUpdate);
    }

    // Always running this lets us derive state based on passage of time, like baseRate decay
    this._derivedState = this._reduceDerived(this._derivedState, this._derive(this._baseState));

    if (extraStateUpdate) {
      assert(this._extraState);
      this._extraState = this._reduceExtra(this._extraState, extraStateUpdate);
    }

    this._scheduleUpdate();

    this._notify({
      newState: this.state,
      oldState,
      stateChange: difference(this.state, oldState)
    });
  }
}
