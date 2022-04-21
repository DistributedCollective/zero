import { BigNumber } from "@ethersproject/bignumber";
import { Event } from "@ethersproject/contracts";

import {
  Decimal,
  ObservableLiquity,
  StabilityDeposit,
  Trove,
  TroveWithPendingRedistribution
} from "@liquity/lib-base";

import { _getContracts, _requireAddress } from "./EthersLiquityConnection";
import { ReadableEthersLiquity } from "./ReadableEthersLiquity";

const debouncingDelayMs = 50;

const debounce = (listener: (latestBlock: number) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
  let latestBlock = 0;

  return (...args: unknown[]) => {
    const event = args[args.length - 1] as Event;

    if (event.blockNumber !== undefined && event.blockNumber > latestBlock) {
      latestBlock = event.blockNumber;
    }

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      listener(latestBlock);
      timeoutId = undefined;
    }, debouncingDelayMs);
  };
};

/** @alpha */
export class ObservableEthersLiquity implements ObservableLiquity {
  private readonly _readable: ReadableEthersLiquity;

  constructor(readable: ReadableEthersLiquity) {
    this._readable = readable;
  }

  watchTotalRedistributed(
    onTotalRedistributedChanged: (totalRedistributed: Trove) => void
  ): () => void {
    const { activePool, defaultPool } = _getContracts(this._readable.connection);
    const etherSent = activePool.filters.RBtcerSent();

    const redistributionListener = debounce((blockTag: number) => {
      this._readable.getTotalRedistributed({ blockTag }).then(onTotalRedistributedChanged);
    });

    const etherSentListener = (toAddress: string, _amount: BigNumber, event: Event) => {
      if (toAddress === defaultPool.address) {
        redistributionListener(event);
      }
    };

    activePool.on(etherSent, etherSentListener);

    return () => {
      activePool.removeListener(etherSent, etherSentListener);
    };
  }

  watchTroveWithoutRewards(
    onTroveChanged: (trove: TroveWithPendingRedistribution) => void,
    address?: string
  ): () => void {
    address ??= _requireAddress(this._readable.connection);

    const { troveManager, borrowerOperations } = _getContracts(this._readable.connection);
    const troveUpdatedByTroveManager = troveManager.filters.TroveUpdated(address);
    const troveUpdatedByBorrowerOperations = borrowerOperations.filters.TroveUpdated(address);

    const troveListener = debounce((blockTag: number) => {
      this._readable.getTroveBeforeRedistribution(address, { blockTag }).then(onTroveChanged);
    });

    troveManager.on(troveUpdatedByTroveManager, troveListener);
    borrowerOperations.on(troveUpdatedByBorrowerOperations, troveListener);

    return () => {
      troveManager.removeListener(troveUpdatedByTroveManager, troveListener);
      borrowerOperations.removeListener(troveUpdatedByBorrowerOperations, troveListener);
    };
  }

