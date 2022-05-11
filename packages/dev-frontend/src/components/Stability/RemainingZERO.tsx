import React from "react";
import { Flex } from "theme-ui";

import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

const selector = ({ remainingStabilityPoolZEROReward }: LiquityStoreState) => ({
  remainingStabilityPoolZEROReward
});

export const RemainingZERO: React.FC = () => {
  const { remainingStabilityPoolZEROReward } = useLiquitySelector(selector);

  return (
    <Flex sx={{ mr: 2, fontSize: 2, fontWeight: "medium" }}>
      {remainingStabilityPoolZEROReward.prettify(0)} ZERO remaining
    </Flex>
  );
};
