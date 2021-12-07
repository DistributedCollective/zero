import React, { useEffect, useState } from "react";
import { Card, Paragraph, Text } from "theme-ui";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { InfoIcon } from "../InfoIcon";
import { useLiquity } from "../../hooks/LiquityContext";
import { Badge } from "../Badge";
import { fetchZeroPrice } from "./context/fetchZeroPrice";

const selector = ({ zusdInStabilityPool, remainingStabilityPoolZEROReward }: LiquityStoreState) => ({
  zusdInStabilityPool,
  remainingStabilityPoolZEROReward
});

export const Yield: React.FC = () => {
  const {
    liquity: {
      connection: { addresses }
    }
  } = useLiquity();
  const { zusdInStabilityPool, remainingStabilityPoolZEROReward } = useLiquitySelector(selector);

  const [zeroPrice, setZeroPrice] = useState<Decimal | undefined>(undefined);
  const hasZeroValue = remainingStabilityPoolZEROReward.isZero || zusdInStabilityPool.isZero;
  const zeroTokenAddress = addresses["zeroToken"];

  useEffect(() => {
    (async () => {
      try {
        const { zeroPriceUSD } = await fetchZeroPrice(zeroTokenAddress);
        setZeroPrice(zeroPriceUSD);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [zeroTokenAddress]);

  if (hasZeroValue || zeroPrice === undefined) return null;

  const yearlyHalvingSchedule = 0.5; // 50% see ZERO distribution schedule for more info
  const remainingZeroOneYear = remainingStabilityPoolZEROReward.mul(yearlyHalvingSchedule);
  const remainingZeroOneYearInUSD = remainingZeroOneYear.mul(zeroPrice);
  const aprPercentage = remainingZeroOneYearInUSD.div(zusdInStabilityPool).mul(100);
  const remainingZeroInUSD = remainingStabilityPoolZEROReward.mul(zeroPrice);

  if (aprPercentage.isZero) return null;

  return (
    <Badge>
      <Text>ZERO APR {aprPercentage.toString(2)}%</Text>
      <InfoIcon
        tooltip={
          <Card variant="tooltip" sx={{ width: ["220px", "518px"] }}>
            <Paragraph>
              An <Text sx={{ fontWeight: "bold" }}>estimate</Text> of the ZERO return on the ZUSD
              deposited to the Stability Pool over the next year, not including your RBTC gains from
              liquidations.
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace", mt: 2 }}>
              (($ZERO_REWARDS * YEARLY_DISTRIBUTION%) / DEPOSITED_ZUSD) * 100 ={" "}
              <Text sx={{ fontWeight: "bold" }}> APR</Text>
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace" }}>
              ($
              {remainingZeroInUSD.shorten()} * 50% / ${zusdInStabilityPool.shorten()}) * 100 =
              <Text sx={{ fontWeight: "bold" }}> {aprPercentage.toString(2)}%</Text>
            </Paragraph>
          </Card>
        }
      ></InfoIcon>
    </Badge>
  );
};