  watchNumberOfTroves(onNumberOfTrovesChanged: (numberOfTroves: number) => void): () => void {
    const { troveManager } = _getContracts(this._readable.connection);
    const { TroveUpdated } = troveManager.filters;
    const troveUpdated = TroveUpdated();

    const troveUpdatedListener = debounce((blockTag: number) => {
      this._readable.getNumberOfTroves({ blockTag }).then(onNumberOfTrovesChanged);
    });

    troveManager.on(troveUpdated, troveUpdatedListener);

    return () => {
      troveManager.removeListener(troveUpdated, troveUpdatedListener);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  watchPrice(onPriceChanged: (price: Decimal) => void): () => void {
    // TODO revisit
    // We no longer have our own PriceUpdated events. If we want to implement this in an event-based
    // manner, we'll need to listen to aggregator events directly. Or we could do polling.
    throw new Error("Method not implemented.");
  }

  watchTotal(onTotalChanged: (total: Trove) => void): () => void {
    const { troveManager } = _getContracts(this._readable.connection);
    const { TroveUpdated } = troveManager.filters;
    const troveUpdated = TroveUpdated();

    const totalListener = debounce((blockTag: number) => {
      this._readable.getTotal({ blockTag }).then(onTotalChanged);
    });

    troveManager.on(troveUpdated, totalListener);

    return () => {
      troveManager.removeListener(troveUpdated, totalListener);
    };
  }

  watchStabilityDeposit(
    onStabilityDepositChanged: (stabilityDeposit: StabilityDeposit) => void,
    address?: string
  ): () => void {
    address ??= _requireAddress(this._readable.connection);

    const { activePool, stabilityPool } = _getContracts(this._readable.connection);
    const { UserDepositChanged } = stabilityPool.filters;
    const { RBtcerSent } = activePool.filters;

    const userDepositChanged = UserDepositChanged(address);
    const etherSent = RBtcerSent();

    const depositListener = debounce((blockTag: number) => {
      this._readable.getStabilityDeposit(address, { blockTag }).then(onStabilityDepositChanged);
    });

    const etherSentListener = (toAddress: string, _amount: BigNumber, event: Event) => {
      if (toAddress === stabilityPool.address) {
        // Liquidation while Stability Pool has some deposits
        // There may be new gains
        depositListener(event);
      }
    };

    stabilityPool.on(userDepositChanged, depositListener);
    activePool.on(etherSent, etherSentListener);

    return () => {
      stabilityPool.removeListener(userDepositChanged, depositListener);
      activePool.removeListener(etherSent, etherSentListener);
    };
  }

  watchZUSDInStabilityPool(
    onZUSDInStabilityPoolChanged: (zusdInStabilityPool: Decimal) => void
  ): () => void {
    const { zusdToken, stabilityPool } = _getContracts(this._readable.connection);
    const { Transfer } = zusdToken.filters;

    const transferZUSDFromStabilityPool = Transfer(stabilityPool.address);
    const transferZUSDToStabilityPool = Transfer(null, stabilityPool.address);

    const stabilityPoolZUSDFilters = [transferZUSDFromStabilityPool, transferZUSDToStabilityPool];

    const stabilityPoolZUSDListener = debounce((blockTag: number) => {
      this._readable.getZUSDInStabilityPool({ blockTag }).then(onZUSDInStabilityPoolChanged);
    });

    stabilityPoolZUSDFilters.forEach(filter => zusdToken.on(filter, stabilityPoolZUSDListener));

    return () =>
      stabilityPoolZUSDFilters.forEach(filter =>
        zusdToken.removeListener(filter, stabilityPoolZUSDListener)
      );
  }

  watchZUSDBalance(onZUSDBalanceChanged: (balance: Decimal) => void, address?: string): () => void {
    address ??= _requireAddress(this._readable.connection);

    const { zusdToken } = _getContracts(this._readable.connection);
    const { Transfer } = zusdToken.filters;
    const transferZUSDFromUser = Transfer(address);
    const transferZUSDToUser = Transfer(null, address);

    const zusdTransferFilters = [transferZUSDFromUser, transferZUSDToUser];

    const zusdTransferListener = debounce((blockTag: number) => {
      this._readable.getZUSDBalance(address, { blockTag }).then(onZUSDBalanceChanged);
    });

    zusdTransferFilters.forEach(filter => zusdToken.on(filter, zusdTransferListener));

    return () =>
      zusdTransferFilters.forEach(filter => zusdToken.removeListener(filter, zusdTransferListener));
  }

  watchNUEBalance(onNUEBalanceChanged: (balance: Decimal) => void, address?: string): () => void {
    address ??= _requireAddress(this._readable.connection);

    const { nueToken } = _getContracts(this._readable.connection);

    if (!nueToken) {
      throw "nue token address not set"
    }

    const { Transfer } = nueToken.filters;
    const transferNUEFromUser = Transfer(address);
    const transferNUEToUser = Transfer(null, address);

    const nueTransferFilters = [transferNUEFromUser, transferNUEToUser];

    const zusdTransferListener = debounce((blockTag: number) => {
      this._readable.getNUEBalance(address, { blockTag }).then(onNUEBalanceChanged);
    });

    nueTransferFilters.forEach(filter => nueToken.on(filter, zusdTransferListener));

    return () =>
      nueTransferFilters.forEach(filter => nueToken.removeListener(filter, zusdTransferListener));
  }
}
