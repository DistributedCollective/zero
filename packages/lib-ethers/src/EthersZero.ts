import {
  CollateralGainTransferDetails,
  Decimal,
  Decimalish,
  FailedReceipt,
  Fees,
  FrontendStatus,
  LiquidationDetails,
  ZeroStore,
  ZEROStake,
  RedemptionDetails,
  StabilityDeposit,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TransactableZero,
  TransactionFailedError,
  LoC,
  LoCAdjustmentDetails,
  LoCAdjustmentParams,
  LoCClosureDetails,
  LoCCreationDetails,
  LoCCreationParams,
  LoCListingParams,
  LoCWithPendingRedistribution,
  UserLoC
} from "@sovryn-zero/lib-base";

import {
  EthersZeroConnection,
  EthersZeroConnectionOptionalParams,
  EthersZeroStoreOption,
  _connect,
  _usingStore
} from "./EthersZeroConnection";

import {
  EthersCallOverrides,
  EthersProvider,
  EthersSigner,
  EthersTransactionOverrides,
  EthersTransactionReceipt
} from "./types";

import { PopulatableEthersZero, SentEthersZeroTransaction } from "./PopulatableEthersZero";
import { ReadableEthersZero, ReadableEthersZeroWithStore } from "./ReadableEthersZero";
import { SendableEthersZero } from "./SendableEthersZero";
import { BlockPolledZeroStore } from "./BlockPolledZeroStore";

/**
 * Thrown by {@link EthersZero} in case of transaction failure.
 *
 * @public
 */
export class EthersTransactionFailedError extends TransactionFailedError<
  FailedReceipt<EthersTransactionReceipt>
> {
  constructor(message: string, failedReceipt: FailedReceipt<EthersTransactionReceipt>) {
    super("EthersTransactionFailedError", message, failedReceipt);
  }
}

const waitForSuccess = async <T>(tx: SentEthersZeroTransaction<T>) => {
  const receipt = await tx.waitForReceipt();

  if (receipt.status !== "succeeded") {
    throw new EthersTransactionFailedError("Transaction failed", receipt);
  }

  return receipt.details;
};

/**
 * Convenience class that combines multiple interfaces of the library in one object.
 *
 * @public
 */
export class EthersZero implements ReadableEthersZero, TransactableZero {
  /** Information about the connection to the Zero protocol. */
  readonly connection: EthersZeroConnection;

  /** Can be used to create populated (unsigned) transactions. */
  readonly populate: PopulatableEthersZero;

  /** Can be used to send transactions without waiting for them to be mined. */
  readonly send: SendableEthersZero;

  private _readable: ReadableEthersZero;

  /** @internal */
  constructor(readable: ReadableEthersZero) {
    this._readable = readable;
    this.connection = readable.connection;
    this.populate = new PopulatableEthersZero(readable);
    this.send = new SendableEthersZero(this.populate);
  }

  /** @internal */
  static _from(
    connection: EthersZeroConnection & { useStore: "blockPolled" }
  ): EthersZeroWithStore<BlockPolledZeroStore>;

  /** @internal */
  static _from(connection: EthersZeroConnection): EthersZero;

  /** @internal */
  static _from(connection: EthersZeroConnection): EthersZero {
    if (_usingStore(connection)) {
      return new _EthersZeroWithStore(ReadableEthersZero._from(connection));
    } else {
      return new EthersZero(ReadableEthersZero._from(connection));
    }
  }

