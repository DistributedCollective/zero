import { Signer } from "@ethersproject/abstract-signer";
import { Provider } from "@ethersproject/abstract-provider";
import { Wallet } from "@ethersproject/wallet";

import {
  Decimal,
  Decimalish,
  Difference,
  Percent,
  LoC,
  LoCWithPendingRedistribution,
  ReadableZero,
  ZUSD_LIQUIDATION_RESERVE
} from "@sovryn-zero/lib-base";
import { EthersZero, ReadableEthersZero } from "@sovryn-zero/lib-ethers";
import { SubgraphZero } from "@sovryn-zero/lib-subgraph";

export const objToString = (o: Record<string, unknown>) =>
  "{ " +
  Object.entries(o)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ") +
  " }";

export const createRandomWallets = (numberOfWallets: number, provider: Provider) => {
  const accounts = new Array<Wallet>(numberOfWallets);

  for (let i = 0; i < numberOfWallets; ++i) {
    accounts[i] = Wallet.createRandom().connect(provider);
  }

  return accounts;
};

export const createRandomLoC = (price: Decimal) => {
  let randomValue = truncateLastDigits(benford(1000));

  if (Math.random() < 0.5) {
    const collateral = Decimal.from(randomValue);
    const maxDebt = parseInt(price.mul(collateral).toString(0));
    const debt = ZUSD_LIQUIDATION_RESERVE.add(truncateLastDigits(maxDebt - benford(maxDebt)));

    return new LoC(collateral, debt);
  } else {
    const debt = ZUSD_LIQUIDATION_RESERVE.add(100 * randomValue);

    const collateral = Decimal.from(
      debt
        .div(price)
        .mul(100 + benford(200))
        .div(100)
        .toString(4)
    );

    return new LoC(collateral, debt);
  }
};

export const randomCollateralChange = ({ collateral }: LoC) =>
  Math.random() < 0.5
    ? { withdrawCollateral: collateral.mul(1.1 * Math.random()) }
    : { depositCollateral: collateral.mul(0.5 * Math.random()) };

export const randomDebtChange = ({ debt }: LoC) =>
  Math.random() < 0.5
    ? { repayZUSD: debt.mul(1.1 * Math.random()) }
    : { borrowZUSD: debt.mul(0.5 * Math.random()) };

export const getListOfLoCs = async (zero: ReadableZero) =>
  zero.getLoCs({
    first: await zero.getNumberOfLoCs(),
    sortedBy: "descendingCollateralRatio",
    beforeRedistribution: false
  });

export const getListOfLoCsBeforeRedistribution = async (zero: ReadableZero) =>
  zero.getLoCs({
    first: await zero.getNumberOfLoCs(),
    sortedBy: "descendingCollateralRatio",
    beforeRedistribution: true
  });

export const getListOfLoCOwners = async (zero: ReadableZero) =>
  getListOfLoCsBeforeRedistribution(zero).then(locs => locs.map(([owner]) => owner));

const tinyDifference = Decimal.from("0.000000001");

const sortedByICR = (
  listOfLoCs: [string, LoCWithPendingRedistribution][],
  totalRedistributed: LoC,
  price: Decimalish
) => {
  if (listOfLoCs.length < 2) {
    return true;
  }

  let currentLoC = listOfLoCs[0][1].applyRedistribution(totalRedistributed);

  for (let i = 1; i < listOfLoCs.length; ++i) {
    const nextLoC = listOfLoCs[i][1].applyRedistribution(totalRedistributed);

    if (
      nextLoC.collateralRatio(price).gt(currentLoC.collateralRatio(price).add(tinyDifference))
    ) {
      return false;
    }

    currentLoC = nextLoC;
  }

  return true;
};

export const listDifference = (listA: string[], listB: string[]) => {
  const setB = new Set(listB);
  return listA.filter(x => !setB.has(x));
};

