import { Heading, Box, Card, Flex, Button } from "theme-ui";

import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { COIN, GT } from "../../strings";

import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { Icon } from "../Icon";

import { useStakingView } from "./context/StakingViewContext";
import { StakingGainsAction } from "./StakingGainsAction";

const select = ({ zeroStake, totalStakedZERO }: LiquityStoreState) => ({
  zeroStake,
  totalStakedZERO
});

export const ReadOnlyStake: React.FC = () => {
  const { changePending, dispatch } = useStakingView();
  const { zeroStake, totalStakedZERO } = useLiquitySelector(select);

  const poolShare = zeroStake.stakedZERO.mulDiv(100, totalStakedZERO);

  return (
    <Card>
      <Heading>Staking</Heading>

      <Box sx={{ p: [2, 3] }}>
        <DisabledEditableRow
          label="Stake"
          inputId="stake-zero"
          amount={zeroStake.stakedZERO.prettify()}
          value={zeroStake.stakedZERO}
          unit={GT}
        />

        <StaticRow
          label="Pool share"
          inputId="stake-share"
          amount={poolShare.prettify(4)}
          value={poolShare}
          unit="%"
        />

        <StaticRow
          label="Redemption gain"
          inputId="stake-gain-eth"
          amount={zeroStake.collateralGain.prettify(4)}
          value={zeroStake.collateralGain}
          color={zeroStake.collateralGain.nonZero && "success"}
          unit="RBTC"
        />

        <StaticRow
          label="Issuance gain"
          inputId="stake-gain-zusd"
          amount={zeroStake.zusdGain.prettify()}
          value={zeroStake.zusdGain}
          color={zeroStake.zusdGain.nonZero && "success"}
          unit={COIN}
        />

        <Flex variant="layout.cta">
          <Button variant="outline" onClick={() => dispatch({ type: "startAdjusting" })}>
            <Icon name="pen" size="sm" />
            &nbsp;Adjust
          </Button>

          <StakingGainsAction />
        </Flex>
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
