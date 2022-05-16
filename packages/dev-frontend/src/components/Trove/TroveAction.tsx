import { useMemo } from "react";
import { Button } from "theme-ui";

import { Decimal, TroveChange } from "@sovryn-zero/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { TransactionFunction, useTransactionFunction } from "../Transaction";

type TroveActionProps = {
  transactionId: string;
  useNueToken: boolean;
  change: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }>;
  maxBorrowingRate: Decimal;
};

export const TroveAction: React.FC<TroveActionProps> = ({
  children,
  transactionId,
  change,
  useNueToken,
  maxBorrowingRate
}) => {
  const { liquity } = useLiquity();

  const troveAction = useMemo(() => {
    let action: TransactionFunction;

    switch (change.type) {
      case "creation": {
        action = useNueToken
          ? liquity.send.openNueTrove.bind(liquity.send, change.params, maxBorrowingRate)
          : liquity.send.openTrove.bind(liquity.send, change.params, maxBorrowingRate);
        break;
      }

      case "closure": {
        action = useNueToken
          ? liquity.send.closeNueTrove.bind(liquity.send)
          : liquity.send.closeTrove.bind(liquity.send);
        break;
      }

      case "adjustment": {
        action = useNueToken
          ? liquity.send.adjustNueTrove.bind(liquity.send, change.params, maxBorrowingRate)
          : liquity.send.adjustTrove.bind(liquity.send, change.params, maxBorrowingRate);
        break;
      }
    }

    return action;
  }, [change.params, change.type, liquity.send, maxBorrowingRate, useNueToken]);

  const [sendTransaction] = useTransactionFunction(transactionId, troveAction);

  return <Button onClick={sendTransaction}>{children}</Button>;
};
