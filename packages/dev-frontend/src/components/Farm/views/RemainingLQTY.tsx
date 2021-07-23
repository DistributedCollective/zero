import React from "react";
import { Flex } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

const selector = ({ remainingLiquidityMiningZEROReward }: LiquityStoreState) => ({
  remainingLiquidityMiningZEROReward
});

export const RemainingZERO: React.FC = () => {
  const { remainingLiquidityMiningZEROReward } = useLiquitySelector(selector);

  return (
    <Flex sx={{ mr: 2, fontSize: 2, fontWeight: "medium" }}>
      {remainingLiquidityMiningZEROReward.prettify(0)} ZERO remaining
    </Flex>
  );
};