export const listOfLoCsShouldBeEqual = (
  listA: [string, LoCWithPendingRedistribution][],
  listB: [string, LoCWithPendingRedistribution][]
) => {
  if (listA.length !== listB.length) {
    throw new Error("length of LoC lists is different");
  }

  const mapB = new Map(listB);

  listA.forEach(([owner, locA]) => {
    const locB = mapB.get(owner);

    if (!locB) {
      throw new Error(`${owner} has no LoC in listB`);
    }

    if (!locA.equals(locB)) {
      throw new Error(`${owner} has different locs in listA & listB`);
    }
  });
};

export const checkLoCOrdering = (
  listOfLoCs: [string, LoCWithPendingRedistribution][],
  totalRedistributed: LoC,
  price: Decimal,
  previousListOfLoCs?: [string, LoCWithPendingRedistribution][]
) => {
  if (!sortedByICR(listOfLoCs, totalRedistributed, price)) {
    if (previousListOfLoCs) {
      console.log();
      console.log("// List of LoCs before:");
      dumpLoCs(previousListOfLoCs, totalRedistributed, price);

      console.log();
      console.log("// List of LoCs after:");
    }

    dumpLoCs(listOfLoCs, totalRedistributed, price);
    throw new Error("ordering is broken");
  }
};

export const checkPoolBalances = async (
  zero: ReadableEthersZero,
  listOfLoCs: [string, LoCWithPendingRedistribution][],
  totalRedistributed: LoC
) => {
  const activePool = await zero._getActivePool();
  const defaultPool = await zero._getDefaultPool();

  const [activeTotal, defaultTotal] = listOfLoCs.reduce(
    ([activeTotal, defaultTotal], [, locActive]) => {
      const locTotal = locActive.applyRedistribution(totalRedistributed);
      const locDefault = locTotal.subtract(locActive);

      return [activeTotal.add(locActive), defaultTotal.add(locDefault)];
    },
    [new LoC(), new LoC()]
  );

  const diffs = [
    Difference.between(activePool.collateral, activeTotal.collateral),
    Difference.between(activePool.debt, activeTotal.debt),
    Difference.between(defaultPool.collateral, defaultTotal.collateral),
    Difference.between(defaultPool.debt, defaultTotal.debt)
  ];

  if (!diffs.every(diff => diff.absoluteValue?.lt(tinyDifference))) {
    console.log();
    console.log(`  ActivePool:    ${activePool}`);
    console.log(`  Total active:  ${activeTotal}`);
    console.log();
    console.log(`  DefaultPool:   ${defaultPool}`);
    console.log(`  Total default: ${defaultTotal}`);
    console.log();

    throw new Error("discrepancy between LoCs & Pools");
  }
};

const numbersEqual = (a: number, b: number) => a === b;
const decimalsEqual = (a: Decimal, b: Decimal) => a.eq(b);
const locsEqual = (a: LoC, b: LoC) => a.equals(b);

const locsRoughlyEqual = (locA: LoC, locB: LoC) =>
  [
    [locA.collateral, locB.collateral],
    [locA.debt, locB.debt]
  ].every(([a, b]) => Difference.between(a, b).absoluteValue?.lt(tinyDifference));

class EqualityCheck<T> {
  private name: string;
  private get: (l: ReadableZero) => Promise<T>;
  private equals: (a: T, b: T) => boolean;

  constructor(
    name: string,
    get: (l: ReadableZero) => Promise<T>,
    equals: (a: T, b: T) => boolean
  ) {
    this.name = name;
    this.get = get;
    this.equals = equals;
  }

  async allEqual(liquities: ReadableZero[]) {
    const [a, ...rest] = await Promise.all(liquities.map(l => this.get(l)));

    if (!rest.every(b => this.equals(a, b))) {
      throw new Error(`Mismatch in ${this.name}`);
    }
  }
}

