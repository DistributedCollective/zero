import {
  CollateralGainTransferDetails,
  Decimalish,
  LiquidationDetails,
  RedemptionDetails,
  SendableZero,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  LoCAdjustmentDetails,
  LoCAdjustmentParams,
  LoCClosureDetails,
  LoCCreationDetails,
  LoCCreationParams
} from "@sovryn-zero/lib-base";

import {
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  EthersTransactionResponse
} from "./types";

import {
  PopulatableEthersZero,
  PopulatedEthersZeroTransaction,
  SentEthersZeroTransaction
} from "./PopulatableEthersZero";

const sendTransaction = <T>(tx: PopulatedEthersZeroTransaction<T>) => tx.send();

/**
 * Ethers-based implementation of {@link @sovryn-zero/lib-base#SendableZero}.
 *
 * @public
 */
export class SendableEthersZero
  implements SendableZero<EthersTransactionReceipt, EthersTransactionResponse> {
  private _populate: PopulatableEthersZero;

  constructor(populatable: PopulatableEthersZero) {
    this._populate = populatable;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.openLoC} */
  openLoC(
    params: LoCCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCCreationDetails>> {
    return this._populate.openLoC(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.openNueLoC} */
  openNueLoC(
    params: LoCCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCCreationDetails>> {
    return this._populate.openNueLoC(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.closeLoC} */
  closeLoC(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCClosureDetails>> {
    return this._populate.closeLoC(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.closeNueLoC} */
  closeNueLoC(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCClosureDetails>> {
    return this._populate.closeNueLoC(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.adjustLoC} */
  adjustLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this._populate.adjustLoC(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.adjustNueLoC} */
  adjustNueLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this._populate.adjustNueLoC(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.depositCollateral} */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this._populate.depositCollateral(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this._populate.withdrawCollateral(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.borrowZUSD} */
  borrowZUSD(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this._populate.borrowZUSD(amount, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.repayZUSD} */
  repayZUSD(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this._populate.repayZUSD(amount, overrides).then(sendTransaction);
  }

  /** @internal */
  setPrice(
    price: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.setPrice(price, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.liquidate} */
  liquidate(
    address: string | string[],
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LiquidationDetails>> {
    return this._populate.liquidate(address, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.liquidateUpTo} */
  liquidateUpTo(
    maximumNumberOfLoCsToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LiquidationDetails>> {
    return this._populate
      .liquidateUpTo(maximumNumberOfLoCsToLiquidate, overrides)
      .then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.depositZUSDInStabilityPool} */
  depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<StabilityDepositChangeDetails>> {
    return this._populate
      .depositZUSDInStabilityPool(amount, frontendTag, overrides)
      .then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.withdrawZUSDFromStabilityPool} */
  withdrawZUSDFromStabilityPool(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<StabilityDepositChangeDetails>> {
    return this._populate.withdrawZUSDFromStabilityPool(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.withdrawGainsFromStabilityPool} */
  withdrawGainsFromStabilityPool(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<StabilityPoolGainsWithdrawalDetails>> {
    return this._populate.withdrawGainsFromStabilityPool(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.transferCollateralGainToLoC} */
  transferCollateralGainToLoC(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<CollateralGainTransferDetails>> {
    return this._populate.transferCollateralGainToLoC(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.sendZUSD} */
  sendZUSD(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.sendZUSD(toAddress, amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.sendZERO} */
  sendZERO(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.sendZERO(toAddress, amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.redeemZUSD} */
  redeemZUSD(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<RedemptionDetails>> {
    return this._populate.redeemZUSD(amount, maxRedemptionRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.claimCollateralSurplus} */
  claimCollateralSurplus(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.claimCollateralSurplus(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.stakeZERO} */
  stakeZERO(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.stakeZERO(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.unstakeZERO} */
  unstakeZERO(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.unstakeZERO(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.withdrawGainsFromStaking(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.registerFrontend} */
  registerFrontend(
    kickbackRate: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<void>> {
    return this._populate.registerFrontend(kickbackRate, overrides).then(sendTransaction);
  }
}
