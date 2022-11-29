import { Decimal } from "./Decimal";
import { LoC, LoCWithPendingRedistribution, UserLoC } from "./LoC";
import { StabilityDeposit } from "./StabilityDeposit";
import { Fees } from "./Fees";
import { ZEROStake } from "./ZEROStake";

/**
 * Represents whether an address has been registered as a Zero frontend.
 *
 * @remarks
 * Returned by the {@link ReadableZero.getFrontendStatus | getFrontendStatus()} function.
 *
 * When `status` is `"registered"`, `kickbackRate` gives the frontend's kickback rate as a
 * {@link Decimal} between 0 and 1.
 *
 * @public
 */
export type FrontendStatus =
  | { status: "unregistered" }
  | { status: "registered"; kickbackRate: Decimal };

/**
 * Parameters of the {@link ReadableZero.(getLoCs:2) | getLoCs()} function.
 *
 * @public
 */
export interface LoCListingParams {
  /** Number of LoCs to retrieve. */
  readonly first: number;

  /** How the LoCs should be sorted. */
  readonly sortedBy: "ascendingCollateralRatio" | "descendingCollateralRatio";

  /** Index of the first LoC to retrieve from the sorted list. */
  readonly startingAt?: number;

  /**
   * When set to `true`, the retrieved LoCs won't include the liquidation shares received since
   * the last time they were directly modified.
   *
   * @remarks
   * Changes the type of returned LoCs to {@link LoCWithPendingRedistribution}.
   */
  readonly beforeRedistribution?: boolean;
}

/**
 * Read the state of the Zero protocol.
 *
 * @remarks
 * Implemented by {@link @sovryn-zero/lib-ethers#EthersZero}.
 *
 * @public
 */
export interface ReadableZero {
  /**
   * Get the total collateral and debt per stake that has been liquidated through redistribution.
   *
   * @remarks
   * Needed when dealing with instances of {@link @sovryn-zero/lib-base#LoCWithPendingRedistribution}.
   */
  getTotalRedistributed(): Promise<LoC>;

  /**
   * Get a LoC in its state after the last direct modification.
   *
   * @param address - Address that owns the LoC.
   *
   * @remarks
   * The current state of a LoC can be fetched using
   * {@link @sovryn-zero/lib-base#ReadableZero.getLoC | getLoC()}.
   */
  getLoCBeforeRedistribution(address?: string): Promise<LoCWithPendingRedistribution>;

  /**
   * Get the current state of a LoC.
   *
   * @param address - Address that owns the LoC.
   */
  getLoC(address?: string): Promise<UserLoC>;

  /**
   * Get number of LoCs that are currently open.
   */
  getNumberOfLoCs(): Promise<number>;

  /**
   * Get the current price of the native currency (e.g. Bitcoin) in USD.
   */
  getPrice(): Promise<Decimal>;

  /**
   * Get the total amount of collateral and debt in the Zero system.
   */
  getTotal(): Promise<LoC>;

  /**
   * Get the current state of a Stability Deposit.
   *
   * @param address - Address that owns the Stability Deposit.
   */
  getStabilityDeposit(address?: string): Promise<StabilityDeposit>;

  /**
   * Get the remaining ZERO that will be collectively rewarded to stability depositors.
   */
  getRemainingStabilityPoolZEROReward(): Promise<Decimal>;

  /**
   * Get the total amount of ZUSD currently deposited in the Stability Pool.
   */
  getZUSDInStabilityPool(): Promise<Decimal>;

  /**
   * Get the amount of ZUSD held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getZUSDBalance(address?: string): Promise<Decimal>;

  /**
   * Get the amount of ZERO held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getZEROBalance(address?: string): Promise<Decimal>;

  /**
   * Get the amount of leftover collateral available for withdrawal by an address.
   *
   * @remarks
   * When a LoC gets liquidated or redeemed, any collateral it has above 110% (in case of
   * liquidation) or 100% collateralization (in case of redemption) gets sent to a pool, where it
   * can be withdrawn from using
   * {@link @sovryn-zero/lib-base#TransactableZero.claimCollateralSurplus | claimCollateralSurplus()}.
   */
  getCollateralSurplusBalance(address?: string): Promise<Decimal>;

  /** @internal */
  getLoCs(
    params: LoCListingParams & { beforeRedistribution: true }
  ): Promise<LoCWithPendingRedistribution[]>;

  /**
   * Get a slice from the list of LoCs.
   *
   * @param params - Controls how the list is sorted, and where the slice begins and ends.
   * @returns Pairs of owner addresses and their LoCs.
   */
  getLoCs(params: LoCListingParams): Promise<UserLoC[]>;

  /**
   * Get a calculator for current fees.
   */
  getFees(): Promise<Fees>;

  /**
   * Get the current state of an ZERO Stake.
   *
   * @param address - Address that owns the ZERO Stake.
   */
  getZEROStake(address?: string): Promise<ZEROStake>;

  /**
   * Get the total amount of ZERO currently staked.
   */
  getTotalStakedZERO(): Promise<Decimal>;

  /**
   * Check whether an address is registered as a Zero frontend, and what its kickback rate is.
   *
   * @param address - Address to check.
   */
  getFrontendStatus(address?: string): Promise<FrontendStatus>;
}
