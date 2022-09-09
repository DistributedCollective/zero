import React, { useState } from "react";
import { Box, Flex, Button } from "theme-ui";
import { ActionDescription } from "../ActionDescription";

import {
  Decimal,
  Decimalish,
  StabilityDeposit,
  LiquityStoreState,
  Difference
} from "@sovryn-zero/lib-base";

import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { COIN } from "../../strings";

import { Icon } from "../Icon";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";

const select = ({ zusdBalance, zusdInStabilityPool }: LiquityStoreState) => ({
  zusdBalance,
  zusdInStabilityPool
});

type StabilityDepositEditorProps = {
  originalDeposit: StabilityDeposit;
  editedZUSD: Decimal;
  changePending: boolean;
  description: any;
  makingNewDeposit: boolean;
  dispatch: (action: { type: "setDeposit"; newValue: Decimalish } | { type: "revert" }) => void;
};

export const StabilityDepositEditor: React.FC<StabilityDepositEditorProps> = ({
  originalDeposit,
  editedZUSD,
  changePending,
  dispatch,
  children,
  description,
  makingNewDeposit
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
    <>
      <Box
        sx={{
          pt: 36,
          mx: "auto",
          position: "relative"
        }}
      >
        {edited && !changePending && (
          <Button
            variant="titleIcon"
            sx={{ position: "absolute", right: 0, top: 0, ":enabled:hover": { color: "danger" } }}
            onClick={() => dispatch({ type: "revert" })}
          >
            <Icon name="history" size="sm" />
          </Button>
        )}
        {description ??
          (makingNewDeposit ? (
            <ActionDescription>Enter the amount of {COIN} you'd like to deposit.</ActionDescription>
          ) : (
            <ActionDescription>Adjust the {COIN} amount to deposit or withdraw.</ActionDescription>
          ))}

        <Flex
          sx={{
            px: 36,
            justifyContent: "center",
            flexDirection: ["column", "column", "column", "row"]
          }}
        >
          <EditableRow
            label="Deposit"
            inputId="deposit-zero"
            amount={editedZUSD.prettify()}
            maxAmount={maxAmount.toString()}
            maxedOut={maxedOut}
            unit={COIN}
            {...{ editingState }}
            editedAmount={editedZUSD.toString(18)}
            setEditedAmount={newValue => dispatch({ type: "setDeposit", newValue })}
          />

          <Box sx={{ mt: 40, pl: "8px", minWidth: 140 }}>
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
          </Box>
        </Flex>

        {!originalDeposit.isEmpty && (
          <Flex sx={{ mt: 3, justifyContent: "center" }}>
            <StaticRow
              label="Liquidation gain"
              inputId="deposit-gain"
              amount={originalDeposit.collateralGain.prettify(4)}
              color={originalDeposit.collateralGain.nonZero && "success"}
              unit="RBTC"
            />
          </Flex>
        )}
      </Box>
      {children}

      {changePending && <LoadingOverlay />}
    </>
  );
};
