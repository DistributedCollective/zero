import { Decimal, Decimalish } from "./Decimal";
import { TroveAdjustmentParams, TroveCreationParams } from "./Trove";
import { LiquityReceipt, SendableLiquity, SentLiquityTransaction } from "./SendableLiquity";

import {
  CollateralGainTransferDetails,
  LiquidationDetails,
  RedemptionDetails,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TroveAdjustmentDetails,
  TroveClosureDetails,
  TroveCreationDetails
} from "./TransactableLiquity";

/**
 * A transaction that has been prepared for sending.
 *
 * @remarks
 * Implemented by {@link @sovryn-zero/lib-ethers#PopulatedEthersLiquityTransaction}.
 *
 * @public
 */
export interface PopulatedLiquityTransaction<
  P = unknown,
  T extends SentLiquityTransaction = SentLiquityTransaction
> {
  /** Implementation-specific populated transaction object. */
  readonly rawPopulatedTransaction: P;

  /**
   * Send the transaction.
   *
   * @returns An object that implements {@link @sovryn-zero/lib-base#SentLiquityTransaction}.
   */
  send(): Promise<T>;
}

/**
 * A redemption transaction that has been prepared for sending.
 *
 * @remarks
 * The Liquity protocol fulfills redemptions by repaying the debt of Troves in ascending order of
 * their collateralization ratio, and taking a portion of their collateral in exchange. Due to the
 * {@link @sovryn-zero/lib-base#ZUSD_MINIMUM_DEBT | minimum debt} requirement that Troves must fulfill,
 * some ZUSD amounts are not possible to redeem exactly.
 *
 * When {@link @sovryn-zero/lib-base#PopulatableLiquity.redeemZUSD | redeemZUSD()} is called with an
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
  extends PopulatedLiquityTransaction<
    P,
    SentLiquityTransaction<S, LiquityReceipt<R, RedemptionDetails>>
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
    ? U extends SentLiquityTransaction
      ? (...args: A) => Promise<PopulatedLiquityTransaction<P, U>>
      : never
    : never;
};

/**
 * Prepare Liquity transactions for sending.
 *
 * @remarks
 * The functions return an object implementing {@link PopulatedLiquityTransaction}, which can be
 * used to send the transaction and get a {@link SentLiquityTransaction}.
 *
 * Implemented by {@link @sovryn-zero/lib-ethers#PopulatableEthersLiquity}.
 *
 * @public
 */
export interface PopulatableLiquity<R = unknown, S = unknown, P = unknown>
  extends _PopulatableFrom<SendableLiquity<R, S>, P> {
  // Methods re-declared for documentation purposes

  /** {@inheritDoc TransactableLiquity.openTrove} */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, TroveCreationDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.closeTrove} */
  closeTrove(): Promise<
    PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, TroveClosureDetails>>>
  >;

  /** {@inheritDoc TransactableLiquity.adjustTrove} */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.depositCollateral} */
  depositCollateral(
    amount: Decimalish
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.borrowZUSD} */
  borrowZUSD(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.repayZUSD} */
  repayZUSD(
    amount: Decimalish
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** @internal */
  setPrice(
    price: Decimalish
  ): Promise<PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>>;

  /** {@inheritDoc TransactableLiquity.liquidate} */
  liquidate(
    address: string | string[]
  ): Promise<
    PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, LiquidationDetails>>>
  >;

  /** {@inheritDoc TransactableLiquity.liquidateUpTo} */
  liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number
  ): Promise<
    PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, LiquidationDetails>>>
  >;

  /** {@inheritDoc TransactableLiquity.depositZUSDInStabilityPool} */
  depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, StabilityDepositChangeDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.withdrawZUSDFromStabilityPool} */
  withdrawZUSDFromStabilityPool(
    amount: Decimalish
  ): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, StabilityDepositChangeDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.withdrawGainsFromStabilityPool} */
  withdrawGainsFromStabilityPool(): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, StabilityPoolGainsWithdrawalDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.transferCollateralGainToTrove} */
  transferCollateralGainToTrove(): Promise<
    PopulatedLiquityTransaction<
      P,
      SentLiquityTransaction<S, LiquityReceipt<R, CollateralGainTransferDetails>>
    >
  >;

  /** {@inheritDoc TransactableLiquity.sendZUSD} */
  sendZUSD(
    toAddress: string,
    amount: Decimalish
  ): Promise<PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>>;

  /** {@inheritDoc TransactableLiquity.sendZERO} */
  sendZERO(
    toAddress: string,
    amount: Decimalish
  ): Promise<PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>>;

  /** {@inheritDoc TransactableLiquity.redeemZUSD} */
  redeemZUSD(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish
  ): Promise<PopulatedRedemption<P, S, R>>;

  /** {@inheritDoc TransactableLiquity.claimCollateralSurplus} */
  claimCollateralSurplus(): Promise<
    PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableLiquity.stakeZERO} */
  stakeZERO(
    amount: Decimalish
  ): Promise<PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>>;

  /** {@inheritDoc TransactableLiquity.unstakeZERO} */
  unstakeZERO(
    amount: Decimalish
  ): Promise<PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>>;

  /** {@inheritDoc TransactableLiquity.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(): Promise<
    PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableLiquity.registerFrontend} */
  registerFrontend(
    kickbackRate: Decimalish
  ): Promise<PopulatedLiquityTransaction<P, SentLiquityTransaction<S, LiquityReceipt<R, void>>>>;
}
