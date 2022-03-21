import React, { useCallback } from "react";
<<<<<<< HEAD
<<<<<<< HEAD
import { Heading, Flex, Button, Text } from "theme-ui";
=======
=======
>>>>>>> ee41cab4... restyle card Header, Subheader and content
import { Card, Heading, Box, Flex, Button, Text } from "theme-ui";
import { InfoMessage } from "../InfoMessage";
>>>>>>> ee41cab4... restyle card Header, Subheader and content
import { useStabilityView } from "./context/StabilityViewContext";
import { Yield } from "./Yield";
import { Card } from "../Card";

export const NoDeposit: React.FC = props => {
  const { dispatchEvent } = useStabilityView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  return (
<<<<<<< HEAD
<<<<<<< HEAD
    <Card
      heading={
        <>
          <Heading className="heading">Stability Pool</Heading>
          <Heading as="h3" className="subheading" sx={{ fontWeight: "light" }}>
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
=======
=======
>>>>>>> ee41cab4... restyle card Header, Subheader and content
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
>>>>>>> ee41cab4... restyle card Header, Subheader and content
    </Card>
  );
};
