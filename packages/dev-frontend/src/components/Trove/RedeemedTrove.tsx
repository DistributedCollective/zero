import React, { useCallback } from "react";
import { Card, Box, Button, Flex } from "theme-ui";
import { CollateralSurplusAction } from "../CollateralSurplusAction";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { useTroveView } from "./context/TroveViewContext";
import { InfoMessage } from "../InfoMessage";

const select = ({ collateralSurplusBalance }: LiquityStoreState) => ({
  hasSurplusCollateral: !collateralSurplusBalance.isZero
});

export const RedeemedTrove: React.FC = () => {
  const { hasSurplusCollateral } = useLiquitySelector(select);
  const { dispatchEvent } = useTroveView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("OPEN_TROVE_PRESSED");
  }, [dispatchEvent]);

  return (
    <Card>
      <Box sx={{ p: [2, 3] }}>
        <InfoMessage title="Your Line of Credit has been redeemed.">
          {hasSurplusCollateral
            ? "Please reclaim your remaining collateral before opening a new Line of Credit."
            : "You can borrow ZUSD by opening a new Line of Credit."}
        </InfoMessage>

        <Flex variant="layout.actions">
          {hasSurplusCollateral && <CollateralSurplusAction />}
          {!hasSurplusCollateral && <Button onClick={handleOpenTrove}>Open Line of Credit</Button>}
        </Flex>
      </Box>
    </Card>
  );
};
