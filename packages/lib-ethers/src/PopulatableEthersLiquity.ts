import assert from "assert";

import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";
import { Log } from "@ethersproject/abstract-provider";

import {
  CollateralGainTransferDetails,
  Decimal,
  Decimalish,
  LiquidationDetails,
  LiquityReceipt,
  ZUSD_MINIMUM_NET_DEBT,
  MinedReceipt,
  PopulatableLiquity,
  PopulatedLiquityTransaction,
  PopulatedRedemption,
  RedemptionDetails,
  SentLiquityTransaction,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  Trove,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams,
  TroveWithPendingRedistribution,
  _failedReceipt,
  _normalizeTroveAdjustment,
  _normalizeTroveCreation,
  _pendingReceipt,
  _successfulReceipt
} from "@sovryn-zero/lib-base";

import {
  EthersPopulatedTransaction,
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  EthersTransactionResponse,
  PermitParams
} from "./types";

import {
  EthersLiquityConnection,
  _getContracts,
  _getProvider,
  _requireAddress,
  _requireSigner
} from "./EthersLiquityConnection";

import { _priceFeedIsTestnet } from "./contracts";
import { logsToString } from "./parseLogs";
import { ReadableEthersLiquity } from "./ReadableEthersLiquity";

const decimalify = (bigNumber: BigNumber) => Decimal.fromBigNumberString(bigNumber.toHexString());

// With 70 iterations redemption costs about ~10M gas, and each iteration accounts for ~138k more
/** @internal */
export const _redeemMaxIterations = 70;

const defaultBorrowingRateSlippageTolerance = Decimal.from(0.005); // 0.5%
const defaultRedemptionRateSlippageTolerance = Decimal.from(0.001); // 0.1%

const noDetails = () => undefined;

const compose = <T, U, V>(f: (_: U) => V, g: (_: T) => U) => (_: T) => f(g(_));

const id = <T>(t: T) => t;

// Takes ~6-7K to update lastFeeOperationTime. Let's be on the safe side.
const addGasForPotentialLastFeeOperationTimeUpdate = (gas: BigNumber) => gas.add(10000);

// First traversal in ascending direction takes ~50K, then ~13.5K per extra step.
// 80K should be enough for 3 steps, plus some extra to be safe.
const addGasForPotentialListTraversal = (gas: BigNumber) => gas.add(80000);

const addGasForZEROIssuance = (gas: BigNumber) => gas.add(50000);

// To get the best entropy available, we'd do something like:
//
// const bigRandomNumber = () =>
//   BigNumber.from(
//     `0x${Array.from(crypto.getRandomValues(new Uint32Array(8)))
//       .map(u32 => u32.toString(16).padStart(8, "0"))
//       .join("")}`
//   );
//
// However, Window.crypto is browser-specific. Since we only use this for randomly picking Troves
// during the search for hints, Math.random() will do fine, too.
//
// This returns a random integer between 0 and Number.MAX_SAFE_INTEGER
const randomInteger = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

// Maximum number of trials to perform in a single getApproxHint() call. If the number of trials
// required to get a statistically "good" hint is larger than this, the search for the hint will
// be broken up into multiple getApproxHint() calls.
//
// This should be low enough to work with popular public Ethereum providers like Infura without
// triggering any fair use limits.
const maxNumberOfTrialsAtOnce = 2500;

function* generateTrials(totalNumberOfTrials: number) {
  assert(Number.isInteger(totalNumberOfTrials) && totalNumberOfTrials > 0);

  while (totalNumberOfTrials) {
    const numberOfTrials = Math.min(totalNumberOfTrials, maxNumberOfTrialsAtOnce);
    yield numberOfTrials;

    totalNumberOfTrials -= numberOfTrials;
  }
}

/**
 * A transaction that has already been sent.
 *
 * @remarks
 * Returned by {@link SendableEthersLiquity} functions.
 *
 * @public
 */
