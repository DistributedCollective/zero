import React, { useCallback, useEffect, useState, useRef } from "react";
import { Flex, Button, Box, Card } from "theme-ui";
import {
  LiquityStoreState,
  Decimal,
  Trove,
  ZUSD_LIQUIDATION_RESERVE,
  Percent,
  Difference
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
  const { trove, fees, price, accountBalance } = state;
  return {
    trove,
    fees,
    price,
    accountBalance,
    validationContext: selectForTroveChangeValidation(state)
  };
};

const TRANSACTION_ID = "trove-adjustment";
// const GAS_ROOM_ETH = Decimal.from(0.1);

const feeFrom = (original: Trove, edited: Trove, borrowingRate: Decimal): Decimal => {
  const change = original.whatChanged(edited, borrowingRate);

  if (change && change.type !== "invalidCreation" && change.params.borrowZUSD) {
    return change.params.borrowZUSD.mul(borrowingRate);
  } else {
    return Decimal.ZERO;
  }
};

const applyUnsavedCollateralChanges = (unsavedChanges: Difference, trove: Trove) => {
  if (unsavedChanges.absoluteValue) {
    if (unsavedChanges.positive) {
      return trove.collateral.add(unsavedChanges.absoluteValue);
    }
    if (unsavedChanges.negative) {
      if (unsavedChanges.absoluteValue.lt(trove.collateral)) {
        return trove.collateral.sub(unsavedChanges.absoluteValue);
      }
    }
    return trove.collateral;
  }
  return trove.collateral;
};

const applyUnsavedNetDebtChanges = (unsavedChanges: Difference, trove: Trove) => {
  if (unsavedChanges.absoluteValue) {
    if (unsavedChanges.positive) {
      return trove.netDebt.add(unsavedChanges.absoluteValue);
    }
    if (unsavedChanges.negative) {
      if (unsavedChanges.absoluteValue.lt(trove.netDebt)) {
        return trove.netDebt.sub(unsavedChanges.absoluteValue);
      }
    }
    return trove.netDebt;
  }
  return trove.netDebt;
};

export const Adjusting: React.FC = () => {
  const { dispatchEvent } = useTroveView();
  const { trove, fees, price, /* accountBalance, */ validationContext } = useLiquitySelector(
    selector
  );
  const editingState = useState<string>();
  const previousTrove = useRef<Trove>(trove);
  const [collateral, setCollateral] = useState<Decimal>(trove.collateral);
  const [netDebt, setNetDebt] = useState<Decimal>(trove.netDebt);
  const { borrowedToken, useNueToken } = useNueTokenSelection();

  const transactionState = useMyTransactionState(TRANSACTION_ID);
  const borrowingRate = fees.borrowingRate();

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("TROVE_ADJUSTED");
    }
  }, [transactionState.type, dispatchEvent]);

  useEffect(() => {
    if (!previousTrove.current.collateral.eq(trove.collateral)) {
      const unsavedChanges = Difference.between(collateral, previousTrove.current.collateral);
      const nextCollateral = applyUnsavedCollateralChanges(unsavedChanges, trove);
      setCollateral(nextCollateral);
    }
    if (!previousTrove.current.netDebt.eq(trove.netDebt)) {
      const unsavedChanges = Difference.between(netDebt, previousTrove.current.netDebt);
      const nextNetDebt = applyUnsavedNetDebtChanges(unsavedChanges, trove);
      setNetDebt(nextNetDebt);
    }
    previousTrove.current = trove;
  }, [trove, collateral, netDebt]);

  const handleCancelPressed = useCallback(() => {
    dispatchEvent("CANCEL_ADJUST_TROVE_PRESSED");
  }, [dispatchEvent]);

  const reset = useCallback(() => {
    setCollateral(trove.collateral);
    setNetDebt(trove.netDebt);
  }, [trove.collateral, trove.netDebt]);

  if (trove.status !== "open") {
    return null;
  }

  const isDirty = !collateral.eq(trove.collateral) || !netDebt.eq(trove.netDebt);
  const isDebtIncrease = netDebt.gt(trove.netDebt);
  const debtIncreaseAmount = isDebtIncrease ? netDebt.sub(trove.netDebt) : Decimal.ZERO;

  const fee = isDebtIncrease
    ? feeFrom(trove, new Trove(trove.collateral, trove.debt.add(debtIncreaseAmount)), borrowingRate)
    : Decimal.ZERO;
  const totalDebt = netDebt.add(ZUSD_LIQUIDATION_RESERVE).add(fee);
  const maxBorrowingRate = borrowingRate.add(0.005);
  const updatedTrove = isDirty ? new Trove(collateral, totalDebt) : trove;
  const feePct = new Percent(borrowingRate);
  // const maxEth = accountBalance.gt(GAS_ROOM_ETH) ? accountBalance.sub(GAS_ROOM_ETH) : Decimal.ZERO;
  // const maxCollateral = collateral.add(maxEth);
  // const collateralMaxedOut = collateral.eq(maxCollateral);
  const collateralRatio =
    !collateral.isZero && !netDebt.isZero ? updatedTrove.collateralRatio(price) : undefined;
  const collateralRatioChange = Difference.between(collateralRatio, trove.collateralRatio(price));

  const [troveChange, description] = validateTroveChange(
    trove,
    updatedTrove,
    borrowingRate,
    useNueToken,
    validationContext
  );

  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  return (
    <>
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
        <Flex>
          <EditableRow
            label="Collateral"
            inputId="trove-collateral"
            amount={collateral.prettify(4)}
            editingState={editingState}
            unit="RBTC"
            editedAmount={collateral.toString(4)}
            setEditedAmount={(amount: string) => setCollateral(Decimal.from(amount))}
          />

          <Flex sx={{ flexDirection: "column", flex: 1 }}>
            <EditableRow
              label="Net debt"
              inputId="trove-net-debt-amount"
              amount={netDebt.prettify()}
              unit={borrowedToken}
              editingState={editingState}
              editedAmount={netDebt.toString(2)}
              setEditedAmount={(amount: string) => setNetDebt(Decimal.from(amount))}
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
            label="Borrowing Fee"
            inputId="trove-borrowing-fee"
            amount={fee.prettify(2)}
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
            unit={borrowedToken}
            infoIcon={
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    The total amount of ZUSD your Line of Credit will hold.{" "}
                    {isDirty && (
                      <>
                        You will need to repay {totalDebt.sub(ZUSD_LIQUIDATION_RESERVE).prettify(2)}{" "}
                        ZUSD to reclaim your collateral ({ZUSD_LIQUIDATION_RESERVE.toString()} ZUSD
                        Liquidation Reserve excluded).
                      </>
                    )}
                  </Card>
                }
              />
            }
          />

          <CollateralRatio value={collateralRatio} change={collateralRatioChange} />
        </Flex>
        {description ?? (
          <ActionDescription>
            Adjust your Line of Credit by modifying its collateral, debt, or both.
          </ActionDescription>
        )}
      </Box>
      <Flex variant="layout.cta">
        <Button variant="cancel" onClick={handleCancelPressed}>
          Cancel
        </Button>

        {troveChange ? (
          <TroveAction
            transactionId={TRANSACTION_ID}
            change={troveChange}
            useNueToken={useNueToken}
            maxBorrowingRate={maxBorrowingRate}
          >
            Confirm
          </TroveAction>
        ) : (
          <Button disabled>Confirm</Button>
        )}
      </Flex>
      {isTransactionPending && <LoadingOverlay />}
    </>
  );
};
