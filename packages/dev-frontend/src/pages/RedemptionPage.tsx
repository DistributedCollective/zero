import React from "react";
import { Container, Link, Paragraph } from "theme-ui";
import { Card } from "../components/Card";
import { SystemStats } from "../components/SystemStats";
import { Redemption } from "../components/Redemption/Redemption";
import { InfoMessage } from "../components/InfoMessage";

export const RedemptionPage: React.FC = () => {
  return (
    <Container variant="columns">
      <Container variant="leftRedemption">
        <Card>
          <InfoMessage title="Bot functionality">
            <Paragraph>
              Redemptions are expected to be carried out by bots when arbitrage opportunities emerge.
            </Paragraph>
            <Paragraph sx={{ mt: 2 }}>
              Most of the time you will get a better rate for converting NUE to RBTC on{" "}
              <Link variant="redemption" href="https://live.sovryn.app/swap" target="_blank">
                Sovryn
              </Link>{" "}
              or other exchanges.
            </Paragraph>
            <Paragraph sx={{ mt: 2 }}>
              <strong>Note</strong>: Redemption is not for repaying your loan. To repay your loan,
              adjust your Line of Credit on the{" "}
              <Link variant="redemption" href="#/">
                Dashboard
              </Link>
              .
            </Paragraph>
          </InfoMessage>
        </Card>
        <Redemption />
      </Container>

      <Container variant="rightRedemption">
        <SystemStats />
      </Container>
    </Container>
  );
};
