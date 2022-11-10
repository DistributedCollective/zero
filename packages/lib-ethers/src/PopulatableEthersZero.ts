import assert from "assert";

import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";
import { Log } from "@ethersproject/abstract-provider";

import {
  CollateralGainTransferDetails,
  Decimal,
  Decimalish,
  LiquidationDetails,
  ZeroReceipt,
  ZUSD_MINIMUM_NET_DEBT,
  MinedReceipt,
  PopulatableZero,
  PopulatedZeroTransaction,
  PopulatedRedemption,
  RedemptionDetails,
  SentZeroTransaction,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  LoC,
  LoCAdjustmentDetails,
  LoCAdjustmentParams,
  LoCClosureDetails,
  LoCCreationDetails,
  LoCCreationParams,
  LoCWithPendingRedistribution,
  _failedReceipt,
  _normalizeLoCAdjustment,
  _normalizeLoCCreation,
  _pendingReceipt,
  _successfulReceipt
} from "@sovryn-zero/lib-base";

import {
  EthersPopulatedTransaction,
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  EthersTransactionResponse
} from "./types";

import {
  EthersZeroConnection,
  _getContracts,
  _getProvider,
  _requireAddress,
  _requireSigner
} from "./EthersZeroConnection";

import { _priceFeedIsTestnet } from "./contracts";
import { logsToString } from "./parseLogs";
import { ReadableEthersZero } from "./ReadableEthersZero";

const decimalify = (bigNumber: BigNumber) => Decimal.fromBigNumberString(bigNumber.toHexString());

// With 70 iterations redemption costs about ~10M gas, and each iteration accounts for ~138k more
/** @internal */
export const _redeemMaxIterations = 70;

const defaultOriginationRateSlippageTolerance = Decimal.from(0.005); // 0.5%
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

// To get the best entropy available, we'd do sombtcing like:
//
// const bigRandomNumber = () =>
//   BigNumber.from(
//     `0x${Array.from(crypto.getRandomValues(new Uint32Array(8)))
//       .map(u32 => u32.toString(16).padStart(8, "0"))
//       .join("")}`
//   );
//
// However, Window.crypto is browser-specific. Since we only use this for randomly picking LoCs
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
 * Returned by {@link SendableEthersZero} functions.
 *
 * @public
 */
