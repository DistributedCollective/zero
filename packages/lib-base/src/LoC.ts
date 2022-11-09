import assert from "assert";

import { Decimal, Decimalish } from "./Decimal";

import {
  MINIMUM_COLLATERAL_RATIO,
  CRITICAL_COLLATERAL_RATIO,
  ZUSD_LIQUIDATION_RESERVE,
  MINIMUM_BORROWING_RATE
} from "./constants";

/** @internal */ export type _CollateralDeposit<T> = { depositCollateral: T };
/** @internal */ export type _CollateralWithdrawal<T> = { withdrawCollateral: T };
/** @internal */ export type _ZUSDBorrowing<T> = { borrowZUSD: T };
/** @internal */ export type _ZUSDRepayment<T> = { repayZUSD: T };

/** @internal */ export type _NoCollateralDeposit = Partial<_CollateralDeposit<undefined>>;
/** @internal */ export type _NoCollateralWithdrawal = Partial<_CollateralWithdrawal<undefined>>;
/** @internal */ export type _NoZUSDBorrowing = Partial<_ZUSDBorrowing<undefined>>;
/** @internal */ export type _NoZUSDRepayment = Partial<_ZUSDRepayment<undefined>>;

/** @internal */
export type _CollateralChange<T> =
  | (_CollateralDeposit<T> & _NoCollateralWithdrawal)
  | (_CollateralWithdrawal<T> & _NoCollateralDeposit);

/** @internal */
export type _NoCollateralChange = _NoCollateralDeposit & _NoCollateralWithdrawal;

/** @internal */
export type _DebtChange<T> =
  | (_ZUSDBorrowing<T> & _NoZUSDRepayment)
  | (_ZUSDRepayment<T> & _NoZUSDBorrowing);

/** @internal */
export type _NoDebtChange = _NoZUSDBorrowing & _NoZUSDRepayment;

/**
 * Parameters of an {@link TransactableZero.openLoC | openLoC()} transaction.
 *
 * @remarks
 * The type parameter `T` specifies the allowed value type(s) of the particular `LoCCreationParams`
 * object's properties.
 *
 * <h2>Properties</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Property </th>
 *     <th> Type </th>
 *     <th> Description </th>
 *   </tr>
 *
 *   <tr>
 *     <td> depositCollateral </td>
 *     <td> T </td>
 *     <td> The amount of collateral that's deposited. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> borrowZUSD </td>
 *     <td> T </td>
 *     <td> The amount of ZUSD that's borrowed. </td>
 *   </tr>
 *
 * </table>
 *
 * @public
 */
export type LoCCreationParams<T = unknown> = _CollateralDeposit<T> &
  _NoCollateralWithdrawal &
  _ZUSDBorrowing<T> &
  _NoZUSDRepayment;

/**
 * Parameters of a {@link TransactableZero.closeLoC | closeLoC()} transaction.
 *
 * @remarks
 * The type parameter `T` specifies the allowed value type(s) of the particular `LoCClosureParams`
 * object's properties.
 *
 * <h2>Properties</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Property </th>
 *     <th> Type </th>
 *     <th> Description </th>
 *   </tr>
 *
 *   <tr>
 *     <td> withdrawCollateral </td>
 *     <td> T </td>
 *     <td> The amount of collateral that's withdrawn. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> repayZUSD? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of ZUSD that's repaid. </td>
 *   </tr>
 *
 * </table>
 *
 * @public
 */
export type LoCClosureParams<T> = _CollateralWithdrawal<T> &
  _NoCollateralDeposit &
  Partial<_ZUSDRepayment<T>> &
  _NoZUSDBorrowing;

/**
 * Parameters of an {@link TransactableZero.adjustLoC | adjustLoC()} transaction.
 *
 * @remarks
 * The type parameter `T` specifies the allowed value type(s) of the particular
 * `LoCAdjustmentParams` object's properties.
 *
 * Even though all properties are optional, a valid `LoCAdjustmentParams` object must define at
 * least one.
 *
 * Defining both `depositCollateral` and `withdrawCollateral`, or both `borrowZUSD` and `repayZUSD`
 * at the same time is disallowed, and will result in a type-checking error.
 *
 * <h2>Properties</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Property </th>
 *     <th> Type </th>
 *     <th> Description </th>
 *   </tr>
 *
 *   <tr>
 *     <td> depositCollateral? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of collateral that's deposited. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> withdrawCollateral? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of collateral that's withdrawn. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> borrowZUSD? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of ZUSD that's borrowed. </td>
 *   </tr>
 *
 *   <tr>
 *     <td> repayZUSD? </td>
 *     <td> T </td>
 *     <td> <i>(Optional)</i> The amount of ZUSD that's repaid. </td>
 *   </tr>
 *
 * </table>
 *
 * @public
 */
