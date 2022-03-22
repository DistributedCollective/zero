import React, { useState, useEffect } from "react";
import { Heading, Flex, Button, Label, Input } from "theme-ui";
import { Card } from "./Card";

import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../hooks/LiquityContext";

import { Icon } from "./Icon";
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

        <Label variant="unit" color="primary" backgroundColor="background">
          $
        </Label>

        <Input
          type={canSetPrice ? "number" : "text"}
          step="any"
          value={editedPrice}
          onChange={e => setEditedPrice(e.target.value)}
          disabled={!canSetPrice}
        />

        {canSetPrice && (
          <Flex sx={{ ml: 2, alignItems: "center" }}>
            <Transaction
              id="set-price"
              tooltip="Set"
              tooltipPlacement="bottom"
              send={overrides => {
                if (!editedPrice) {
                  throw new Error("Invalid price");
                }
                return liquity.setPrice(Decimal.from(editedPrice), overrides);
              }}
            >
              <Button variant="icon">
                <Icon name="chart-line" size="lg" />
              </Button>
            </Transaction>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};
