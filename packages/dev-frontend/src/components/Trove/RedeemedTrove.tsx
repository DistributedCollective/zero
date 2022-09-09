import React, { useCallback } from "react";
import { Box, Button, Flex } from "theme-ui";
import { CollateralSurplusAction } from "../CollateralSurplusAction";
import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";
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
    <>
      <Box sx={{ p: [2, 3] }}>
        <InfoMessage title="Your Line of Credit has been redeemed.">
          {hasSurplusCollateral
            ? "Please reclaim your remaining collateral before opening a new Line of Credit."
            : "You can borrow ZUSD by opening a new Line of Credit."}
        </InfoMessage>

        <Flex variant="layout.cta">
          {hasSurplusCollateral && <CollateralSurplusAction />}
          {!hasSurplusCollateral && (
            <Button onClick={handleOpenTrove} data-action-id="zero-dashboard-openLOC">
              Open Line of Credit
            </Button>
          )}
        </Flex>
      </Box>
    </>
  );
};
