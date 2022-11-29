import {
  Decimal,
  ZUSD_MINIMUM_DEBT,
  Trove,
  TroveAdjustmentParams,
  TroveChange,
  Percent,
  MINIMUM_COLLATERAL_RATIO,
  CRITICAL_COLLATERAL_RATIO,
  LiquityStoreState,
  TroveClosureParams,
  TroveCreationParams
} from "@sovryn-zero/lib-base";

import { COIN, COIN2 } from "../../../strings";

import { ActionDescription, Amount } from "../../ActionDescription";
import { ErrorDescription } from "../../ErrorDescription";

const mcrPercent = new Percent(MINIMUM_COLLATERAL_RATIO).toString(0);
const ccrPercent = new Percent(CRITICAL_COLLATERAL_RATIO).toString(0);

type TroveAdjustmentDescriptionParams = {
  params: TroveAdjustmentParams<Decimal>;
  useNueBalance: Boolean;
};

const TroveChangeDescription: React.FC<TroveAdjustmentDescriptionParams> = ({
  params,
  useNueBalance
}) => (
  <ActionDescription>
    {params.depositCollateral && params.borrowZUSD ? (
      <>
        You will deposit{" "}
        <Amount value={params.depositCollateral}>{params.depositCollateral.prettify()} RBTC</Amount>{" "}
        and receive{" "}
        <Amount value={params.borrowZUSD}>
          {params.borrowZUSD.prettify()} {useNueBalance ? COIN2 : COIN}
        </Amount>
      </>
    ) : params.repayZUSD && params.withdrawCollateral ? (
      <>
        You will pay{" "}
        <Amount value={params.repayZUSD}>
          {params.repayZUSD.prettify()} {useNueBalance ? COIN2 : COIN}
        </Amount>{" "}
        and receive{" "}
        <Amount value={params.withdrawCollateral}>
          {params.withdrawCollateral.prettify()} RBTC
        </Amount>
      </>
    ) : params.depositCollateral && params.repayZUSD ? (
      <>
        You will deposit{" "}
        <Amount value={params.depositCollateral}>{params.depositCollateral.prettify()} RBTC</Amount>{" "}
        and pay{" "}
        <Amount value={params.repayZUSD}>
          {params.repayZUSD.prettify()} {useNueBalance ? COIN2 : COIN}
        </Amount>
      </>
    ) : params.borrowZUSD && params.withdrawCollateral ? (
      <>
        You will receive{" "}
        <Amount value={params.withdrawCollateral}>
          {params.withdrawCollateral.prettify()} RBTC
        </Amount>{" "}
        and{" "}
        <Amount value={params.borrowZUSD}>
          {params.borrowZUSD.prettify()} {useNueBalance ? COIN2 : COIN}
        </Amount>
      </>
    ) : params.depositCollateral ? (
      <>
        You will deposit{" "}
        <Amount value={params.depositCollateral}>{params.depositCollateral.prettify()} RBTC</Amount>
      </>
    ) : params.withdrawCollateral ? (
      <>
        You will receive{" "}
        <Amount value={params.withdrawCollateral}>
          {params.withdrawCollateral.prettify()} RBTC
        </Amount>
      </>
    ) : params.borrowZUSD ? (
      <>
        You will receive{" "}
        <Amount value={params.borrowZUSD}>
          {params.borrowZUSD.prettify()} {useNueBalance ? COIN2 : COIN}
        </Amount>
      </>
    ) : (
      <>
        You will pay{" "}
        <Amount value={params.repayZUSD}>
          {params.repayZUSD.prettify()} {useNueBalance ? COIN2 : COIN}
        </Amount>
      </>
    )}
    .
  </ActionDescription>
);

export const selectForTroveChangeValidation = ({
  price,
  total,
  accountBalance,
  zusdBalance,
  nueBalance,
  numberOfTroves
}: LiquityStoreState) => ({ price, total, accountBalance, zusdBalance, nueBalance, numberOfTroves });

type TroveChangeValidationSelectedState = ReturnType<typeof selectForTroveChangeValidation>;

