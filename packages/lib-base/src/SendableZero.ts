import { Decimalish } from "./Decimal";
import { LoCAdjustmentParams, LoCCreationParams } from "./LoC";

import {
  CollateralGainTransferDetails,
  LiquidationDetails,
  RedemptionDetails,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TransactableZero,
  LoCAdjustmentDetails,
  LoCClosureDetails,
  LoCCreationDetails
} from "./TransactableZero";

/**
 * A transaction that has already been sent.
 *
 * @remarks
 * Implemented by {@link @sovryn-zero/lib-ethers#SentEthersZeroTransaction}.
 *
 * @public
 */
export interface SentZeroTransaction<S = unknown, T extends ZeroReceipt = ZeroReceipt> {
  /** Implementation-specific sent transaction object. */
  readonly rawSentTransaction: S;

  /**
   * Check whether the transaction has been mined, and whether it was successful.
   *
   * @remarks
   * Unlike {@link @sovryn-zero/lib-base#SentZeroTransaction.waitForReceipt | waitForReceipt()},
   * this function doesn't wait for the transaction to be mined.
   */
  getReceipt(): Promise<T>;

  /**
   * Wait for the transaction to be mined, and check whether it was successful.
   *
   * @returns Either a {@link @sovryn-zero/lib-base#FailedReceipt} or a
   *          {@link @sovryn-zero/lib-base#SuccessfulReceipt}.
   */
  waitForReceipt(): Promise<Extract<T, MinedReceipt>>;
}

/**
 * Indicates that the transaction hasn't been mined yet.
 *
 * @remarks
 * Returned by {@link SentZeroTransaction.getReceipt}.
 *
 * @public
 */
export type PendingReceipt = { status: "pending" };

/** @internal */
export const _pendingReceipt: PendingReceipt = { status: "pending" };

/**
 * Indicates that the transaction has been mined, but it failed.
 *
 * @remarks
 * The `rawReceipt` property is an implementation-specific transaction receipt object.
 *
 * Returned by {@link SentZeroTransaction.getReceipt} and
 * {@link SentZeroTransaction.waitForReceipt}.
 *
 * @public
 */
export type FailedReceipt<R = unknown> = { status: "failed"; rawReceipt: R };

/** @internal */
export const _failedReceipt = <R>(rawReceipt: R): FailedReceipt<R> => ({
  status: "failed",
  rawReceipt
});

/**
 * Indicates that the transaction has succeeded.
 *
 * @remarks
 * The `rawReceipt` property is an implementation-specific transaction receipt object.
 *
 * The `details` property may contain more information about the transaction.
 * See the return types of {@link TransactableZero} functions for the exact contents of `details`
 * for each type of Zero transaction.
 *
 * Returned by {@link SentZeroTransaction.getReceipt} and
 * {@link SentZeroTransaction.waitForReceipt}.
 *
 * @public
 */
export type SuccessfulReceipt<R = unknown, D = unknown> = {
  status: "succeeded";
  rawReceipt: R;
  details: D;
};

/** @internal */
export const _successfulReceipt = <R, D>(
  rawReceipt: R,
  details: D,
  toString?: () => string
): SuccessfulReceipt<R, D> => ({
  status: "succeeded",
  rawReceipt,
  details,
  ...(toString ? { toString } : {})
});

/**
 * Either a {@link FailedReceipt} or a {@link SuccessfulReceipt}.
 *
 * @public
 */
export type MinedReceipt<R = unknown, D = unknown> = FailedReceipt<R> | SuccessfulReceipt<R, D>;

/**
 * One of either a {@link PendingReceipt}, a {@link FailedReceipt} or a {@link SuccessfulReceipt}.
 *
 * @public
 */
export type ZeroReceipt<R = unknown, D = unknown> = PendingReceipt | MinedReceipt<R, D>;

