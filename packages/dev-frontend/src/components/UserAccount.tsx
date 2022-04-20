import React from "react";
import { Text, Flex, Box, Heading } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COIN2 } from "../strings";

import { Icon } from "./Icon";

const select = ({ accountBalance, zusdBalance, zeroBalance, nueBalance }: LiquityStoreState) => ({
  accountBalance,
  zusdBalance,
  zeroBalance,
  nueBalance
});

export const UserAccount: React.FC = () => {
  const { accountBalance, zusdBalance, nueBalance } = useLiquitySelector(select);

  return (
    <Box sx={{ display: ["none", "flex"] }}>
      <Flex sx={{ alignItems: "center" }}>
        <Icon name="wallet" size="lg" />

        {([
          ["RBTC", accountBalance],
          [COIN, zusdBalance],
          [COIN2, nueBalance]
          // [GT, zeroBalance]
        ] as const).map(([currency, balance], i) => (
          <Flex key={i} sx={{ ml: 3, flexDirection: "column", fontWeight: 600 }}>
            <Heading sx={{ fontSize: 1, fontWeight: 700 }}>{currency}</Heading>
            <Text sx={{ fontSize: 1 }}>{balance.prettify()}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};
