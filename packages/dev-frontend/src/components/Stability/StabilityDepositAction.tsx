import { Button } from "theme-ui";
import { Decimal, LiquityStoreState, StabilityDepositChange } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";

type StabilityDepositActionProps = {
  transactionId: string;
  change: StabilityDepositChange<Decimal>;
  actionId: string;
};

const selectFrontendRegistered = ({ frontend }: LiquityStoreState) =>
  frontend.status === "registered";

export const StabilityDepositAction: React.FC<StabilityDepositActionProps> = ({
  children,
  transactionId,
  change,
  actionId
}) => {
  const { config, liquity } = useLiquity();
  const frontendRegistered = useLiquitySelector(selectFrontendRegistered);

  const frontendTag = frontendRegistered ? config.frontendTag : undefined;

  const [sendTransaction] = useTransactionFunction(
    transactionId,
    change.depositZUSD
      ? liquity.send.depositZUSDInStabilityPool.bind(liquity.send, change.depositZUSD, frontendTag)
      : liquity.send.withdrawZUSDFromStabilityPool.bind(liquity.send, change.withdrawZUSD)
  );

  return (
    <Button data-action-id={actionId} onClick={sendTransaction}>
      {children}
    </Button>
  );
};
