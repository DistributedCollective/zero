import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";
import { Container, Flex, Text, Link } from "theme-ui";

import { Trove } from "../components/Trove/Trove";
import { Stability } from "../components/Stability/Stability";
import { SystemStats } from "../components/SystemStats";
import { PriceManager } from "../components/PriceManager";
import { Convert } from "../components/Aggregator/Convert";
import useTokenBalance from "../hooks/useTokenBalance";
import { addresses } from "../contracts/config";
import { isZero, isMainnet } from "../utils";
import { useConnectorContext } from "src/components/Connector";

const select = ({ zusdBalance }: LiquityStoreState) => ({
  zusdBalance
});

export const Dashboard: React.FC = () => {
  const { walletAddress } = useConnectorContext();
  const { zusdBalance } = useLiquitySelector(select);
  const { data } = useTokenBalance(walletAddress!, addresses.xusd);
  const usdBalanceIsZero = zusdBalance.isZero && isZero((data || "")?.toString());
  return (
    <Container variant="columns">
      <Flex
        sx={{
          justifyContent: "center",
          flexDirection: "row",
          width: "100%",
          mt: 4,
          mx: 4
        }}
      >
        <Flex
          sx={{
            alignItems: "center",
            justifyContent: "center",
            py: 2,
            px: 4,
            borderRadius: 15,
            backgroundColor: "cardBackground"
          }}
        >
          <Text sx={{ fontWeight: 400, px: 2 }}>
            ZUSD to XUSD conversions are currently paused to preserve BabelFish stability and
            liquidity. You can find more information{" "}
            <Link
              href={`https://${!isMainnet ? "live" : "test"}.sovryn.app/zero`}
              variant="redemption"
            >
              here
            </Link>
            .
          </Text>
        </Flex>
      </Flex>

      <Container variant="left">
        {!usdBalanceIsZero && <Convert />}
        <Trove />
        <Stability />
      </Container>

      <Container variant="right">
        <SystemStats />
        <PriceManager />
      </Container>
    </Container>
  );
};
