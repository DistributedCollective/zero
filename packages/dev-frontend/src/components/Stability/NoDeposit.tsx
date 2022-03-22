import React, { useCallback } from "react";
import { Heading, Flex, Button, Text } from "theme-ui";
import { useStabilityView } from "./context/StabilityViewContext";
import { Yield } from "./Yield";
import { Card } from "../Card";

export const NoDeposit: React.FC = props => {
  const { dispatchEvent } = useStabilityView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  return (
    <Card
      heading={
        <>
          <Heading className="heading">Stability Pool</Heading>
          <Heading as="h3" className="subheading">
            You can earn RBTC by depositing ZUSD.
          </Heading>
        </>
      }
    >
      <Flex variant="layout.actions">
        <Text sx={{ fontStyle: "italic" }}>You have no ZUSD in the Stability Pool. </Text>
        <Flex sx={{ justifyContent: "flex-start", flex: 1, alignItems: "center" }}>
          <Yield />
        </Flex>
        <Button onClick={handleOpenTrove}>Deposit</Button>
      </Flex>
    </Card>
  );
};