export type LoCAdjustmentParams<T = unknown> =
  | (_CollateralChange<T> & _NoDebtChange)
  | (_DebtChange<T> & _NoCollateralChange)
  | (_CollateralChange<T> & _DebtChange<T>);

/**
 * Describes why a LoC could not be created.
 *
 * @remarks
 * See {@link LoCChange}.
 *
 * <h2>Possible values</h2>
 *
 * <table>
 *
 *   <tr>
 *     <th> Value </th>
 *     <th> Reason </th>
 *   </tr>
 *
 *   <tr>
 *     <td> "missingLiquidationReserve" </td>
 *     <td> A LoC's debt cannot be less than the liquidation reserve. </td>
 *   </tr>
 *
 * </table>
 *
 * More errors may be added in the future.
 *
 * @public
 */
export type LoCCreationError = "missingLiquidationReserve";

/**
 * Represents the change between two LoC states.
 *
 * @remarks
 * Returned by {@link LoC.whatChanged}.
 *
 * Passed as a parameter to {@link LoC.apply}.
 *
 * @public
 */
export type LoCChange<T> =
  | { type: "invalidCreation"; invalidLoC: LoC; error: LoCCreationError }
  | { type: "creation"; params: LoCCreationParams<T> }
  | { type: "closure"; params: LoCClosureParams<T> }
  | { type: "adjustment"; params: LoCAdjustmentParams<T>; setToZero?: "collateral" | "debt" };

// This might seem backwards, but this way we avoid spamming the .d.ts and generated docs
type InvalidLoCCreation = Extract<LoCChange<never>, { type: "invalidCreation" }>;
type LoCCreation<T> = Extract<LoCChange<T>, { type: "creation" }>;
type LoCClosure<T> = Extract<LoCChange<T>, { type: "closure" }>;
type LoCAdjustment<T> = Extract<LoCChange<T>, { type: "adjustment" }>;

const invalidLoCCreation = (
  invalidLoC: LoC,
  error: LoCCreationError
): InvalidLoCCreation => ({
  type: "invalidCreation",
  invalidLoC,
  error
});

const locCreation = <T>(params: LoCCreationParams<T>): LoCCreation<T> => ({
  type: "creation",
  params
});

const locClosure = <T>(params: LoCClosureParams<T>): LoCClosure<T> => ({
  type: "closure",
  params
});

const locAdjustment = <T>(
  params: LoCAdjustmentParams<T>,
  setToZero?: "collateral" | "debt"
): LoCAdjustment<T> => ({
  type: "adjustment",
  params,
  setToZero
});

const valueIsDefined = <T>(entry: [string, T | undefined]): entry is [string, T] =>
  entry[1] !== undefined;

type AllowedKey<T> = Exclude<
  {
    [P in keyof T]: T[P] extends undefined ? never : P;
  }[keyof T],
  undefined
>;

const allowedLoCCreationKeys: AllowedKey<LoCCreationParams>[] = [
  "depositCollateral",
  "borrowZUSD"
];

function checkAllowedLoCCreationKeys<T>(
  entries: [string, T][]
): asserts entries is [AllowedKey<LoCCreationParams>, T][] {
  const badKeys = entries
    .filter(([k]) => !(allowedLoCCreationKeys as string[]).includes(k))
    .map(([k]) => `'${k}'`);

  if (badKeys.length > 0) {
    throw new Error(`LoCCreationParams: property ${badKeys.join(", ")} not allowed`);
  }
}

const locCreationParamsFromEntries = <T>(
  entries: [AllowedKey<LoCCreationParams>, T][]
): LoCCreationParams<T> => {
  const params = Object.fromEntries(entries) as Record<AllowedKey<LoCCreationParams>, T>;
  const missingKeys = allowedLoCCreationKeys.filter(k => !(k in params)).map(k => `'${k}'`);

  if (missingKeys.length > 0) {
    throw new Error(`LoCCreationParams: property ${missingKeys.join(", ")} missing`);
  }

  return params;
};

const decimalize = <T>([k, v]: [T, Decimalish]): [T, Decimal] => [k, Decimal.from(v)];
const nonZero = <T>([, v]: [T, Decimal]): boolean => !v.isZero;

