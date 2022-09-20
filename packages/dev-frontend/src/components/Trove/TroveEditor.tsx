import React from "react";
import { Box, Card, Flex } from "theme-ui";

import {
  Percent,
  Difference,
  Decimalish,
  Decimal,
  Trove,
  LiquityStoreState,
  ZUSD_LIQUIDATION_RESERVE
} from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { StaticRow } from "./Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { CollateralRatio } from "./CollateralRatio";
import { InfoIcon } from "../InfoIcon";

type TroveEditorProps = {
  borrowedToken: string;
  useNueToken: boolean;
  handleSetNueToken: () => void;
  original: Trove;
  edited: Trove;
  fee: Decimal;
  borrowingRate: Decimal;
  changePending: boolean;
  dispatch: (
    action: { type: "setCollateral" | "setDebt"; newValue: Decimalish } | { type: "revert" }
  ) => void;
};

const select = ({ price }: LiquityStoreState) => ({ price });

export const TroveEditor: React.FC<TroveEditorProps> = ({
  children,
  original,
  edited,
  fee,
  useNueToken,
  handleSetNueToken,
  borrowedToken,
  borrowingRate,
  changePending
}) => {
  const { price } = useLiquitySelector(select);

  const feePct = new Percent(borrowingRate);

  const originalCollateralRatio = !original.isEmpty ? original.collateralRatio(price) : undefined;
  const collateralRatio = !edited.isEmpty ? edited.collateralRatio(price) : undefined;
  const collateralRatioChange = Difference.between(collateralRatio, originalCollateralRatio);

  return (
    <>
      <Box sx={{ p: [2, 3] }}>
        <Flex
          sx={{
            mt: 30,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2
          }}
        >
          <StaticRow
            label="Collateral"
            inputId="trove-collateral"
            amount={edited.collateral.prettify(4)}
            value={edited.collateral}
            unit="RBTC"
          />
          {/* <NueCheckbox checked={useNueToken} onChange={handleSetNueToken} /> */}

          <StaticRow
            label="Debt"
            inputId="trove-debt"
            amount={edited.debt.prettify()}
            value={edited.debt}
            unit={borrowedToken}
          />

          {original.isEmpty && (
            <StaticRow
              label="Liquidation Reserve"
              inputId="trove-liquidation-reserve"
              amount={`${ZUSD_LIQUIDATION_RESERVE}`}
              value={ZUSD_LIQUIDATION_RESERVE}
              unit={borrowedToken}
              infoIcon={
                <InfoIcon
                  tooltip={
                    <Card variant="tooltip" sx={{ width: "200px" }}>
                      An amount set aside to cover the liquidator’s gas costs if your Line of Credit
                      needs to be liquidated. The amount increases your debt and is refunded if you
                      close your Line of Credit by fully paying off its net debt.
                    </Card>
                  }
                />
              }
            />
          )}

          <StaticRow
            label="Origination Fee"
            inputId="trove-borrowing-fee"
            amount={fee.toString(2)}
            value={fee}
            pendingAmount={feePct.toString(2)}
            unit={borrowedToken}
            infoIcon={
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    This amount is deducted from the borrowed amount as a one-time fee. There are no
                    recurring fees for borrowing, which is thus interest-free.
                  </Card>
                }
              />
            }
          />
        </Flex>

        <CollateralRatio value={collateralRatio} change={collateralRatioChange} />
      </Box>
      {children}

      {changePending && <LoadingOverlay />}
    </>
  );
};
