import { Decimal, Decimalish } from "./Decimal";
import { LoCAdjustmentParams, LoCCreationParams } from "./LoC";
import { ZeroReceipt, SendableZero, SentZeroTransaction } from "./SendableZero";

import {
  CollateralGainTransferDetails,
  LiquidationDetails,
  RedemptionDetails,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  LoCAdjustmentDetails,
  LoCClosureDetails,
  LoCCreationDetails
} from "./TransactableZero";

/**
 * A transaction that has been prepared for sending.
 *
 * @remarks
 * Implemented by {@link @sovryn-zero/lib-ethers#PopulatedEthersZeroTransaction}.
 *
 * @public
 */
export interface PopulatedZeroTransaction<
  P = unknown,
  T extends SentZeroTransaction = SentZeroTransaction
> {
  /** Implementation-specific populated transaction object. */
  readonly rawPopulatedTransaction: P;

  /**
   * Send the transaction.
   *
   * @returns An object that implements {@link @sovryn-zero/lib-base#SentZeroTransaction}.
   */
  send(): Promise<T>;
}

/**
 * A redemption transaction that has been prepared for sending.
 *
 * @remarks
 * The Zero protocol fulfills redemptions by repaying the debt of LoCs in ascending order of
 * their collateralization ratio, and taking a portion of their collateral in exchange. Due to the
 * {@link @sovryn-zero/lib-base#ZUSD_MINIMUM_DEBT | minimum debt} requirement that LoCs must fulfill,
 * some ZUSD amounts are not possible to redeem exactly.
 *
 * When {@link @sovryn-zero/lib-base#PopulatableZero.redeemZUSD | redeemZUSD()} is called with an
 * amount that can't be fully redeemed, the amount will be truncated (see the `redeemableZUSDAmount`
 * property). When this happens, the redeemer can either redeem the truncated amount by sending the
 * transaction unchanged, or prepare a new transaction by
 * {@link @sovryn-zero/lib-base#PopulatedRedemption.increaseAmountByMinimumNetDebt | increasing the amount}
 * to the next lowest possible value, which is the sum of the truncated amount and
 * {@link @sovryn-zero/lib-base#ZUSD_MINIMUM_NET_DEBT}.
 *
 * @public
 */
export interface PopulatedRedemption<P = unknown, S = unknown, R = unknown>
  extends PopulatedZeroTransaction<
    P,
    SentZeroTransaction<S, ZeroReceipt<R, RedemptionDetails>>
  > {
  /** Amount of ZUSD the redeemer is trying to redeem. */
  readonly attemptedZUSDAmount: Decimal;

  /** Maximum amount of ZUSD that is currently redeemable from `attemptedZUSDAmount`. */
  readonly redeemableZUSDAmount: Decimal;

  /** Whether `redeemableZUSDAmount` is less than `attemptedZUSDAmount`. */
  readonly isTruncated: boolean;

  /**
   * Prepare a new transaction by increasing the attempted amount to the next lowest redeemable
   * value.
   *
   * @param maxRedemptionRate - Maximum acceptable
   *                            {@link @sovryn-zero/lib-base#Fees.redemptionRate | redemption rate} to
   *                            use in the new transaction.
   *
   * @remarks
   * If `maxRedemptionRate` is omitted, the original transaction's `maxRedemptionRate` is reused
   * unless that was also omitted, in which case the current redemption rate (based on the increased
   * amount) plus 0.1% is used as maximum acceptable rate.
   */
  increaseAmountByMinimumNetDebt(
    maxRedemptionRate?: Decimalish
  ): Promise<PopulatedRedemption<P, S, R>>;
}

/** @internal */
export type _PopulatableFrom<T, P> = {
  [M in keyof T]: T[M] extends (...args: infer A) => Promise<infer U>
    ? U extends SentZeroTransaction
      ? (...args: A) => Promise<PopulatedZeroTransaction<P, U>>
      : never
    : never;
};

/**
 * Prepare Zero transactions for sending.
 *
 * @remarks
 * The functions return an object implementing {@link PopulatedZeroTransaction}, which can be
 * used to send the transaction and get a {@link SentZeroTransaction}.
 *
 * Implemented by {@link @sovryn-zero/lib-ethers#PopulatableEthersZero}.
 *
 * @public
 */
export interface PopulatableZero<R = unknown, S = unknown, P = unknown>
  extends _PopulatableFrom<SendableZero<R, S>, P> {
  // Methods re-declared for documentation purposes

  /** {@inheritDoc TransactableZero.openLoC} */
  openLoC(
    params: LoCCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, LoCCreationDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.closeLoC} */
  closeLoC(): Promise<
    PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, LoCClosureDetails>>>
  >;

  /** {@inheritDoc TransactableZero.adjustLoC} */
  adjustLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.depositCollateral} */
  depositCollateral(
    amount: Decimalish
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.borrowZUSD} */
  borrowZUSD(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.repayZUSD} */
  repayZUSD(
    amount: Decimalish
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, LoCAdjustmentDetails>>
    >
  >;

  /** @internal */
  setPrice(
    price: Decimalish
  ): Promise<PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>>;

  /** {@inheritDoc TransactableZero.liquidate} */
  liquidate(
    address: string | string[]
  ): Promise<
    PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, LiquidationDetails>>>
  >;

  /** {@inheritDoc TransactableZero.liquidateUpTo} */
  liquidateUpTo(
    maximumNumberOfLoCsToLiquidate: number
  ): Promise<
    PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, LiquidationDetails>>>
  >;

  /** {@inheritDoc TransactableZero.depositZUSDInStabilityPool} */
  depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, StabilityDepositChangeDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.withdrawZUSDFromStabilityPool} */
  withdrawZUSDFromStabilityPool(
    amount: Decimalish
  ): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, StabilityDepositChangeDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.withdrawGainsFromStabilityPool} */
  withdrawGainsFromStabilityPool(): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, StabilityPoolGainsWithdrawalDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.transferCollateralGainToLoC} */
  transferCollateralGainToLoC(): Promise<
    PopulatedZeroTransaction<
      P,
      SentZeroTransaction<S, ZeroReceipt<R, CollateralGainTransferDetails>>
    >
  >;

  /** {@inheritDoc TransactableZero.sendZUSD} */
  sendZUSD(
    toAddress: string,
    amount: Decimalish
  ): Promise<PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>>;

  /** {@inheritDoc TransactableZero.sendZERO} */
  sendZERO(
    toAddress: string,
    amount: Decimalish
  ): Promise<PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>>;

  /** {@inheritDoc TransactableZero.redeemZUSD} */
  redeemZUSD(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish
  ): Promise<PopulatedRedemption<P, S, R>>;

  /** {@inheritDoc TransactableZero.claimCollateralSurplus} */
  claimCollateralSurplus(): Promise<
    PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableZero.stakeZERO} */
  stakeZERO(
    amount: Decimalish
  ): Promise<PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>>;

  /** {@inheritDoc TransactableZero.unstakeZERO} */
  unstakeZERO(
    amount: Decimalish
  ): Promise<PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>>;

  /** {@inheritDoc TransactableZero.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(): Promise<
    PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableZero.registerFrontend} */
  registerFrontend(
    kickbackRate: Decimalish
  ): Promise<PopulatedZeroTransaction<P, SentZeroTransaction<S, ZeroReceipt<R, void>>>>;
}