export class SentEthersLiquityTransaction<T = unknown>
  implements
    SentLiquityTransaction<EthersTransactionResponse, LiquityReceipt<EthersTransactionReceipt, T>> {
  /** Ethers' representation of a sent transaction. */
  readonly rawSentTransaction: EthersTransactionResponse;

  private readonly _connection: EthersLiquityConnection;
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T;

  /** @internal */
  constructor(
    rawSentTransaction: EthersTransactionResponse,
    connection: EthersLiquityConnection,
    parse: (rawReceipt: EthersTransactionReceipt) => T
  ) {
    this.rawSentTransaction = rawSentTransaction;
    this._connection = connection;
    this._parse = parse;
  }

  private _receiptFrom(rawReceipt: EthersTransactionReceipt | null) {
    return rawReceipt
      ? rawReceipt.status
        ? _successfulReceipt(rawReceipt, this._parse(rawReceipt), () =>
            logsToString(rawReceipt, _getContracts(this._connection))
          )
        : _failedReceipt(rawReceipt)
      : _pendingReceipt;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SentLiquityTransaction.getReceipt} */
  async getReceipt(): Promise<LiquityReceipt<EthersTransactionReceipt, T>> {
    return this._receiptFrom(
      await _getProvider(this._connection).getTransactionReceipt(this.rawSentTransaction.hash)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SentLiquityTransaction.waitForReceipt} */
  async waitForReceipt(): Promise<MinedReceipt<EthersTransactionReceipt, T>> {
    const receipt = this._receiptFrom(
      await _getProvider(this._connection).waitForTransaction(this.rawSentTransaction.hash)
    );

    assert(receipt.status !== "pending");
    return receipt;
  }
}

/**
 * A transaction that has been prepared for sending.
 *
 * @remarks
 * Returned by {@link PopulatableEthersLiquity} functions.
 *
 * @public
 */
export class PopulatedEthersLiquityTransaction<T = unknown>
  implements
    PopulatedLiquityTransaction<EthersPopulatedTransaction, SentEthersLiquityTransaction<T>> {
  /** Unsigned transaction object populated by Ethers. */
  readonly rawPopulatedTransaction: EthersPopulatedTransaction;

  private readonly _connection: EthersLiquityConnection;
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T;

  /** @internal */
  constructor(
    rawPopulatedTransaction: EthersPopulatedTransaction,
    connection: EthersLiquityConnection,
    parse: (rawReceipt: EthersTransactionReceipt) => T
  ) {
    this.rawPopulatedTransaction = rawPopulatedTransaction;
    this._connection = connection;
    this._parse = parse;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatedLiquityTransaction.send} */
  async send(): Promise<SentEthersLiquityTransaction<T>> {
    return new SentEthersLiquityTransaction(
      await _requireSigner(this._connection).sendTransaction(this.rawPopulatedTransaction),
      this._connection,
      this._parse
    );
  }
}

/**
 * {@inheritDoc @sovryn-zero/lib-base#PopulatedRedemption}
 *
 * @public
 */
export class PopulatedEthersRedemption
  extends PopulatedEthersLiquityTransaction<RedemptionDetails>
  implements
    PopulatedRedemption<
      EthersPopulatedTransaction,
      EthersTransactionResponse,
      EthersTransactionReceipt
    > {
  /** {@inheritDoc @sovryn-zero/lib-base#PopulatedRedemption.attemptedZUSDAmount} */
  readonly attemptedZUSDAmount: Decimal;

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatedRedemption.redeemableZUSDAmount} */
  readonly redeemableZUSDAmount: Decimal;

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatedRedemption.isTruncated} */
  readonly isTruncated: boolean;

  private readonly _increaseAmountByMinimumNetDebt?: (
    maxRedemptionRate?: Decimalish
  ) => Promise<PopulatedEthersRedemption>;

  /** @internal */
  constructor(
    rawPopulatedTransaction: EthersPopulatedTransaction,
    connection: EthersLiquityConnection,
    attemptedZUSDAmount: Decimal,
    redeemableZUSDAmount: Decimal,
    increaseAmountByMinimumNetDebt?: (
      maxRedemptionRate?: Decimalish
    ) => Promise<PopulatedEthersRedemption>
  ) {
    const { troveManager } = _getContracts(connection);

    super(
      rawPopulatedTransaction,
      connection,

      ({ logs }) =>
        troveManager
          .extractEvents(logs, "Redemption")
          .map(({ args: { _ETHSent, _ETHFee, _actualZUSDAmount, _attemptedZUSDAmount } }) => ({
            attemptedZUSDAmount: decimalify(_attemptedZUSDAmount),
            actualZUSDAmount: decimalify(_actualZUSDAmount),
            collateralTaken: decimalify(_ETHSent),
            fee: decimalify(_ETHFee)
          }))[0]
    );

    this.attemptedZUSDAmount = attemptedZUSDAmount;
    this.redeemableZUSDAmount = redeemableZUSDAmount;
    this.isTruncated = redeemableZUSDAmount.lt(attemptedZUSDAmount);
    this._increaseAmountByMinimumNetDebt = increaseAmountByMinimumNetDebt;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatedRedemption.increaseAmountByMinimumNetDebt} */
  increaseAmountByMinimumNetDebt(
    maxRedemptionRate?: Decimalish
  ): Promise<PopulatedEthersRedemption> {
    if (!this._increaseAmountByMinimumNetDebt) {
      throw new Error(
        "PopulatedEthersRedemption: increaseAmountByMinimumNetDebt() can " +
          "only be called when amount is truncated"
      );
    }

    return this._increaseAmountByMinimumNetDebt(maxRedemptionRate);
  }
}

