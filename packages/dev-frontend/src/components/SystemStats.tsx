import React from "react";
import { Heading, Link, Box, Text, Flex } from "theme-ui";
import { Card } from "./Card";
import { AddressZero } from "@ethersproject/constants";
import { Decimal, Percent, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../hooks/LiquityContext";
import { COIN, GT } from "../strings";
import { Statistic } from "./Statistic";

const selectBalances = ({ accountBalance, zusdBalance, zeroBalance }: LiquityStoreState) => ({
  accountBalance,
  zusdBalance,
  zeroBalance
});

const Balances: React.FC = () => {
  const { accountBalance, zusdBalance, zeroBalance } = useLiquitySelector(selectBalances);

  return (
    <Box sx={{ mb: 3 }}>
      <Heading>My Account Balances</Heading>
      <Statistic name="RBTC"> {accountBalance.prettify(4)}</Statistic>
      <Statistic name={COIN}> {zusdBalance.prettify()}</Statistic>
      <Statistic name={GT}>{zeroBalance.prettify()}</Statistic>
    </Box>
  );
};

const GitHubCommit: React.FC<{ children?: string }> = ({ children }) =>
  children?.match(/[0-9a-f]{40}/) ? (
    <Link href={`https://github.com/DistributedCollective/zero/commit/${children}`}>
      {children.substr(0, 7)}
    </Link>
  ) : (
    <>unknown</>
  );

type SystemStatsProps = {
  variant?: string;
  showBalances?: boolean;
};

const select = ({
  numberOfTroves,
  price,
  total,
  zusdInStabilityPool,
  borrowingRate,
  redemptionRate,
  totalStakedZERO,
  frontend
}: LiquityStoreState) => ({
  numberOfTroves,
  price,
  total,
  zusdInStabilityPool,
  borrowingRate,
  redemptionRate,
  totalStakedZERO,
  kickbackRate: frontend.status === "registered" ? frontend.kickbackRate : null
});

export const SystemStats: React.FC<SystemStatsProps> = ({ variant = "info", showBalances }) => {
  const {
    liquity: {
      connection: { version: contractsVersion, deploymentDate, frontendTag }
    }
  } = useLiquity();

  const {
    numberOfTroves,
    price,
    zusdInStabilityPool,
    total,
    borrowingRate,
    totalStakedZERO,
    kickbackRate
  } = useLiquitySelector(select);

  const zusdInStabilityPoolPct =
    total.debt.nonZero && new Percent(zusdInStabilityPool.div(total.debt));
  const totalCollateralRatioPct = new Percent(total.collateralRatio(price));
  const borrowingFeePct = new Percent(borrowingRate);
  const kickbackRatePct = frontendTag === AddressZero ? "100" : kickbackRate?.mul(100).prettify();

  return (
    <Card {...{ variant }}>
      {showBalances && <Balances />}
      <Heading className="heading">Zero statistics</Heading>
      <Heading as="h2" sx={{ my: 2, fontWeight: "body", fontSize: 16 }}>
        Protocol
      </Heading>

      <Statistic
        name="Borrowing Fee"
        tooltip="The Borrowing Fee is a one-off fee charged as a percentage of the borrowed amount (in ZUSD) and is part of a Line of Credit's debt. The fee varies between 0.5% and 5% depending on ZUSD redemption volumes."
      >
        {borrowingFeePct.toString(2)}
      </Statistic>

      <Statistic
        name="TVL"
        tooltip="The Total Value Locked (TVL) is the total value of RBTC locked as collateral in the system, given in RBTC and USD."
      >
        {total.collateral.shorten()} <Text sx={{ fontSize: 1 }}>&nbsp;RBTC</Text>
        <Text sx={{ fontSize: 1 }}>
          &nbsp;(${Decimal.from(total.collateral.mul(price)).shorten()})
        </Text>
      </Statistic>
      <Statistic
        name="Credit Lines"
        tooltip="The total number of active Lines of Credit in the system."
      >
        {Decimal.from(numberOfTroves).prettify(0)}
      </Statistic>
      <Statistic name="ZUSD supply" tooltip="The total ZUSD minted by the Zero Protocol.">
        {total.debt.shorten()}
      </Statistic>
      {zusdInStabilityPoolPct && (
        <Statistic
          name="ZUSD in Stability Pool"
          tooltip="The total ZUSD currently held in the Stability Pool, expressed as an amount and a fraction of the ZUSD supply.
        "
        >
          {zusdInStabilityPool.shorten()}
          <Text sx={{ fontSize: 1 }}>&nbsp;({zusdInStabilityPoolPct.toString(1)})</Text>
        </Statistic>
      )}
      <Statistic
        name="Staked ZERO"
        tooltip="The total amount of ZERO that is staked for earning fee revenue."
      >
        {totalStakedZERO.shorten()}
      </Statistic>
      <Statistic
        name="Total Collateral Ratio"
        tooltip="The ratio of the USD value of the entire system collateral at the current RBTC:USD price, to the entire system debt."
      >
        {totalCollateralRatioPct.prettify()}
      </Statistic>
      <Statistic
        name="Recovery Mode"
        tooltip="Recovery Mode is activated when the Total Collateral Ratio (TCR) falls below 150%. When active, your Line of Credit can be liquidated if its collateral ratio is below the TCR. The maximum collateral you can lose from liquidation is capped at 110% of your Line of Credit's debt. Operations are also restricted that would negatively impact the TCR."
      >
        {total.collateralRatioIsBelowCritical(price) ? <Box color="danger">Yes</Box> : "No"}
      </Statistic>
      {}

      <Box sx={{ mt: 3, opacity: 0.3 }}>
        <Box sx={{ fontSize: 0 }}>
          Frontend version:{" "}
          {process.env.NODE_ENV === "development" ? (
            "development"
          ) : (
            <GitHubCommit>{process.env.REACT_APP_VERSION}</GitHubCommit>
          )}
        </Box>
        <Flex sx={{ flexDirection: "row" }}>
          <Box sx={{ fontSize: 0 }}>
            Contracts version: <GitHubCommit>{contractsVersion}</GitHubCommit>
          </Box>
          <Box sx={{ fontSize: 0, mx: 2 }}>Deployed: {deploymentDate.toLocaleString()}</Box>
        </Flex>
      </Box>
    </Card>
  );
};
