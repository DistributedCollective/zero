import React from "react";
import { Text, Flex, Box, Heading } from "theme-ui";

import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { COIN } from "../strings";

import { Icon } from "./Icon";
import useTokenBalance from "../hooks/useTokenBalance";
import { useWeb3React } from "@web3-react/core";
import { addresses } from "../contracts/config";
import { parseBalance } from "../utils";

const select = ({ accountBalance, zusdBalance, zeroBalance, nueBalance }: LiquityStoreState) => ({
  accountBalance,
  zusdBalance,
  zeroBalance,
  nueBalance
});

export const UserAccount: React.FC = () => {
  const { accountBalance, zusdBalance } = useLiquitySelector(select);
  const { account } = useWeb3React();
  const { data, decimals } = useTokenBalance(account!, addresses.xusd);

  return (
    <Box sx={{ display: ["none", "flex"] }}>
      <Flex sx={{ alignItems: "center" }}>
        <Icon name="wallet" size="lg" />

        {([
          ["RBTC", accountBalance],
          [COIN, zusdBalance]
          // [GT, zeroBalance]
        ] as const).map(([currency, balance], i) => (
          <Flex key={i} sx={{ ml: 3, flexDirection: "column", fontWeight: 600 }}>
            <Heading sx={{ fontSize: 1, fontWeight: 700 }}>{currency}</Heading>
            <Text sx={{ fontSize: 1 }}>{balance.prettify()}</Text>
          </Flex>
        ))}
        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 600 }}>
          <Heading sx={{ fontSize: 1, fontWeight: 700 }}>XUSD</Heading>
          <Text sx={{ fontSize: 1 }}>{parseBalance(data ?? 0, decimals)}</Text>
        </Flex>
      </Flex>
    </Box>
  );
};
