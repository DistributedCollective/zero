import React, { useCallback } from "react";
import { Heading, Flex, Button, Text } from "theme-ui";
import { useTroveView } from "./context/TroveViewContext";
import { Card } from "../Card";

export const NoTrove: React.FC = props => {
  const { dispatchEvent } = useTroveView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("OPEN_TROVE_PRESSED");
  }, [dispatchEvent]);

  return (
    <Card
      heading={
        <>
          <Heading className="heading">Line of Credit</Heading>
          <Heading as="h3" className="subheading" sx={{ fontWeight: "light" }}>
            You can borrow ZUSD by opening a Line of Credit.
          </Heading>
        </>
      }
    >
      <Flex variant="layout.actions">
        <Text sx={{ fontStyle: "italic" }}>You haven't borrowed any ZUSD yet. </Text>
        <Button onClick={handleOpenTrove}>Open Line of Credit</Button>
      </Flex>
    </Card>
  );
};
