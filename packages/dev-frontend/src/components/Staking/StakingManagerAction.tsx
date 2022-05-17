import { Button } from "theme-ui";

import { Decimal, ZEROStakeChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";

type StakingActionProps = {
  change: ZEROStakeChange<Decimal>;
};

export const StakingManagerAction: React.FC<StakingActionProps> = ({ change, children }) => {
  const { liquity } = useLiquity();

  const [sendTransaction] = useTransactionFunction(
    "stake",
    change.stakeZERO
      ? liquity.send.stakeZERO.bind(liquity.send, change.stakeZERO)
      : liquity.send.unstakeZERO.bind(liquity.send, change.unstakeZERO)
  );

  return <Button onClick={sendTransaction}>{children}</Button>;
};
