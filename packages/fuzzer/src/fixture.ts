import { Signer } from "@ethersproject/abstract-signer";

import {
  Decimal,
  Decimalish,
  ZEROStake,
  StabilityDeposit,
  TransactableLiquity,
  Trove,
  TroveAdjustmentParams
} from "@sovryn-zero/lib-base";

import { EthersLiquity as Liquity } from "@sovryn-zero/lib-ethers";

import {
  createRandomTrove,
  shortenAddress,
  benford,
  getListOfTroveOwners,
  listDifference,
  getListOfTroves,
  randomCollateralChange,
  randomDebtChange,
  objToString
} from "./utils";

import { GasHistogram } from "./GasHistogram";

type _GasHistogramsFrom<T> = {
  [P in keyof T]: T[P] extends (...args: never[]) => Promise<infer R> ? GasHistogram<R> : never;
};

type GasHistograms = Pick<
  _GasHistogramsFrom<TransactableLiquity>,
  | "openTrove"
  | "adjustTrove"
  | "closeTrove"
  | "redeemZUSD"
  | "depositZUSDInStabilityPool"
  | "withdrawZUSDFromStabilityPool"
  | "stakeZERO"
  | "unstakeZERO"
>;

export class Fixture {
  private readonly deployerLiquity: Liquity;
  private readonly funder: Signer;
  private readonly funderLiquity: Liquity;
  private readonly funderAddress: string;
  private readonly frontendAddress: string;
  private readonly gasHistograms: GasHistograms;

  private price: Decimal;

  totalNumberOfLiquidations = 0;

  private constructor(
    deployerLiquity: Liquity,
    funder: Signer,
    funderLiquity: Liquity,
    funderAddress: string,
    frontendAddress: string,
    price: Decimal
  ) {
    this.deployerLiquity = deployerLiquity;
    this.funder = funder;
    this.funderLiquity = funderLiquity;
    this.funderAddress = funderAddress;
    this.frontendAddress = frontendAddress;
    this.price = price;

    this.gasHistograms = {
      openTrove: new GasHistogram(),
      adjustTrove: new GasHistogram(),
      closeTrove: new GasHistogram(),
      redeemZUSD: new GasHistogram(),
      depositZUSDInStabilityPool: new GasHistogram(),
      withdrawZUSDFromStabilityPool: new GasHistogram(),
      stakeZERO: new GasHistogram(),
      unstakeZERO: new GasHistogram()
    };
  }

  static async setup(
    deployerLiquity: Liquity,
    funder: Signer,
    funderLiquity: Liquity,
    frontendAddress: string,
    frontendLiquity: Liquity
  ) {
    const funderAddress = await funder.getAddress();
    const price = await deployerLiquity.getPrice();

    await frontendLiquity.registerFrontend(Decimal.from(10).div(11));

    return new Fixture(
      deployerLiquity,
      funder,
      funderLiquity,
      funderAddress,
      frontendAddress,
      price
    );
  }

  private async sendZUSDFromFunder(toAddress: string, amount: Decimalish) {
    amount = Decimal.from(amount);

    const zusdBalance = await this.funderLiquity.getZUSDBalance();

    if (zusdBalance.lt(amount)) {
      const trove = await this.funderLiquity.getTrove();
      const total = await this.funderLiquity.getTotal();
      const fees = await this.funderLiquity.getFees();

      const targetCollateralRatio =
        trove.isEmpty || !total.collateralRatioIsBelowCritical(this.price)
          ? 1.51
          : Decimal.max(trove.collateralRatio(this.price).add(0.00001), 1.11);

      let newTrove = trove.isEmpty ? Trove.create({ depositCollateral: 1 }) : trove;
      newTrove = newTrove.adjust({ borrowZUSD: amount.sub(zusdBalance).mul(2) });
      newTrove = newTrove.setCollateral(newTrove.debt.mulDiv(targetCollateralRatio, this.price));

      if (trove.isEmpty) {
        const params = Trove.recreate(newTrove, fees.borrowingRate());
        console.log(`[funder] openTrove(${objToString(params)})`);
        await this.funderLiquity.openTrove(params);
      } else {
        let newTotal = total.add(newTrove).subtract(trove);

        if (
          !total.collateralRatioIsBelowCritical(this.price) &&
          newTotal.collateralRatioIsBelowCritical(this.price)
        ) {
          newTotal = newTotal.setCollateral(newTotal.debt.mulDiv(1.51, this.price));
          newTrove = trove.add(newTotal).subtract(total);
        }

        const params = trove.adjustTo(newTrove, fees.borrowingRate());
        console.log(`[funder] adjustTrove(${objToString(params)})`);
        await this.funderLiquity.adjustTrove(params);
      }
    }

    await this.funderLiquity.sendZUSD(toAddress, amount);
  }

