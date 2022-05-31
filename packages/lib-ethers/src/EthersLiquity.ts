import {
  CollateralGainTransferDetails,
  Decimal,
  Decimalish,
  FailedReceipt,
  Fees,
  FrontendStatus,
  LiquidationDetails,
  LiquityStore,
  ZEROStake,
  RedemptionDetails,
  StabilityDeposit,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TransactableLiquity,
  TransactionFailedError,
  Trove,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove
} from "@sovryn-zero/lib-base";

import {
  EthersLiquityConnection,
  EthersLiquityConnectionOptionalParams,
  EthersLiquityStoreOption,
  _connect,
  _usingStore
} from "./EthersLiquityConnection";

import {
  EthersCallOverrides,
  EthersProvider,
  EthersSigner,
  EthersTransactionOverrides,
  EthersTransactionReceipt
} from "./types";

import { PopulatableEthersLiquity, SentEthersLiquityTransaction } from "./PopulatableEthersLiquity";
import { ReadableEthersLiquity, ReadableEthersLiquityWithStore } from "./ReadableEthersLiquity";
import { SendableEthersLiquity } from "./SendableEthersLiquity";
import { BlockPolledLiquityStore } from "./BlockPolledLiquityStore";

/**
 * Thrown by {@link EthersLiquity} in case of transaction failure.
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

const waitForSuccess = async <T>(tx: SentEthersLiquityTransaction<T>) => {
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
export class EthersLiquity implements ReadableEthersLiquity, TransactableLiquity {
  /** Information about the connection to the Liquity protocol. */
  readonly connection: EthersLiquityConnection;

  /** Can be used to create populated (unsigned) transactions. */
  readonly populate: PopulatableEthersLiquity;

  /** Can be used to send transactions without waiting for them to be mined. */
  readonly send: SendableEthersLiquity;

  private _readable: ReadableEthersLiquity;

  /** @internal */
  constructor(readable: ReadableEthersLiquity) {
    this._readable = readable;
    this.connection = readable.connection;
    this.populate = new PopulatableEthersLiquity(readable);
    this.send = new SendableEthersLiquity(this.populate);
  }

  /** @internal */
  static _from(
    connection: EthersLiquityConnection & { useStore: "blockPolled" }
  ): EthersLiquityWithStore<BlockPolledLiquityStore>;

  /** @internal */
  static _from(connection: EthersLiquityConnection): EthersLiquity;

  /** @internal */
  static _from(connection: EthersLiquityConnection): EthersLiquity {
    if (_usingStore(connection)) {
      return new _EthersLiquityWithStore(ReadableEthersLiquity._from(connection));
    } else {
      return new EthersLiquity(ReadableEthersLiquity._from(connection));
    }
  }

  /** @internal */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams: EthersLiquityConnectionOptionalParams & { useStore: "blockPolled" }
  ): Promise<EthersLiquityWithStore<BlockPolledLiquityStore>>;

  /**
   * Connect to the Liquity protocol and create an `EthersLiquity` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<EthersLiquity>;

  static async connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<EthersLiquity> {
    return EthersLiquity._from(await _connect(signerOrProvider, optionalParams));
  }

  /**
   * Check whether this `EthersLiquity` is an {@link EthersLiquityWithStore}.
   */
  hasStore(): this is EthersLiquityWithStore;

  /**
   * Check whether this `EthersLiquity` is an
   * {@link EthersLiquityWithStore}\<{@link BlockPolledLiquityStore}\>.
   */
  hasStore(store: "blockPolled"): this is EthersLiquityWithStore<BlockPolledLiquityStore>;

  hasStore(): boolean {
    return false;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getTotalRedistributed} */
  getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotalRedistributed(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
  getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    return this._readable.getTroveBeforeRedistribution(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getTrove} */
  getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove> {
    return this._readable.getTrove(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getNumberOfTroves} */
  getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number> {
    return this._readable.getNumberOfTroves(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getPrice} */
  getPrice(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getPrice(overrides);
  }

  /** @internal */
  _getActivePool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getActivePool(overrides);
  }

  /** @internal */
  _getDefaultPool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getDefaultPool(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getTotal} */
  getTotal(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotal(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getStabilityDeposit} */
  getStabilityDeposit(address?: string, overrides?: EthersCallOverrides): Promise<StabilityDeposit> {
    return this._readable.getStabilityDeposit(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getRemainingStabilityPoolZEROReward} */
  getRemainingStabilityPoolZEROReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getRemainingStabilityPoolZEROReward(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getZUSDInStabilityPool} */
  getZUSDInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getZUSDInStabilityPool(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getZUSDBalance} */
  getZUSDBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getZUSDBalance(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getNUEBalance} */
  getNUEBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getNUEBalance(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getZEROBalance} */
  getZEROBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getZEROBalance(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getCollateralSurplusBalance} */
  getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getCollateralSurplusBalance(address, overrides);
  }

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution[]>;

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.(getTroves:2)} */
  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;

  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]> {
    return this._readable.getTroves(params, overrides);
  }

  /** @internal */
  _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    return this._readable._getFeesFactory(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getFees} */
  getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    return this._readable.getFees(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getZEROStake} */
  getZEROStake(address?: string, overrides?: EthersCallOverrides): Promise<ZEROStake> {
    return this._readable.getZEROStake(address, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getTotalStakedZERO} */
  getTotalStakedZERO(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getTotalStakedZERO(overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#ReadableLiquity.getFrontendStatus} */
  getFrontendStatus(address?: string, overrides?: EthersCallOverrides): Promise<FrontendStatus> {
    return this._readable.getFrontendStatus(address, overrides);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.openTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveCreationDetails> {
    return this.send.openTrove(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.openTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  openNueTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveCreationDetails> {
    return this.send.openNueTrove(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.closeTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  closeTrove(overrides?: EthersTransactionOverrides): Promise<TroveClosureDetails> {
    return this.send.closeTrove(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.closeNueTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  closeNueTrove(overrides?: EthersTransactionOverrides): Promise<TroveClosureDetails> {
    return this.send.closeNueTrove(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.adjustTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.adjustTrove(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.adjustNueTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  adjustNueTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.adjustNueTrove(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.depositCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.depositCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.withdrawCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.withdrawCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.borrowZUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  borrowZUSD(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.borrowZUSD(amount, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.repayZUSD}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  repayZUSD(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.repayZUSD(amount, overrides).then(waitForSuccess);
  }

  /** @internal */
  setPrice(price: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.setPrice(price, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.liquidate}
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
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.liquidateUpTo}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<LiquidationDetails> {
    return this.send.liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.depositZUSDInStabilityPool}
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
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.withdrawZUSDFromStabilityPool}
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
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.withdrawGainsFromStabilityPool}
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
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.transferCollateralGainToTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  transferCollateralGainToTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<CollateralGainTransferDetails> {
    return this.send.transferCollateralGainToTrove(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.sendZUSD}
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
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.sendZERO}
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
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.redeemZUSD}
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
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.claimCollateralSurplus}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  claimCollateralSurplus(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.claimCollateralSurplus(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.stakeZERO}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  stakeZERO(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.stakeZERO(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.unstakeZERO}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  unstakeZERO(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.unstakeZERO(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.withdrawGainsFromStaking}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawGainsFromStaking(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.withdrawGainsFromStaking(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @sovryn-zero/lib-base#TransactableLiquity.registerFrontend}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  registerFrontend(kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.registerFrontend(kickbackRate, overrides).then(waitForSuccess);
  }
}

/**
 * Variant of {@link EthersLiquity} that exposes a {@link @sovryn-zero/lib-base#LiquityStore}.
 *
 * @public
 */
export interface EthersLiquityWithStore<T extends LiquityStore = LiquityStore>
  extends EthersLiquity {
  /** An object that implements LiquityStore. */
  readonly store: T;
}

class _EthersLiquityWithStore<T extends LiquityStore = LiquityStore>
  extends EthersLiquity
  implements EthersLiquityWithStore<T> {
  readonly store: T;

  constructor(readable: ReadableEthersLiquityWithStore<T>) {
    super(readable);

    this.store = readable.store;
  }

  hasStore(store?: EthersLiquityStoreOption): boolean {
    return store === undefined || store === this.connection.useStore;
  }
}
