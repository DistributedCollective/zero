import React, { useCallback } from "react";
import { Card, Heading, Box, Flex, Button, Text } from "theme-ui";
import { InfoMessage } from "../InfoMessage";
import { useTroveView } from "./context/TroveViewContext";

export const NoTrove: React.FC = props => {
  const { dispatchEvent } = useTroveView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("OPEN_TROVE_PRESSED");
  }, [dispatchEvent]);

  return (
    <Card>
      <Heading>Line of Credit</Heading>
      <Heading as="h3" sx={{fontWeight:"light"}}>You can borrow ZUSD by opening a Line of Credit.</Heading>
      <Box sx={{paddingTop:"72px", paddingLeft: "31px", paddingRight:"41px"}}>

        <Flex variant="layout.actions">
          <Text sx={{fontStyle: "italic"}}>You haven't borrowed any ZUSD yet. </Text>
          <Button onClick={handleOpenTrove}>Open Line of Credit</Button>
        </Flex>
      </Box>
    </Card>
  );
};
