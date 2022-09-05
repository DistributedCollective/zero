import React, { useState } from "react";
import { Heading, Box, Card, Button } from "theme-ui";

import {
  Decimal,
  Decimalish,
  Difference,
  LiquityStoreState,
  ZEROStake
} from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { COIN, GT } from "../../strings";

import { Icon } from "../Icon";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";

import { useStakingView } from "./context/StakingViewContext";

const select = ({ zeroBalance, totalStakedZERO }: LiquityStoreState) => ({
  zeroBalance,
  totalStakedZERO
});

type StakingEditorProps = {
  title: string;
  originalStake: ZEROStake;
  editedZERO: Decimal;
  dispatch: (action: { type: "setStake"; newValue: Decimalish } | { type: "revert" }) => void;
};

export const StakingEditor: React.FC<StakingEditorProps> = ({
  children,
  title,
  originalStake,
  editedZERO,
  dispatch
}) => {
  const { zeroBalance, totalStakedZERO } = useLiquitySelector(select);
  const { changePending } = useStakingView();
  const editingState = useState<string>();

  const edited = !editedZERO.eq(originalStake.stakedZERO);

  const maxAmount = originalStake.stakedZERO.add(zeroBalance);
  const maxedOut = editedZERO.eq(maxAmount);

  const totalStakedZEROAfterChange = totalStakedZERO.sub(originalStake.stakedZERO).add(editedZERO);

  const originalPoolShare = originalStake.stakedZERO.mulDiv(100, totalStakedZERO);
  const newPoolShare = editedZERO.mulDiv(100, totalStakedZEROAfterChange);
  const poolShareChange =
    originalStake.stakedZERO.nonZero && Difference.between(newPoolShare, originalPoolShare).nonZero;

  return (
    <Card>
      <Heading>
        {title}
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
          label="Stake"
          inputId="stake-zero"
          amount={editedZERO.prettify()}
          value={editedZERO}
          maxAmount={maxAmount.toString()}
          maxedOut={maxedOut}
          unit={GT}
          {...{ editingState }}
          editedAmount={editedZERO.toString(18)}
          setEditedAmount={newValue => dispatch({ type: "setStake", newValue })}
        />

        {newPoolShare.infinite ? (
          <StaticRow label="Pool share" inputId="stake-share" amount="N/A" />
        ) : (
          <StaticRow
            label="Pool share"
            inputId="stake-share"
            amount={newPoolShare.prettify(4)}
            value={newPoolShare}
            pendingAmount={poolShareChange?.prettify(4).concat("%")}
            pendingColor={poolShareChange?.positive ? "success" : "danger"}
            unit="%"
          />
        )}

        {!originalStake.isEmpty && (
          <>
            <StaticRow
              label="Redemption gain"
              inputId="stake-gain-eth"
              amount={originalStake.collateralGain.prettify(4)}
              value={originalStake.collateralGain}
              color={originalStake.collateralGain.nonZero && "success"}
              unit="RBTC"
            />

            <StaticRow
              label="Issuance gain"
              inputId="stake-gain-zusd"
              amount={originalStake.zusdGain.prettify()}
              value={originalStake.zusdGain}
              color={originalStake.zusdGain.nonZero && "success"}
              unit={COIN}
            />
          </>
        )}

        {children}
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