/** @internal */
export const _normalizeLoCCreation = (
  params: Record<string, Decimalish | undefined>
): LoCCreationParams<Decimal> => {
  const definedEntries = Object.entries(params).filter(valueIsDefined);
  checkAllowedLoCCreationKeys(definedEntries);
  const nonZeroEntries = definedEntries.map(decimalize);

  return locCreationParamsFromEntries(nonZeroEntries);
};

const allowedLoCAdjustmentKeys: AllowedKey<LoCAdjustmentParams>[] = [
  "depositCollateral",
  "withdrawCollateral",
  "borrowZUSD",
  "repayZUSD"
];

function checkAllowedLoCAdjustmentKeys<T>(
  entries: [string, T][]
): asserts entries is [AllowedKey<LoCAdjustmentParams>, T][] {
  const badKeys = entries
    .filter(([k]) => !(allowedLoCAdjustmentKeys as string[]).includes(k))
    .map(([k]) => `'${k}'`);

  if (badKeys.length > 0) {
    throw new Error(`LoCAdjustmentParams: property ${badKeys.join(", ")} not allowed`);
  }
}

const collateralChangeFrom = <T>({
  depositCollateral,
  withdrawCollateral
}: Partial<Record<AllowedKey<LoCAdjustmentParams>, T>>): _CollateralChange<T> | undefined => {
  if (depositCollateral !== undefined && withdrawCollateral !== undefined) {
    throw new Error(
      "LoCAdjustmentParams: 'depositCollateral' and 'withdrawCollateral' " +
        "can't be present at the same time"
    );
  }

  if (depositCollateral !== undefined) {
    return { depositCollateral };
  }

  if (withdrawCollateral !== undefined) {
    return { withdrawCollateral };
  }
};

const debtChangeFrom = <T>({
  borrowZUSD,
  repayZUSD
}: Partial<Record<AllowedKey<LoCAdjustmentParams>, T>>): _DebtChange<T> | undefined => {
  if (borrowZUSD !== undefined && repayZUSD !== undefined) {
    throw new Error(
      "LoCAdjustmentParams: 'borrowZUSD' and 'repayZUSD' can't be present at the same time"
    );
  }

  if (borrowZUSD !== undefined) {
    return { borrowZUSD };
  }

  if (repayZUSD !== undefined) {
    return { repayZUSD };
  }
};

const locAdjustmentParamsFromEntries = <T>(
  entries: [AllowedKey<LoCAdjustmentParams>, T][]
): LoCAdjustmentParams<T> => {
  const params = Object.fromEntries(entries) as Partial<
    Record<AllowedKey<LoCAdjustmentParams>, T>
  >;

  const collateralChange = collateralChangeFrom(params);
  const debtChange = debtChangeFrom(params);

  if (collateralChange !== undefined && debtChange !== undefined) {
    return { ...collateralChange, ...debtChange };
  }

  if (collateralChange !== undefined) {
    return collateralChange;
  }

  if (debtChange !== undefined) {
    return debtChange;
  }

  throw new Error("LoCAdjustmentParams: must include at least one non-zero parameter");
};

/** @internal */
export const _normalizeLoCAdjustment = (
  params: Record<string, Decimalish | undefined>
): LoCAdjustmentParams<Decimal> => {
  const definedEntries = Object.entries(params).filter(valueIsDefined);
  checkAllowedLoCAdjustmentKeys(definedEntries);
  const nonZeroEntries = definedEntries.map(decimalize).filter(nonZero);

  return locAdjustmentParamsFromEntries(nonZeroEntries);
};

const applyFee = (borrowingRate: Decimalish, debtIncrease: Decimal) =>
  debtIncrease.mul(Decimal.ONE.add(borrowingRate));

const unapplyFee = (borrowingRate: Decimalish, debtIncrease: Decimal) =>
  debtIncrease._divCeil(Decimal.ONE.add(borrowingRate));

const NOMINAL_COLLATERAL_RATIO_PRECISION = Decimal.from(100);

/**
 * A combination of collateral and debt.
 *
 * @public
 */
export class LoC {
  /** Amount of native currency (e.g. Bitcoin) collateralized. */
  readonly collateral: Decimal;

  /** Amount of ZUSD owed. */
  readonly debt: Decimal;

  /** @internal */
  constructor(collateral = Decimal.ZERO, debt = Decimal.ZERO) {
    this.collateral = collateral;
    this.debt = debt;
  }

  get isEmpty(): boolean {
    return this.collateral.isZero && this.debt.isZero;
  }

