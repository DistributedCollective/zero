import React, { useCallback, useEffect } from "react";
import { Card, Box, Flex, Button } from "theme-ui";

import { LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { COIN } from "../../strings";
import { LoadingOverlay } from "../LoadingOverlay";
import { useMyTransactionState } from "../Transaction";
import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { ClaimAndMove } from "./actions/ClaimAndMove";
import { ClaimRewards } from "./actions/ClaimRewards";
import { useStabilityView } from "./context/StabilityViewContext";
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
        {/* {!isWaitingForTransaction && (
          <Flex sx={{ justifyContent: "flex-end", position: "absolute", right: 0, top: 0 }}>
            <RemainingZERO />
          </Flex>
        )} */}
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
            <Flex sx={{ justifyContent: "flex-end", flex: 1 }}>
              <Yield />
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <Flex variant="layout.cta">
        <ClaimRewards
          actionId="zero-stabilityPool-withdraw-claimRBTC"
          disabled={!hasGain && !hasReward}
        >
          Claim RBTC
        </ClaimRewards>
        {hasTrove && (
          <Box sx={{ position: "relative" }}>
            <Box sx={{ position: "absolute", top: -25, right: -1 }}>
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    Claim and move RBTC to Line of Credit
                  </Card>
                }
                size="xs"
              />
            </Box>
            <ClaimAndMove disabled={!hasGain}>Claim and Move</ClaimAndMove>{" "}
          </Box>
        )}
        <Button data-action-id="zero-stabilityPool-withdraw-adjust" onClick={handleAdjustDeposit}>
          &nbsp;Adjust
        </Button>
      </Flex>
      {isWaitingForTransaction && <LoadingOverlay />}
    </>
  );
};
