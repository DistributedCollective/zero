import { Decimal, Decimalish } from "./Decimal";

/**
 * Represents the change between two Stability Deposit states.
 *
 * @public
 */
export type StabilityDepositChange<T> =
  | { depositZUSD: T; withdrawZUSD?: undefined }
  | { depositZUSD?: undefined; withdrawZUSD: T; withdrawAllZUSD: boolean };

/**
 * A Stability Deposit and its accrued gains.
 *
 * @public
 */
export class StabilityDeposit {
  /** Amount of ZUSD in the Stability Deposit at the time of the last direct modification. */
  readonly initialZUSD: Decimal;

  /** Amount of ZUSD left in the Stability Deposit. */
  readonly currentZUSD: Decimal;

  /** Amount of native currency (e.g. Bitcoin) received in exchange for the used-up ZUSD. */
  readonly collateralGain: Decimal;

  /** Amount of ZERO rewarded since the last modification of the Stability Deposit. */
  readonly zeroReward: Decimal;

  /**
   * Address of frontend through which this Stability Deposit was made.
   *
   * @remarks
   * If the Stability Deposit was made through a frontend that doesn't tag deposits, this will be
   * the zero-address.
   */
  readonly frontendTag: string;

  /** @internal */
  constructor(
    initialZUSD: Decimal,
    currentZUSD: Decimal,
    collateralGain: Decimal,
    zeroReward: Decimal,
    frontendTag: string
  ) {
    this.initialZUSD = initialZUSD;
    this.currentZUSD = currentZUSD;
    this.collateralGain = collateralGain;
    this.zeroReward = zeroReward;
    this.frontendTag = frontendTag;

    if (this.currentZUSD.gt(this.initialZUSD)) {
      throw new Error("currentZUSD can't be greater than initialZUSD");
    }
  }

  get isEmpty(): boolean {
    return (
      this.initialZUSD.isZero &&
      this.currentZUSD.isZero &&
      this.collateralGain.isZero &&
      this.zeroReward.isZero
    );
  }

  /** @internal */
  toString(): string {
    return (
      `{ initialZUSD: ${this.initialZUSD}` +
      `, currentZUSD: ${this.currentZUSD}` +
      `, collateralGain: ${this.collateralGain}` +
      `, zeroReward: ${this.zeroReward}` +
      `, frontendTag: "${this.frontendTag}" }`
    );
  }

  /**
   * Compare to another instance of `StabilityDeposit`.
   */
  equals(that: StabilityDeposit): boolean {
    return (
      this.initialZUSD.eq(that.initialZUSD) &&
      this.currentZUSD.eq(that.currentZUSD) &&
      this.collateralGain.eq(that.collateralGain) &&
      this.zeroReward.eq(that.zeroReward) &&
      this.frontendTag === that.frontendTag
    );
  }

  /**
   * Calculate the difference between the `currentZUSD` in this Stability Deposit and `thatZUSD`.
   *
   * @returns An object representing the change, or `undefined` if the deposited amounts are equal.
   */
  whatChanged(thatZUSD: Decimalish): StabilityDepositChange<Decimal> | undefined {
    thatZUSD = Decimal.from(thatZUSD);

    if (thatZUSD.lt(this.currentZUSD)) {
      return { withdrawZUSD: this.currentZUSD.sub(thatZUSD), withdrawAllZUSD: thatZUSD.isZero };
    }

    if (thatZUSD.gt(this.currentZUSD)) {
      return { depositZUSD: thatZUSD.sub(this.currentZUSD) };
    }
  }

  /**
   * Apply a {@link StabilityDepositChange} to this Stability Deposit.
   *
   * @returns The new deposited ZUSD amount.
   */
  apply(change: StabilityDepositChange<Decimalish> | undefined): Decimal {
    if (!change) {
      return this.currentZUSD;
    }

    if (change.withdrawZUSD !== undefined) {
      return change.withdrawAllZUSD || this.currentZUSD.lte(change.withdrawZUSD)
        ? Decimal.ZERO
        : this.currentZUSD.sub(change.withdrawZUSD);
    } else {
      return this.currentZUSD.add(change.depositZUSD);
    }
  }
}
