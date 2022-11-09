import { Decimal, Decimalish } from "./Decimal";
import { LoC, LoCAdjustmentParams, LoCClosureParams, LoCCreationParams } from "./LoC";
import { StabilityDepositChange } from "./StabilityDeposit";
import { FailedReceipt } from "./SendableZero";

/**
 * Thrown by {@link TransactableZero} functions in case of transaction failure.
 *
 * @public
 */
export class TransactionFailedError<T extends FailedReceipt = FailedReceipt> extends Error {
  readonly failedReceipt: T;

  /** @internal */
  constructor(name: string, message: string, failedReceipt: T) {
    super(message);
    this.name = name;
    this.failedReceipt = failedReceipt;
  }
}

/**
 * Details of an {@link TransactableZero.openLoC | openLoC()} transaction.
 *
 * @public
 */
export interface LoCCreationDetails {
  /** How much was deposited and borrowed. */
  params: LoCCreationParams<Decimal>;

  /** The LoC that was created by the transaction. */
  newLoC: LoC;

  /** Amount of ZUSD added to the LoC's debt as borrowing fee. */
  fee: Decimal;
}

/**
 * Details of an {@link TransactableZero.adjustLoC | adjustLoC()} transaction.
 *
 * @public
 */
export interface LoCAdjustmentDetails {
  /** Parameters of the adjustment. */
  params: LoCAdjustmentParams<Decimal>;

  /** New state of the adjusted LoC directly after the transaction. */
  newLoC: LoC;

  /** Amount of ZUSD added to the LoC's debt as borrowing fee. */
  fee: Decimal;
}

/**
 * Details of a {@link TransactableZero.closeLoC | closeLoC()} transaction.
 *
 * @public
 */
export interface LoCClosureDetails {
  /** How much was withdrawn and repaid. */
  params: LoCClosureParams<Decimal>;
}

/**
 * Details of a {@link TransactableZero.liquidate | liquidate()} or
 * {@link TransactableZero.liquidateUpTo | liquidateUpTo()} transaction.
 *
 * @public
 */
export interface LiquidationDetails {
  /** Addresses whose LoCs were liquidated by the transaction. */
  liquidatedAddresses: string[];

  /** Total collateral liquidated and debt cleared by the transaction. */
  totalLiquidated: LoC;

  /** Amount of ZUSD paid to the liquidator as gas compensation. */
  zusdGasCompensation: Decimal;

  /** Amount of native currency (e.g. Bitcoin) paid to the liquidator as gas compensation. */
  collateralGasCompensation: Decimal;
}

/**
 * Details of a {@link TransactableZero.redeemZUSD | redeemZUSD()} transaction.
 *
 * @public
 */
export interface RedemptionDetails {
  /** Amount of ZUSD the redeemer tried to redeem. */
  attemptedZUSDAmount: Decimal;

  /**
   * Amount of ZUSD that was actually redeemed by the transaction.
   *
   * @remarks
   * This can end up being lower than `attemptedZUSDAmount` due to interference from another
   * transaction that modifies the list of LoCs.
   *
   * @public
   */
  actualZUSDAmount: Decimal;

  /** Amount of collateral (e.g. Bitcoin) taken from LoCs by the transaction. */
  collateralTaken: Decimal;

  /** Amount of native currency (e.g. Bitcoin) deducted as fee from collateral taken. */
  fee: Decimal;
}

/**
 * Details of a
 * {@link TransactableZero.withdrawGainsFromStabilityPool | withdrawGainsFromStabilityPool()}
 * transaction.
 *
 * @public
 */
export interface StabilityPoolGainsWithdrawalDetails {
  /** Amount of ZUSD burned from the deposit by liquidations since the last modification. */
  zusdLoss: Decimal;

  /** Amount of ZUSD in the deposit directly after this transaction. */
  newZUSDDeposit: Decimal;

  /** Amount of native currency (e.g. Bitcoin) paid out to the depositor in this transaction. */
  collateralGain: Decimal;

  /** Amount of ZERO rewarded to the depositor in this transaction. */
  zeroReward: Decimal;
}

/**
 * Details of a
 * {@link TransactableZero.depositZUSDInStabilityPool | depositZUSDInStabilityPool()} or
 * {@link TransactableZero.withdrawZUSDFromStabilityPool | withdrawZUSDFromStabilityPool()}
 * transaction.
 *
 * @public
 */
export interface StabilityDepositChangeDetails extends StabilityPoolGainsWithdrawalDetails {
  /** Change that was made to the deposit by this transaction. */
  change: StabilityDepositChange<Decimal>;
}

