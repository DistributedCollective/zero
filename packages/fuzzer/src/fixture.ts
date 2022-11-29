import { Signer } from "@ethersproject/abstract-signer";

import {
  Decimal,
  Decimalish,
  ZEROStake,
  StabilityDeposit,
  TransactableZero,
  LoC,
  LoCAdjustmentParams
} from "@sovryn-zero/lib-base";

import { EthersZero as Zero } from "@sovryn-zero/lib-ethers";

import {
  createRandomLoC,
  shortenAddress,
  benford,
  getListOfLoCOwners,
  listDifference,
  getListOfLoCs,
  randomCollateralChange,
  randomDebtChange,
  objToString
} from "./utils";

import { GasHistogram } from "./GasHistogram";

type _GasHistogramsFrom<T> = {
  [P in keyof T]: T[P] extends (...args: never[]) => Promise<infer R> ? GasHistogram<R> : never;
};

type GasHistograms = Pick<
  _GasHistogramsFrom<TransactableZero>,
  | "openLoC"
  | "adjustLoC"
  | "closeLoC"
  | "redeemZUSD"
  | "depositZUSDInStabilityPool"
  | "withdrawZUSDFromStabilityPool"
  | "stakeZERO"
  | "unstakeZERO"
>;

export class Fixture {
  private readonly deployerZero: Zero;
  private readonly funder: Signer;
  private readonly funderZero: Zero;
  private readonly funderAddress: string;
  private readonly frontendAddress: string;
  private readonly gasHistograms: GasHistograms;

  private price: Decimal;

  totalNumberOfLiquidations = 0;

  private constructor(
    deployerZero: Zero,
    funder: Signer,
    funderZero: Zero,
    funderAddress: string,
    frontendAddress: string,
    price: Decimal
  ) {
    this.deployerZero = deployerZero;
    this.funder = funder;
    this.funderZero = funderZero;
    this.funderAddress = funderAddress;
    this.frontendAddress = frontendAddress;
    this.price = price;

    this.gasHistograms = {
      openLoC: new GasHistogram(),
      adjustLoC: new GasHistogram(),
      closeLoC: new GasHistogram(),
      redeemZUSD: new GasHistogram(),
      depositZUSDInStabilityPool: new GasHistogram(),
      withdrawZUSDFromStabilityPool: new GasHistogram(),
      stakeZERO: new GasHistogram(),
      unstakeZERO: new GasHistogram()
    };
  }

  static async setup(
    deployerZero: Zero,
    funder: Signer,
    funderZero: Zero,
    frontendAddress: string,
    frontendZero: Zero
  ) {
    const funderAddress = await funder.getAddress();
    const price = await deployerZero.getPrice();

    await frontendZero.registerFrontend(Decimal.from(10).div(11));

    return new Fixture(
      deployerZero,
      funder,
      funderZero,
      funderAddress,
      frontendAddress,
      price
    );
  }

  private async sendZUSDFromFunder(toAddress: string, amount: Decimalish) {
    amount = Decimal.from(amount);

    const zusdBalance = await this.funderZero.getZUSDBalance();

    if (zusdBalance.lt(amount)) {
      const loc = await this.funderZero.getLoC();
      const total = await this.funderZero.getTotal();
      const fees = await this.funderZero.getFees();

      const targetCollateralRatio =
        loc.isEmpty || !total.collateralRatioIsBelowCritical(this.price)
          ? 1.51
          : Decimal.max(loc.collateralRatio(this.price).add(0.00001), 1.11);

      let newLoC = loc.isEmpty ? LoC.create({ depositCollateral: 1 }) : loc;
      newLoC = newLoC.adjust({ borrowZUSD: amount.sub(zusdBalance).mul(2) });
      newLoC = newLoC.setCollateral(newLoC.debt.mulDiv(targetCollateralRatio, this.price));

      if (loc.isEmpty) {
        const params = LoC.recreate(newLoC, fees.originationRate());
        console.log(`[funder] openLoC(${objToString(params)})`);
        await this.funderZero.openLoC(params);
      } else {
        let newTotal = total.add(newLoC).subtract(loc);

        if (
          !total.collateralRatioIsBelowCritical(this.price) &&
          newTotal.collateralRatioIsBelowCritical(this.price)
        ) {
          newTotal = newTotal.setCollateral(newTotal.debt.mulDiv(1.51, this.price));
          newLoC = loc.add(newTotal).subtract(total);
        }

        const params = loc.adjustTo(newLoC, fees.originationRate());
        console.log(`[funder] adjustLoC(${objToString(params)})`);
        await this.funderZero.adjustLoC(params);
      }
    }

    await this.funderZero.sendZUSD(toAddress, amount);
  }

  async setRandomPrice() {
    this.price = this.price.add(200 * Math.random() + 100).div(2);
    console.log(`[deployer] setPrice(${this.price})`);
    await this.deployerZero.setPrice(this.price);

    return this.price;
  }

