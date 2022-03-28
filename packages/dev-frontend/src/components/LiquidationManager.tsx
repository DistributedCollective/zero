import { text } from "@fortawesome/fontawesome-svg-core";
import React, { useState } from "react";
import { Card, Box, Heading, Flex, Button, Label, Input } from "theme-ui";

import { useLiquity } from "../hooks/LiquityContext";

import { Icon } from "./Icon";
import { Transaction } from "./Transaction";

export const LiquidationManager: React.FC = () => {
  const {
    liquity: { send: liquity }
  } = useLiquity();
  const [numberOfTrovesToLiquidate, setNumberOfTrovesToLiquidate] = useState("");

  return (
    <Card>
      <Box sx={{ p: [2, 3] }}>
        <Flex sx={{ alignItems: "center" }}>
          <Label sx={{ pr: "18px" }}>Liquidate up to</Label>

          <Input
            type="number"
            min="1"
            step="1"
            value={numberOfTrovesToLiquidate}
            placeholder="90"
            onChange={e => setNumberOfTrovesToLiquidate(e.target.value)}
            sx={{ border: "solid", maxWidth: "70px", color: "text", textAlign: "center" }}
          />

          <Label sx={{ pl: "18px" }}>Lines of Credit</Label>

          <Flex sx={{ ml: 2, alignItems: "center" }}>
            <Transaction
              id="batch-liquidate"
              tooltip="Liquidate"
              tooltipPlacement="bottom"
              send={overrides => {
                if (!numberOfTrovesToLiquidate) {
                  throw new Error("Invalid number");
                }
                return liquity.liquidateUpTo(parseInt(numberOfTrovesToLiquidate, 10), overrides);
              }}
            >
              <Button variant="dangerIcon" sx={{ pl: "23px", pr: "66px" }}>
                <Icon name="trash" size="lg" />
              </Button>
            </Transaction>
          </Flex>
        </Flex>
      </Box>
    </Card>
  );
};
