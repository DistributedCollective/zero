import {
  TroveUpdated,
  ZUSDBorrowingFeePaid
} from "../../generated/BorrowerOperations/BorrowerOperations";

import { getTroveOperationFromBorrowerOperation } from "../types/TroveOperation";

import { setBorrowingFeeOfLastTroveChange, updateTrove } from "../entities/Trove";
import { increaseTotalBorrowingFeesPaid } from "../entities/Global";

export function handleTroveUpdated(event: TroveUpdated): void {
  updateTrove(
    event,
    getTroveOperationFromBorrowerOperation(event.params.operation),
    event.params._borrower,
    event.params._coll,
    event.params._debt,
    event.params.stake
  );
}

export function handleZUSDBorrowingFeePaid(event: ZUSDBorrowingFeePaid): void {
  setBorrowingFeeOfLastTroveChange(event.params._ZUSDFee);
  increaseTotalBorrowingFeesPaid(event.params._ZUSDFee);
}
