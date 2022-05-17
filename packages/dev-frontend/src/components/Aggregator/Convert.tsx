import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { useWeb3React } from "@web3-react/core";
import React from "react";

import { Button, Flex, Heading, Text } from "theme-ui";
import { addresses } from "../../contracts/config";
import useTokenBalance from "../../hooks/useTokenBalance";
import useZusdAggregator from "../../hooks/useZusdAggregator";
import { isZero, parseBalance } from "../../utils";
import { Card } from "../Card";

const select = ({ zusdBalance }: LiquityStoreState) => ({
  zusdBalance
});

export const Convert: React.FC = () => {
  const { account } = useWeb3React();
  const { zusdBalance } = useLiquitySelector(select);
  const { data, decimals } = useTokenBalance(account!, addresses.xusd);
  const { mint, redeem } = useZusdAggregator(account);
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
          <Text> ZUSD Balance</Text>
          <Text sx={{ fontSize: 2, fontWeight: 700, mt: 2 }}>{zusdBalance.prettify()} ZUSD</Text>
          <Button
            onClick={() => mint(zusdBalance.toString())}
            disabled={zusdBalance.isZero}
            sx={{ mt: 3 }}
          >
            Convert All
          </Button>
        </Flex>

        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 300 }}>
          <Text> XUSD Balance</Text>
          <Text sx={{ fontSize: 2, fontWeight: 700, mt: 2 }}>
            {parseBalance(data ?? 0, decimals)} XUSD
          </Text>
          <Button
            onClick={() => redeem((data || "")?.toString())}
            disabled={isZero((data || "")?.toString())}
            sx={{ mt: 3 }}
          >
            Convert All
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};