/** @internal */
export type _SendableFrom<T, R, S> = {
  [M in keyof T]: T[M] extends (...args: infer A) => Promise<infer D>
    ? (...args: A) => Promise<SentZeroTransaction<S, ZeroReceipt<R, D>>>
    : never;
};

/**
 * Send Zero transactions.
 *
 * @remarks
 * The functions return an object implementing {@link SentZeroTransaction}, which can be used
 * to monitor the transaction and get its details when it succeeds.
 *
 * Implemented by {@link @sovryn-zero/lib-ethers#SendableEthersZero}.
 *
 * @public
 */
export interface SendableZero<R = unknown, S = unknown>
  extends _SendableFrom<TransactableZero, R, S> {
  // Methods re-declared for documentation purposes

  /** {@inheritDoc TransactableZero.openLoC} */
  openLoC(
    params: LoCCreationParams<Decimalish>,
    maxOriginationRate?: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LoCCreationDetails>>>;

  /** {@inheritDoc TransactableZero.closeLoC} */
  closeLoC(): Promise<SentZeroTransaction<S, ZeroReceipt<R, LoCClosureDetails>>>;

  /** {@inheritDoc TransactableZero.adjustLoC} */
  adjustLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxOriginationRate?: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>>;

  /** {@inheritDoc TransactableZero.depositCollateral} */
  depositCollateral(
    amount: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>>;

  /** {@inheritDoc TransactableZero.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>>;

  /** {@inheritDoc TransactableZero.borrowZUSD} */
  borrowZUSD(
    amount: Decimalish,
    maxOriginationRate?: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>>;

  /** {@inheritDoc TransactableZero.repayZUSD} */
  repayZUSD(
    amount: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>>;

  /** @internal */
  setPrice(price: Decimalish): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;

  /** {@inheritDoc TransactableZero.liquidate} */
  liquidate(
    address: string | string[]
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LiquidationDetails>>>;

  /** {@inheritDoc TransactableZero.liquidateUpTo} */
  liquidateUpTo(
    maximumNumberOfLoCsToLiquidate: number
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, LiquidationDetails>>>;

  /** {@inheritDoc TransactableZero.depositZUSDInStabilityPool} */
  depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, StabilityDepositChangeDetails>>>;

  /** {@inheritDoc TransactableZero.withdrawZUSDFromStabilityPool} */
  withdrawZUSDFromStabilityPool(
    amount: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, StabilityDepositChangeDetails>>>;

  /** {@inheritDoc TransactableZero.withdrawGainsFromStabilityPool} */
  withdrawGainsFromStabilityPool(): Promise<
    SentZeroTransaction<S, ZeroReceipt<R, StabilityPoolGainsWithdrawalDetails>>
  >;

  /** {@inheritDoc TransactableZero.transferCollateralGainToLoC} */
  transferCollateralGainToLoC(): Promise<
    SentZeroTransaction<S, ZeroReceipt<R, CollateralGainTransferDetails>>
  >;

  /** {@inheritDoc TransactableZero.sendZUSD} */
  sendZUSD(
    toAddress: string,
    amount: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;

  /** {@inheritDoc TransactableZero.sendZERO} */
  sendZERO(
    toAddress: string,
    amount: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;

  /** {@inheritDoc TransactableZero.redeemZUSD} */
  redeemZUSD(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, RedemptionDetails>>>;

  /** {@inheritDoc TransactableZero.claimCollateralSurplus} */
  claimCollateralSurplus(): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;

  /** {@inheritDoc TransactableZero.stakeZERO} */
  stakeZERO(amount: Decimalish): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;

  /** {@inheritDoc TransactableZero.unstakeZERO} */
  unstakeZERO(amount: Decimalish): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;

  /** {@inheritDoc TransactableZero.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;

  /** {@inheritDoc TransactableZero.registerFrontend} */
  registerFrontend(
    kickbackRate: Decimalish
  ): Promise<SentZeroTransaction<S, ZeroReceipt<R, void>>>;
}