/**
 * Details of a
 * {@link TransactableZero.transferCollateralGainToLoC | transferCollateralGainToLoC()}
 * transaction.
 *
 * @public
 */
export interface CollateralGainTransferDetails extends StabilityPoolGainsWithdrawalDetails {
  /** New state of the depositor's LoC directly after the transaction. */
  newLoC: LoC;
}

/**
 * Send Zero transactions and wait for them to succeed.
 *
 * @remarks
 * The functions return the details of the transaction (if any), or throw an implementation-specific
 * subclass of {@link TransactionFailedError} in case of transaction failure.
 *
 * Implemented by {@link @sovryn-zero/lib-ethers#EthersZero}.
 *
 * @public
 */
export interface TransactableZero {
  /**
   * Open a new LoC by depositing collateral and borrowing ZUSD.
   *
   * @param params - How much to deposit and borrow.
   * @param maxBorrowingRate - Maximum acceptable
   *                           {@link @sovryn-zero/lib-base#Fees.borrowingRate | borrowing rate}.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * If `maxBorrowingRate` is omitted, the current borrowing rate plus 0.5% is used as maximum
   * acceptable rate.
   */
  openLoC(
    params: LoCCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<LoCCreationDetails>;

  /**
   * Close existing LoC by repaying all debt and withdrawing all collateral.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  closeLoC(): Promise<LoCClosureDetails>;

  /**
   * Adjust existing LoC by changing its collateral, debt, or both.
   *
   * @param params - Parameters of the adjustment.
   * @param maxBorrowingRate - Maximum acceptable
   *                           {@link @sovryn-zero/lib-base#Fees.borrowingRate | borrowing rate} if
   *                           `params` includes `borrowZUSD`.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * The transaction will fail if the LoC's debt would fall below
   * {@link @sovryn-zero/lib-base#ZUSD_MINIMUM_DEBT}.
   *
   * If `maxBorrowingRate` is omitted, the current borrowing rate plus 0.5% is used as maximum
   * acceptable rate.
   */
  adjustLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<LoCAdjustmentDetails>;

  /**
   * Adjust existing LoC by depositing more collateral.
   *
   * @param amount - The amount of collateral to add to the LoC's existing collateral.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * Equivalent to:
   *
   * ```typescript
   * adjustLoC({ depositCollateral: amount })
   * ```
   */
  depositCollateral(amount: Decimalish): Promise<LoCAdjustmentDetails>;

  /**
   * Adjust existing LoC by withdrawing some of its collateral.
   *
   * @param amount - The amount of collateral to withdraw from the LoC.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * Equivalent to:
   *
   * ```typescript
   * adjustLoC({ withdrawCollateral: amount })
   * ```
   */
  withdrawCollateral(amount: Decimalish): Promise<LoCAdjustmentDetails>;

  /**
   * Adjust existing LoC by borrowing more ZUSD.
   *
   * @param amount - The amount of ZUSD to borrow.
   * @param maxBorrowingRate - Maximum acceptable
   *                           {@link @sovryn-zero/lib-base#Fees.borrowingRate | borrowing rate}.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * Equivalent to:
   *
   * ```typescript
   * adjustLoC({ borrowZUSD: amount }, maxBorrowingRate)
   * ```
   */
  borrowZUSD(amount: Decimalish, maxBorrowingRate?: Decimalish): Promise<LoCAdjustmentDetails>;

  /**
   * Adjust existing LoC by repaying some of its debt.
   *
   * @param amount - The amount of ZUSD to repay.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * Equivalent to:
   *
   * ```typescript
   * adjustLoC({ repayZUSD: amount })
   * ```
   */
  repayZUSD(amount: Decimalish): Promise<LoCAdjustmentDetails>;

  /** @internal */
  setPrice(price: Decimalish): Promise<void>;

  /**
   * Liquidate one or more undercollateralized LoCs.
   *
   * @param address - Address or array of addresses whose LoCs to liquidate.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  liquidate(address: string | string[]): Promise<LiquidationDetails>;

  /**
   * Liquidate the least collateralized LoCs up to a maximum number.
   *
   * @param maximumNumberOfLoCsToLiquidate - Stop after liquidating this many LoCs.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  liquidateUpTo(maximumNumberOfLoCsToLiquidate: number): Promise<LiquidationDetails>;

  /**
   * Make a new Stability Deposit, or top up existing one.
   *
   * @param amount - Amount of ZUSD to add to new or existing deposit.
   * @param frontendTag - Address that should receive a share of this deposit's ZERO rewards.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * The `frontendTag` parameter is only effective when making a new deposit.
   *
   * As a side-effect, the transaction will also pay out an existing Stability Deposit's
   * {@link @sovryn-zero/lib-base#StabilityDeposit.collateralGain | collateral gain} and
   * {@link @sovryn-zero/lib-base#StabilityDeposit.zeroReward | ZERO reward}.
   */
  depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string
  ): Promise<StabilityDepositChangeDetails>;

