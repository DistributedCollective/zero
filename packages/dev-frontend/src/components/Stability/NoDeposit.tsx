import React, { useCallback } from "react";
import { Flex, Button, Text } from "theme-ui";
import { useStabilityView } from "./context/StabilityViewContext";
import { Yield } from "./Yield";

export const NoDeposit: React.FC = props => {
  const { dispatchEvent } = useStabilityView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  return (
    <Flex sx={{ px: 20 }} variant="layout.actions">
      <Text sx={{ fontStyle: "italic" }}>You have no ZUSD in the Stability Pool. </Text>
      <Flex sx={{ justifyContent: "flex-start", flex: 1, alignItems: "center" }}>
        <Yield />
      </Flex>
      <Button onClick={handleOpenTrove} data-action-id="zero-dashboard-depositStability">
        Deposit
      </Button>
    </Flex>
  );
};
