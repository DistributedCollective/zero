import React, { useState, useEffect } from "react";
import { Button, Box, Flex, Spinner, Card, Heading } from "theme-ui";

import { Decimal, Percent } from "@liquity/decimal";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { Transaction, useMyTransactionState } from "./Transaction";
import { LoadingOverlay } from "./LoadingOverlay";
import { EditableRow, StaticRow } from "./Editor";
import { Icon } from "./Icon";
import { useLiquity } from "../hooks/LiquityContext";
import { COIN } from "../strings";

type RedemptionActionProps = {
  amount: Decimal;
  setAmount: (amount: Decimal) => void;
  changePending: boolean;
  setChangePending: (isPending: boolean) => void;
};

const selectForRedemptionAction = ({ price, lusdBalance, numberOfTroves }: LiquityStoreState) => ({
  price,
  lusdBalance,
  numberOfTroves
});

const RedemptionAction: React.FC<RedemptionActionProps> = ({
  amount,
  setAmount,
  changePending,
  setChangePending
}) => {
  const { price, lusdBalance, numberOfTroves } = useLiquitySelector(selectForRedemptionAction);
  const {
    liquity: { send: liquity }
  } = useLiquity();

  const myTransactionId = "redemption";
  const myTransactionState = useMyTransactionState(myTransactionId);
  const tentativelyConfirmed =
    (myTransactionState.type === "waitingForConfirmations" &&
      myTransactionState.confirmations > 0) ||
    myTransactionState.type === "confirmed";

  useEffect(() => {
    if (myTransactionState.type === "waitingForApproval") {
      setChangePending(true);
    } else if (myTransactionState.type === "failed" || myTransactionState.type === "cancelled") {
      setChangePending(false);
    } else if (tentativelyConfirmed) {
      setAmount(Decimal.ZERO);
      setChangePending(false);
    }
  }, [myTransactionState.type, setChangePending, setAmount, tentativelyConfirmed]);

  if (amount.isZero) {
    return null;
  }

  const send = liquity.redeemLUSD.bind(liquity, amount, { price, numberOfTroves });

  return myTransactionState.type === "waitingForApproval" ? (
    <Flex variant="layout.actions">
      <Button disabled sx={{ mx: 2 }}>
        <Spinner sx={{ mr: 2, color: "white" }} size="20px" />
        Waiting for your approval
      </Button>
    </Flex>
  ) : changePending ? null : (
    <Flex variant="layout.actions">
      <Transaction
        id={myTransactionId}
        requires={[[lusdBalance.gte(amount), `You don't have enough ${COIN}`]]}
        {...{ send }}
      >
        <Button sx={{ mx: 2 }}>
          Exchange {amount.prettify()} {COIN}
        </Button>
      </Transaction>
    </Flex>
  );
};

const select = ({ price, fees, total }: LiquityStoreState) => ({ price, fees, total });

export const RedemptionManager: React.FC = () => {
  const { price, fees, total } = useLiquitySelector(select);
  const [lusdAmount, setLUSDAmount] = useState(Decimal.ZERO);
  const [changePending, setChangePending] = useState(false);
  const editingState = useState<string>();

  const edited = !lusdAmount.isZero;
  const ethAmount = lusdAmount.div(price);
  const feeFactor = fees.redemptionFeeFactor(lusdAmount.div(total.debt));
  const feePct = new Percent(feeFactor);
  const ethFee = ethAmount.mul(feeFactor);

  return (
    <>
      <Card>
        <Heading>
          Redeem {COIN} to get ETH
          {edited && !changePending && (
            <Button
              variant="titleIcon"
              sx={{ ":enabled:hover": { color: "danger" } }}
              onClick={() => setLUSDAmount(Decimal.ZERO)}
            >
              <Icon name="history" size="lg" />
            </Button>
          )}
        </Heading>

        {changePending && <LoadingOverlay />}

        <Box>
          <EditableRow
            label="Redeem"
            inputId="redeem-lusd"
            amount={lusdAmount.prettify()}
            unit={COIN}
            {...{ editingState }}
            editedAmount={lusdAmount.toString(2)}
            setEditedAmount={amount => setLUSDAmount(Decimal.from(amount))}
          ></EditableRow>

          {edited && (
            <>
              <StaticRow
                label="Fee"
                inputId="redeem-fee"
                amount={ethFee.toString(4)}
                color="danger"
                pendingAmount={feePct.toString(2)}
                pendingColor="danger"
                unit="ETH"
              />

              <StaticRow
                label="Get"
                inputId="redeem-eth"
                amount={ethAmount.sub(ethFee).prettify(4)}
                unit="ETH"
              />
            </>
          )}
        </Box>
      </Card>

      <RedemptionAction
        {...{ amount: lusdAmount, setAmount: setLUSDAmount, changePending, setChangePending }}
      />
    </>
  );
};
