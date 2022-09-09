import React from "react";

import { Decimal, StabilityDeposit, StabilityDepositChange } from "@sovryn-zero/lib-base";

import { COIN, GT } from "../../strings";
import { ActionDescription, Amount } from "../ActionDescription";

type StabilityActionDescriptionProps = {
  originalDeposit: StabilityDeposit;
  change: StabilityDepositChange<Decimal>;
};

export const StabilityActionDescription: React.FC<StabilityActionDescriptionProps> = ({
  originalDeposit,
  change
}) => {
  const collateralGain = originalDeposit.collateralGain.nonZero?.prettify(4).concat(" RBTC");
  const zeroReward = originalDeposit.zeroReward.nonZero?.prettify().concat(" ", GT);

  return (
    <ActionDescription>
      {change.depositZUSD ? (
        <>
          You are depositing{" "}
          <Amount value={change.depositZUSD}>
            {change.depositZUSD.prettify()} {COIN}
          </Amount>{" "}
          in the Stability Pool
        </>
      ) : (
        <>
          You are withdrawing{" "}
          <Amount value={change.withdrawZUSD}>
            {change.withdrawZUSD.prettify()} {COIN}
          </Amount>{" "}
          to your wallet
        </>
      )}
      {(collateralGain || zeroReward) && (
        <>
          {" "}
          and claiming at least{" "}
          {collateralGain && zeroReward ? (
            <>
              <Amount>{collateralGain}</Amount> and <Amount>{zeroReward}</Amount>
            </>
          ) : (
            <Amount>{collateralGain ?? zeroReward}</Amount>
          )}
        </>
      )}
      .
    </ActionDescription>
  );
};
