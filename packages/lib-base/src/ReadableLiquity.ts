import { Decimal } from "./Decimal";
import { Trove, TroveWithPendingRedistribution, UserTrove } from "./Trove";
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
 * Parameters of the {@link ReadableZero.(getTroves:2) | getTroves()} function.
 *
 * @public
 */
export interface TroveListingParams {
  /** Number of Troves to retrieve. */
  readonly first: number;

  /** How the Troves should be sorted. */
  readonly sortedBy: "ascendingCollateralRatio" | "descendingCollateralRatio";

  /** Index of the first Trove to retrieve from the sorted list. */
  readonly startingAt?: number;

  /**
   * When set to `true`, the retrieved Troves won't include the liquidation shares received since
   * the last time they were directly modified.
   *
   * @remarks
   * Changes the type of returned Troves to {@link TroveWithPendingRedistribution}.
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
   * Needed when dealing with instances of {@link @sovryn-zero/lib-base#TroveWithPendingRedistribution}.
   */
  getTotalRedistributed(): Promise<Trove>;

  /**
   * Get a Trove in its state after the last direct modification.
   *
   * @param address - Address that owns the Trove.
   *
   * @remarks
   * The current state of a Trove can be fetched using
   * {@link @sovryn-zero/lib-base#ReadableZero.getTrove | getTrove()}.
   */
  getTroveBeforeRedistribution(address?: string): Promise<TroveWithPendingRedistribution>;

  /**
   * Get the current state of a Trove.
   *
   * @param address - Address that owns the Trove.
   */
  getTrove(address?: string): Promise<UserTrove>;

  /**
   * Get number of Troves that are currently open.
   */
  getNumberOfTroves(): Promise<number>;

  /**
   * Get the current price of the native currency (e.g. Bitcoin) in USD.
   */
  getPrice(): Promise<Decimal>;

  /**
   * Get the total amount of collateral and debt in the Zero system.
   */
  getTotal(): Promise<Trove>;

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
   * When a Trove gets liquidated or redeemed, any collateral it has above 110% (in case of
   * liquidation) or 100% collateralization (in case of redemption) gets sent to a pool, where it
   * can be withdrawn from using
   * {@link @sovryn-zero/lib-base#TransactableZero.claimCollateralSurplus | claimCollateralSurplus()}.
   */
  getCollateralSurplusBalance(address?: string): Promise<Decimal>;

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true }
  ): Promise<TroveWithPendingRedistribution[]>;

  /**
   * Get a slice from the list of Troves.
   *
   * @param params - Controls how the list is sorted, and where the slice begins and ends.
   * @returns Pairs of owner addresses and their Troves.
   */
  getTroves(params: TroveListingParams): Promise<UserTrove[]>;

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
