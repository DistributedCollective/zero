import React from "react";
import { Button } from "theme-ui";

import { useLiquity } from "../../../hooks/LiquityContext";
import { useTransactionFunction } from "../../Transaction";

type ClaimRewardsProps = {
  disabled?: boolean;
  actionId: string;
};

export const ClaimRewards: React.FC<ClaimRewardsProps> = ({ disabled, children, actionId }) => {
  const { liquity } = useLiquity();

  const [sendTransaction] = useTransactionFunction(
    "stability-deposit",
    liquity.send.withdrawGainsFromStabilityPool.bind(liquity.send)
  );

  return (
    <Button data-action-id={actionId} variant="cancel" onClick={sendTransaction} disabled={disabled}>
      {children}
    </Button>
  );
};