/** @internal */
export interface _TroveChangeWithFees<T> {
  params: T;
  newTrove: Trove;
  fee: Decimal;
}

/**
 * Ethers-based implementation of {@link @sovryn-zero/lib-base#PopulatableLiquity}.
 *
 * @public
 */
export class PopulatableEthersLiquity
  implements
    PopulatableLiquity<
      EthersTransactionReceipt,
      EthersTransactionResponse,
      EthersPopulatedTransaction
    > {
  private readonly _readable: ReadableEthersLiquity;

  constructor(readable: ReadableEthersLiquity) {
    this._readable = readable;
  }

  private _wrapSimpleTransaction(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersLiquityTransaction<void> {
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      noDetails
    );
  }

  private _wrapTroveChangeWithFees<T>(
    params: T,
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersLiquityTransaction<_TroveChangeWithFees<T>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs }) => {
        const [newTrove] = borrowerOperations
          .extractEvents(logs, "TroveUpdated")
          .map(({ args: { _coll, _debt } }) => new Trove(decimalify(_coll), decimalify(_debt)));

        const [fee] = borrowerOperations
          .extractEvents(logs, "ZUSDBorrowingFeePaid")
          .map(({ args: { _ZUSDFee } }) => decimalify(_ZUSDFee));

        return {
          params,
          newTrove,
          fee
        };
      }
    );
  }

  private async _wrapTroveClosure(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): Promise<PopulatedEthersLiquityTransaction<TroveClosureDetails>> {
    const { activePool, zusdToken } = _getContracts(this._readable.connection);

    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs, from: userAddress }) => {
        const [repayZUSD] = zusdToken
          .extractEvents(logs, "Transfer")
          .filter(({ args: { from, to } }) => from === userAddress && to === AddressZero)
          .map(({ args: { value } }) => decimalify(value));

        const [withdrawCollateral] = activePool
          .extractEvents(logs, "EtherSent")
          .filter(({ args: { _to } }) => _to === userAddress)
          .map(({ args: { _amount } }) => decimalify(_amount));

        return {
          params: repayZUSD.nonZero ? { withdrawCollateral, repayZUSD } : { withdrawCollateral }
        };
      }
    );
  }

  private _wrapLiquidation(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersLiquityTransaction<LiquidationDetails> {
    const { troveManager } = _getContracts(this._readable.connection);

    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs }) => {
        const liquidatedAddresses = troveManager
          .extractEvents(logs, "TroveLiquidated")
          .map(({ args: { _borrower } }) => _borrower);

        const [totals] = troveManager
          .extractEvents(logs, "Liquidation")
          .map(
            ({
              args: { _ZUSDGasCompensation, _collGasCompensation, _liquidatedColl, _liquidatedDebt }
            }) => ({
              collateralGasCompensation: decimalify(_collGasCompensation),
              zusdGasCompensation: decimalify(_ZUSDGasCompensation),
              totalLiquidated: new Trove(decimalify(_liquidatedColl), decimalify(_liquidatedDebt))
            })
          );

        return {
          liquidatedAddresses,
          ...totals
        };
      }
    );
  }

  private _extractStabilityPoolGainsWithdrawalDetails(
    logs: Log[]
  ): StabilityPoolGainsWithdrawalDetails {
    const { stabilityPool } = _getContracts(this._readable.connection);

    const [newZUSDDeposit] = stabilityPool
      .extractEvents(logs, "UserDepositChanged")
      .map(({ args: { _newDeposit } }) => decimalify(_newDeposit));

    const [[collateralGain, zusdLoss]] = stabilityPool
      .extractEvents(logs, "ETHGainWithdrawn")
      .map(({ args: { _ETH, _ZUSDLoss } }) => [decimalify(_ETH), decimalify(_ZUSDLoss)]);

    const [zeroReward] = stabilityPool
      .extractEvents(logs, "ZEROPaidToDepositor")
      .map(({ args: { _ZERO } }) => decimalify(_ZERO));

    return {
      zusdLoss,
      newZUSDDeposit,
      collateralGain,
      zeroReward
    };
  }

  private _wrapStabilityPoolGainsWithdrawal(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersLiquityTransaction<StabilityPoolGainsWithdrawalDetails> {
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs }) => this._extractStabilityPoolGainsWithdrawalDetails(logs)
    );
  }

  private _wrapStabilityDepositTopup(
    change: { depositZUSD: Decimal },
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails> {
    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs }) => ({
        ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
        change
      })
    );
  }

  private async _wrapStabilityDepositWithdrawal(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>> {
    const { stabilityPool, zusdToken } = _getContracts(this._readable.connection);

    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs, from: userAddress }) => {
        const gainsWithdrawalDetails = this._extractStabilityPoolGainsWithdrawalDetails(logs);

        const [withdrawZUSD] = zusdToken
          .extractEvents(logs, "Transfer")
          .filter(({ args: { from, to } }) => from === stabilityPool.address && to === userAddress)
          .map(({ args: { value } }) => decimalify(value));

        return {
          ...gainsWithdrawalDetails,
          change: { withdrawZUSD, withdrawAllZUSD: gainsWithdrawalDetails.newZUSDDeposit.isZero }
        };
      }
    );
  }

  private _wrapCollateralGainTransfer(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersLiquityTransaction<CollateralGainTransferDetails> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return new PopulatedEthersLiquityTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs }) => {
        const [newTrove] = borrowerOperations
          .extractEvents(logs, "TroveUpdated")
          .map(({ args: { _coll, _debt } }) => new Trove(decimalify(_coll), decimalify(_debt)));

        return {
          ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
          newTrove
        };
      }
    );
  }

  private async _findHintsForNominalCollateralRatio(
    nominalCollateralRatio: Decimal
  ): Promise<[string, string]> {
    const { sortedTroves, hintHelpers } = _getContracts(this._readable.connection);
    const numberOfTroves = await this._readable.getNumberOfTroves();

    if (!numberOfTroves) {
      return [AddressZero, AddressZero];
    }

    if (nominalCollateralRatio.infinite) {
      return [AddressZero, await sortedTroves.getFirst()];
    }

    const totalNumberOfTrials = Math.ceil(10 * Math.sqrt(numberOfTroves));
    const [firstTrials, ...restOfTrials] = generateTrials(totalNumberOfTrials);

    const collectApproxHint = (
      {
        latestRandomSeed,
        results
      }: {
        latestRandomSeed: BigNumberish;
        results: { diff: BigNumber; hintAddress: string }[];
      },
      numberOfTrials: number
    ) =>
      hintHelpers
        .getApproxHint(nominalCollateralRatio.hex, numberOfTrials, latestRandomSeed)
        .then(({ latestRandomSeed, ...result }) => ({
          latestRandomSeed,
          results: [...results, result]
        }));

    const { results } = await restOfTrials.reduce(
      (p, numberOfTrials) => p.then(state => collectApproxHint(state, numberOfTrials)),
      collectApproxHint({ latestRandomSeed: randomInteger(), results: [] }, firstTrials)
    );

    const { hintAddress } = results.reduce((a, b) => (a.diff.lt(b.diff) ? a : b));

    return sortedTroves.findInsertPosition(nominalCollateralRatio.hex, hintAddress, hintAddress);
  }

  private async _findHints(trove: Trove): Promise<[string, string]> {
    if (trove instanceof TroveWithPendingRedistribution) {
      throw new Error("Rewards must be applied to this Trove");
    }

    return this._findHintsForNominalCollateralRatio(trove._nominalCollateralRatio);
  }

  private async _findRedemptionHints(
    amount: Decimal
  ): Promise<
    [
      truncatedAmount: Decimal,
      firstRedemptionHint: string,
      partialRedemptionUpperHint: string,
      partialRedemptionLowerHint: string,
      partialRedemptionHintNICR: BigNumber
    ]
  > {
    const { hintHelpers } = _getContracts(this._readable.connection);
    const price = await this._readable.getPrice();

    const {
      firstRedemptionHint,
      partialRedemptionHintNICR,
      truncatedZUSDamount
    } = await hintHelpers.getRedemptionHints(amount.hex, price.hex, _redeemMaxIterations);

    const [
      partialRedemptionUpperHint,
      partialRedemptionLowerHint
    ] = partialRedemptionHintNICR.isZero()
      ? [AddressZero, AddressZero]
      : await this._findHintsForNominalCollateralRatio(decimalify(partialRedemptionHintNICR));

    return [
      decimalify(truncatedZUSDamount),
      firstRedemptionHint,
      partialRedemptionUpperHint,
      partialRedemptionLowerHint,
      partialRedemptionHintNICR
    ];
  }

  async findHints(trove: Trove): Promise<[string, string]> {
    return this._findHints(trove);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.openTrove} */
  async openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveCreationDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeTroveCreation(params);
    const { depositCollateral, borrowZUSD } = normalized;

    const fees = await this._readable.getFees();
    const borrowingRate = fees.borrowingRate();
    const newTrove = Trove.create(normalized, borrowingRate);

    maxBorrowingRate =
      maxBorrowingRate !== undefined
        ? Decimal.from(maxBorrowingRate)
        : borrowingRate.add(defaultBorrowingRateSlippageTolerance);

    return this._wrapTroveChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.openTrove(
        { value: depositCollateral.hex, ...overrides },
        compose(addGasForPotentialLastFeeOperationTimeUpdate, addGasForPotentialListTraversal),
        maxBorrowingRate.hex,
        borrowZUSD.hex,
        ...(await this._findHints(newTrove))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.openNueTrove} */
  async openNueTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveCreationDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeTroveCreation(params);
    const { depositCollateral, borrowZUSD } = normalized;

    const fees = await this._readable.getFees();
    const borrowingRate = fees.borrowingRate();
    const newTrove = Trove.create(normalized, borrowingRate);

    maxBorrowingRate =
      maxBorrowingRate !== undefined
        ? Decimal.from(maxBorrowingRate)
        : borrowingRate.add(defaultBorrowingRateSlippageTolerance);

    return this._wrapTroveChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.openNueTrove(
        { value: depositCollateral.hex, ...overrides },
        compose(addGasForPotentialLastFeeOperationTimeUpdate, addGasForPotentialListTraversal),
        maxBorrowingRate.hex,
        borrowZUSD.hex,
        ...(await this._findHints(newTrove))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.closeTrove} */
  async closeTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveClosureDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return this._wrapTroveClosure(
      await borrowerOperations.estimateAndPopulate.closeTrove({ ...overrides }, id)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.closeNueTrove} */
  async closeNueTrove(
    _permitParams: PermitParams,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveClosureDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return this._wrapTroveClosure(
      await borrowerOperations.estimateAndPopulate.closeNueTrove({ ...overrides }, gas =>
        gas.mul(125).div(100), _permitParams
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.depositCollateral} */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
    return this.adjustTrove({ depositCollateral: amount }, undefined, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
    return this.adjustTrove({ withdrawCollateral: amount }, undefined, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.borrowZUSD} */
  borrowZUSD(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
    return this.adjustTrove({ borrowZUSD: amount }, maxBorrowingRate, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.repayZUSD} */
  repayZUSD(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
    return this.adjustTrove({ repayZUSD: amount }, undefined, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.adjustTrove} */
  async adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeTroveAdjustment(params);
    const { depositCollateral, withdrawCollateral, borrowZUSD, repayZUSD } = normalized;

    const [trove, fees] = await Promise.all([
      this._readable.getTrove(address),
      borrowZUSD && this._readable.getFees()
    ]);

    const borrowingRate = fees?.borrowingRate();
    const finalTrove = trove.adjust(normalized, borrowingRate);

    maxBorrowingRate =
      maxBorrowingRate !== undefined
        ? Decimal.from(maxBorrowingRate)
        : borrowingRate?.add(defaultBorrowingRateSlippageTolerance) ?? Decimal.ZERO;

    return this._wrapTroveChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.adjustTrove(
        { value: depositCollateral?.hex, ...overrides },
        compose(
          borrowZUSD ? addGasForPotentialLastFeeOperationTimeUpdate : id,
          addGasForPotentialListTraversal
        ),
        maxBorrowingRate.hex,
        (withdrawCollateral ?? Decimal.ZERO).hex,
        (borrowZUSD ?? repayZUSD ?? Decimal.ZERO).hex,
        !!borrowZUSD,
        ...(await this._findHints(finalTrove))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.adjustNueTrove} */
  async adjustNueTrove(
    params: TroveAdjustmentParams<Decimalish>,
    permitParams: PermitParams,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<TroveAdjustmentDetails>> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeTroveAdjustment(params);
    const { depositCollateral, withdrawCollateral, borrowZUSD, repayZUSD } = normalized;

    const [trove, fees] = await Promise.all([
      this._readable.getTrove(address),
      borrowZUSD && this._readable.getFees()
    ]);

    const borrowingRate = fees?.borrowingRate();
    const finalTrove = trove.adjust(normalized, borrowingRate);

    maxBorrowingRate =
      maxBorrowingRate !== undefined
        ? Decimal.from(maxBorrowingRate)
        : borrowingRate?.add(defaultBorrowingRateSlippageTolerance) ?? Decimal.ZERO;

    return this._wrapTroveChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.adjustNueTrove(
        { value: depositCollateral?.hex, ...overrides },
        compose(
          borrowZUSD ? addGasForPotentialLastFeeOperationTimeUpdate : id,
          addGasForPotentialListTraversal
        ),
        maxBorrowingRate.hex,
        (withdrawCollateral ?? Decimal.ZERO).hex,
        (borrowZUSD ?? repayZUSD ?? Decimal.ZERO).hex,
        !!borrowZUSD,
        ...(await this._findHints(finalTrove)),
        permitParams
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.claimCollateralSurplus} */
  async claimCollateralSurplus(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await borrowerOperations.estimateAndPopulate.claimCollateral({ ...overrides }, id)
    );
  }

  /** @internal */
  async setPrice(
    price: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    const { priceFeed } = _getContracts(this._readable.connection);

    if (!_priceFeedIsTestnet(priceFeed)) {
      throw new Error("setPrice() unavailable on this deployment of Zero");
    }

    return this._wrapSimpleTransaction(
      await priceFeed.estimateAndPopulate.setPrice({ ...overrides }, id, Decimal.from(price).hex)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.liquidate} */
  async liquidate(
    address: string | string[],
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<LiquidationDetails>> {
    const { troveManager } = _getContracts(this._readable.connection);

    if (Array.isArray(address)) {
      return this._wrapLiquidation(
        await troveManager.estimateAndPopulate.batchLiquidateTroves(
          { ...overrides },
          addGasForZEROIssuance,
          address
        )
      );
    } else {
      return this._wrapLiquidation(
        await troveManager.estimateAndPopulate.liquidate(
          { ...overrides },
          addGasForZEROIssuance,
          address
        )
      );
    }
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.liquidateUpTo} */
  async liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<LiquidationDetails>> {
    const { troveManager } = _getContracts(this._readable.connection);

    return this._wrapLiquidation(
      await troveManager.estimateAndPopulate.liquidateTroves(
        { ...overrides },
        addGasForZEROIssuance,
        maximumNumberOfTrovesToLiquidate
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.depositZUSDInStabilityPool} */
  async depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>> {
    const { stabilityPool } = _getContracts(this._readable.connection);
    const depositZUSD = Decimal.from(amount);

    return this._wrapStabilityDepositTopup(
      { depositZUSD },
      await stabilityPool.estimateAndPopulate.provideToSP(
        { ...overrides },
        addGasForZEROIssuance,
        depositZUSD.hex,
        frontendTag ?? this._readable.connection.frontendTag ?? AddressZero
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.withdrawZUSDFromStabilityPool} */
  async withdrawZUSDFromStabilityPool(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<StabilityDepositChangeDetails>> {
    const { stabilityPool } = _getContracts(this._readable.connection);

    return this._wrapStabilityDepositWithdrawal(
      await stabilityPool.estimateAndPopulate.withdrawFromSP(
        { ...overrides },
        addGasForZEROIssuance,
        Decimal.from(amount).hex
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.withdrawGainsFromStabilityPool} */
  async withdrawGainsFromStabilityPool(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<StabilityPoolGainsWithdrawalDetails>> {
    const { stabilityPool } = _getContracts(this._readable.connection);

    return this._wrapStabilityPoolGainsWithdrawal(
      await stabilityPool.estimateAndPopulate.withdrawFromSP(
        { ...overrides },
        addGasForZEROIssuance,
        Decimal.ZERO.hex
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.transferCollateralGainToTrove} */
  async transferCollateralGainToTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<CollateralGainTransferDetails>> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { stabilityPool } = _getContracts(this._readable.connection);

    const [initialTrove, stabilityDeposit] = await Promise.all([
      this._readable.getTrove(address),
      this._readable.getStabilityDeposit(address)
    ]);

    const finalTrove = initialTrove.addCollateral(stabilityDeposit.collateralGain);

    return this._wrapCollateralGainTransfer(
      await stabilityPool.estimateAndPopulate.withdrawETHGainToTrove(
        { ...overrides },
        compose(addGasForPotentialListTraversal, addGasForZEROIssuance),
        ...(await this._findHints(finalTrove))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.sendZUSD} */
  async sendZUSD(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    const { zusdToken } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await zusdToken.estimateAndPopulate.transfer(
        { ...overrides },
        id,
        toAddress,
        Decimal.from(amount).hex
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.sendZERO} */
  async sendZERO(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    const { zeroToken } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await zeroToken.estimateAndPopulate.transfer(
        { ...overrides },
        id,
        toAddress,
        Decimal.from(amount).hex
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.redeemZUSD} */
  async redeemZUSD(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersRedemption> {
    const { troveManager } = _getContracts(this._readable.connection);
    const attemptedZUSDAmount = Decimal.from(amount);

    const [
      fees,
      total,
      [truncatedAmount, firstRedemptionHint, ...partialHints]
    ] = await Promise.all([
      this._readable.getFees(),
      this._readable.getTotal(),
      this._findRedemptionHints(attemptedZUSDAmount)
    ]);

    if (truncatedAmount.isZero) {
      throw new Error(
        `redeemZUSD: amount too low to redeem (try at least ${ZUSD_MINIMUM_NET_DEBT})`
      );
    }

    const defaultMaxRedemptionRate = (amount: Decimal) =>
      Decimal.min(
        fees.redemptionRate(amount.div(total.debt)).add(defaultRedemptionRateSlippageTolerance),
        Decimal.ONE
      );

    const populateRedemption = async (
      attemptedZUSDAmount: Decimal,
      maxRedemptionRate?: Decimalish,
      truncatedAmount: Decimal = attemptedZUSDAmount,
      partialHints: [string, string, BigNumberish] = [AddressZero, AddressZero, 0]
    ): Promise<PopulatedEthersRedemption> => {
      const maxRedemptionRateOrDefault =
        maxRedemptionRate !== undefined
          ? Decimal.from(maxRedemptionRate)
          : defaultMaxRedemptionRate(truncatedAmount);

      return new PopulatedEthersRedemption(
        await troveManager.estimateAndPopulate.redeemCollateral(
          { ...overrides },
          addGasForPotentialLastFeeOperationTimeUpdate,
          truncatedAmount.hex,
          firstRedemptionHint,
          ...partialHints,
          _redeemMaxIterations,
          maxRedemptionRateOrDefault.hex
        ),

        this._readable.connection,
        attemptedZUSDAmount,
        truncatedAmount,

        truncatedAmount.lt(attemptedZUSDAmount)
          ? newMaxRedemptionRate =>
              populateRedemption(
                truncatedAmount.add(ZUSD_MINIMUM_NET_DEBT),
                newMaxRedemptionRate ?? maxRedemptionRate
              )
          : undefined
      );
    };

    return populateRedemption(attemptedZUSDAmount, maxRedemptionRate, truncatedAmount, partialHints);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.stakeZERO} */
  async stakeZERO(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    const { zeroStaking } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await zeroStaking.estimateAndPopulate.stake({ ...overrides }, id, Decimal.from(amount).hex)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.unstakeZERO} */
  async unstakeZERO(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    const { zeroStaking } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await zeroStaking.estimateAndPopulate.unstake({ ...overrides }, id, Decimal.from(amount).hex)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    return this.unstakeZERO(Decimal.ZERO, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableLiquity.registerFrontend} */
  async registerFrontend(
    kickbackRate: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersLiquityTransaction<void>> {
    const { stabilityPool } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await stabilityPool.estimateAndPopulate.registerFrontEnd(
        { ...overrides },
        id,
        Decimal.from(kickbackRate).hex
      )
    );
  }
}