  async setRandomPrice() {
    this.price = this.price.add(200 * Math.random() + 100).div(2);
    console.log(`[deployer] setPrice(${this.price})`);
    await this.deployerLiquity.setPrice(this.price);

    return this.price;
  }

  async liquidateRandomNumberOfTroves(price: Decimal) {
    const zusdInStabilityPoolBefore = await this.deployerLiquity.getZUSDInStabilityPool();
    console.log(`// Stability Pool balance: ${zusdInStabilityPoolBefore}`);

    const trovesBefore = await getListOfTroves(this.deployerLiquity);

    if (trovesBefore.length === 0) {
      console.log("// No Troves to liquidate");
      return;
    }

    const troveOwnersBefore = trovesBefore.map(([owner]) => owner);
    const [, lastTrove] = trovesBefore[trovesBefore.length - 1];

    if (!lastTrove.collateralRatioIsBelowMinimum(price)) {
      console.log("// No Troves to liquidate");
      return;
    }

    const maximumNumberOfTrovesToLiquidate = Math.floor(50 * Math.random()) + 1;
    console.log(`[deployer] liquidateUpTo(${maximumNumberOfTrovesToLiquidate})`);
    await this.deployerLiquity.liquidateUpTo(maximumNumberOfTrovesToLiquidate);

    const troveOwnersAfter = await getListOfTroveOwners(this.deployerLiquity);
    const liquidatedTroves = listDifference(troveOwnersBefore, troveOwnersAfter);

    if (liquidatedTroves.length > 0) {
      for (const liquidatedTrove of liquidatedTroves) {
        console.log(`// Liquidated ${shortenAddress(liquidatedTrove)}`);
      }
    }

    this.totalNumberOfLiquidations += liquidatedTroves.length;

    const zusdInStabilityPoolAfter = await this.deployerLiquity.getZUSDInStabilityPool();
    console.log(`// Stability Pool balance: ${zusdInStabilityPoolAfter}`);
  }

