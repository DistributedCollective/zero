import React, { useState } from "react";
import { Heading, Box, Card, Button } from "theme-ui";

import {
  Decimal,
  Decimalish,
  StabilityDeposit,
  LiquityStoreState,
  Difference
} from "@liquity/lib-base";

import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, GT } from "../../strings";

import { Icon } from "../Icon";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { InfoIcon } from "../InfoIcon";

const select = ({ zusdBalance, zusdInStabilityPool }: LiquityStoreState) => ({
  zusdBalance,
  zusdInStabilityPool
});

type StabilityDepositEditorProps = {
  originalDeposit: StabilityDeposit;
  editedZUSD: Decimal;
  changePending: boolean;
  dispatch: (action: { type: "setDeposit"; newValue: Decimalish } | { type: "revert" }) => void;
};

export const StabilityDepositEditor: React.FC<StabilityDepositEditorProps> = ({
  originalDeposit,
  editedZUSD,
  changePending,
  dispatch,
  children
}) => {
  const { zusdBalance, zusdInStabilityPool } = useLiquitySelector(select);
  const editingState = useState<string>();

  const edited = !editedZUSD.eq(originalDeposit.currentZUSD);

  const maxAmount = originalDeposit.currentZUSD.add(zusdBalance);
  const maxedOut = editedZUSD.eq(maxAmount);

  const zusdInStabilityPoolAfterChange = zusdInStabilityPool
    .sub(originalDeposit.currentZUSD)
    .add(editedZUSD);

  const originalPoolShare = originalDeposit.currentZUSD.mulDiv(100, zusdInStabilityPool);
  const newPoolShare = editedZUSD.mulDiv(100, zusdInStabilityPoolAfterChange);
  const poolShareChange =
    originalDeposit.currentZUSD.nonZero &&
    Difference.between(newPoolShare, originalPoolShare).nonZero;

  return (
    <Card>
      <Heading>
        Stability Pool
        {edited && !changePending && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" } }}
            onClick={() => dispatch({ type: "revert" })}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="Deposit"
          inputId="deposit-zero"
          amount={editedZUSD.prettify()}
          maxAmount={maxAmount.toString()}
          maxedOut={maxedOut}
          unit={COIN}
          {...{ editingState }}
          editedAmount={editedZUSD.toString(2)}
          setEditedAmount={newValue => dispatch({ type: "setDeposit", newValue })}
        />

        {newPoolShare.infinite ? (
          <StaticRow label="Pool share" inputId="deposit-share" amount="N/A" />
        ) : (
          <StaticRow
            label="Pool share"
            inputId="deposit-share"
            amount={newPoolShare.prettify(4)}
            pendingAmount={poolShareChange?.prettify(4).concat("%")}
            pendingColor={poolShareChange?.positive ? "success" : "danger"}
            unit="%"
          />
        )}

        {!originalDeposit.isEmpty && (
          <>
            <StaticRow
              label="Liquidation gain"
              inputId="deposit-gain"
              amount={originalDeposit.collateralGain.prettify(4)}
              color={originalDeposit.collateralGain.nonZero && "success"}
              unit="ETH"
            />

            <StaticRow
              label="Reward"
              inputId="deposit-reward"
              amount={originalDeposit.zeroReward.prettify()}
              color={originalDeposit.zeroReward.nonZero && "success"}
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
          </>
        )}
        {children}
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