export class SentEthersZeroTransaction<T = unknown>
  implements
    SentZeroTransaction<EthersTransactionResponse, ZeroReceipt<EthersTransactionReceipt, T>> {
  /** Ethers' representation of a sent transaction. */
  readonly rawSentTransaction: EthersTransactionResponse;

  private readonly _connection: EthersZeroConnection;
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T;

  /** @internal */
  constructor(
    rawSentTransaction: EthersTransactionResponse,
    connection: EthersZeroConnection,
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

  /** {@inheritDoc @sovryn-zero/lib-base#SentZeroTransaction.getReceipt} */
  async getReceipt(): Promise<ZeroReceipt<EthersTransactionReceipt, T>> {
    return this._receiptFrom(
      await _getProvider(this._connection).getTransactionReceipt(this.rawSentTransaction.hash)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#SentZeroTransaction.waitForReceipt} */
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
 * Returned by {@link PopulatableEthersZero} functions.
 *
 * @public
 */
export class PopulatedEthersZeroTransaction<T = unknown>
  implements
    PopulatedZeroTransaction<EthersPopulatedTransaction, SentEthersZeroTransaction<T>> {
  /** Unsigned transaction object populated by Ethers. */
  readonly rawPopulatedTransaction: EthersPopulatedTransaction;

  private readonly _connection: EthersZeroConnection;
  private readonly _parse: (rawReceipt: EthersTransactionReceipt) => T;

  /** @internal */
  constructor(
    rawPopulatedTransaction: EthersPopulatedTransaction,
    connection: EthersZeroConnection,
    parse: (rawReceipt: EthersTransactionReceipt) => T
  ) {
    this.rawPopulatedTransaction = rawPopulatedTransaction;
    this._connection = connection;
    this._parse = parse;
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatedZeroTransaction.send} */
  async send(): Promise<SentEthersZeroTransaction<T>> {
    return new SentEthersZeroTransaction(
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
  extends PopulatedEthersZeroTransaction<RedemptionDetails>
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
    connection: EthersZeroConnection,
    attemptedZUSDAmount: Decimal,
    redeemableZUSDAmount: Decimal,
    increaseAmountByMinimumNetDebt?: (
      maxRedemptionRate?: Decimalish
    ) => Promise<PopulatedEthersRedemption>
  ) {
    const { locManager } = _getContracts(connection);

    super(
      rawPopulatedTransaction,
      connection,

      ({ logs }) =>
        locManager
          .extractEvents(logs, "Redemption")
          .map(({ args: { _BTCSent, _BTCFee, _actualZUSDAmount, _attemptedZUSDAmount } }) => ({
            attemptedZUSDAmount: decimalify(_attemptedZUSDAmount),
            actualZUSDAmount: decimalify(_actualZUSDAmount),
            collateralTaken: decimalify(_BTCSent),
            fee: decimalify(_BTCFee)
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
export interface _LoCChangeWithFees<T> {
  params: T;
  newLoC: LoC;
  fee: Decimal;
}

/**
 * Ethers-based implementation of {@link @sovryn-zero/lib-base#PopulatableZero}.
 *
 * @public
 */
export class PopulatableEthersZero
  implements
    PopulatableZero<
      EthersTransactionReceipt,
      EthersTransactionResponse,
      EthersPopulatedTransaction
    > {
  private readonly _readable: ReadableEthersZero;

  constructor(readable: ReadableEthersZero) {
    this._readable = readable;
  }

  private _wrapSimpleTransaction(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersZeroTransaction<void> {
    return new PopulatedEthersZeroTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      noDetails
    );
  }

  private _wrapLoCChangeWithFees<T>(
    params: T,
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersZeroTransaction<_LoCChangeWithFees<T>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return new PopulatedEthersZeroTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs }) => {
        const [newLoC] = borrowerOperations
          .extractEvents(logs, "LoCUpdated")
          .map(({ args: { _coll, _debt } }) => new LoC(decimalify(_coll), decimalify(_debt)));

        const [fee] = borrowerOperations
          .extractEvents(logs, "ZUSDOriginationFeePaid")
          .map(({ args: { _ZUSDFee } }) => decimalify(_ZUSDFee));

        return {
          params,
          newLoC,
          fee
        };
      }
    );
  }

  private async _wrapLoCClosure(
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): Promise<PopulatedEthersZeroTransaction<LoCClosureDetails>> {
    const { activePool, zusdToken } = _getContracts(this._readable.connection);

    return new PopulatedEthersZeroTransaction(
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
  ): PopulatedEthersZeroTransaction<LiquidationDetails> {
    const { locManager } = _getContracts(this._readable.connection);

    return new PopulatedEthersZeroTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs }) => {
        const liquidatedAddresses = locManager
          .extractEvents(logs, "LoCLiquidated")
          .map(({ args: { _borrower } }) => _borrower);

        const [totals] = locManager
          .extractEvents(logs, "Liquidation")
          .map(
            ({
              args: { _ZUSDGasCompensation, _collGasCompensation, _liquidatedColl, _liquidatedDebt }
            }) => ({
              collateralGasCompensation: decimalify(_collGasCompensation),
              zusdGasCompensation: decimalify(_ZUSDGasCompensation),
              totalLiquidated: new LoC(decimalify(_liquidatedColl), decimalify(_liquidatedDebt))
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
      .map(({ args: { _BTC, _ZUSDLoss } }) => [decimalify(_BTC), decimalify(_ZUSDLoss)]);

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
  ): PopulatedEthersZeroTransaction<StabilityPoolGainsWithdrawalDetails> {
    return new PopulatedEthersZeroTransaction(
      rawPopulatedTransaction,
      this._readable.connection,
      ({ logs }) => this._extractStabilityPoolGainsWithdrawalDetails(logs)
    );
  }

  private _wrapStabilityDepositTopup(
    change: { depositZUSD: Decimal },
    rawPopulatedTransaction: EthersPopulatedTransaction
  ): PopulatedEthersZeroTransaction<StabilityDepositChangeDetails> {
    return new PopulatedEthersZeroTransaction(
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
  ): Promise<PopulatedEthersZeroTransaction<StabilityDepositChangeDetails>> {
    const { stabilityPool, zusdToken } = _getContracts(this._readable.connection);

    return new PopulatedEthersZeroTransaction(
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
  ): PopulatedEthersZeroTransaction<CollateralGainTransferDetails> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return new PopulatedEthersZeroTransaction(
      rawPopulatedTransaction,
      this._readable.connection,

      ({ logs }) => {
        const [newLoC] = borrowerOperations
          .extractEvents(logs, "LoCUpdated")
          .map(({ args: { _coll, _debt } }) => new LoC(decimalify(_coll), decimalify(_debt)));

        return {
          ...this._extractStabilityPoolGainsWithdrawalDetails(logs),
          newLoC
        };
      }
    );
  }

  private async _findHintsForNominalCollateralRatio(
    nominalCollateralRatio: Decimal
  ): Promise<[string, string]> {
    const { sortedLoCs, hintHelpers } = _getContracts(this._readable.connection);
    const numberOfLoCs = await this._readable.getNumberOfLoCs();

    if (!numberOfLoCs) {
      return [AddressZero, AddressZero];
    }

    if (nominalCollateralRatio.infinite) {
      return [AddressZero, await sortedLoCs.getFirst()];
    }

    const totalNumberOfTrials = Math.ceil(10 * Math.sqrt(numberOfLoCs));
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

    return sortedLoCs.findInsertPosition(nominalCollateralRatio.hex, hintAddress, hintAddress);
  }

  private async _findHints(loc: LoC): Promise<[string, string]> {
    if (loc instanceof LoCWithPendingRedistribution) {
      throw new Error("Rewards must be applied to this LoC");
    }

    return this._findHintsForNominalCollateralRatio(loc._nominalCollateralRatio);
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

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.openLoC} */
  async openLoC(
    params: LoCCreationParams<Decimalish>,
    maxOriginationRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCCreationDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeLoCCreation(params);
    const { depositCollateral, borrowZUSD } = normalized;

    const fees = await this._readable.getFees();
    const originationRate = fees.originationRate();
    const newLoC = LoC.create(normalized, originationRate);

    maxOriginationRate =
      maxOriginationRate !== undefined
        ? Decimal.from(maxOriginationRate)
        : originationRate.add(defaultOriginationRateSlippageTolerance);

    return this._wrapLoCChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.openLoC(
        { value: depositCollateral.hex, ...overrides },
        compose(addGasForPotentialLastFeeOperationTimeUpdate, addGasForPotentialListTraversal),
        maxOriginationRate.hex,
        borrowZUSD.hex,
        ...(await this._findHints(newLoC))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.openNueLoC} */
  async openNueLoC(
    params: LoCCreationParams<Decimalish>,
    maxOriginationRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCCreationDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeLoCCreation(params);
    const { depositCollateral, borrowZUSD } = normalized;

    const fees = await this._readable.getFees();
    const originationRate = fees.originationRate();
    const newLoC = LoC.create(normalized, originationRate);

    maxOriginationRate =
      maxOriginationRate !== undefined
        ? Decimal.from(maxOriginationRate)
        : originationRate.add(defaultOriginationRateSlippageTolerance);

    return this._wrapLoCChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.openNueLoC(
        { value: depositCollateral.hex, ...overrides },
        compose(addGasForPotentialLastFeeOperationTimeUpdate, addGasForPotentialListTraversal),
        maxOriginationRate.hex,
        borrowZUSD.hex,
        ...(await this._findHints(newLoC))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.closeLoC} */
  async closeLoC(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCClosureDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return this._wrapLoCClosure(
      await borrowerOperations.estimateAndPopulate.closeLoC({ ...overrides }, id)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.closeNueLoC} */
  async closeNueLoC(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCClosureDetails>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return this._wrapLoCClosure(
      await borrowerOperations.estimateAndPopulate.closeNueLoC({ ...overrides }, gas =>
        gas.mul(125).div(100)
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.depositCollateral} */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this.adjustLoC({ depositCollateral: amount }, undefined, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this.adjustLoC({ withdrawCollateral: amount }, undefined, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.borrowZUSD} */
  borrowZUSD(
    amount: Decimalish,
    maxOriginationRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this.adjustLoC({ borrowZUSD: amount }, maxOriginationRate, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.repayZUSD} */
  repayZUSD(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCAdjustmentDetails>> {
    return this.adjustLoC({ repayZUSD: amount }, undefined, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.adjustLoC} */
  async adjustLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxOriginationRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCAdjustmentDetails>> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeLoCAdjustment(params);
    const { depositCollateral, withdrawCollateral, borrowZUSD, repayZUSD } = normalized;

    const [loc, fees] = await Promise.all([
      this._readable.getLoC(address),
      borrowZUSD && this._readable.getFees()
    ]);

    const originationRate = fees?.originationRate();
    const finalLoC = loc.adjust(normalized, originationRate);

    maxOriginationRate =
      maxOriginationRate !== undefined
        ? Decimal.from(maxOriginationRate)
        : originationRate?.add(defaultOriginationRateSlippageTolerance) ?? Decimal.ZERO;

    return this._wrapLoCChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.adjustLoC(
        { value: depositCollateral?.hex, ...overrides },
        compose(
          borrowZUSD ? addGasForPotentialLastFeeOperationTimeUpdate : id,
          addGasForPotentialListTraversal
        ),
        maxOriginationRate.hex,
        (withdrawCollateral ?? Decimal.ZERO).hex,
        (borrowZUSD ?? repayZUSD ?? Decimal.ZERO).hex,
        !!borrowZUSD,
        ...(await this._findHints(finalLoC))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.adjustNueLoC} */
  async adjustNueLoC(
    params: LoCAdjustmentParams<Decimalish>,
    maxOriginationRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LoCAdjustmentDetails>> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { borrowerOperations } = _getContracts(this._readable.connection);

    const normalized = _normalizeLoCAdjustment(params);
    const { depositCollateral, withdrawCollateral, borrowZUSD, repayZUSD } = normalized;

    const [loc, fees] = await Promise.all([
      this._readable.getLoC(address),
      borrowZUSD && this._readable.getFees()
    ]);

    const originationRate = fees?.originationRate();
    const finalLoC = loc.adjust(normalized, originationRate);

    maxOriginationRate =
      maxOriginationRate !== undefined
        ? Decimal.from(maxOriginationRate)
        : originationRate?.add(defaultOriginationRateSlippageTolerance) ?? Decimal.ZERO;

    return this._wrapLoCChangeWithFees(
      normalized,
      await borrowerOperations.estimateAndPopulate.adjustNueLoC(
        { value: depositCollateral?.hex, ...overrides },
        compose(
          borrowZUSD ? addGasForPotentialLastFeeOperationTimeUpdate : id,
          addGasForPotentialListTraversal
        ),
        maxOriginationRate.hex,
        (withdrawCollateral ?? Decimal.ZERO).hex,
        (borrowZUSD ?? repayZUSD ?? Decimal.ZERO).hex,
        !!borrowZUSD,
        ...(await this._findHints(finalLoC))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.claimCollateralSurplus} */
  async claimCollateralSurplus(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
    const { borrowerOperations } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await borrowerOperations.estimateAndPopulate.claimCollateral({ ...overrides }, id)
    );
  }

  /** @internal */
  async setPrice(
    price: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
    const { priceFeed } = _getContracts(this._readable.connection);

    if (!_priceFeedIsTestnet(priceFeed)) {
      throw new Error("setPrice() unavailable on this deployment of Zero");
    }

    return this._wrapSimpleTransaction(
      await priceFeed.estimateAndPopulate.setPrice({ ...overrides }, id, Decimal.from(price).hex)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.liquidate} */
  async liquidate(
    address: string | string[],
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LiquidationDetails>> {
    const { locManager } = _getContracts(this._readable.connection);

    if (Array.isArray(address)) {
      return this._wrapLiquidation(
        await locManager.estimateAndPopulate.batchLiquidateLoCs(
          { ...overrides },
          addGasForZEROIssuance,
          address
        )
      );
    } else {
      return this._wrapLiquidation(
        await locManager.estimateAndPopulate.liquidate(
          { ...overrides },
          addGasForZEROIssuance,
          address
        )
      );
    }
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.liquidateUpTo} */
  async liquidateUpTo(
    maximumNumberOfLoCsToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<LiquidationDetails>> {
    const { locManager } = _getContracts(this._readable.connection);

    return this._wrapLiquidation(
      await locManager.estimateAndPopulate.liquidateLoCs(
        { ...overrides },
        addGasForZEROIssuance,
        maximumNumberOfLoCsToLiquidate
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.depositZUSDInStabilityPool} */
  async depositZUSDInStabilityPool(
    amount: Decimalish,
    frontendTag?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<StabilityDepositChangeDetails>> {
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

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.withdrawZUSDFromStabilityPool} */
  async withdrawZUSDFromStabilityPool(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<StabilityDepositChangeDetails>> {
    const { stabilityPool } = _getContracts(this._readable.connection);

    return this._wrapStabilityDepositWithdrawal(
      await stabilityPool.estimateAndPopulate.withdrawFromSP(
        { ...overrides },
        addGasForZEROIssuance,
        Decimal.from(amount).hex
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.withdrawGainsFromStabilityPool} */
  async withdrawGainsFromStabilityPool(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<StabilityPoolGainsWithdrawalDetails>> {
    const { stabilityPool } = _getContracts(this._readable.connection);

    return this._wrapStabilityPoolGainsWithdrawal(
      await stabilityPool.estimateAndPopulate.withdrawFromSP(
        { ...overrides },
        addGasForZEROIssuance,
        Decimal.ZERO.hex
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.transferCollateralGainToLoC} */
  async transferCollateralGainToLoC(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<CollateralGainTransferDetails>> {
    const address = _requireAddress(this._readable.connection, overrides);
    const { stabilityPool } = _getContracts(this._readable.connection);

    const [initialLoC, stabilityDeposit] = await Promise.all([
      this._readable.getLoC(address),
      this._readable.getStabilityDeposit(address)
    ]);

    const finalLoC = initialLoC.addCollateral(stabilityDeposit.collateralGain);

    return this._wrapCollateralGainTransfer(
      await stabilityPool.estimateAndPopulate.withdrawBTCGainToLoC(
        { ...overrides },
        compose(addGasForPotentialListTraversal, addGasForZEROIssuance),
        ...(await this._findHints(finalLoC))
      )
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.sendZUSD} */
  async sendZUSD(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
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

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.sendZERO} */
  async sendZERO(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
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

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.redeemZUSD} */
  async redeemZUSD(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersRedemption> {
    const { locManager } = _getContracts(this._readable.connection);
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
        await locManager.estimateAndPopulate.redeemCollateral(
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

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.stakeZERO} */
  async stakeZERO(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
    const { zeroStaking } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await zeroStaking.estimateAndPopulate.stake({ ...overrides }, id, Decimal.from(amount).hex)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.unstakeZERO} */
  async unstakeZERO(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
    const { zeroStaking } = _getContracts(this._readable.connection);

    return this._wrapSimpleTransaction(
      await zeroStaking.estimateAndPopulate.unstake({ ...overrides }, id, Decimal.from(amount).hex)
    );
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
    return this.unstakeZERO(Decimal.ZERO, overrides);
  }

  /** {@inheritDoc @sovryn-zero/lib-base#PopulatableZero.registerFrontend} */
  async registerFrontend(
    kickbackRate: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<PopulatedEthersZeroTransaction<void>> {
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