  /**
   * Amount of ZUSD that must be repaid to close this LoC.
   *
   * @remarks
   * This doesn't include the liquidation reserve, which is refunded in case of normal closure.
   */
  get netDebt(): Decimal {
    if (this.debt.lt(ZUSD_LIQUIDATION_RESERVE)) {
      throw new Error(`netDebt should not be used when debt < ${ZUSD_LIQUIDATION_RESERVE}`);
    }

    return this.debt.sub(ZUSD_LIQUIDATION_RESERVE);
  }

  /** @internal */
  get _nominalCollateralRatio(): Decimal {
    return this.collateral.mulDiv(NOMINAL_COLLATERAL_RATIO_PRECISION, this.debt);
  }

  /** Calculate the LoC's collateralization ratio at a given price. */
  collateralRatio(price: Decimalish): Decimal {
    return this.collateral.mulDiv(price, this.debt);
  }

  /**
   * Whether the LoC is undercollateralized at a given price.
   *
   * @returns
   * `true` if the LoC's collateralization ratio is less than the
   * {@link MINIMUM_COLLATERAL_RATIO}.
   */
  collateralRatioIsBelowMinimum(price: Decimalish): boolean {
    return this.collateralRatio(price).lt(MINIMUM_COLLATERAL_RATIO);
  }

  /**
   * Whether the collateralization ratio is less than the {@link CRITICAL_COLLATERAL_RATIO} at a
   * given price.
   *
   * @example
   * Can be used to check whether the Zero protocol is in recovery mode by using it on the return
   * value of {@link ReadableZero.getTotal | getTotal()}. For example:
   *
   * ```typescript
   * const total = await zero.getTotal();
   * const price = await zero.getPrice();
   *
   * if (total.collateralRatioIsBelowCritical(price)) {
   *   // Recovery mode is active
   * }
   * ```
   */
  collateralRatioIsBelowCritical(price: Decimalish): boolean {
    return this.collateralRatio(price).lt(CRITICAL_COLLATERAL_RATIO);
  }

  /** Whether the LoC is sufficiently collateralized to be opened during recovery mode. */
  isOpenableInRecoveryMode(price: Decimalish): boolean {
    return this.collateralRatio(price).gte(CRITICAL_COLLATERAL_RATIO);
  }

  /** @internal */
  toString(): string {
    return `{ collateral: ${this.collateral}, debt: ${this.debt} }`;
  }

  equals(that: LoC): boolean {
    return this.collateral.eq(that.collateral) && this.debt.eq(that.debt);
  }

  add(that: LoC): LoC {
    return new LoC(this.collateral.add(that.collateral), this.debt.add(that.debt));
  }

  addCollateral(collateral: Decimalish): LoC {
    return new LoC(this.collateral.add(collateral), this.debt);
  }

  addDebt(debt: Decimalish): LoC {
    return new LoC(this.collateral, this.debt.add(debt));
  }

  subtract(that: LoC): LoC {
    const { collateral, debt } = that;

    return new LoC(
      this.collateral.gt(collateral) ? this.collateral.sub(collateral) : Decimal.ZERO,
      this.debt.gt(debt) ? this.debt.sub(debt) : Decimal.ZERO
    );
  }

  subtractCollateral(collateral: Decimalish): LoC {
    return new LoC(
      this.collateral.gt(collateral) ? this.collateral.sub(collateral) : Decimal.ZERO,
      this.debt
    );
  }

  subtractDebt(debt: Decimalish): LoC {
    return new LoC(this.collateral, this.debt.gt(debt) ? this.debt.sub(debt) : Decimal.ZERO);
  }

  multiply(multiplier: Decimalish): LoC {
    return new LoC(this.collateral.mul(multiplier), this.debt.mul(multiplier));
  }

  setCollateral(collateral: Decimalish): LoC {
    return new LoC(Decimal.from(collateral), this.debt);
  }

  setDebt(debt: Decimalish): LoC {
    return new LoC(this.collateral, Decimal.from(debt));
  }

  private _debtChange({ debt }: LoC, borrowingRate: Decimalish): _DebtChange<Decimal> {
    return debt.gt(this.debt)
      ? { borrowZUSD: unapplyFee(borrowingRate, debt.sub(this.debt)) }
      : { repayZUSD: this.debt.sub(debt) };
  }

  private _collateralChange({ collateral }: LoC): _CollateralChange<Decimal> {
    return collateral.gt(this.collateral)
      ? { depositCollateral: collateral.sub(this.collateral) }
      : { withdrawCollateral: this.collateral.sub(collateral) };
  }

