import React from "react";
import { Text, Flex, Box, Heading } from "theme-ui";

import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { COIN, COIN2, GT } from "../strings";
import { useLiquity } from "../hooks/LiquityContext";
import { shortenAddress } from "../utils/shortenAddress";

import { Icon } from "./Icon";

const select = ({ accountBalance, zusdBalance, zeroBalance, nueBalance }: LiquityStoreState) => ({
  accountBalance,
  zusdBalance,
  zeroBalance,
  nueBalance
});

export const UserAccount: React.FC = () => {
  const { account } = useLiquity();
  const { accountBalance, zusdBalance, zeroBalance, nueBalance } = useLiquitySelector(select);

  return (
    <Box sx={{ display: ["none", "flex"] }}>
      <Flex sx={{ alignItems: "center" }}>
        <Icon name="user-circle" size="lg" />
        <Flex sx={{ ml: 3, mr: 4, flexDirection: "column" }}>
          <Heading sx={{ fontSize: 1 }}>Connected as</Heading>
          <Text as="span" sx={{ fontSize: 1 }}>
            {shortenAddress(account)}
          </Text>
        </Flex>
      </Flex>

      <Flex sx={{ alignItems: "center" }}>
        <Icon name="wallet" size="lg" />

        {([
          ["RBTC", accountBalance],
          [COIN, zusdBalance],
          [COIN2, nueBalance],
          [GT, zeroBalance]
        ] as const).map(([currency, balance], i) => (
          <Flex key={i} sx={{ ml: 3, flexDirection: "column" }}>
            <Heading sx={{ fontSize: 1 }}>{currency}</Heading>
            <Text sx={{ fontSize: 1 }}>{balance.prettify()}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};
