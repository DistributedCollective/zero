import { BigNumber } from "@ethersproject/bignumber";
import { Event } from "@ethersproject/contracts";

import {
  Decimal,
  ObservableZero,
  StabilityDeposit,
  LoC,
  LoCWithPendingRedistribution
} from "@sovryn-zero/lib-base";

import { _getContracts, _requireAddress } from "./EthersZeroConnection";
import { ReadableEthersZero } from "./ReadableEthersZero";

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
export class ObservableEthersZero implements ObservableZero {
  private readonly _readable: ReadableEthersZero;

  constructor(readable: ReadableEthersZero) {
    this._readable = readable;
  }

  watchTotalRedistributed(
    onTotalRedistributedChanged: (totalRedistributed: LoC) => void
  ): () => void {
    const { activePool, defaultPool } = _getContracts(this._readable.connection);
    const etherSent = activePool.filters.EtherSent();

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

  watchLoCWithoutRewards(
    onLoCChanged: (loc: LoCWithPendingRedistribution) => void,
    address?: string
  ): () => void {
    address ??= _requireAddress(this._readable.connection);

    const { locManager, borrowerOperations } = _getContracts(this._readable.connection);
    const locUpdatedByLoCManager = locManager.filters.LoCUpdated(address);
    const locUpdatedByBorrowerOperations = borrowerOperations.filters.LoCUpdated(address);

    const locListener = debounce((blockTag: number) => {
      this._readable.getLoCBeforeRedistribution(address, { blockTag }).then(onLoCChanged);
    });

    locManager.on(locUpdatedByLoCManager, locListener);
    borrowerOperations.on(locUpdatedByBorrowerOperations, locListener);

    return () => {
      locManager.removeListener(locUpdatedByLoCManager, locListener);
      borrowerOperations.removeListener(locUpdatedByBorrowerOperations, locListener);
    };
  }

  watchNumberOfLoCs(onNumberOfLoCsChanged: (numberOfLoCs: number) => void): () => void {
    const { locManager } = _getContracts(this._readable.connection);
    const { LoCUpdated } = locManager.filters;
    const locUpdated = LoCUpdated();

    const locUpdatedListener = debounce((blockTag: number) => {
      this._readable.getNumberOfLoCs({ blockTag }).then(onNumberOfLoCsChanged);
    });

    locManager.on(locUpdated, locUpdatedListener);

    return () => {
      locManager.removeListener(locUpdated, locUpdatedListener);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  watchPrice(onPriceChanged: (price: Decimal) => void): () => void {
    // TODO revisit
    // We no longer have our own PriceUpdated events. If we want to implement this in an event-based
    // manner, we'll need to listen to aggregator events directly. Or we could do polling.
    throw new Error("Method not implemented.");
  }

  watchTotal(onTotalChanged: (total: LoC) => void): () => void {
    const { locManager } = _getContracts(this._readable.connection);
    const { LoCUpdated } = locManager.filters;
    const locUpdated = LoCUpdated();

    const totalListener = debounce((blockTag: number) => {
      this._readable.getTotal({ blockTag }).then(onTotalChanged);
    });

    locManager.on(locUpdated, totalListener);

    return () => {
      locManager.removeListener(locUpdated, totalListener);
    };
  }

  watchStabilityDeposit(
    onStabilityDepositChanged: (stabilityDeposit: StabilityDeposit) => void,
    address?: string
  ): () => void {
    address ??= _requireAddress(this._readable.connection);

    const { activePool, stabilityPool } = _getContracts(this._readable.connection);
    const { UserDepositChanged } = stabilityPool.filters;
    const { EtherSent } = activePool.filters;

    const userDepositChanged = UserDepositChanged(address);
    const etherSent = EtherSent();

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
}
