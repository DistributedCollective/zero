import React, { useEffect, useState } from "react";
import { Button, Box, Flex, Card, Heading } from "theme-ui";

import { Decimal, Percent, LiquityStoreState, MINIMUM_COLLATERAL_RATIO } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN } from "../../strings";

import { Icon } from "../Icon";
import { LoadingOverlay } from "../LoadingOverlay";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { ActionDescription, Amount } from "../ActionDescription";
import { ErrorDescription } from "../ErrorDescription";
import { useMyTransactionState } from "../Transaction";

import { RedemptionAction } from "./RedemptionAction";
import { InfoIcon } from "../InfoIcon";

const mcrPercent = new Percent(MINIMUM_COLLATERAL_RATIO).toString(0);

const select = ({ price, fees, total, zusdBalance }: LiquityStoreState) => ({
  price,
  fees,
  total,
  zusdBalance
});

const transactionId = "redemption";

export const RedemptionManager: React.FC = () => {
  const { price, fees, total, zusdBalance } = useLiquitySelector(select);
  const [zusdAmount, setZUSDAmount] = useState(Decimal.ZERO);
  const [changePending, setChangePending] = useState(false);
  const editingState = useState<string>();

  const dirty = !zusdAmount.isZero;
  const ethAmount = zusdAmount.div(price);
  const redemptionRate = fees.redemptionRate(zusdAmount.div(total.debt));
  const feePct = new Percent(redemptionRate);
  const ethFee = ethAmount.mul(redemptionRate);
  const maxRedemptionRate = redemptionRate.add(0.001); // TODO slippage tolerance

  const myTransactionState = useMyTransactionState(transactionId);

  useEffect(() => {
    if (
      myTransactionState.type === "waitingForApproval" ||
      myTransactionState.type === "waitingForConfirmation"
    ) {
      setChangePending(true);
    } else if (myTransactionState.type === "failed" || myTransactionState.type === "cancelled") {
      setChangePending(false);
    } else if (myTransactionState.type === "confirmed") {
      setZUSDAmount(Decimal.ZERO);
      setChangePending(false);
    }
  }, [myTransactionState.type, setChangePending, setZUSDAmount]);

  const [canRedeem, description] = total.collateralRatioIsBelowMinimum(price)
    ? [
        false,
        <ErrorDescription>
          You can't redeem ZUSD when the total collateral ratio is less than{" "}
          <Amount>{mcrPercent}</Amount>. Please try again later.
        </ErrorDescription>
      ]
    : zusdAmount.gt(zusdBalance)
    ? [
        false,
        <ErrorDescription>
          The amount you're trying to redeem exceeds your balance by{" "}
          <Amount>
            {zusdAmount.sub(zusdBalance).prettify()} {COIN}
          </Amount>
          .
        </ErrorDescription>
      ]
    : [
        true,
        <ActionDescription>
          You will receive <Amount>{ethAmount.sub(ethFee).prettify(4)} ETH</Amount> in exchange for{" "}
          <Amount>
            {zusdAmount.prettify()} {COIN}
          </Amount>
          .
        </ActionDescription>
      ];

  return (
    <Card>
      <Heading>
        Redeem
        {dirty && !changePending && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" } }}
            onClick={() => setZUSDAmount(Decimal.ZERO)}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="Redeem"
          inputId="redeem-zusd"
          amount={zusdAmount.prettify()}
          maxAmount={zusdBalance.toString()}
          maxedOut={zusdAmount.eq(zusdBalance)}
          unit={COIN}
          {...{ editingState }}
          editedAmount={zusdAmount.toString(2)}
          setEditedAmount={amount => setZUSDAmount(Decimal.from(amount))}
        />

        <StaticRow
          label="Redemption Fee"
          inputId="redeem-fee"
          amount={ethFee.toString(4)}
          pendingAmount={feePct.toString(2)}
          unit="ETH"
          infoIcon={
            <InfoIcon
              tooltip={
                <Card variant="tooltip" sx={{ minWidth: "240px" }}>
                  The Redemption Fee is charged as a percentage of the redeemed Ether. The Redemption
                  Fee depends on ZUSD redemption volumes and is 0.5% at minimum.
                </Card>
              }
            />
          }
        />

        {((dirty || !canRedeem) && description) || (
          <ActionDescription>Enter the amount of {COIN} you'd like to redeem.</ActionDescription>
        )}

        <Flex variant="layout.actions">
          <RedemptionAction
            transactionId={transactionId}
            disabled={!dirty || !canRedeem}
            zusdAmount={zusdAmount}
            maxRedemptionRate={maxRedemptionRate}
          />
        </Flex>
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