  /**
   * Calculate the difference between this LoC and another.
   *
   * @param that - The other LoC.
   * @param borrowingRate - Borrowing rate to use when calculating a borrowed amount.
   *
   * @returns
   * An object representing the change, or `undefined` if the LoCs are equal.
   */
  whatChanged(
    that: LoC,
    borrowingRate: Decimalish = MINIMUM_BORROWING_RATE
  ): LoCChange<Decimal> | undefined {
    if (this.collateral.eq(that.collateral) && this.debt.eq(that.debt)) {
      return undefined;
    }

    if (this.isEmpty) {
      if (that.debt.lt(ZUSD_LIQUIDATION_RESERVE)) {
        return invalidLoCCreation(that, "missingLiquidationReserve");
      }

      return locCreation({
        depositCollateral: that.collateral,
        borrowZUSD: unapplyFee(borrowingRate, that.netDebt)
      });
    }

    if (that.isEmpty) {
      return locClosure(
        this.netDebt.nonZero
          ? { withdrawCollateral: this.collateral, repayZUSD: this.netDebt }
          : { withdrawCollateral: this.collateral }
      );
    }

    return this.collateral.eq(that.collateral)
      ? locAdjustment<Decimal>(this._debtChange(that, borrowingRate), that.debt.zero && "debt")
      : this.debt.eq(that.debt)
      ? locAdjustment<Decimal>(this._collateralChange(that), that.collateral.zero && "collateral")
      : locAdjustment<Decimal>(
          {
            ...this._debtChange(that, borrowingRate),
            ...this._collateralChange(that)
          },
          (that.debt.zero && "debt") ?? (that.collateral.zero && "collateral")
        );
  }

  /**
   * Make a new LoC by applying a {@link LoCChange} to this LoC.
   *
   * @param change - The change to apply.
   * @param borrowingRate - Borrowing rate to use when adding a borrowed amount to the LoC's debt.
   */
  apply(
    change: LoCChange<Decimal> | undefined,
    borrowingRate: Decimalish = MINIMUM_BORROWING_RATE
  ): LoC {
    if (!change) {
      return this;
    }

    switch (change.type) {
      case "invalidCreation":
        if (!this.isEmpty) {
          throw new Error("Can't create onto existing LoC");
        }

        return change.invalidLoC;

      case "creation": {
        if (!this.isEmpty) {
          throw new Error("Can't create onto existing LoC");
        }

        const { depositCollateral, borrowZUSD } = change.params;

        return new LoC(
          depositCollateral,
          ZUSD_LIQUIDATION_RESERVE.add(applyFee(borrowingRate, borrowZUSD))
        );
      }

      case "closure":
        if (this.isEmpty) {
          throw new Error("Can't close empty LoC");
        }

        return _emptyLoC;

      case "adjustment": {
        const {
          setToZero,
          params: { depositCollateral, withdrawCollateral, borrowZUSD, repayZUSD }
        } = change;

        const collateralDecrease = withdrawCollateral ?? Decimal.ZERO;
        const collateralIncrease = depositCollateral ?? Decimal.ZERO;
        const debtDecrease = repayZUSD ?? Decimal.ZERO;
        const debtIncrease = borrowZUSD ? applyFee(borrowingRate, borrowZUSD) : Decimal.ZERO;

        return setToZero === "collateral"
          ? this.setCollateral(Decimal.ZERO).addDebt(debtIncrease).subtractDebt(debtDecrease)
          : setToZero === "debt"
          ? this.setDebt(Decimal.ZERO)
              .addCollateral(collateralIncrease)
              .subtractCollateral(collateralDecrease)
          : this.add(new LoC(collateralIncrease, debtIncrease)).subtract(
              new LoC(collateralDecrease, debtDecrease)
            );
      }
    }
  }

  /**
   * Calculate the result of an {@link TransactableZero.openLoC | openLoC()} transaction.
   *
   * @param params - Parameters of the transaction.
   * @param borrowingRate - Borrowing rate to use when calculating the LoC's debt.
   */
  static create(params: LoCCreationParams<Decimalish>, borrowingRate?: Decimalish): LoC {
    return _emptyLoC.apply(locCreation(_normalizeLoCCreation(params)), borrowingRate);
  }

