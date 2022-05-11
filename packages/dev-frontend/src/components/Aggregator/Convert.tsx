import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import React from "react";

import { Button, Flex, Heading, Text } from "theme-ui";
import { Card } from "../Card";

const select = ({ zusdBalance }: LiquityStoreState) => ({
  zusdBalance
});

export const Convert: React.FC = () => {
  const { zusdBalance } = useLiquitySelector(select);
  return (
    <Card
      heading={
        <>
          <Heading className="heading">Convert</Heading>
          <Heading as="h3" className="subheading">
            Convert ZUSD to XUSD and XUSD to ZUSD at 1:1 ratio
          </Heading>
        </>
      }
    >
      <Flex sx={{ alignItems: "center", justifyContent: "space-around", py: 4 }}>
        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 300 }}>
          <Text> ZUSD Balane</Text>
          <Text sx={{ fontSize: 2, fontWeight: 700, mt: 2 }}>{zusdBalance.prettify()} ZUSD</Text>
          <Button disabled={zusdBalance.isZero} sx={{ mt: 3 }}>
            Convert All
          </Button>
        </Flex>

        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 300 }}>
          <Text> XUSD Balane</Text>
          <Text sx={{ fontSize: 2, fontWeight: 700, mt: 2 }}>0 XUSD</Text>
          <Button disabled={true} sx={{ mt: 3 }}>
            Convert All
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};
