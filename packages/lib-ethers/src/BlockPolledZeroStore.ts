import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";

import {
  Decimal,
  ZeroStoreState,
  ZeroStoreBaseState,
  TroveWithPendingRedistribution,
  StabilityDeposit,
  ZEROStake,
  ZeroStore
} from "@sovryn-zero/lib-base";

import { ReadableEthersZero } from "./ReadableEthersZero";
import {
  EthersZeroConnection,
  _getBlockTimestamp,
  _getProvider
} from "./EthersZeroConnection";
import { EthersCallOverrides, EthersProvider } from "./types";

/**
 * Extra state added to {@link @sovryn-zero/lib-base#ZeroStoreState} by
 * {@link BlockPolledZeroStore}.
 *
 * @public
 */
export interface BlockPolledZeroStoreExtraState {
  /**
   * Number of block that the store state was fetched from.
   *
   * @remarks
   * May be undefined when the store state is fetched for the first time.
   */
  blockTag?: number;

  /**
   * Timestamp of latest block (number of seconds since epoch).
   */
  blockTimestamp: number;
}

/**
 * The type of {@link BlockPolledZeroStore}'s
 * {@link @sovryn-zero/lib-base#ZeroStore.state | state}.
 *
 * @public
 */
export type BlockPolledZeroStoreState = ZeroStoreState<BlockPolledZeroStoreExtraState>;

type Resolved<T> = T extends Promise<infer U> ? U : T;
type ResolvedValues<T> = { [P in keyof T]: Resolved<T[P]> };

const promiseAllValues = <T>(object: T) => {
  const keys = Object.keys(object);

  return Promise.all(Object.values(object)).then(values =>
    Object.fromEntries(values.map((value, i) => [keys[i], value]))
  ) as Promise<ResolvedValues<T>>;
};

const decimalify = (bigNumber: BigNumber) => Decimal.fromBigNumberString(bigNumber.toHexString());

/**
 * Ethers-based {@link @sovryn-zero/lib-base#ZeroStore} that updates state whenever there's a new
 * block.
 *
 * @public
 */
export class BlockPolledZeroStore extends ZeroStore<BlockPolledZeroStoreExtraState> {
  readonly connection: EthersZeroConnection;

  private readonly _readable: ReadableEthersZero;
  private readonly _provider: EthersProvider;

  constructor(readable: ReadableEthersZero) {
    super();

    this.connection = readable.connection;
    this._readable = readable;
    this._provider = _getProvider(readable.connection);
  }

  private async _getRiskiestTroveBeforeRedistribution(
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    const riskiestTroves = await this._readable.getTroves(
      { first: 1, sortedBy: "ascendingCollateralRatio", beforeRedistribution: true },
      overrides
    );

    if (riskiestTroves.length === 0) {
      return new TroveWithPendingRedistribution(AddressZero, "nonExistent");
    }

    return riskiestTroves[0];
  }

  private async _get(
    blockTag?: number
  ): Promise<[baseState: ZeroStoreBaseState, extraState: BlockPolledZeroStoreExtraState]> {
    const { userAddress, frontendTag } = this.connection;

    const { blockTimestamp, createFees, ...baseState } = await promiseAllValues({
      blockTimestamp: _getBlockTimestamp(this.connection, blockTag),
      createFees: this._readable._getFeesFactory({ blockTag }),

      price: this._readable.getPrice({ blockTag }),
      numberOfTroves: this._readable.getNumberOfTroves({ blockTag }),
      totalRedistributed: this._readable.getTotalRedistributed({ blockTag }),
      total: this._readable.getTotal({ blockTag }),
      zusdInStabilityPool: this._readable.getZUSDInStabilityPool({ blockTag }),
      totalStakedZERO: this._readable.getTotalStakedZERO({ blockTag }),
      _riskiestTroveBeforeRedistribution: this._getRiskiestTroveBeforeRedistribution({ blockTag }),
      remainingStabilityPoolZEROReward: this._readable.getRemainingStabilityPoolZEROReward({
        blockTag
      }),

      frontend: frontendTag
        ? this._readable.getFrontendStatus(frontendTag, { blockTag })
        : { status: "unregistered" as const },

      ...(userAddress
        ? {
            accountBalance: this._provider.getBalance(userAddress, blockTag).then(decimalify),
            zusdBalance: this._readable.getZUSDBalance(userAddress, { blockTag }),
            nueBalance: Decimal.ZERO,
            zeroBalance: this._readable.getZEROBalance(userAddress, { blockTag }),
            collateralSurplusBalance: this._readable.getCollateralSurplusBalance(userAddress, {
              blockTag
            }),
            troveBeforeRedistribution: this._readable.getTroveBeforeRedistribution(userAddress, {
              blockTag
            }),
            stabilityDeposit: this._readable.getStabilityDeposit(userAddress, { blockTag }),
            zeroStake: this._readable.getZEROStake(userAddress, { blockTag }),
            ownFrontend: this._readable.getFrontendStatus(userAddress, { blockTag })
          }
        : {
            accountBalance: Decimal.ZERO,
            zusdBalance: Decimal.ZERO,
            nueBalance: Decimal.ZERO,
            zeroBalance: Decimal.ZERO,
            uniTokenBalance: Decimal.ZERO,
            uniTokenAllowance: Decimal.ZERO,
            liquidityMiningStake: Decimal.ZERO,
            liquidityMiningZEROReward: Decimal.ZERO,
            collateralSurplusBalance: Decimal.ZERO,
            troveBeforeRedistribution: new TroveWithPendingRedistribution(
              AddressZero,
              "nonExistent"
            ),
            stabilityDeposit: new StabilityDeposit(
              Decimal.ZERO,
              Decimal.ZERO,
              Decimal.ZERO,
              Decimal.ZERO,
              AddressZero
            ),
            zeroStake: new ZEROStake(),
            ownFrontend: { status: "unregistered" as const }
          })
    });

    return [
      {
        ...baseState,
        _feesInNormalMode: createFees(blockTimestamp, false)
      },
      {
        blockTag,
        blockTimestamp
      }
    ];
  }

  /** @internal @override */
  protected _doStart(): () => void {
    this._get().then(state => {
      if (!this._loaded) {
        this._load(...state);
      }
    });

    const blockListener = async (blockTag: number) => {
      const state = await this._get(blockTag);

      if (this._loaded) {
        this._update(...state);
      } else {
        this._load(...state);
      }
    };

    this._provider.on("block", blockListener);

    return () => {
      this._provider.off("block", blockListener);
    };
  }

  /** @internal @override */
  protected _reduceExtra(
    oldState: BlockPolledZeroStoreExtraState,
    stateUpdate: Partial<BlockPolledZeroStoreExtraState>
  ): BlockPolledZeroStoreExtraState {
    return {
      blockTag: stateUpdate.blockTag ?? oldState.blockTag,
      blockTimestamp: stateUpdate.blockTimestamp ?? oldState.blockTimestamp
    };
  }
}
