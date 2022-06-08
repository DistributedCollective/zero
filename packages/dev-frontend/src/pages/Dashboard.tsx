import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { Container } from "theme-ui";
import { useWeb3React } from "@web3-react/core";

import { Trove } from "../components/Trove/Trove";
import { Stability } from "../components/Stability/Stability";
import { SystemStats } from "../components/SystemStats";
import { PriceManager } from "../components/PriceManager";
import { Convert } from "../components/Aggregator/Convert";
import useTokenBalance from "../hooks/useTokenBalance";
import { addresses } from "../contracts/config";
import { isZero } from "../utils";

const select = ({ zusdBalance }: LiquityStoreState) => ({
  zusdBalance
});

export const Dashboard: React.FC = () => {
  const { account } = useWeb3React();
  const { zusdBalance } = useLiquitySelector(select);
  const { data } = useTokenBalance(account!, addresses.xusd);
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