  async openRandomTrove(userAddress: string, liquity: Liquity) {
    const total = await liquity.getTotal();
    const fees = await liquity.getFees();

    let newTrove: Trove;

    const cannotOpen = (newTrove: Trove) =>
      total.collateralRatioIsBelowCritical(this.price)
        ? newTrove.collateralRatioIsBelowCritical(this.price)
        : newTrove.collateralRatioIsBelowMinimum(this.price) ||
          total.add(newTrove).collateralRatioIsBelowCritical(this.price);

    // do {
    newTrove = createRandomTrove(this.price);
    // } while (cannotOpen(newTrove));

    await this.funder.sendTransaction({
      to: userAddress,
      value: newTrove.collateral.hex
    });

    const params = Trove.recreate(newTrove, fees.borrowingRate());

    if (cannotOpen(newTrove)) {
      console.log(
        `// [${shortenAddress(userAddress)}] openTrove(${objToString(params)}) expected to fail`
      );

      await this.gasHistograms.openTrove.expectFailure(() =>
        liquity.openTrove(params, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] openTrove(${objToString(params)})`);

      await this.gasHistograms.openTrove.expectSuccess(() =>
        liquity.send.openTrove(params, { gasPrice: 0 })
      );
    }
  }

  async randomlyAdjustTrove(userAddress: string, liquity: Liquity, trove: Trove) {
    const total = await liquity.getTotal();
    const fees = await liquity.getFees();
    const x = Math.random();

    const params: TroveAdjustmentParams<Decimal> =
      x < 0.333
        ? randomCollateralChange(trove)
        : x < 0.666
        ? randomDebtChange(trove)
        : { ...randomCollateralChange(trove), ...randomDebtChange(trove) };

    const cannotAdjust = (trove: Trove, params: TroveAdjustmentParams<Decimal>) => {
      if (params.withdrawCollateral?.gte(trove.collateral) || params.repayZUSD?.gt(trove.netDebt)) {
        return true;
      }

      const adjusted = trove.adjust(params, fees.borrowingRate());

      return (
        (params.withdrawCollateral?.nonZero || params.borrowZUSD?.nonZero) &&
        (adjusted.collateralRatioIsBelowMinimum(this.price) ||
          (total.collateralRatioIsBelowCritical(this.price)
            ? adjusted._nominalCollateralRatio.lt(trove._nominalCollateralRatio)
            : total.add(adjusted).subtract(trove).collateralRatioIsBelowCritical(this.price)))
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

    if (cannotAdjust(trove, params)) {
      console.log(
        `// [${shortenAddress(userAddress)}] adjustTrove(${objToString(params)}) expected to fail`
      );

      await this.gasHistograms.adjustTrove.expectFailure(() =>
        liquity.adjustTrove(params, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] adjustTrove(${objToString(params)})`);

      await this.gasHistograms.adjustTrove.expectSuccess(() =>
        liquity.send.adjustTrove(params, { gasPrice: 0 })
      );
    }
  }

  async closeTrove(userAddress: string, liquity: Liquity, trove: Trove) {
    const total = await liquity.getTotal();

    if (total.collateralRatioIsBelowCritical(this.price)) {
      // Cannot close Trove during recovery mode
      console.log("// Skipping closeTrove() in recovery mode");
      return;
    }

    await this.sendZUSDFromFunder(userAddress, trove.netDebt);

    console.log(`[${shortenAddress(userAddress)}] closeTrove()`);

    await this.gasHistograms.closeTrove.expectSuccess(() =>
      liquity.send.closeTrove({ gasPrice: 0 })
    );
  }

  async redeemRandomAmount(userAddress: string, liquity: Liquity) {
    const total = await liquity.getTotal();

    if (total.collateralRatioIsBelowMinimum(this.price)) {
      console.log("// Skipping redeemZUSD() when TCR < MCR");
      return;
    }

    const amount = benford(10000);
    await this.sendZUSDFromFunder(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] redeemZUSD(${amount})`);

    await this.gasHistograms.redeemZUSD.expectSuccess(() =>
      liquity.send.redeemZUSD(amount, { gasPrice: 0 })
    );
  }

  async depositRandomAmountInStabilityPool(userAddress: string, liquity: Liquity) {
    const amount = benford(20000);

    await this.sendZUSDFromFunder(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] depositZUSDInStabilityPool(${amount})`);

    await this.gasHistograms.depositZUSDInStabilityPool.expectSuccess(() =>
      liquity.send.depositZUSDInStabilityPool(amount, this.frontendAddress, {
        gasPrice: 0
      })
    );
  }

  async withdrawRandomAmountFromStabilityPool(
    userAddress: string,
    liquity: Liquity,
    deposit: StabilityDeposit
  ) {
    const [[, lastTrove]] = await liquity.getTroves({
      first: 1,
      sortedBy: "ascendingCollateralRatio"
    });

    const amount = deposit.currentZUSD.mul(1.1 * Math.random()).add(10 * Math.random());

    const cannotWithdraw = (amount: Decimal) =>
      amount.nonZero && lastTrove.collateralRatioIsBelowMinimum(this.price);

    if (cannotWithdraw(amount)) {
      console.log(
        `// [${shortenAddress(userAddress)}] ` +
          `withdrawZUSDFromStabilityPool(${amount}) expected to fail`
      );

      await this.gasHistograms.withdrawZUSDFromStabilityPool.expectFailure(() =>
        liquity.withdrawZUSDFromStabilityPool(amount, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] withdrawZUSDFromStabilityPool(${amount})`);

      await this.gasHistograms.withdrawZUSDFromStabilityPool.expectSuccess(() =>
        liquity.send.withdrawZUSDFromStabilityPool(amount, { gasPrice: 0 })
      );
    }
  }

  async stakeRandomAmount(userAddress: string, liquity: Liquity) {
    const zeroBalance = await this.funderLiquity.getZEROBalance();
    const amount = zeroBalance.mul(Math.random() / 2);

    await this.funderLiquity.sendZERO(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] stakeZERO(${amount})`);

    await this.gasHistograms.stakeZERO.expectSuccess(() =>
      liquity.send.stakeZERO(amount, { gasPrice: 0 })
    );
  }

  async unstakeRandomAmount(userAddress: string, liquity: Liquity, stake: ZEROStake) {
    const amount = stake.stakedZERO.mul(1.1 * Math.random()).add(10 * Math.random());

    console.log(`[${shortenAddress(userAddress)}] unstakeZERO(${amount})`);

    await this.gasHistograms.unstakeZERO.expectSuccess(() =>
      liquity.send.unstakeZERO(amount, { gasPrice: 0 })
    );
  }

  async sweepZUSD(liquity: Liquity) {
    const zusdBalance = await liquity.getZUSDBalance();

    if (zusdBalance.nonZero) {
      await liquity.sendZUSD(this.funderAddress, zusdBalance, { gasPrice: 0 });
    }
  }

  async sweepZERO(liquity: Liquity) {
    const zeroBalance = await liquity.getZEROBalance();

    if (zeroBalance.nonZero) {
      await liquity.sendZERO(this.funderAddress, zeroBalance, { gasPrice: 0 });
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
