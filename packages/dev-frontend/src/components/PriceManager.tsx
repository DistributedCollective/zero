import React, { useState, useEffect } from "react";
import { Box, Heading, Flex, Button, Label, Input } from "theme-ui";
import { Card } from "./Card";

import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../hooks/LiquityContext";

import { Transaction } from "./Transaction";

const selectPrice = ({ price }: LiquityStoreState) => price;

export const PriceManager: React.FC = () => {
  const {
    liquity: {
      send: liquity,
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
      <Flex sx={{ mt: 24 }}>
        <Label>RBTC</Label>
        <Box sx={{width: "330px", position: "relative", display: "flex", alignItems: "center" }}>
          <Label
            variant="unit"
            color="white"
            bg="zeroCardHeading"
            sx={{
              position: "absolute",
              left: 1
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
            sx={{ pl: 20 }}
          />
        </Box>
      </Flex>
    </Card>
  );
};