  async liquidateRandomNumberOfLoCs(price: Decimal) {
    const zusdInStabilityPoolBefore = await this.deployerZero.getZUSDInStabilityPool();
    console.log(`// Stability Pool balance: ${zusdInStabilityPoolBefore}`);

    const locsBefore = await getListOfLoCs(this.deployerZero);

    if (locsBefore.length === 0) {
      console.log("// No LoCs to liquidate");
      return;
    }

    const locOwnersBefore = locsBefore.map(([owner]) => owner);
    const [, lastLoC] = locsBefore[locsBefore.length - 1];

    if (!lastLoC.collateralRatioIsBelowMinimum(price)) {
      console.log("// No LoCs to liquidate");
      return;
    }

    const maximumNumberOfLoCsToLiquidate = Math.floor(50 * Math.random()) + 1;
    console.log(`[deployer] liquidateUpTo(${maximumNumberOfLoCsToLiquidate})`);
    await this.deployerZero.liquidateUpTo(maximumNumberOfLoCsToLiquidate);

    const locOwnersAfter = await getListOfLoCOwners(this.deployerZero);
    const liquidatedLoCs = listDifference(locOwnersBefore, locOwnersAfter);

    if (liquidatedLoCs.length > 0) {
      for (const liquidatedLoC of liquidatedLoCs) {
        console.log(`// Liquidated ${shortenAddress(liquidatedLoC)}`);
      }
    }

    this.totalNumberOfLiquidations += liquidatedLoCs.length;

    const zusdInStabilityPoolAfter = await this.deployerZero.getZUSDInStabilityPool();
    console.log(`// Stability Pool balance: ${zusdInStabilityPoolAfter}`);
  }

