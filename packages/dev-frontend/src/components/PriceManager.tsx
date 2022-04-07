import React, { useState, useEffect } from "react";
import { Box, Heading, Flex, Label, Input } from "theme-ui";
import { Card } from "./Card";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../hooks/LiquityContext";

const selectPrice = ({ price }: LiquityStoreState) => price;

export const PriceManager: React.FC = () => {
  const {
    liquity: {
      connection: { _priceFeedIsTestnet: canSetPrice }
    }
  } = useLiquity();

  const price = useLiquitySelector(selectPrice);
  const [editedPrice, setEditedPrice] = useState(price.toString(2));

  useEffect(() => {
    setEditedPrice(price.toString(2));
  }, [price]);

  return (
    <Card>
      <Heading className="heading">Price feed</Heading>
      <Flex sx={{ mt: 24, alignItems: "center" }}>
        <Label sx={{ mr: 2 }}>RBTC</Label>
        <Box sx={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
          <Label
            variant="unit"
            color="white"
            bg="zeroCardHeading"
            sx={{
              position: "absolute",
              left: 3
            }}
          >
            $
          </Label>

          <Input
            type={canSetPrice ? "number" : "text"}
            step="any"
            value={editedPrice}
            onChange={e => setEditedPrice(e.target.value)}
            disabled={!canSetPrice}
            sx={{ pl: 42, py: 3, color: "white", border: "none" }}
            bg="zeroCardHeading"
            min={0}
          />
        </Box>
      </Flex>
    </Card>
  );
};
