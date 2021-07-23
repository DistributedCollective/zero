import { Button } from "theme-ui";
import { Decimal, LiquityStoreState, StabilityDepositChange } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";

type StabilityDepositActionProps = {
  transactionId: string;
  change: StabilityDepositChange<Decimal>;
};

const selectFrontendRegistered = ({ frontend }: LiquityStoreState) =>
  frontend.status === "registered";

export const StabilityDepositAction: React.FC<StabilityDepositActionProps> = ({
  children,
  transactionId,
  change
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

  return <Button onClick={sendTransaction}>{children}</Button>;
};
