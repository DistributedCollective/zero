import React, { useCallback } from "react";
import { Box, Flex, Button } from "theme-ui";
import { useLiquitySelector } from "@sovryn-zero/lib-react";
import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { DisabledEditableRow } from "./Editor";
import { useTroveView } from "./context/TroveViewContext";
import { COIN } from "../../strings";
import { CollateralRatio } from "./CollateralRatio";

const select = ({ trove, price }: LiquityStoreState) => ({ trove, price });

export const ReadOnlyTrove: React.FC = () => {
  const { dispatchEvent } = useTroveView();
  const handleAdjustTrove = useCallback(() => {
    dispatchEvent("ADJUST_TROVE_PRESSED");
  }, [dispatchEvent]);
  const handleCloseTrove = useCallback(() => {
    dispatchEvent("CLOSE_TROVE_PRESSED");
  }, [dispatchEvent]);

  const { trove, price } = useLiquitySelector(select);

  // console.log("READONLY TROVE", trove.collateral.prettify(4));
  return (
    <>
      <Box sx={{ p: [2, 3] }}>
        <Flex>
          <DisabledEditableRow
            label="Collateral"
            inputId="trove-collateral"
            amount={trove.collateral.prettify(4)}
            value={trove.collateral}
            unit="RBTC"
          />

          <DisabledEditableRow
            label="Debt"
            inputId="trove-debt"
            amount={trove.debt.prettify()}
            value={trove.debt}
            unit={COIN}
          />
        </Flex>
        <Box sx={{ mt: 30 }}>
          <CollateralRatio value={trove.collateralRatio(price)} />
        </Box>
      </Box>
      <Flex variant="layout.cta">
        <Button onClick={handleCloseTrove}>Close Line of Credit</Button>
        <Button onClick={handleAdjustTrove}>Adjust</Button>
      </Flex>
    </>
  );
};
