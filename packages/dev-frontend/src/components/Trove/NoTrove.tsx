import React, { useCallback } from "react";
import { Flex, Button, Text } from "theme-ui";
import { useTroveView } from "./context/TroveViewContext";

export const NoTrove: React.FC = props => {
  const { dispatchEvent } = useTroveView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("OPEN_TROVE_PRESSED");
  }, [dispatchEvent]);

  return (
    <Flex sx={{ px: 20 }} variant="layout.actions">
      <Text sx={{ fontStyle: "italic" }}>You haven't borrowed any ZUSD yet. </Text>
      <Button onClick={handleOpenTrove}>Open Line of Credit</Button>
    </Flex>
  );
};
