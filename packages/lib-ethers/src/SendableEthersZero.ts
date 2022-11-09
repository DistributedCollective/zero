import {
  CollateralGainTransferDetails,
  Decimalish,
  LiquidationDetails,
  RedemptionDetails,
  SendableZero,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams
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

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.openTrove} */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveCreationDetails>> {
    return this._populate.openTrove(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.openNueTrove} */
  openNueTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveCreationDetails>> {
    return this._populate.openNueTrove(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.closeTrove} */
  closeTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveClosureDetails>> {
    return this._populate.closeTrove(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.closeNueTrove} */
  closeNueTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveClosureDetails>> {
    return this._populate.closeNueTrove(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.adjustTrove} */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveAdjustmentDetails>> {
    return this._populate.adjustTrove(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.adjustNueTrove} */
  adjustNueTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveAdjustmentDetails>> {
    return this._populate.adjustNueTrove(params, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.depositCollateral} */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveAdjustmentDetails>> {
    return this._populate.depositCollateral(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveAdjustmentDetails>> {
    return this._populate.withdrawCollateral(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.borrowZUSD} */
  borrowZUSD(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveAdjustmentDetails>> {
    return this._populate.borrowZUSD(amount, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.repayZUSD} */
  repayZUSD(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<TroveAdjustmentDetails>> {
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
    maximumNumberOfTrovesToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<LiquidationDetails>> {
    return this._populate
      .liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides)
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

  /** {@inheritDoc @sovryn-zero/lib-base#SendableZero.transferCollateralGainToTrove} */
  transferCollateralGainToTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersZeroTransaction<CollateralGainTransferDetails>> {
    return this._populate.transferCollateralGainToTrove(overrides).then(sendTransaction);
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
