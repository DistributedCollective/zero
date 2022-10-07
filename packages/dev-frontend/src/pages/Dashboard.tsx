import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";
import { Container } from "theme-ui";

import { Trove } from "../components/Trove/Trove";
import { Stability } from "../components/Stability/Stability";
import { SystemStats } from "../components/SystemStats";
import { PriceManager } from "../components/PriceManager";
import { Convert } from "../components/Aggregator/Convert";
import useTokenBalance from "../hooks/useTokenBalance";
import { addresses } from "../contracts/config";
import { isZero } from "../utils";
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
