import React, { useEffect } from "react";
import { Button, Flex, Spinner } from "theme-ui";

import { Percent } from "@liquity/decimal";
import { LiquityStoreState, Trove, TroveChange } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../hooks/LiquityContext";
import { Transaction, useMyTransactionState } from "./Transaction";
import { COIN } from "../strings";

type TroveActionProps = {
  original: Trove;
  edited: Trove;
  afterFee: Trove;
  change: TroveChange;
  changePending: boolean;
  dispatch: (action: { type: "startChange" | "finishChange" }) => void;
};

const mcrPercent = new Percent(Trove.MINIMUM_COLLATERAL_RATIO).toString(0);
const ccrPercent = new Percent(Trove.CRITICAL_COLLATERAL_RATIO).toString(0);

const select = ({ price, total, lusdBalance, numberOfTroves }: LiquityStoreState) => ({
  price,
  total,
  lusdBalance,
  numberOfTroves
});

export const TroveAction: React.FC<TroveActionProps> = ({
  original,
  edited,
  afterFee,
  change: { collateralDifference, debtDifference },
  changePending,
  dispatch
}) => {
  const { numberOfTroves, price, lusdBalance, total } = useLiquitySelector(select);
  const {
    liquity: { send: liquity }
  } = useLiquity();

  const myTransactionId = "trove";
  const myTransactionState = useMyTransactionState(myTransactionId);

  useEffect(() => {
    if (myTransactionState.type === "waitingForApproval") {
      dispatch({ type: "startChange" });
    } else if (myTransactionState.type === "failed" || myTransactionState.type === "cancelled") {
      dispatch({ type: "finishChange" });
    }
  }, [myTransactionState.type, dispatch]);

  if (!collateralDifference && !debtDifference) {
    return null;
  }

  const [actionName, send, extraRequirements] = original.isEmpty
    ? ([
        "Open new Trove",
        liquity.openTrove.bind(liquity, edited, { price, numberOfTroves }),
        edited.debt.nonZero
          ? ([
              [
                !total.collateralRatioIsBelowCritical(price),
                `Can't borrow ${COIN} during recovery mode`
              ],
              [
                !total.add(edited).collateralRatioIsBelowCritical(price),
                `Total collateral ratio would fall below ${ccrPercent}`
              ]
            ] as const)
          : []
      ] as const)
    : edited.isEmpty
    ? ([
        "Close Trove",
        liquity.closeTrove.bind(liquity),
        [
          [!total.collateralRatioIsBelowCritical(price), "Can't close Trove during recovery mode"],
          [
            lusdBalance.add(Trove.GAS_COMPENSATION_DEPOSIT).gte(original.debt),
            `You don't have enough ${COIN}`
          ]
        ]
      ] as const)
    : ([
        collateralDifference && debtDifference
          ? collateralDifference.positive && debtDifference.positive
            ? `Deposit ${collateralDifference.absoluteValue!.prettify()} ETH & ` +
              `borrow ${debtDifference.absoluteValue!.prettify()} ${COIN}`
            : collateralDifference.negative && debtDifference.negative
            ? `Repay ${debtDifference.absoluteValue!.prettify()} ${COIN} & ` +
              `withdraw ${collateralDifference.absoluteValue!.prettify()} ETH`
            : collateralDifference.positive
            ? `Deposit ${collateralDifference.absoluteValue!.prettify()} ETH & ` +
              `repay ${debtDifference.absoluteValue!.prettify()} ${COIN}`
            : `Borrow ${debtDifference.absoluteValue!.prettify()} ${COIN} & ` +
              `withdraw ${collateralDifference.absoluteValue!.prettify()} ETH`
          : collateralDifference
          ? `${collateralDifference.positive ? "Deposit" : "Withdraw"} ` +
            `${collateralDifference.absoluteValue!.prettify()} ETH`
          : `${debtDifference!.positive ? "Borrow" : "Repay"} ` +
            `${debtDifference!.absoluteValue!.prettify()} ${COIN}`,

        collateralDifference && debtDifference
          ? liquity.changeTrove.bind(
              liquity,
              { collateralDifference, debtDifference },
              { trove: original, price, numberOfTroves }
            )
          : (collateralDifference
              ? collateralDifference.positive
                ? liquity.depositCollateral
                : liquity.withdrawCollateral
              : debtDifference!.positive
              ? liquity.borrowLUSD
              : liquity.repayLUSD
            ).bind(liquity, (collateralDifference ?? debtDifference)!.absoluteValue!, {
              trove: original,
              price,
              numberOfTroves
            }),
        [
          ...(collateralDifference?.negative
            ? ([
                [
                  !total.collateralRatioIsBelowCritical(price),
                  "Can't withdraw ETH during recovery mode"
                ]
              ] as const)
            : []),
          ...(debtDifference?.positive
            ? ([
                [
                  !total.collateralRatioIsBelowCritical(price),
                  `Can't borrow ${COIN} during recovery mode`
                ],
                [
                  !total.subtract(original).add(afterFee).collateralRatioIsBelowCritical(price),
                  `Total collateral ratio would fall below ${ccrPercent}`
                ]
              ] as const)
            : []),
          ...(debtDifference?.negative
            ? ([
                [lusdBalance.gte(debtDifference.absoluteValue!), `You don't have enough ${COIN}`]
              ] as const)
            : [])
        ]
      ] as const);

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
        requires={[
          [
            !afterFee.collateralRatioIsBelowMinimum(price),
            `Collateral ratio must be at least ${mcrPercent}`
          ],
          [
            edited.isEmpty || edited.debt.gte(Trove.GAS_COMPENSATION_DEPOSIT),
            `Need at least ${Trove.GAS_COMPENSATION_DEPOSIT} ${COIN} for gas compensation`
          ],
          ...extraRequirements
        ]}
        {...{ send }}
      >
        <Button sx={{ mx: 2 }}>{actionName}</Button>
      </Transaction>
    </Flex>
  );
};
