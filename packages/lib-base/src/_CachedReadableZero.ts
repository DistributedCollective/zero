import { Decimal } from "./Decimal";
import { Fees } from "./Fees";
import { ZEROStake } from "./ZEROStake";
import { StabilityDeposit } from "./StabilityDeposit";
import { LoC, LoCWithPendingRedistribution, UserLoC } from "./LoC";
import { FrontendStatus, ReadableZero, LoCListingParams } from "./ReadableZero";

/** @internal */
export type _ReadableZeroWithExtraParamsBase<T extends unknown[]> = {
  [P in keyof ReadableZero]: ReadableZero[P] extends (...params: infer A) => infer R
    ? (...params: [...originalParams: A, ...extraParams: T]) => R
    : never;
};

/** @internal */
export type _ZeroReadCacheBase<T extends unknown[]> = {
  [P in keyof ReadableZero]: ReadableZero[P] extends (...args: infer A) => Promise<infer R>
    ? (...params: [...originalParams: A, ...extraParams: T]) => R | undefined
    : never;
};

// Overloads get lost in the mapping, so we need to define them again...

/** @internal */
export interface _ReadableZeroWithExtraParams<T extends unknown[]>
  extends _ReadableZeroWithExtraParamsBase<T> {
  getLoCs(
    params: LoCListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): Promise<LoCWithPendingRedistribution[]>;

  getLoCs(params: LoCListingParams, ...extraParams: T): Promise<UserLoC[]>;
}

/** @internal */
export interface _ZeroReadCache<T extends unknown[]> extends _ZeroReadCacheBase<T> {
  getLoCs(
    params: LoCListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): LoCWithPendingRedistribution[] | undefined;

  getLoCs(params: LoCListingParams, ...extraParams: T): UserLoC[] | undefined;
}

/** @internal */
export class _CachedReadableZero<T extends unknown[]>
  implements _ReadableZeroWithExtraParams<T> {
  private _readable: _ReadableZeroWithExtraParams<T>;
  private _cache: _ZeroReadCache<T>;

  constructor(readable: _ReadableZeroWithExtraParams<T>, cache: _ZeroReadCache<T>) {
    this._readable = readable;
    this._cache = cache;
  }

  async getTotalRedistributed(...extraParams: T): Promise<LoC> {
    return (
      this._cache.getTotalRedistributed(...extraParams) ??
      this._readable.getTotalRedistributed(...extraParams)
    );
  }

  async getLoCBeforeRedistribution(
    address?: string,
    ...extraParams: T
  ): Promise<LoCWithPendingRedistribution> {
    return (
      this._cache.getLoCBeforeRedistribution(address, ...extraParams) ??
      this._readable.getLoCBeforeRedistribution(address, ...extraParams)
    );
  }

  async getLoC(address?: string, ...extraParams: T): Promise<UserLoC> {
    const [locBeforeRedistribution, totalRedistributed] = await Promise.all([
      this.getLoCBeforeRedistribution(address, ...extraParams),
      this.getTotalRedistributed(...extraParams)
    ]);

    return locBeforeRedistribution.applyRedistribution(totalRedistributed);
  }

  async getNumberOfLoCs(...extraParams: T): Promise<number> {
    return (
      this._cache.getNumberOfLoCs(...extraParams) ??
      this._readable.getNumberOfLoCs(...extraParams)
    );
  }

  async getPrice(...extraParams: T): Promise<Decimal> {
    return this._cache.getPrice(...extraParams) ?? this._readable.getPrice(...extraParams);
  }

  async getTotal(...extraParams: T): Promise<LoC> {
    return this._cache.getTotal(...extraParams) ?? this._readable.getTotal(...extraParams);
  }

  async getStabilityDeposit(address?: string, ...extraParams: T): Promise<StabilityDeposit> {
    return (
      this._cache.getStabilityDeposit(address, ...extraParams) ??
      this._readable.getStabilityDeposit(address, ...extraParams)
    );
  }

  async getRemainingStabilityPoolZEROReward(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getRemainingStabilityPoolZEROReward(...extraParams) ??
      this._readable.getRemainingStabilityPoolZEROReward(...extraParams)
    );
  }

  async getZUSDInStabilityPool(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getZUSDInStabilityPool(...extraParams) ??
      this._readable.getZUSDInStabilityPool(...extraParams)
    );
  }

  async getZUSDBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getZUSDBalance(address, ...extraParams) ??
      this._readable.getZUSDBalance(address, ...extraParams)
    );
  }

  async getZEROBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getZEROBalance(address, ...extraParams) ??
      this._readable.getZEROBalance(address, ...extraParams)
    );
  }

  async getCollateralSurplusBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getCollateralSurplusBalance(address, ...extraParams) ??
      this._readable.getCollateralSurplusBalance(address, ...extraParams)
    );
  }

  getLoCs(
    params: LoCListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): Promise<LoCWithPendingRedistribution[]>;

  getLoCs(params: LoCListingParams, ...extraParams: T): Promise<UserLoC[]>;

  async getLoCs(params: LoCListingParams, ...extraParams: T): Promise<UserLoC[]> {
    const { beforeRedistribution, ...restOfParams } = params;

    const [totalRedistributed, locs] = await Promise.all([
      beforeRedistribution ? undefined : this.getTotalRedistributed(...extraParams),
      this._cache.getLoCs({ beforeRedistribution: true, ...restOfParams }, ...extraParams) ??
        this._readable.getLoCs({ beforeRedistribution: true, ...restOfParams }, ...extraParams)
    ]);

    if (totalRedistributed) {
      return locs.map(loc => loc.applyRedistribution(totalRedistributed));
    } else {
      return locs;
    }
  }

  async getFees(...extraParams: T): Promise<Fees> {
    return this._cache.getFees(...extraParams) ?? this._readable.getFees(...extraParams);
  }

  async getZEROStake(address?: string, ...extraParams: T): Promise<ZEROStake> {
    return (
      this._cache.getZEROStake(address, ...extraParams) ??
      this._readable.getZEROStake(address, ...extraParams)
    );
  }

  async getTotalStakedZERO(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getTotalStakedZERO(...extraParams) ??
      this._readable.getTotalStakedZERO(...extraParams)
    );
  }

  async getFrontendStatus(address?: string, ...extraParams: T): Promise<FrontendStatus> {
    return (
      this._cache.getFrontendStatus(address, ...extraParams) ??
      this._readable.getFrontendStatus(address, ...extraParams)
    );
  }
}