  /** @internal */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams: EthersZeroConnectionOptionalParams & { useStore: "blockPolled" }
  ): Promise<EthersZeroWithStore<BlockPolledZeroStore>>;

  /**
   * Connect to the Zero protocol and create an `EthersZero` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersZeroConnectionOptionalParams
  ): Promise<EthersZero>;

  static async connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersZeroConnectionOptionalParams
  ): Promise<EthersZero> {
    return EthersZero._from(await _connect(signerOrProvider, optionalParams));
  }

  /**
   * Check whether this `EthersZero` is an {@link EthersZeroWithStore}.
   */
  hasStore(): this is EthersZeroWithStore;

  /**
   * Check whether this `EthersZero` is an
   * {@link EthersZeroWithStore}\<{@link BlockPolledZeroStore}\>.
   */
  hasStore(store: "blockPolled"): this is EthersZeroWithStore<BlockPolledZeroStore>;

  hasStore(): boolean {
    return false;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getTotalRedistributed} */
  getTotalRedistributed(overrides?: EthersCallOverrides): Promise<LoC> {
    return this._readable.getTotalRedistributed(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getLoCBeforeRedistribution} */
  getLoCBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<LoCWithPendingRedistribution> {
    return this._readable.getLoCBeforeRedistribution(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getLoC} */
  getLoC(address?: string, overrides?: EthersCallOverrides): Promise<UserLoC> {
    return this._readable.getLoC(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getNumberOfLoCs} */
  getNumberOfLoCs(overrides?: EthersCallOverrides): Promise<number> {
    return this._readable.getNumberOfLoCs(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getPrice} */
  getPrice(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getPrice(overrides);
  }

  /** @internal */
  _getActivePool(overrides?: EthersCallOverrides): Promise<LoC> {
    return this._readable._getActivePool(overrides);
  }

  /** @internal */
  _getDefaultPool(overrides?: EthersCallOverrides): Promise<LoC> {
    return this._readable._getDefaultPool(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getTotal} */
  getTotal(overrides?: EthersCallOverrides): Promise<LoC> {
    return this._readable.getTotal(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getStabilityDeposit} */
  getStabilityDeposit(address?: string, overrides?: EthersCallOverrides): Promise<StabilityDeposit> {
    return this._readable.getStabilityDeposit(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getRemainingStabilityPoolZEROReward} */
  getRemainingStabilityPoolZEROReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getRemainingStabilityPoolZEROReward(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZUSDInStabilityPool} */
  getZUSDInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getZUSDInStabilityPool(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZUSDBalance} */
  getZUSDBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getZUSDBalance(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZEROBalance} */
  getZEROBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getZEROBalance(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getCollateralSurplusBalance} */
  getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getCollateralSurplusBalance(address, overrides);
  }

  /** @internal */
  getLoCs(
    params: LoCListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<LoCWithPendingRedistribution[]>;

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.(getLoCs:2)} */
  getLoCs(params: LoCListingParams, overrides?: EthersCallOverrides): Promise<UserLoC[]>;

  getLoCs(params: LoCListingParams, overrides?: EthersCallOverrides): Promise<UserLoC[]> {
    return this._readable.getLoCs(params, overrides);
  }

  /** @internal */
  _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    return this._readable._getFeesFactory(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getFees} */
  getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    return this._readable.getFees(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getZEROStake} */
  getZEROStake(address?: string, overrides?: EthersCallOverrides): Promise<ZEROStake> {
    return this._readable.getZEROStake(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getTotalStakedZERO} */
  getTotalStakedZERO(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getTotalStakedZERO(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableZero.getFrontendStatus} */
  getFrontendStatus(address?: string, overrides?: EthersCallOverrides): Promise<FrontendStatus> {
    return this._readable.getFrontendStatus(address, overrides);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.openLoC}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  openLoC(
    params: LoCCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCCreationDetails> {
    return this.send.openLoC(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.openLoC}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  openNueLoC(
    params: LoCCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCCreationDetails> {
    return this.send.openNueLoC(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.closeLoC}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  closeLoC(overrides?: EthersTransactionOverrides): Promise<LoCClosureDetails> {
    return this.send.closeLoC(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.closeNueLoC}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  closeNueLoC(overrides?: EthersTransactionOverrides): Promise<LoCClosureDetails> {
    return this.send.closeNueLoC(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.adjustLoC}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  adjustLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCAdjustmentDetails> {
    return this.send.adjustLoC(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.adjustNueLoC}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  adjustNueLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCAdjustmentDetails> {
    return this.send.adjustNueLoC(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.depositCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCAdjustmentDetails> {
    return this.send.depositCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.withdrawCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCAdjustmentDetails> {
    return this.send.withdrawCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.borrowZUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  borrowZUSD(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCAdjustmentDetails> {
    return this.send.borrowZUSD(amount, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.repayZUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  repayZUSD(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<LoCAdjustmentDetails> {
    return this.send.repayZUSD(amount, overrides).then(waitForSuccess);
  }

  /** @internal */
  setPrice(price: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.setPrice(price, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.liquidate}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  liquidate(
    address: string | string[],
    overrides?: EthersTransactionOverrides
  ): Promise<LiquidationDetails> {
    return this.send.liquidate(address, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.liquidateUpTo}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  liquidateUpTo(
    maximumNumberOfLoCsToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<LiquidationDetails> {
    return this.send.liquidateUpTo(maximumNumberOfLoCsToLiquidate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.depositZUSDInStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityDepositChangeDetails> {
    return this.send.depositZUSDInStabilityPool(amount, frontendTag, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.withdrawZUSDFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawZUSDFromStabilityPool(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityDepositChangeDetails> {
    return this.send.withdrawZUSDFromStabilityPool(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.withdrawGainsFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawGainsFromStabilityPool(
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityPoolGainsWithdrawalDetails> {
    return this.send.withdrawGainsFromStabilityPool(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.transferCollateralGainToLoC}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  transferCollateralGainToLoC(
    overrides?: EthersTransactionOverrides
  ): Promise<CollateralGainTransferDetails> {
    return this.send.transferCollateralGainToLoC(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.sendZUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  sendZUSD(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<void> {
    return this.send.sendZUSD(toAddress, amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.sendZERO}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  sendZERO(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<void> {
    return this.send.sendZERO(toAddress, amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.redeemZUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  redeemZUSD(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<RedemptionDetails> {
    return this.send.redeemZUSD(amount, maxRedemptionRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.claimCollateralSurplus}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  claimCollateralSurplus(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.claimCollateralSurplus(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.stakeZERO}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  stakeZERO(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.stakeZERO(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.unstakeZERO}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  unstakeZERO(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.unstakeZERO(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.withdrawGainsFromStaking}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawGainsFromStaking(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.withdrawGainsFromStaking(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableZero.registerFrontend}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  registerFrontend(kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.registerFrontend(kickbackRate, overrides).then(waitForSuccess);
  }
}

/**
 * Variant of {@link EthersZero} that exposes a {@link @sovryn-zero/lib-base#ZeroStore}.
 *
 * @public
 */
export interface EthersZeroWithStore<T extends ZeroStore = ZeroStore>
  extends EthersZero {
  /** An object that implements ZeroStore. */
  readonly store: T;
}

class _EthersZeroWithStore<T extends ZeroStore = ZeroStore>
  extends EthersZero
  implements EthersZeroWithStore<T> {
  readonly store: T;

  constructor(readable: ReadableEthersZeroWithStore<T>) {
    super(readable);

    this.store = readable.store;
  }

  hasStore(store?: EthersZeroStoreOption): boolean {
    return store === undefined || store === this.connection.useStore;
  }
}
