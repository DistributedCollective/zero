import { Decimal } from "./Decimal";
import { LoC, LoCWithPendingRedistribution } from "./LoC";
import { StabilityDeposit } from "./StabilityDeposit";

/** @alpha */
export interface ObservableZero {
  watchTotalRedistributed(
    onTotalRedistributedChanged: (totalRedistributed: LoC) => void
  ): () => void;

  watchLoCWithoutRewards(
    onLoCChanged: (loc: LoCWithPendingRedistribution) => void,
    address?: string
  ): () => void;

  watchNumberOfLoCs(onNumberOfLoCsChanged: (numberOfLoCs: number) => void): () => void;

  watchPrice(onPriceChanged: (price: Decimal) => void): () => void;

  watchTotal(onTotalChanged: (total: LoC) => void): () => void;

  watchStabilityDeposit(
    onStabilityDepositChanged: (stabilityDeposit: StabilityDeposit) => void,
    address?: string
  ): () => void;

  watchZUSDInStabilityPool(
    onZUSDInStabilityPoolChanged: (zusdInStabilityPool: Decimal) => void
  ): () => void;

  watchZUSDBalance(onZUSDBalanceChanged: (balance: Decimal) => void, address?: string): () => void;
}
