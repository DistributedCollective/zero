import React, { useCallback, useEffect, useState } from "react";
import { Flex, Button, Box, Card } from "theme-ui";
import {
  LiquityStoreState,
  Decimal,
  Trove,
  ZUSD_LIQUIDATION_RESERVE,
  ZUSD_MINIMUM_NET_DEBT,
  Percent
} from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";
import { ActionDescription } from "../ActionDescription";
import { useMyTransactionState } from "../Transaction";
import { TroveAction } from "./TroveAction";
import { useTroveView } from "./context/TroveViewContext";
import { Icon } from "../Icon";
import { InfoIcon } from "../InfoIcon";
import { LoadingOverlay } from "../LoadingOverlay";
import { CollateralRatio } from "./CollateralRatio";
import { EditableRow, StaticRow } from "./Editor";
import {
  selectForTroveChangeValidation,
  validateTroveChange
} from "./validation/validateTroveChange";
import { useNueTokenSelection } from "../../hooks/useNueTokenSelection";

const selector = (state: LiquityStoreState) => {
  const { fees, price, accountBalance } = state;
  return {
    fees,
    price,
    accountBalance,
    validationContext: selectForTroveChangeValidation(state)
  };
};

const EMPTY_TROVE = new Trove(Decimal.ZERO, Decimal.ZERO);
const TRANSACTION_ID = "trove-creation";
const GAS_ROOM_ETH = Decimal.from(0.1);

export const Opening: React.FC = () => {
  const { dispatchEvent } = useTroveView();
  const { fees, price, accountBalance, validationContext } = useLiquitySelector(selector);
  const borrowingRate = fees.borrowingRate();
  const editingState = useState<string>();
  const { borrowedToken, useNueToken } = useNueTokenSelection();

  const [collateral, setCollateral] = useState<Decimal>(Decimal.ZERO);
  const [borrowAmount, setBorrowAmount] = useState<Decimal>(Decimal.ZERO);

  const maxBorrowingRate = borrowingRate.add(0.005);

  const fee = borrowAmount.mul(borrowingRate);
  const feePct = new Percent(borrowingRate);
  const totalDebt = borrowAmount.add(ZUSD_LIQUIDATION_RESERVE).add(fee);
  const isDirty = !collateral.isZero || !borrowAmount.isZero;
  const trove = isDirty ? new Trove(collateral, totalDebt) : EMPTY_TROVE;
  const maxEth = accountBalance.gt(GAS_ROOM_ETH) ? accountBalance.sub(GAS_ROOM_ETH) : Decimal.ZERO;
  const maxCollateral = collateral.add(maxEth);
  const collateralMaxedOut = collateral.eq(maxCollateral);
  const collateralRatio =
    !collateral.isZero && !borrowAmount.isZero ? trove.collateralRatio(price) : undefined;

  const [troveChange, description] = validateTroveChange(
    EMPTY_TROVE,
    trove,
    borrowingRate,
    useNueToken,
    validationContext
  );

  const transactionState = useMyTransactionState(TRANSACTION_ID);
  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  const handleCancelPressed = useCallback(() => {
    dispatchEvent("CANCEL_ADJUST_TROVE_PRESSED");
  }, [dispatchEvent]);

  const reset = useCallback(() => {
    setCollateral(Decimal.ZERO);
    setBorrowAmount(Decimal.ZERO);
  }, []);

  useEffect(() => {
    if (!collateral.isZero && borrowAmount.isZero) {
      setBorrowAmount(ZUSD_MINIMUM_NET_DEBT);
    }
  }, [collateral, borrowAmount]);

  return (
    <>
      {description ?? (
        <Flex sx={{ justifyContent: "center" }}>
          <ActionDescription>
            Start by entering the amount of RBTC you'd like to deposit as collateral.
          </ActionDescription>
        </Flex>
      )}
      <Box sx={{ p: [2, 3], position: "relative" }}>
        {isDirty && !isTransactionPending && (
          <Button
            variant="titleIcon"
            sx={{ position: "absolute", top: -2, left: -2, ":enabled:hover": { color: "danger" } }}
            onClick={reset}
          >
            <Icon name="history" size="sm" />
          </Button>
        )}
        <Flex sx={{ flexDirection: ["column", "column", "column", "row"] }}>
          <EditableRow
            label="Collateral"
            inputId="trove-collateral"
            amount={collateral.prettify(4)}
            value={collateral}
            maxAmount={maxCollateral.toString()}
            maxedOut={collateralMaxedOut}
            editingState={editingState}
            unit="RBTC"
            editedAmount={collateral.toString(18)}
            setEditedAmount={(amount: string) => setCollateral(Decimal.from(amount))}
            hideMaxBtn
          />
          <Flex sx={{ flexDirection: "column", flex: 1 }}>
            <EditableRow
              label="Borrow"
              inputId="trove-borrow-amount"
              amount={borrowAmount.prettify()}
              value={borrowAmount}
              unit={borrowedToken}
              editingState={editingState}
              editedAmount={borrowAmount.toString(18)}
              setEditedAmount={(amount: string) => setBorrowAmount(Decimal.from(amount))}
              hideMaxBtn
            />
            {/* <NueCheckbox checked={useNueToken} onChange={handleSetNueToken} /> */}
          </Flex>
        </Flex>
        <Flex
          sx={{ mt: 30, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
        >
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

          <StaticRow
            label="Origination Fee"
            inputId="trove-borrowing-fee"
            amount={fee.prettify(2)}
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

          <StaticRow
            label="Total debt"
            inputId="trove-total-debt"
            amount={totalDebt.prettify(2)}
            value={totalDebt}
            unit={borrowedToken}
            infoIcon={
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    The total amount of {borrowedToken} your Line of Credit will hold.{" "}
                    {isDirty && (
                      <>
                        You will need to repay {totalDebt.sub(ZUSD_LIQUIDATION_RESERVE).prettify(2)}{" "}
                        {borrowedToken} to reclaim your collateral (
                        {ZUSD_LIQUIDATION_RESERVE.toString()} ZUSD Liquidation Reserve excluded).
                      </>
                    )}
                  </Card>
                }
              />
            }
          />
          <CollateralRatio value={collateralRatio} />
        </Flex>
      </Box>
      <Flex variant="layout.cta">
        <Button data-action-id="zero-LOC-cancel" variant="cancel" onClick={handleCancelPressed}>
          Cancel
        </Button>

        {troveChange ? (
          <TroveAction
            transactionId={TRANSACTION_ID}
            change={troveChange}
            useNueToken={useNueToken}
            maxBorrowingRate={maxBorrowingRate}
            data-action-id="zero-LOC-confirm"
          >
            Confirm
          </TroveAction>
        ) : (
          <Button data-action-id="zero-LOC-confirm" disabled>
            Confirm
          </Button>
        )}
      </Flex>
      {isTransactionPending && <LoadingOverlay />}
    </>
  );
};