  async openRandomLoC(userAddress: string, zero: Zero) {
    const total = await zero.getTotal();
    const fees = await zero.getFees();

    let newLoC: LoC;

    const cannotOpen = (newLoC: LoC) =>
      total.collateralRatioIsBelowCritical(this.price)
        ? newLoC.collateralRatioIsBelowCritical(this.price)
        : newLoC.collateralRatioIsBelowMinimum(this.price) ||
          total.add(newLoC).collateralRatioIsBelowCritical(this.price);

    // do {
    newLoC = createRandomLoC(this.price);
    // } while (cannotOpen(newLoC));

    await this.funder.sendTransaction({
      to: userAddress,
      value: newLoC.collateral.hex
    });

    const params = LoC.recreate(newLoC, fees.originationRate());

    if (cannotOpen(newLoC)) {
      console.log(
        `// [${shortenAddress(userAddress)}] openLoC(${objToString(params)}) expected to fail`
      );

      await this.gasHistograms.openLoC.expectFailure(() =>
        zero.openLoC(params, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] openLoC(${objToString(params)})`);

      await this.gasHistograms.openLoC.expectSuccess(() =>
        zero.send.openLoC(params, { gasPrice: 0 })
      );
    }
  }

  async randomlyAdjustLoC(userAddress: string, zero: Zero, loc: LoC) {
    const total = await zero.getTotal();
    const fees = await zero.getFees();
    const x = Math.random();

    const params: LoCAdjustmentParams<Decimal> =
      x < 0.333
        ? randomCollateralChange(loc)
        : x < 0.666
        ? randomDebtChange(loc)
        : { ...randomCollateralChange(loc), ...randomDebtChange(loc) };

    const cannotAdjust = (loc: LoC, params: LoCAdjustmentParams<Decimal>) => {
      if (params.withdrawCollateral?.gte(loc.collateral) || params.repayZUSD?.gt(loc.netDebt)) {
        return true;
      }

      const adjusted = loc.adjust(params, fees.originationRate());

      return (
        (params.withdrawCollateral?.nonZero || params.borrowZUSD?.nonZero) &&
        (adjusted.collateralRatioIsBelowMinimum(this.price) ||
          (total.collateralRatioIsBelowCritical(this.price)
            ? adjusted._nominalCollateralRatio.lt(loc._nominalCollateralRatio)
            : total.add(adjusted).subtract(loc).collateralRatioIsBelowCritical(this.price)))
      );
    };

    if (params.depositCollateral) {
      await this.funder.sendTransaction({
        to: userAddress,
        value: params.depositCollateral.hex
      });
    }

    if (params.repayZUSD) {
      await this.sendZUSDFromFunder(userAddress, params.repayZUSD);
    }

    if (cannotAdjust(loc, params)) {
      console.log(
        `// [${shortenAddress(userAddress)}] adjustLoC(${objToString(params)}) expected to fail`
      );

      await this.gasHistograms.adjustLoC.expectFailure(() =>
        zero.adjustLoC(params, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] adjustLoC(${objToString(params)})`);

      await this.gasHistograms.adjustLoC.expectSuccess(() =>
        zero.send.adjustLoC(params, { gasPrice: 0 })
      );
    }
  }

  async closeLoC(userAddress: string, zero: Zero, loc: LoC) {
    const total = await zero.getTotal();

    if (total.collateralRatioIsBelowCritical(this.price)) {
      // Cannot close LoC during recovery mode
      console.log("// Skipping closeLoC() in recovery mode");
      return;
    }

    await this.sendZUSDFromFunder(userAddress, loc.netDebt);

    console.log(`[${shortenAddress(userAddress)}] closeLoC()`);

    await this.gasHistograms.closeLoC.expectSuccess(() =>
      zero.send.closeLoC({ gasPrice: 0 })
    );
  }

  async redeemRandomAmount(userAddress: string, zero: Zero) {
    const total = await zero.getTotal();

    if (total.collateralRatioIsBelowMinimum(this.price)) {
      console.log("// Skipping redeemZUSD() when TCR < MCR");
      return;
    }

    const amount = benford(10000);
    await this.sendZUSDFromFunder(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] redeemZUSD(${amount})`);

    await this.gasHistograms.redeemZUSD.expectSuccess(() =>
      zero.send.redeemZUSD(amount, { gasPrice: 0 })
    );
  }

  async depositRandomAmountInStabilityPool(userAddress: string, zero: Zero) {
    const amount = benford(20000);

    await this.sendZUSDFromFunder(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] depositZUSDInStabilityPool(${amount})`);

    await this.gasHistograms.depositZUSDInStabilityPool.expectSuccess(() =>
      zero.send.depositZUSDInStabilityPool(amount, this.frontendAddress, {
        gasPrice: 0
      })
    );
  }

  async withdrawRandomAmountFromStabilityPool(
    userAddress: string,
    zero: Zero,
    deposit: StabilityDeposit
  ) {
    const [[, lastLoC]] = await zero.getLoCs({
      first: 1,
      sortedBy: "ascendingCollateralRatio"
    });

    const amount = deposit.currentZUSD.mul(1.1 * Math.random()).add(10 * Math.random());

    const cannotWithdraw = (amount: Decimal) =>
      amount.nonZero && lastLoC.collateralRatioIsBelowMinimum(this.price);

    if (cannotWithdraw(amount)) {
      console.log(
        `// [${shortenAddress(userAddress)}] ` +
          `withdrawZUSDFromStabilityPool(${amount}) expected to fail`
      );

      await this.gasHistograms.withdrawZUSDFromStabilityPool.expectFailure(() =>
        zero.withdrawZUSDFromStabilityPool(amount, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] withdrawZUSDFromStabilityPool(${amount})`);

      await this.gasHistograms.withdrawZUSDFromStabilityPool.expectSuccess(() =>
        zero.send.withdrawZUSDFromStabilityPool(amount, { gasPrice: 0 })
      );
    }
  }

  async stakeRandomAmount(userAddress: string, zero: Zero) {
    const zeroBalance = await this.funderZero.getZEROBalance();
    const amount = zeroBalance.mul(Math.random() / 2);

    await this.funderZero.sendZERO(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] stakeZERO(${amount})`);

    await this.gasHistograms.stakeZERO.expectSuccess(() =>
      zero.send.stakeZERO(amount, { gasPrice: 0 })
    );
  }

  async unstakeRandomAmount(userAddress: string, zero: Zero, stake: ZEROStake) {
    const amount = stake.stakedZERO.mul(1.1 * Math.random()).add(10 * Math.random());

    console.log(`[${shortenAddress(userAddress)}] unstakeZERO(${amount})`);

    await this.gasHistograms.unstakeZERO.expectSuccess(() =>
      zero.send.unstakeZERO(amount, { gasPrice: 0 })
    );
  }

  async sweepZUSD(zero: Zero) {
    const zusdBalance = await zero.getZUSDBalance();

    if (zusdBalance.nonZero) {
      await zero.sendZUSD(this.funderAddress, zusdBalance, { gasPrice: 0 });
    }
  }

  async sweepZERO(zero: Zero) {
    const zeroBalance = await zero.getZEROBalance();

    if (zeroBalance.nonZero) {
      await zero.sendZERO(this.funderAddress, zeroBalance, { gasPrice: 0 });
    }
  }

  summarizeGasStats(): string {
    return Object.entries(this.gasHistograms)
      .map(([name, histo]) => {
        const results = histo.getResults();

        return (
          `${name},outOfGas,${histo.outOfGasFailures}\n` +
          `${name},failure,${histo.expectedFailures}\n` +
          results
            .map(([intervalMin, frequency]) => `${name},success,${frequency},${intervalMin}\n`)
            .join("")
        );
      })
      .join("");
  }
}