const checks = [
  new EqualityCheck("numberOfLoCs", l => l.getNumberOfLoCs(), numbersEqual),
  new EqualityCheck("price", l => l.getPrice(), decimalsEqual),
  new EqualityCheck("total", l => l.getTotal(), locsRoughlyEqual),
  new EqualityCheck("totalRedistributed", l => l.getTotalRedistributed(), locsEqual),
  new EqualityCheck("tokensInStabilityPool", l => l.getZUSDInStabilityPool(), decimalsEqual)
];

export const checkSubgraph = async (subgraph: SubgraphZero, l1Zero: ReadableZero) => {
  await Promise.all(checks.map(check => check.allEqual([subgraph, l1Zero])));

  const l1ListOfLoCs = await getListOfLoCsBeforeRedistribution(l1Zero);
  const subgraphListOfLoCs = await getListOfLoCsBeforeRedistribution(subgraph);
  listOfLoCsShouldBeEqual(l1ListOfLoCs, subgraphListOfLoCs);

  const totalRedistributed = await subgraph.getTotalRedistributed();
  const price = await subgraph.getPrice();

  if (!sortedByICR(subgraphListOfLoCs, totalRedistributed, price)) {
    console.log();
    console.log("// List of LoCs returned by subgraph:");
    dumpLoCs(subgraphListOfLoCs, totalRedistributed, price);
    throw new Error("subgraph sorting broken");
  }
};

export const shortenAddress = (address: string) => address.substr(0, 6) + "..." + address.substr(-4);

const locToString = (
  address: string,
  locWithPendingRewards: LoCWithPendingRedistribution,
  totalRedistributed: LoC,
  price: Decimalish
) => {
  const loc = locWithPendingRewards.applyRedistribution(totalRedistributed);
  const rewards = loc.subtract(locWithPendingRewards);

  return (
    `[${shortenAddress(address)}]: ` +
    `ICR = ${new Percent(loc.collateralRatio(price)).toString(2)}, ` +
    `ICR w/o reward = ${new Percent(locWithPendingRewards.collateralRatio(price)).toString(2)}, ` +
    `coll = ${loc.collateral.toString(2)}, ` +
    `debt = ${loc.debt.toString(2)}, ` +
    `coll reward = ${rewards.collateral.toString(2)}, ` +
    `debt reward = ${rewards.debt.toString(2)}`
  );
};

export const dumpLoCs = (
  listOfLoCs: [string, LoCWithPendingRedistribution][],
  totalRedistributed: LoC,
  price: Decimalish
) => {
  if (listOfLoCs.length === 0) {
    return;
  }

  let [currentOwner, currentLoC] = listOfLoCs[0];
  console.log(`   ${locToString(currentOwner, currentLoC, totalRedistributed, price)}`);

  for (let i = 1; i < listOfLoCs.length; ++i) {
    const [nextOwner, nextLoC] = listOfLoCs[i];

    if (
      nextLoC
        .applyRedistribution(totalRedistributed)
        .collateralRatio(price)
        .sub(tinyDifference)
        .gt(currentLoC.applyRedistribution(totalRedistributed).collateralRatio(price))
    ) {
      console.log(`!! ${locToString(nextOwner, nextLoC, totalRedistributed, price)}`.red);
    } else {
      console.log(`   ${locToString(nextOwner, nextLoC, totalRedistributed, price)}`);
    }

    [currentOwner, currentLoC] = [nextOwner, nextLoC];
  }
};

export const benford = (max: number) => Math.floor(Math.exp(Math.log(max) * Math.random()));

const truncateLastDigits = (n: number) => {
  if (n > 100000) {
    return 1000 * Math.floor(n / 1000);
  } else if (n > 10000) {
    return 100 * Math.floor(n / 100);
  } else if (n > 1000) {
    return 10 * Math.floor(n / 10);
  } else {
    return n;
  }
};

export const connectUsers = (users: Signer[]) =>
  Promise.all(users.map(user => EthersZero.connect(user)));
