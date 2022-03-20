import React, { useCallback } from "react";
import { Card, Heading, Box, Flex, Button, Text } from "theme-ui";
import { InfoMessage } from "../InfoMessage";
import { useStabilityView } from "./context/StabilityViewContext";
import { RemainingZERO } from "./RemainingZERO";
import { Yield } from "./Yield";

export const NoDeposit: React.FC = props => {
  const { dispatchEvent } = useStabilityView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  return (
    <Card>
      <Heading>Stability Pool</Heading>
      <Heading as="h3" sx={{fontWeight:"light"}}> You can earn RBTC by depositing ZUSD.</Heading>
      <Box sx={{ p: [2, 3] }}>
        <Flex variant="layout.actions">
          <Text>You have no ZUSD in the Stability Pool. </Text>
          <Flex sx={{ justifyContent: "flex-start", flex: 1, alignItems: "center" }}>
            <Yield />
          </Flex>
          <Button onClick={handleOpenTrove}>Deposit</Button>
        </Flex>
      </Box>
    </Card>
  );
};
