import {
  Decimal,
  LiquityStoreState,
  StabilityDeposit,
  StabilityDepositChange
} from "@liquity/lib-base";

import { COIN } from "../../../strings";
import { Amount } from "../../ActionDescription";
import { ErrorDescription } from "../../ErrorDescription";
import { StabilityActionDescription } from "../StabilityActionDescription";

export const selectForStabilityDepositChangeValidation = ({
  trove,
  zusdBalance,
  ownFrontend,
  haveUndercollateralizedTroves
}: LiquityStoreState) => ({
  trove,
  zusdBalance,
  haveOwnFrontend: ownFrontend.status === "registered",
  haveUndercollateralizedTroves
});

type StabilityDepositChangeValidationContext = ReturnType<
  typeof selectForStabilityDepositChangeValidation
>;

export const validateStabilityDepositChange = (
  originalDeposit: StabilityDeposit,
  editedZUSD: Decimal,
  {
    zusdBalance,
    haveOwnFrontend,
    haveUndercollateralizedTroves
  }: StabilityDepositChangeValidationContext
): [
  validChange: StabilityDepositChange<Decimal> | undefined,
  description: JSX.Element | undefined
] => {
  const change = originalDeposit.whatChanged(editedZUSD);

  if (haveOwnFrontend) {
    return [
      undefined,
      <ErrorDescription>
        You can’t deposit using a wallet address that is registered as a frontend.
      </ErrorDescription>
    ];
  }

  if (!change) {
    return [undefined, undefined];
  }

  if (change.depositZUSD?.gt(zusdBalance)) {
    return [
      undefined,
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount>
          {change.depositZUSD.sub(zusdBalance).prettify()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    ];
  }

  if (change.withdrawZUSD && haveUndercollateralizedTroves) {
    return [
      undefined,
      <ErrorDescription>
        You're not allowed to withdraw ZUSD from your Stability Deposit when there are
        undercollateralized Troves. Please liquidate those Troves or try again later.
      </ErrorDescription>
    ];
  }

  return [change, <StabilityActionDescription originalDeposit={originalDeposit} change={change} />];
};
