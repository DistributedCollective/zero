import { Button } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";

const selectZEROStake = ({ zeroStake }: LiquityStoreState) => zeroStake;

export const StakingGainsAction: React.FC = () => {
  const { liquity } = useLiquity();
  const { collateralGain, zusdGain } = useLiquitySelector(selectZEROStake);

  const [sendTransaction] = useTransactionFunction(
    "stake",
    liquity.send.withdrawGainsFromStaking.bind(liquity.send)
  );

  return (
    <Button onClick={sendTransaction} disabled={collateralGain.isZero && zusdGain.isZero}>
      Claim gains
    </Button>
  );
};