interface TroveChangeValidationContext extends TroveChangeValidationSelectedState {
  originalTrove: Trove;
  resultingTrove: Trove;
  recoveryMode: boolean;
  wouldTriggerRecoveryMode: boolean;
}

export const validateTroveChange = (
  originalTrove: Trove,
  adjustedTrove: Trove,
  borrowingRate: Decimal,
  useNueBalance: Boolean,
  selectedState: TroveChangeValidationSelectedState
): [
  validChange: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }> | undefined,
  description: JSX.Element | undefined
] => {
  const { total, price } = selectedState;
  const change = originalTrove.whatChanged(adjustedTrove, borrowingRate);

  if (!change) {
    return [undefined, undefined];
  }

  // Reapply change to get the exact state the Trove will end up in (which could be slightly
  // different from `edited` due to imprecision).
  const resultingTrove = originalTrove.apply(change, borrowingRate);
  const recoveryMode = total.collateralRatioIsBelowCritical(price);
  const wouldTriggerRecoveryMode = total
    .subtract(originalTrove)
    .add(resultingTrove)
    .collateralRatioIsBelowCritical(price);

  const context: TroveChangeValidationContext = {
    ...selectedState,
    originalTrove,
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode
  };

  if (change.type === "invalidCreation") {
    // Trying to create a Trove with negative net debt
    return [
      undefined,
      <ErrorDescription>
        Total debt must be at least{" "}
        <Amount value={ZUSD_MINIMUM_DEBT}>
          {ZUSD_MINIMUM_DEBT.toString()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    ];
  }

  const errorDescription =
    change.type === "creation"
      ? validateTroveCreation(change.params, context)
      : change.type === "closure"
      ? validateTroveClosure(useNueBalance, change.params, context)
      : validateTroveAdjustment(useNueBalance, change.params, context);

  if (errorDescription) {
    return [undefined, errorDescription];
  }

  return [change, <TroveChangeDescription params={change.params} useNueBalance={useNueBalance} />];
};

const validateTroveCreation = (
  { depositCollateral }: TroveCreationParams<Decimal>,
  {
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode,
    accountBalance,
    price
  }: TroveChangeValidationContext
): JSX.Element | null => {
  if (resultingTrove.debt.lt(ZUSD_MINIMUM_DEBT)) {
    return (
      <ErrorDescription>
        Total debt must be at least{" "}
        <Amount value={ZUSD_MINIMUM_DEBT}>
          {ZUSD_MINIMUM_DEBT.toString()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    );
  }

  if (recoveryMode) {
    if (!resultingTrove.isOpenableInRecoveryMode(price)) {
      return (
        <ErrorDescription>
          You're not allowed to open a Line of Credit with less than <Amount>{ccrPercent}</Amount>{" "}
          Collateral Ratio during recovery mode. Please increase your Line of Credit's Collateral
          Ratio.
        </ErrorDescription>
      );
    }
  } else {
    if (resultingTrove.collateralRatioIsBelowMinimum(price)) {
      return (
        <ErrorDescription>
          Collateral ratio must be at least <Amount>{mcrPercent}</Amount>.
        </ErrorDescription>
      );
    }

    if (wouldTriggerRecoveryMode) {
      return (
        <ErrorDescription>
          You're not allowed to open a Line of Credit that would cause the Total Collateral Ratio to
          fall below <Amount>{ccrPercent}</Amount>. Please increase your Line of Credit's Collateral
          Ratio.
        </ErrorDescription>
      );
    }
  }

  if (depositCollateral.gt(accountBalance)) {
    return (
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount value={depositCollateral.sub(accountBalance)}>
          {depositCollateral.sub(accountBalance).prettify()} RBTC
        </Amount>
        .
      </ErrorDescription>
    );
  }

  return null;
};

const validateTroveAdjustment = (
  useNueBalance: Boolean,
  { depositCollateral, withdrawCollateral, borrowZUSD, repayZUSD }: TroveAdjustmentParams<Decimal>,
  {
    originalTrove,
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode,
    price,
    accountBalance,
    zusdBalance,
    nueBalance
  }: TroveChangeValidationContext
): JSX.Element | null => {
  if (recoveryMode) {
    if (withdrawCollateral) {
      return (
        <ErrorDescription>
          You're not allowed to withdraw collateral during recovery mode.
        </ErrorDescription>
      );
    }

    if (borrowZUSD) {
      if (resultingTrove.collateralRatioIsBelowCritical(price)) {
        return (
          <ErrorDescription>
            Your collateral ratio must be at least <Amount>{ccrPercent}</Amount> to borrow during
            recovery mode. Please improve your collateral ratio.
          </ErrorDescription>
        );
      }

      if (resultingTrove.collateralRatio(price).lt(originalTrove.collateralRatio(price))) {
        return (
          <ErrorDescription>
            You're not allowed to decrease your collateral ratio during recovery mode.
          </ErrorDescription>
        );
      }
    }
  } else {
    if (resultingTrove.collateralRatioIsBelowMinimum(price)) {
      return (
        <ErrorDescription>
          Collateral ratio must be at least <Amount>{mcrPercent}</Amount>.
        </ErrorDescription>
      );
    }

    if (wouldTriggerRecoveryMode) {
      return (
        <ErrorDescription>
          The adjustment you're trying to make would cause the Total Collateral Ratio to fall below{" "}
          <Amount>{ccrPercent}</Amount>. Please increase your Line of Credit's Collateral Ratio.
        </ErrorDescription>
      );
    }
  }

  if (repayZUSD) {
    if (resultingTrove.debt.lt(ZUSD_MINIMUM_DEBT)) {
      return (
        <ErrorDescription>
          Total debt must be at least{" "}
          <Amount value={ZUSD_MINIMUM_DEBT}>
            {ZUSD_MINIMUM_DEBT.toString()} {useNueBalance ? COIN2 : COIN}
          </Amount>
          .
        </ErrorDescription>
      );
    }

    const repayBalance = useNueBalance ? nueBalance : zusdBalance;
    if (repayZUSD?.gt(repayBalance)) {
      return (
        <ErrorDescription>
          The amount you're trying to repay exceeds your balance by{" "}
          <Amount value={repayZUSD.sub(repayBalance)}>
            {repayZUSD.sub(repayBalance).prettify()} {useNueBalance ? COIN2 : COIN}
          </Amount>
          .
        </ErrorDescription>
      );
    }
  }

  if (depositCollateral?.gt(accountBalance)) {
    return (
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount value={depositCollateral.sub(accountBalance)}>
          {depositCollateral.sub(accountBalance).prettify()} RBTC
        </Amount>
        .
      </ErrorDescription>
    );
  }

  return null;
};

const validateTroveClosure = (
  useNueBalance: Boolean,
  { repayZUSD }: TroveClosureParams<Decimal>,
  {
    recoveryMode,
    wouldTriggerRecoveryMode,
    numberOfTroves,
    nueBalance,
    zusdBalance
  }: TroveChangeValidationContext
): JSX.Element | null => {
  if (numberOfTroves === 1) {
    return (
      <ErrorDescription>
        You're not allowed to close your Line of Credit when there are no other Lines of Credit in
        the system.
      </ErrorDescription>
    );
  }

  if (recoveryMode) {
    return (
      <ErrorDescription>
        You're not allowed to close your Line of Credit during recovery mode.
      </ErrorDescription>
    );
  }

  const repayBalance = useNueBalance ? nueBalance : zusdBalance;
  if (repayZUSD?.gt(repayBalance)) {
    return (
      <ErrorDescription>
        You need{" "}
        <Amount value={repayZUSD.sub(repayBalance)}>
          {repayZUSD.sub(repayBalance).prettify()} {useNueBalance ? COIN2 : COIN}
        </Amount>{" "}
        more to close your Line of Credit.
      </ErrorDescription>
    );
  }

  if (wouldTriggerRecoveryMode) {
    return (
      <ErrorDescription>
        You're not allowed to close a Line of Credit if it would cause the Total Collateralization
        Ratio to fall below <Amount>{ccrPercent}</Amount>. Please wait until the Total Collateral
        Ratio increases.
      </ErrorDescription>
    );
  }

  return null;
};
