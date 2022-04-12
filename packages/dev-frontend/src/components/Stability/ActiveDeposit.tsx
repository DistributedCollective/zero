import React, { useCallback, useEffect } from "react";
import { Card, Box, Flex, Button } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, GT } from "../../strings";
import { LoadingOverlay } from "../LoadingOverlay";
import { useMyTransactionState } from "../Transaction";
import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { ClaimAndMove } from "./actions/ClaimAndMove";
import { ClaimRewards } from "./actions/ClaimRewards";
import { useStabilityView } from "./context/StabilityViewContext";
import { RemainingZERO } from "./RemainingZERO";
import { Yield } from "./Yield";
import { InfoIcon } from "../InfoIcon";

const selector = ({ stabilityDeposit, trove, zusdInStabilityPool }: LiquityStoreState) => ({
  stabilityDeposit,
  trove,
  zusdInStabilityPool
});

export const ActiveDeposit: React.FC = () => {
  const { dispatchEvent } = useStabilityView();
  const { stabilityDeposit, trove, zusdInStabilityPool } = useLiquitySelector(selector);

  const poolShare = stabilityDeposit.currentZUSD.mulDiv(100, zusdInStabilityPool);

  const handleAdjustDeposit = useCallback(() => {
    dispatchEvent("ADJUST_DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  const hasReward = !stabilityDeposit.zeroReward.isZero;
  const hasGain = !stabilityDeposit.collateralGain.isZero;
  const hasTrove = !trove.isEmpty;

  const transactionId = "stability-deposit";
  const transactionState = useMyTransactionState(transactionId);
  const isWaitingForTransaction =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("REWARDS_CLAIMED");
    }
  }, [transactionState.type, dispatchEvent]);

  return (
    <>
      <Box sx={{ p: [2, 3], position: "relative" }}>
        {!isWaitingForTransaction && (
          <Flex sx={{ justifyContent: "flex-end", position: "absolute", right: 0, top: 0 }}>
            <RemainingZERO />
          </Flex>
        )}
        <Flex sx={{ alignItems: "flex-end", mt: 3 }}>
          <DisabledEditableRow
            label="Deposit"
            inputId="deposit-zusd"
            amount={stabilityDeposit.currentZUSD.prettify()}
            unit={COIN}
          />

          <StaticRow
            label="Pool share"
            inputId="deposit-share"
            amount={poolShare.prettify(4)}
            unit="%"
          />

          <StaticRow
            label="Liquidation gain"
            inputId="deposit-gain"
            amount={stabilityDeposit.collateralGain.prettify(4)}
            color={stabilityDeposit.collateralGain.nonZero && "success"}
            unit="RBTC"
          />

          <Flex sx={{ alignItems: "center" }}>
            <StaticRow
              label="Reward"
              inputId="deposit-reward"
              amount={stabilityDeposit.zeroReward.prettify()}
              color={stabilityDeposit.zeroReward.nonZero && "success"}
              unit={GT}
              infoIcon={
                <InfoIcon
                  tooltip={
                    <Card variant="tooltip" sx={{ width: "240px" }}>
                      Although the ZERO rewards accrue every minute, the value on the UI only updates
                      when a user transacts with the Stability Pool. Therefore you may receive more
                      rewards than is displayed when you claim or adjust your deposit.
                    </Card>
                  }
                />
              }
            />
            <Flex sx={{ justifyContent: "flex-end", flex: 1 }}>
              <Yield />
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <Flex variant="layout.cta">
        <ClaimRewards disabled={!hasGain && !hasReward}>Claim RBTC</ClaimRewards>
        {hasTrove && (
          <Box sx={{ position: "relative" }}>
            <Box sx={{ position: "absolute", top: -25, right: -1 }}>
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    Claim ZERO and move RBTC to Line of Credit
                  </Card>
                }
                size="xs"
              />
            </Box>
            <ClaimAndMove disabled={!hasGain}>Claim and Move</ClaimAndMove>{" "}
          </Box>
        )}
        <Button onClick={handleAdjustDeposit}>&nbsp;Adjust</Button>
      </Flex>
      {isWaitingForTransaction && <LoadingOverlay />}
    </>
  );
};
