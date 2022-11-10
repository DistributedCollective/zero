import assert from "assert";
import { describe, it } from "mocha";
import fc from "fast-check";

import {
  ZUSD_LIQUIDATION_RESERVE,
  ZUSD_MINIMUM_DEBT,
  MAXIMUM_ORIGINATION_RATE
} from "../src/constants";

import { Decimal, Difference } from "../src/Decimal";
import { LoC, _emptyLoC } from "../src/LoC";

const liquidationReserve = Number(ZUSD_LIQUIDATION_RESERVE);
const maximumOriginationRate = Number(MAXIMUM_ORIGINATION_RATE);

const maxDebt = 10 * Number(ZUSD_MINIMUM_DEBT);

const loc = ({ collateral = 0, debt = 0 }) =>
  new LoC(Decimal.from(collateral), Decimal.from(debt));

const onlyCollateral = () => fc.record({ collateral: fc.float({ min: 0.1 }) }).map(loc);

const onlyDebt = () =>
  fc.record({ debt: fc.float({ min: liquidationReserve, max: maxDebt }) }).map(loc);

const bothCollateralAndDebt = () =>
  fc
    .record({
      collateral: fc.float({ min: 0.1 }),
      debt: fc.float({ min: liquidationReserve, max: maxDebt })
    })
    .map(loc);

const arbitraryLoC = () => fc.record({ collateral: fc.float(), debt: fc.float() }).map(loc);

const validLoC = () =>
  fc
    .record({ collateral: fc.float(), debt: fc.float({ min: liquidationReserve, max: maxDebt }) })
    .map(loc);

const validNonEmptyLoC = () => validLoC().filter(t => !t.isEmpty);

const roughlyEqual = (a: LoC, b: LoC) =>
  a.collateral.eq(b.collateral) && !!Difference.between(a.debt, b.debt).absoluteValue?.lt(1e-9);

describe("LoC", () => {
  it("applying undefined diff should yield the same LoC", () => {
    const loc = new LoC(Decimal.from(1), Decimal.from(111));

    assert(loc.apply(undefined) === loc);
  });

  it("applying diff of empty from `b` to `a` should yield empty", () => {
    fc.assert(
      fc.property(validNonEmptyLoC(), validNonEmptyLoC(), (a, b) =>
        a.apply(b.whatChanged(_emptyLoC)).equals(_emptyLoC)
      )
    );
  });

  it("applying what changed should preserve zeroings", () => {
    fc.assert(
      fc.property(
        arbitraryLoC(),
        bothCollateralAndDebt(),
        onlyCollateral(),
        (a, b, c) => a.apply(b.whatChanged(c)).debt.isZero
      )
    );

    fc.assert(
      fc.property(
        arbitraryLoC(),
        bothCollateralAndDebt(),
        onlyDebt(),
        (a, b, c) => a.apply(b.whatChanged(c)).collateral.isZero
      )
    );
  });

  it("applying diff of `b` from `a` to `a` should yield `b` when borrowing rate is 0", () => {
    fc.assert(
      fc.property(validLoC(), arbitraryLoC(), (a, b) =>
        a.apply(a.whatChanged(b, 0), 0).equals(b)
      )
    );
  });

  it("applying diff of `b` from `a` to `a` should roughly yield `b` when borrowing rate is non-0", () => {
    fc.assert(
      fc.property(validLoC(), arbitraryLoC(), fc.float({ max: 0.5 }), (a, b, c) =>
        roughlyEqual(a.apply(a.whatChanged(b, c), c), b)
      )
    );
  });

  it("applying an adjustment should never throw", () => {
    fc.assert(
      fc.property(validNonEmptyLoC(), validNonEmptyLoC(), validNonEmptyLoC(), (a, b, c) => {
        a.apply(b.whatChanged(c));
      })
    );
  });

  describe("whatChanged()", () => {
    it("should not define zeros on adjustment", () => {
      fc.assert(
        fc.property(validNonEmptyLoC(), validNonEmptyLoC(), (a, b) => {
          const change = a.whatChanged(b);

          return (
            change === undefined ||
            (change.type === "adjustment" &&
              !change.params.depositCollateral?.isZero &&
              !change.params.withdrawCollateral?.isZero &&
              !change.params.borrowZUSD?.isZero &&
              !change.params.repayZUSD?.isZero)
          );
        })
      );
    });

    it("should recreate a LoC with minimum debt at any borrowing rate", () => {
      fc.assert(
        fc.property(fc.float({ max: maximumOriginationRate }), originationRate => {
          const withMinimumDebt = LoC.recreate(
            new LoC(Decimal.ONE, ZUSD_MINIMUM_DEBT),
            originationRate
          );

          const ret = LoC.create(withMinimumDebt, originationRate).debt.gte(ZUSD_MINIMUM_DEBT);

          if (!ret) {
            console.log(`${LoC.create(withMinimumDebt, originationRate).debt}`);
          }

          return ret;
        })
      );
    });
  });
});