  /**
   * Calculate the parameters of an {@link TransactableZero.openLoC | openLoC()} transaction
   * that will result in the given LoC.
   *
   * @param that - The LoC to recreate.
   * @param borrowingRate - Current borrowing rate.
   */
  static recreate(that: LoC, borrowingRate?: Decimalish): LoCCreationParams<Decimal> {
    const change = _emptyLoC.whatChanged(that, borrowingRate);
    assert(change?.type === "creation");
    return change.params;
  }

  /**
   * Calculate the result of an {@link TransactableZero.adjustLoC | adjustLoC()} transaction
   * on this LoC.
   *
   * @param params - Parameters of the transaction.
   * @param borrowingRate - Borrowing rate to use when adding to the LoC's debt.
   */
  adjust(params: LoCAdjustmentParams<Decimalish>, borrowingRate?: Decimalish): LoC {
    return this.apply(locAdjustment(_normalizeLoCAdjustment(params)), borrowingRate);
  }

  /**
   * Calculate the parameters of an {@link TransactableZero.adjustLoC | adjustLoC()}
   * transaction that will change this LoC into the given LoC.
   *
   * @param that - The desired result of the transaction.
   * @param borrowingRate - Current borrowing rate.
   */
  adjustTo(that: LoC, borrowingRate?: Decimalish): LoCAdjustmentParams<Decimal> {
    const change = this.whatChanged(that, borrowingRate);
    assert(change?.type === "adjustment");
    return change.params;
  }
}

/** @internal */
export const _emptyLoC = new LoC();

/**
 * Represents whether a UserLoC is open or not, or why it was closed.
 *
 * @public
 */
export type UserLoCStatus =
  | "nonExistent"
  | "open"
  | "closedByOwner"
  | "closedByLiquidation"
  | "closedByRedemption";

/**
 * A LoC that is associated with a single owner.
 *
 * @remarks
 * The SDK uses the base {@link LoC} class as a generic container of collateral and debt, for
 * example to represent the {@link ReadableZero.getTotal | total collateral and debt} locked up
 * in the protocol.
 *
 * The `UserLoC` class extends `LoC` with extra information that's only available for LoCs
 * that are associated with a single owner (such as the owner's address, or the LoC's status).
 *
 * @public
 */
export class UserLoC extends LoC {
  /** Address that owns this LoC. */
  readonly ownerAddress: string;

  /** Provides more information when the UserLoC is empty. */
  readonly status: UserLoCStatus;

  /** @internal */
  constructor(ownerAddress: string, status: UserLoCStatus, collateral?: Decimal, debt?: Decimal) {
    super(collateral, debt);

    this.ownerAddress = ownerAddress;
    this.status = status;
  }

  equals(that: UserLoC): boolean {
    return (
      super.equals(that) && this.ownerAddress === that.ownerAddress && this.status === that.status
    );
  }

  /** @internal */
  toString(): string {
    return (
      `{ ownerAddress: "${this.ownerAddress}"` +
      `, collateral: ${this.collateral}` +
      `, debt: ${this.debt}` +
      `, status: "${this.status}" }`
    );
  }
}

/**
 * A LoC in its state after the last direct modification.
 *
 * @remarks
 * The LoC may have received collateral and debt shares from liquidations since then.
 * Use {@link LoCWithPendingRedistribution.applyRedistribution | applyRedistribution()} to
 * calculate the LoC's most up-to-date state.
 *
 * @public
 */
export class LoCWithPendingRedistribution extends UserLoC {
  private readonly stake: Decimal;
  private readonly snapshotOfTotalRedistributed: LoC;

  /** @internal */
  constructor(
    ownerAddress: string,
    status: UserLoCStatus,
    collateral?: Decimal,
    debt?: Decimal,
    stake = Decimal.ZERO,
    snapshotOfTotalRedistributed = _emptyLoC
  ) {
    super(ownerAddress, status, collateral, debt);

    this.stake = stake;
    this.snapshotOfTotalRedistributed = snapshotOfTotalRedistributed;
  }

  applyRedistribution(totalRedistributed: LoC): UserLoC {
    const afterRedistribution = this.add(
      totalRedistributed.subtract(this.snapshotOfTotalRedistributed).multiply(this.stake)
    );

    return new UserLoC(
      this.ownerAddress,
      this.status,
      afterRedistribution.collateral,
      afterRedistribution.debt
    );
  }

  equals(that: LoCWithPendingRedistribution): boolean {
    return (
      super.equals(that) &&
      this.stake.eq(that.stake) &&
      this.snapshotOfTotalRedistributed.equals(that.snapshotOfTotalRedistributed)
    );
  }
}
