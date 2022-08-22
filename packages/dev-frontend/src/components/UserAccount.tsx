import React from "react";
import { Text, Flex, Box, Heading, Card } from "theme-ui";

import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { COIN } from "../strings";

import { Icon } from "./Icon";
import useTokenBalance from "../hooks/useTokenBalance";
import { addresses } from "../contracts/config";
import { useConnectorContext } from "./Connector";
import Tippy from "@tippyjs/react";

const select = ({ accountBalance, zusdBalance, zeroBalance, nueBalance }: LiquityStoreState) => ({
  accountBalance,
  zusdBalance,
  zeroBalance,
  nueBalance
});

export const UserAccount: React.FC = () => {
  const { accountBalance, zusdBalance } = useLiquitySelector(select);

  const { walletAddress } = useConnectorContext();
  const { balance: xusdBalance } = useTokenBalance(walletAddress!, addresses.xusd);

  return (
    <Box sx={{ display: ["none", "flex"] }}>
      <Flex sx={{ alignItems: "center" }}>
        <Icon name="wallet" size="lg" />

        {([
          ["RBTC", accountBalance],
          [COIN, zusdBalance],
          ["XUSD", xusdBalance]
        ] as const).map(([currency, balance], i) => (
          <Flex key={i} sx={{ ml: 3, flexDirection: "column", fontWeight: 600 }}>
            <Heading sx={{ fontSize: 1, fontWeight: 700 }}>{currency}</Heading>

            <Tippy
              disabled={balance.isZero}
              content={<Card variant="tooltip">{balance.toString()}</Card>}
            >
              <Text sx={{ fontSize: 1 }}>{balance.prettify()}</Text>
            </Tippy>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};
