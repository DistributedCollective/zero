import { Button } from "theme-ui";

import { Decimal } from "@sovryn-zero/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";

type RedemptionActionProps = {
  transactionId: string;
  disabled?: boolean;
  zusdAmount: Decimal;
  maxRedemptionRate: Decimal;
};

export const RedemptionAction: React.FC<RedemptionActionProps> = ({
  transactionId,
  disabled,
  zusdAmount,
  maxRedemptionRate
}) => {
  const {
    liquity: { send: liquity }
  } = useLiquity();

  const [sendTransaction] = useTransactionFunction(
    transactionId,
    liquity.redeemZUSD.bind(liquity, zusdAmount, maxRedemptionRate)
  );

  return (
    <Button data-action-id="zero-redeem-confirm" disabled={disabled} onClick={sendTransaction}>
      Confirm
    </Button>
  );
};