  /**
   * Withdraw ZUSD from Stability Deposit.
   *
   * @param amount - Amount of ZUSD to withdraw.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * As a side-effect, the transaction will also pay out the Stability Deposit's
   * {@link @sovryn-zero/lib-base#StabilityDeposit.collateralGain | collateral gain} and
   * {@link @sovryn-zero/lib-base#StabilityDeposit.zeroReward | ZERO reward}.
   */
  withdrawZUSDFromStabilityPool(amount: Decimalish): Promise<StabilityDepositChangeDetails>;

  /**
   * Withdraw {@link @sovryn-zero/lib-base#StabilityDeposit.collateralGain | collateral gain} and
   * {@link @sovryn-zero/lib-base#StabilityDeposit.zeroReward | ZERO reward} from Stability Deposit.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  withdrawGainsFromStabilityPool(): Promise<StabilityPoolGainsWithdrawalDetails>;

  /**
   * Transfer {@link @sovryn-zero/lib-base#StabilityDeposit.collateralGain | collateral gain} from
   * Stability Deposit to LoC.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * The collateral gain is transfered to the LoC as additional collateral.
   *
   * As a side-effect, the transaction will also pay out the Stability Deposit's
   * {@link @sovryn-zero/lib-base#StabilityDeposit.zeroReward | ZERO reward}.
   */
  transferCollateralGainToLoC(): Promise<CollateralGainTransferDetails>;

  /**
   * Send ZUSD tokens to an address.
   *
   * @param toAddress - Address of receipient.
   * @param amount - Amount of ZUSD to send.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  sendZUSD(toAddress: string, amount: Decimalish): Promise<void>;

  /**
   * Send ZERO tokens to an address.
   *
   * @param toAddress - Address of receipient.
   * @param amount - Amount of ZERO to send.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  sendZERO(toAddress: string, amount: Decimalish): Promise<void>;

  /**
   * Redeem ZUSD to native currency (e.g. Bitcoin) at face value.
   *
   * @param amount - Amount of ZUSD to be redeemed.
   * @param maxRedemptionRate - Maximum acceptable
   *                            {@link @sovryn-zero/lib-base#Fees.redemptionRate | redemption rate}.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * If `maxRedemptionRate` is omitted, the current redemption rate (based on `amount`) plus 0.1%
   * is used as maximum acceptable rate.
   */
  redeemZUSD(amount: Decimalish, maxRedemptionRate?: Decimalish): Promise<RedemptionDetails>;

  /**
   * Claim leftover collateral after a liquidation or redemption.
   *
   * @remarks
   * Use {@link @sovryn-zero/lib-base#ReadableZero.getCollateralSurplusBalance | getCollateralSurplusBalance()}
   * to check the amount of collateral available for withdrawal.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  claimCollateralSurplus(): Promise<void>;

  /**
   * Stake ZERO to start earning fee revenue or increase existing stake.
   *
   * @param amount - Amount of ZERO to add to new or existing stake.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * As a side-effect, the transaction will also pay out an existing ZERO stake's
   * {@link @sovryn-zero/lib-base#ZEROStake.collateralGain | collateral gain} and
   * {@link @sovryn-zero/lib-base#ZEROStake.zusdGain | ZUSD gain}.
   */
  stakeZERO(amount: Decimalish): Promise<void>;

  /**
   * Withdraw ZERO from staking.
   *
   * @param amount - Amount of ZERO to withdraw.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   *
   * @remarks
   * As a side-effect, the transaction will also pay out the ZERO stake's
   * {@link @sovryn-zero/lib-base#ZEROStake.collateralGain | collateral gain} and
   * {@link @sovryn-zero/lib-base#ZEROStake.zusdGain | ZUSD gain}.
   */
  unstakeZERO(amount: Decimalish): Promise<void>;

  /**
   * Withdraw {@link @sovryn-zero/lib-base#ZEROStake.collateralGain | collateral gain} and
   * {@link @sovryn-zero/lib-base#ZEROStake.zusdGain | ZUSD gain} from ZERO stake.
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  withdrawGainsFromStaking(): Promise<void>;

  /**
   * Register current wallet address as a Zero frontend.
   *
   * @param kickbackRate - The portion of ZERO rewards to pass onto users of the frontend
   *                       (between 0 and 1).
   *
   * @throws
   * Throws {@link TransactionFailedError} in case of transaction failure.
   */
  registerFrontend(kickbackRate: Decimalish): Promise<void>;
}
