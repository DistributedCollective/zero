import chai, { expect, assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSpies from "chai-spies";
import { AddressZero } from "@ethersproject/constants";
import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { ethers, network, deployZero } from "hardhat";

import {
  Decimal,
  Decimalish,
  LoC,
  StabilityDeposit,
  ZeroReceipt,
  SuccessfulReceipt,
  SentZeroTransaction,
  LoCCreationParams,
  Fees,
  ZUSD_LIQUIDATION_RESERVE,
  MAXIMUM_BORROWING_RATE,
  MINIMUM_BORROWING_RATE,
  ZUSD_MINIMUM_DEBT,
  ZUSD_MINIMUM_NET_DEBT
} from "@sovryn-zero/lib-base";

import { HintHelpers } from "../types";

import {
  PopulatableEthersZero,
  PopulatedEthersZeroTransaction,
  _redeemMaxIterations
} from "../src/PopulatableEthersZero";

import { _ZeroDeploymentJSON } from "../src/contracts";
import { _connectToDeployment } from "../src/EthersZeroConnection";
import { EthersZero } from "../src/EthersZero";
import { ReadableEthersZero } from "../src/ReadableEthersZero";
import mockBalanceRedirectPresaleAbi from "../abi/MockBalanceRedirectPresale.json";

const provider = ethers.provider;

chai.use(chaiAsPromised);
chai.use(chaiSpies);

const connectToDeployment = async (
  deployment: _ZeroDeploymentJSON,
  signer: Signer,
  frontendTag?: string
) =>
  EthersZero._from(
    _connectToDeployment(deployment, signer, {
      userAddress: await signer.getAddress(),
      frontendTag
    })
  );

const increaseTime = async (timeJumpSeconds: number) => {
  await provider.send("evm_increaseTime", [timeJumpSeconds]);
};

function assertStrictEqual<T, U extends T>(
  actual: T,
  expected: U,
  message?: string
): asserts actual is U {
  assert.strictEqual(actual, expected, message);
}

function assertDefined<T>(actual: T | undefined): asserts actual is T {
  assert(actual !== undefined);
}

const waitForSuccess = async <T extends ZeroReceipt>(
  tx: Promise<SentZeroTransaction<unknown, T>>
) => {
  const receipt = await (await tx).waitForReceipt();
  assertStrictEqual(receipt.status, "succeeded" as const);

  return receipt as Extract<T, SuccessfulReceipt>;
};

// TODO make the testcases isolated

describe("EthersZero", () => {
  let deployer: Signer;
  let funder: Signer;
  let user: Signer;
  let otherUsers: Signer[];

  let deployment: _ZeroDeploymentJSON;

  let deployerZero: EthersZero;
  let zero: EthersZero;
  let otherLiquities: EthersZero[];

  const connectUsers = (users: Signer[]) =>
    Promise.all(users.map(user => connectToDeployment(deployment, user)));

  const openLoCs = (users: Signer[], params: LoCCreationParams<Decimalish>[]) =>
    params
      .map((params, i) => () =>
        Promise.all([
          connectToDeployment(deployment, users[i]),
          sendTo(users[i], params.depositCollateral).then(tx => tx.wait())
        ]).then(async ([zero]) => {
          await zero.openLoC(params, undefined, { gasPrice: 0 });
        })
      )
      .reduce((a, b) => a.then(b), Promise.resolve());

  const sendTo = (user: Signer, value: Decimalish, nonce?: number) =>
    funder.sendTransaction({
      to: user.getAddress(),
      value: Decimal.from(value).hex,
      nonce
    });

  const sendToEach = async (users: Signer[], value: Decimalish) => {
    const txCount = await provider.getTransactionCount(funder.getAddress());
    const txs = await Promise.all(users.map((user, i) => sendTo(user, value, txCount + i)));

    // Wait for the last tx to be mined.
    await txs[txs.length - 1].wait();
  };

  before(async () => {
    [deployer, funder, user, ...otherUsers] = await ethers.getSigners();
    deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);

    zero = await connectToDeployment(deployment, user);
    expect(zero).to.be.an.instanceOf(EthersZero);
  });

  // Always setup same initial balance for user
  beforeEach(async () => {
    const targetBalance = BigNumber.from(Decimal.from(100).hex);
    const balance = await user.getBalance();
    const gasPrice = 0;

    if (balance.eq(targetBalance)) {
      return;
    }

    if (balance.gt(targetBalance)) {
      await user.sendTransaction({
        to: funder.getAddress(),
        value: balance.sub(targetBalance),
        gasPrice
      });
    } else {
      await funder.sendTransaction({
        to: user.getAddress(),
        value: targetBalance.sub(balance),
        gasPrice
      });
    }

    expect(`${await user.getBalance()}`).to.equal(`${targetBalance}`);
  });

  it("should get the price", async () => {
    const price = await zero.getPrice();
    expect(price).to.be.an.instanceOf(Decimal);
  });

  describe("findHintForCollateralRatio", () => {
    it("should pick the closest approx hint", async () => {
      type Resolved<T> = T extends Promise<infer U> ? U : never;
      type ApproxHint = Resolved<ReturnType<HintHelpers["getApproxHint"]>>;

      const fakeHints: ApproxHint[] = [
        { diff: BigNumber.from(3), hintAddress: "alice", latestRandomSeed: BigNumber.from(1111) },
        { diff: BigNumber.from(4), hintAddress: "bob", latestRandomSeed: BigNumber.from(2222) },
        { diff: BigNumber.from(1), hintAddress: "carol", latestRandomSeed: BigNumber.from(3333) },
        { diff: BigNumber.from(2), hintAddress: "dennis", latestRandomSeed: BigNumber.from(4444) }
      ];

      const borrowerOperations = {
        estimateAndPopulate: {
          openLoC: () => ({})
        }
      };

      const hintHelpers = chai.spy.interface({
        getApproxHint: () => Promise.resolve(fakeHints.shift())
      });

      const sortedLoCs = chai.spy.interface({
        findInsertPosition: () => Promise.resolve(["fake insert position"])
      });

      const fakeZero = new PopulatableEthersZero(({
        getNumberOfLoCs: () => Promise.resolve(1000000),
        getFees: () => Promise.resolve(new Fees(0, 0.99, 1, new Date(), new Date(), false)),

        connection: {
          signerOrProvider: user,
          _contracts: {
            borrowerOperations,
            hintHelpers,
            sortedLoCs
          }
        }
      } as unknown) as ReadableEthersZero);

      const nominalCollateralRatio = Decimal.from(0.5);

      const params = LoC.recreate(new LoC(Decimal.from(1), ZUSD_MINIMUM_DEBT));
      const loc = LoC.create(params);
      expect(`${loc._nominalCollateralRatio}`).to.equal(`${nominalCollateralRatio}`);

      await fakeZero.openLoC(params);

      expect(hintHelpers.getApproxHint).to.have.been.called.exactly(4);
      expect(hintHelpers.getApproxHint).to.have.been.called.with(nominalCollateralRatio.hex);

      // returned latestRandomSeed should be passed back on the next call
      expect(hintHelpers.getApproxHint).to.have.been.called.with(BigNumber.from(1111));
      expect(hintHelpers.getApproxHint).to.have.been.called.with(BigNumber.from(2222));
      expect(hintHelpers.getApproxHint).to.have.been.called.with(BigNumber.from(3333));

      expect(sortedLoCs.findInsertPosition).to.have.been.called.once;
      expect(sortedLoCs.findInsertPosition).to.have.been.called.with(
        nominalCollateralRatio.hex,
        "carol"
      );
    });
  });

  describe("LoC", () => {
    it("should have no LoC initially", async () => {
      const loc = await zero.getLoC();
      expect(loc.isEmpty).to.be.true;
    });

    it("should fail to create an undercollateralized LoC", async () => {
      const price = await zero.getPrice();
      const undercollateralized = new LoC(ZUSD_MINIMUM_DEBT.div(price), ZUSD_MINIMUM_DEBT);

      await expect(zero.openLoC(LoC.recreate(undercollateralized))).to.eventually.be.rejected;
    });

    it("should fail to create a LoC with too little debt", async () => {
      const withTooLittleDebt = new LoC(Decimal.from(50), ZUSD_MINIMUM_DEBT.sub(1));

      await expect(zero.openLoC(LoC.recreate(withTooLittleDebt))).to.eventually.be.rejected;
    });

    const withSomeBorrowing = { depositCollateral: 50, borrowZUSD: ZUSD_MINIMUM_NET_DEBT.add(100) };

    it("should create a LoC with some borrowing", async () => {
      const { newLoC, fee } = await zero.openLoC(withSomeBorrowing);
      expect(newLoC).to.deep.equal(LoC.create(withSomeBorrowing));
      expect(`${fee}`).to.equal(`${MINIMUM_BORROWING_RATE.mul(withSomeBorrowing.borrowZUSD)}`);
    });

    it("should fail to withdraw all the collateral while the LoC has debt", async () => {
      const loc = await zero.getLoC();

      await expect(zero.withdrawCollateral(loc.collateral)).to.eventually.be.rejected;
    });

    const repaySomeDebt = { repayZUSD: 10 };

    it("should repay some debt", async () => {
      const { newLoC, fee } = await zero.repayZUSD(repaySomeDebt.repayZUSD);
      expect(newLoC).to.deep.equal(LoC.create(withSomeBorrowing).adjust(repaySomeDebt));
      expect(`${fee}`).to.equal("0");
    });

    const borrowSomeMore = { borrowZUSD: 20 };

    it("should borrow some more", async () => {
      const { newLoC, fee } = await zero.borrowZUSD(borrowSomeMore.borrowZUSD);
      expect(newLoC).to.deep.equal(
        LoC.create(withSomeBorrowing).adjust(repaySomeDebt).adjust(borrowSomeMore)
      );
      expect(`${fee}`).to.equal(`${MINIMUM_BORROWING_RATE.mul(borrowSomeMore.borrowZUSD)}`);
    });

    const depositMoreCollateral = { depositCollateral: 1 };

    it("should deposit more collateral", async () => {
      const { newLoC } = await zero.depositCollateral(depositMoreCollateral.depositCollateral);
      expect(newLoC).to.deep.equal(
        LoC.create(withSomeBorrowing)
          .adjust(repaySomeDebt)
          .adjust(borrowSomeMore)
          .adjust(depositMoreCollateral)
      );
    });

    const repayAndWithdraw = { repayZUSD: 60, withdrawCollateral: 0.5 };

    it("should repay some debt and withdraw some collateral at the same time", async () => {
      const { newLoC } = await zero.adjustLoC(repayAndWithdraw, undefined, { gasPrice: 0 });

      expect(newLoC).to.deep.equal(
        LoC.create(withSomeBorrowing)
          .adjust(repaySomeDebt)
          .adjust(borrowSomeMore)
          .adjust(depositMoreCollateral)
          .adjust(repayAndWithdraw)
      );

      const btcBalance = Decimal.fromBigNumberString(`${await user.getBalance()}`);
      expect(`${btcBalance}`).to.equal("100.5");
    });

    const borrowAndDeposit = { borrowZUSD: 60, depositCollateral: 0.5 };

    it("should borrow more and deposit some collateral at the same time", async () => {
      const { newLoC, fee } = await zero.adjustLoC(borrowAndDeposit, undefined, {
        gasPrice: 0
      });

      expect(newLoC).to.deep.equal(
        LoC.create(withSomeBorrowing)
          .adjust(repaySomeDebt)
          .adjust(borrowSomeMore)
          .adjust(depositMoreCollateral)
          .adjust(repayAndWithdraw)
          .adjust(borrowAndDeposit)
      );

      expect(`${fee}`).to.equal(`${MINIMUM_BORROWING_RATE.mul(borrowAndDeposit.borrowZUSD)}`);

      const btcBalance = Decimal.fromBigNumberString(`${await user.getBalance()}`);
      expect(`${btcBalance}`).to.equal("99.5");
    });

    it("should close the LoC with some ZUSD from another user", async () => {
      const price = await zero.getPrice();
      const initialLoC = await zero.getLoC();
      const zusdBalance = await zero.getZEROBalance();
      const zusdShortage = initialLoC.netDebt.sub(zusdBalance);

      let funderLoC = LoC.create({ depositCollateral: 1, borrowZUSD: zusdShortage });
      funderLoC = funderLoC.setDebt(Decimal.max(funderLoC.debt, ZUSD_MINIMUM_DEBT));
      funderLoC = funderLoC.setCollateral(funderLoC.debt.mulDiv(1.51, price));

      const funderZero = await connectToDeployment(deployment, funder);
      await funderZero.openLoC(LoC.recreate(funderLoC));
      await funderZero.sendZUSD(await user.getAddress(), zusdShortage);

      const { params } = await zero.closeLoC();

      expect(params).to.deep.equal({
        withdrawCollateral: initialLoC.collateral,
        repayZUSD: initialLoC.netDebt
      });

      const finalLoC = await zero.getLoC();
      expect(finalLoC.isEmpty).to.be.true;
    });
  });

  describe("SendableEthersZero", () => {
    it("should parse failed transactions without throwing", async () => {
      // By passing a gasLimit, we avoid automatic use of estimateGas which would throw
      const tx = await zero.send.openLoC(
        { depositCollateral: 0.01, borrowZUSD: 0.01 },
        undefined,
        { gasLimit: 1e6 }
      );
      const { status } = await tx.waitForReceipt();

      expect(status).to.equal("failed");
    });
  });

  describe("Frontend", () => {
    it("should have no frontend initially", async () => {
      const frontend = await zero.getFrontendStatus(await user.getAddress());

      assertStrictEqual(frontend.status, "unregistered" as const);
    });

    it("should register a frontend", async () => {
      await zero.registerFrontend(0.75);
    });

    it("should have a frontend now", async () => {
      const frontend = await zero.getFrontendStatus(await user.getAddress());

      assertStrictEqual(frontend.status, "registered" as const);
      expect(`${frontend.kickbackRate}`).to.equal("0.75");
    });

    it("other user's deposit should be tagged with the frontend's address", async () => {
      const frontendTag = await user.getAddress();

      await funder.sendTransaction({
        to: otherUsers[0].getAddress(),
        value: Decimal.from(20.1).hex
      });

      const otherZero = await connectToDeployment(deployment, otherUsers[0], frontendTag);
      await otherZero.openLoC({ depositCollateral: 20, borrowZUSD: ZUSD_MINIMUM_DEBT });

      if (deployment.presaleAddress) {
        const presale = new ethers.Contract(
          deployment.presaleAddress,
          mockBalanceRedirectPresaleAbi,
          provider
        );
        await presale.connect(deployer).closePresale();
      }
      await otherZero.depositZUSDInStabilityPool(ZUSD_MINIMUM_DEBT);

      const deposit = await otherZero.getStabilityDeposit();
      expect(deposit.frontendTag).to.equal(frontendTag);
    });
  });

  describe("StabilityPool", () => {
    before(async () => {
      deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);

      [deployerZero, zero, ...otherLiquities] = await connectUsers([
        deployer,
        user,
        ...otherUsers.slice(0, 1)
      ]);

      await funder.sendTransaction({
        to: otherUsers[0].getAddress(),
        value: ZUSD_MINIMUM_DEBT.div(170).hex
      });
    });

    const initialLoCOfDepositor = LoC.create({
      depositCollateral: ZUSD_MINIMUM_DEBT.div(100),
      borrowZUSD: ZUSD_MINIMUM_NET_DEBT
    });

    const smallStabilityDeposit = Decimal.from(10);

    it("should fail if Zero presale is open", async () => {
      await expect(zero.depositZUSDInStabilityPool(smallStabilityDeposit)).to.eventually.be
        .rejected;
    });

    it("should make a small stability deposit", async () => {
      const { newLoC } = await zero.openLoC(LoC.recreate(initialLoCOfDepositor));
      expect(newLoC).to.deep.equal(initialLoCOfDepositor);

      if (deployment.presaleAddress) {
        const presale = new ethers.Contract(
          deployment.presaleAddress,
          mockBalanceRedirectPresaleAbi,
          provider
        );
        await presale.connect(deployer).closePresale();
      }

      const details = await zero.depositZUSDInStabilityPool(smallStabilityDeposit);

      expect(details).to.deep.equal({
        zusdLoss: Decimal.from(0),
        newZUSDDeposit: smallStabilityDeposit,
        collateralGain: Decimal.from(0),
        zeroReward: Decimal.from(0),

        change: {
          depositZUSD: smallStabilityDeposit
        }
      });
    });

    const locWithVeryLowICR = LoC.create({
      depositCollateral: ZUSD_MINIMUM_DEBT.div(180),
      borrowZUSD: ZUSD_MINIMUM_NET_DEBT
    });

    it("other user should make a LoC with very low ICR", async () => {
      const { newLoC } = await otherLiquities[0].openLoC(LoC.recreate(locWithVeryLowICR));

      const price = await zero.getPrice();
      expect(Number(`${newLoC.collateralRatio(price)}`)).to.be.below(1.15);
    });

    const dippedPrice = Decimal.from(190);

    it("the price should take a dip", async () => {
      await deployerZero.setPrice(dippedPrice);

      const price = await zero.getPrice();
      expect(`${price}`).to.equal(`${dippedPrice}`);
    });

    it("should liquidate other user's LoC", async () => {
      const details = await zero.liquidateUpTo(1);

      expect(details).to.deep.equal({
        liquidatedAddresses: [await otherUsers[0].getAddress()],

        collateralGasCompensation: locWithVeryLowICR.collateral.mul(0.005), // 0.5%
        zusdGasCompensation: ZUSD_LIQUIDATION_RESERVE,

        totalLiquidated: new LoC(
          locWithVeryLowICR.collateral
            .mul(0.995) // -0.5% gas compensation
            .add("0.000000000000000001"), // tiny imprecision
          locWithVeryLowICR.debt
        )
      });

      const otherLoC = await otherLiquities[0].getLoC();
      expect(otherLoC.isEmpty).to.be.true;
    });

    it("should have a depleted stability deposit and some collateral gain", async () => {
      const stabilityDeposit = await zero.getStabilityDeposit();

      expect(stabilityDeposit).to.deep.equal(
        new StabilityDeposit(
          smallStabilityDeposit,
          Decimal.ZERO,
          locWithVeryLowICR.collateral
            .mul(0.995) // -0.5% gas compensation
            .mulDiv(smallStabilityDeposit, locWithVeryLowICR.debt)
            .sub("0.000000000000000005"), // tiny imprecision
          Decimal.ZERO,
          AddressZero
        )
      );
    });

    it("the LoC should have received some liquidation shares", async () => {
      const loc = await zero.getLoC();

      expect(loc).to.deep.equal({
        ownerAddress: await user.getAddress(),
        status: "open",

        ...initialLoCOfDepositor
          .addDebt(locWithVeryLowICR.debt.sub(smallStabilityDeposit))
          .addCollateral(
            locWithVeryLowICR.collateral
              .mul(0.995) // -0.5% gas compensation
              .mulDiv(locWithVeryLowICR.debt.sub(smallStabilityDeposit), locWithVeryLowICR.debt)
              .add("0.000000000000000001") // tiny imprecision
          )
      });
    });

    it("total should equal the LoC", async () => {
      const loc = await zero.getLoC();

      const numberOfLoCs = await zero.getNumberOfLoCs();
      expect(numberOfLoCs).to.equal(1);

      const total = await zero.getTotal();
      expect(total).to.deep.equal(
        loc.addCollateral("0.000000000000000001") // tiny imprecision
      );
    });

    it("should transfer the gains to the LoC", async () => {
      const details = await zero.transferCollateralGainToLoC();

      expect(details).to.deep.equal({
        zusdLoss: smallStabilityDeposit,
        newZUSDDeposit: Decimal.ZERO,
        zeroReward: Decimal.ZERO,

        collateralGain: locWithVeryLowICR.collateral
          .mul(0.995) // -0.5% gas compensation
          .mulDiv(smallStabilityDeposit, locWithVeryLowICR.debt)
          .sub("0.000000000000000005"), // tiny imprecision

        newLoC: initialLoCOfDepositor
          .addDebt(locWithVeryLowICR.debt.sub(smallStabilityDeposit))
          .addCollateral(
            locWithVeryLowICR.collateral
              .mul(0.995) // -0.5% gas compensation
              .sub("0.000000000000000005") // tiny imprecision
          )
      });

      const stabilityDeposit = await zero.getStabilityDeposit();
      expect(stabilityDeposit.isEmpty).to.be.true;
    });

    describe("when people overstay", () => {
      before(async () => {
        // Deploy new instances of the contracts, for a clean slate
        deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);

        const otherUsersSubset = otherUsers.slice(0, 5);
        [deployerZero, zero, ...otherLiquities] = await connectUsers([
          deployer,
          user,
          ...otherUsersSubset
        ]);

        if (deployment.presaleAddress) {
          const presale = new ethers.Contract(
            deployment.presaleAddress,
            mockBalanceRedirectPresaleAbi,
            provider
          );
          await presale.connect(deployer).closePresale();
        }
        await sendToEach(otherUsersSubset, 21.1);

        let price = Decimal.from(200);
        await deployerZero.setPrice(price);

        // Use this account to print ZUSD
        await zero.openLoC({ depositCollateral: 50, borrowZUSD: 5000 });

        // otherLiquities[0-2] will be independent stability depositors
        await zero.sendZUSD(await otherUsers[0].getAddress(), 3000);
        await zero.sendZUSD(await otherUsers[1].getAddress(), 1000);
        await zero.sendZUSD(await otherUsers[2].getAddress(), 1000);

        // otherLiquities[3-4] will be LoC owners whose LoCs get liquidated
        await otherLiquities[3].openLoC({ depositCollateral: 21, borrowZUSD: 2900 });
        await otherLiquities[4].openLoC({ depositCollateral: 21, borrowZUSD: 2900 });

        await otherLiquities[0].depositZUSDInStabilityPool(3000);
        await otherLiquities[1].depositZUSDInStabilityPool(1000);
        // otherLiquities[2] doesn't deposit yet

        // Tank the price so we can liquidate
        price = Decimal.from(150);
        await deployerZero.setPrice(price);

        // Liquidate first victim
        await zero.liquidate(await otherUsers[3].getAddress());
        expect((await otherLiquities[3].getLoC()).isEmpty).to.be.true;

        // Now otherLiquities[2] makes their deposit too
        await otherLiquities[2].depositZUSDInStabilityPool(1000);

        // Liquidate second victim
        await zero.liquidate(await otherUsers[4].getAddress());
        expect((await otherLiquities[4].getLoC()).isEmpty).to.be.true;

        // Stability Pool is now empty
        expect(`${await zero.getZUSDInStabilityPool()}`).to.equal("0");
      });

      it("should still be able to withdraw remaining deposit", async () => {
        for (const l of [otherLiquities[0], otherLiquities[1], otherLiquities[2]]) {
          const stabilityDeposit = await l.getStabilityDeposit();
          await l.withdrawZUSDFromStabilityPool(stabilityDeposit.currentZUSD);
        }
      });
    });
  });

  describe("Redemption", () => {
    const locCreations = [
      { depositCollateral: 99, borrowZUSD: 4600 },
      { depositCollateral: 20, borrowZUSD: 2000 }, // net debt: 2010
      { depositCollateral: 20, borrowZUSD: 2100 }, // net debt: 2110.5
      { depositCollateral: 20, borrowZUSD: 2200 } //  net debt: 2211
    ];

    before(async function () {
      if (network.name !== "hardhat") {
        // Redemptions are only allowed after a bootstrap phase of 2 weeks.
        // Since fast-forwarding only works on Hardhat EVM, skip these tests elsewhere.
        this.skip();
      }

      // Deploy new instances of the contracts, for a clean slate
      deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);

      const otherUsersSubset = otherUsers.slice(0, 3);
      [deployerZero, zero, ...otherLiquities] = await connectUsers([
        deployer,
        user,
        ...otherUsersSubset
      ]);

      await sendToEach(otherUsersSubset, 20.1);
    });

    it("should fail to redeem during the bootstrap phase", async () => {
      await zero.openLoC(locCreations[0]);
      await otherLiquities[0].openLoC(locCreations[1]);
      await otherLiquities[1].openLoC(locCreations[2]);
      await otherLiquities[2].openLoC(locCreations[3]);

      await expect(zero.redeemZUSD(4326.5, undefined, { gasPrice: 0 })).to.eventually.be.rejected;
    });

    const someZUSD = Decimal.from(4326.5);

    it("should redeem some ZUSD after the bootstrap phase", async () => {
      // Fast-forward 15 days
      increaseTime(60 * 60 * 24 * 15);

      expect(`${await otherLiquities[0].getCollateralSurplusBalance()}`).to.equal("0");
      expect(`${await otherLiquities[1].getCollateralSurplusBalance()}`).to.equal("0");
      expect(`${await otherLiquities[2].getCollateralSurplusBalance()}`).to.equal("0");

      const expectedTotal = locCreations
        .map(params => LoC.create(params))
        .reduce((a, b) => a.add(b));

      const total = await zero.getTotal();
      expect(total).to.deep.equal(expectedTotal);

      const expectedDetails = {
        attemptedZUSDAmount: someZUSD,
        actualZUSDAmount: someZUSD,
        collateralTaken: someZUSD.div(200),
        fee: new Fees(0, 0.99, 2, new Date(), new Date(), false)
          .redemptionRate(someZUSD.div(total.debt))
          .mul(someZUSD.div(200))
      };

      const details = await zero.redeemZUSD(someZUSD, undefined, { gasPrice: 0 });
      expect(details).to.deep.equal(expectedDetails);

      const balance = Decimal.fromBigNumberString(`${await provider.getBalance(user.getAddress())}`);
      expect(`${balance}`).to.equal(
        `${expectedDetails.collateralTaken.sub(expectedDetails.fee).add(100)}`
      );

      expect(`${await zero.getZUSDBalance()}`).to.equal("273.5");

      expect(`${(await otherLiquities[0].getLoC()).debt}`).to.equal(
        `${LoC.create(locCreations[1]).debt.sub(
          someZUSD
            .sub(LoC.create(locCreations[2]).netDebt)
            .sub(LoC.create(locCreations[3]).netDebt)
        )}`
      );

      expect((await otherLiquities[1].getLoC()).isEmpty).to.be.true;
      expect((await otherLiquities[2].getLoC()).isEmpty).to.be.true;
    });

    it("should claim the collateral surplus after redemption", async () => {
      const balanceBefore1 = await provider.getBalance(otherUsers[1].getAddress());
      const balanceBefore2 = await provider.getBalance(otherUsers[2].getAddress());

      expect(`${await otherLiquities[0].getCollateralSurplusBalance()}`).to.equal("0");

      const surplus1 = await otherLiquities[1].getCollateralSurplusBalance();
      const loc1 = LoC.create(locCreations[2]);
      expect(`${surplus1}`).to.equal(`${loc1.collateral.sub(loc1.netDebt.div(200))}`);

      const surplus2 = await otherLiquities[2].getCollateralSurplusBalance();
      const loc2 = LoC.create(locCreations[3]);
      expect(`${surplus2}`).to.equal(`${loc2.collateral.sub(loc2.netDebt.div(200))}`);

      await otherLiquities[1].claimCollateralSurplus({ gasPrice: 0 });
      await otherLiquities[2].claimCollateralSurplus({ gasPrice: 0 });

      expect(`${await otherLiquities[0].getCollateralSurplusBalance()}`).to.equal("0");
      expect(`${await otherLiquities[1].getCollateralSurplusBalance()}`).to.equal("0");
      expect(`${await otherLiquities[2].getCollateralSurplusBalance()}`).to.equal("0");

      const balanceAfter1 = await provider.getBalance(otherUsers[1].getAddress());
      const balanceAfter2 = await provider.getBalance(otherUsers[2].getAddress());
      expect(`${balanceAfter1}`).to.equal(`${balanceBefore1.add(surplus1.hex)}`);
      expect(`${balanceAfter2}`).to.equal(`${balanceBefore2.add(surplus2.hex)}`);
    });

    it("borrowing rate should be maxed out now", async () => {
      const borrowZUSD = Decimal.from(10);

      const { fee, newLoC } = await zero.borrowZUSD(borrowZUSD);
      expect(`${fee}`).to.equal(`${borrowZUSD.mul(MAXIMUM_BORROWING_RATE)}`);

      expect(newLoC).to.deep.equal(
        LoC.create(locCreations[0]).adjust({ borrowZUSD }, MAXIMUM_BORROWING_RATE)
      );
    });
  });

  describe("Redemption (truncation)", () => {
    const locCreationParams = { depositCollateral: 20, borrowZUSD: 2000 };
    const netDebtPerLoC = LoC.create(locCreationParams).netDebt;
    const amountToAttempt = Decimal.from(3900);
    const expectedRedeemable = netDebtPerLoC.mul(2).sub(ZUSD_MINIMUM_NET_DEBT);

    before(function () {
      if (network.name !== "hardhat") {
        // Redemptions are only allowed after a bootstrap phase of 2 weeks.
        // Since fast-forwarding only works on Hardhat EVM, skip these tests elsewhere.
        this.skip();
      }
    });

    beforeEach(async function () {
      this.timeout("1m");
      // Deploy new instances of the contracts, for a clean slate
      deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);

      const otherUsersSubset = otherUsers.slice(0, 3);
      [deployerZero, zero, ...otherLiquities] = await connectUsers([
        deployer,
        user,
        ...otherUsersSubset
      ]);

      await sendToEach(otherUsersSubset, 20.1);

      await zero.openLoC({ depositCollateral: 99, borrowZUSD: 5000 });
      await otherLiquities[0].openLoC(locCreationParams);
      await otherLiquities[1].openLoC(locCreationParams);
      await otherLiquities[2].openLoC(locCreationParams);

      increaseTime(60 * 60 * 24 * 15);
    });

    it("should truncate the amount if it would put the last LoC below the min debt", async () => {
      const redemption = await zero.populate.redeemZUSD(amountToAttempt);
      expect(`${redemption.attemptedZUSDAmount}`).to.equal(`${amountToAttempt}`);
      expect(`${redemption.redeemableZUSDAmount}`).to.equal(`${expectedRedeemable}`);
      expect(redemption.isTruncated).to.be.true;

      const { details } = await waitForSuccess(redemption.send());
      expect(`${details.attemptedZUSDAmount}`).to.equal(`${expectedRedeemable}`);
      expect(`${details.actualZUSDAmount}`).to.equal(`${expectedRedeemable}`);
    });

    it("should increase the amount to the next lowest redeemable value", async () => {
      const increasedRedeemable = expectedRedeemable.add(ZUSD_MINIMUM_NET_DEBT);

      const initialRedemption = await zero.populate.redeemZUSD(amountToAttempt);
      const increasedRedemption = await initialRedemption.increaseAmountByMinimumNetDebt();
      expect(`${increasedRedemption.attemptedZUSDAmount}`).to.equal(`${increasedRedeemable}`);
      expect(`${increasedRedemption.redeemableZUSDAmount}`).to.equal(`${increasedRedeemable}`);
      expect(increasedRedemption.isTruncated).to.be.false;

      const { details } = await waitForSuccess(increasedRedemption.send());
      expect(`${details.attemptedZUSDAmount}`).to.equal(`${increasedRedeemable}`);
      expect(`${details.actualZUSDAmount}`).to.equal(`${increasedRedeemable}`);
    });

    it("should fail to increase the amount if it's not truncated", async () => {
      const redemption = await zero.populate.redeemZUSD(netDebtPerLoC);
      expect(redemption.isTruncated).to.be.false;

      expect(() => redemption.increaseAmountByMinimumNetDebt()).to.throw(
        "can only be called when amount is truncated"
      );
    });
  });

  describe("Redemption (gas checks)", function () {
    this.timeout("10m");

    const massivePrice = Decimal.from(1000000);

    const amountToBorrowPerLoC = Decimal.from(2000);
    const netDebtPerLoC = MINIMUM_BORROWING_RATE.add(1).mul(amountToBorrowPerLoC);
    const collateralPerLoC = netDebtPerLoC
      .add(ZUSD_LIQUIDATION_RESERVE)
      .mulDiv(1.5, massivePrice);

    const amountToRedeem = netDebtPerLoC.mul(_redeemMaxIterations);
    const amountToDeposit = MINIMUM_BORROWING_RATE.add(1)
      .mul(amountToRedeem)
      .add(ZUSD_LIQUIDATION_RESERVE)
      .mulDiv(2, massivePrice);

    before(async function () {
      if (network.name !== "hardhat") {
        // Redemptions are only allowed after a bootstrap phase of 2 weeks.
        // Since fast-forwarding only works on Hardhat EVM, skip these tests elsewhere.
        this.skip();
      }

      // Deploy new instances of the contracts, for a clean slate
      deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);
      const otherUsersSubset = otherUsers.slice(0, _redeemMaxIterations);
      expect(otherUsersSubset).to.have.length(_redeemMaxIterations);

      [deployerZero, zero, ...otherLiquities] = await connectUsers([
        deployer,
        user,
        ...otherUsersSubset
      ]);

      await deployerZero.setPrice(massivePrice);
      await sendToEach(otherUsersSubset, collateralPerLoC);

      for (const otherZero of otherLiquities) {
        await otherZero.openLoC(
          {
            depositCollateral: collateralPerLoC,
            borrowZUSD: amountToBorrowPerLoC
          },
          undefined,
          { gasPrice: 0 }
        );
      }

      increaseTime(60 * 60 * 24 * 15);
    });

    it("should redeem using the maximum iterations and almost all gas", async () => {
      await zero.openLoC({
        depositCollateral: amountToDeposit,
        borrowZUSD: amountToRedeem
      });

      const { rawReceipt } = await waitForSuccess(zero.send.redeemZUSD(amountToRedeem));

      const gasUsed = rawReceipt.gasUsed.toNumber();
      // gasUsed is ~half the real used amount because of how refunds work, see:
      // https://ethereum.stackexchange.com/a/859/9205
      expect(gasUsed).to.be.at.least(4900000, "should use close to 10M gas");
    });
  });

  describe("Gas estimation", () => {
    const locWithICRBetween = (a: LoC, b: LoC) => a.add(b).multiply(0.5);

    let rudeUser: Signer;
    let fiveOtherUsers: Signer[];
    let rudeZero: EthersZero;

    before(async function () {
      this.timeout("10m");
      if (network.name !== "hardhat") {
        this.skip();
      }
      this.timeout("1m");

      deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);

      [rudeUser, ...fiveOtherUsers] = otherUsers.slice(0, 6);

      [deployerZero, zero, rudeZero, ...otherLiquities] = await connectUsers([
        deployer,
        user,
        rudeUser,
        ...fiveOtherUsers
      ]);

      await openLoCs(fiveOtherUsers, [
        { depositCollateral: 20, borrowZUSD: 2040 },
        { depositCollateral: 20, borrowZUSD: 2050 },
        { depositCollateral: 20, borrowZUSD: 2060 },
        { depositCollateral: 20, borrowZUSD: 2070 },
        { depositCollateral: 20, borrowZUSD: 2080 }
      ]);

      increaseTime(60 * 60 * 24 * 15);
    });

    it("should include enough gas for updating lastFeeOperationTime", async () => {
      await zero.openLoC({ depositCollateral: 20, borrowZUSD: 2090 });

      // We just updated lastFeeOperationTime, so this won't anticipate having to update that
      // during estimateGas
      const tx = await zero.populate.redeemZUSD(1);
      const originalGasEstimate = await provider.estimateGas(tx.rawPopulatedTransaction);

      // Fast-forward 2 minutes.
      await increaseTime(120);

      // Required gas has just went up.
      const newGasEstimate = await provider.estimateGas(tx.rawPopulatedTransaction);
      const gasIncrease = newGasEstimate.sub(originalGasEstimate).toNumber();
      expect(gasIncrease).to.be.within(5000, 10000);

      // This will now have to update lastFeeOperationTime
      await waitForSuccess(tx.send());

      // Decay base-rate back to 0
      await increaseTime(100000000);
    });

    it("should include enough gas for one extra traversal", async () => {
      const locs = await zero.getLoCs({ first: 10, sortedBy: "ascendingCollateralRatio" });

      const loc = await zero.getLoC();
      const newLoC = locWithICRBetween(locs[3], locs[4]);

      // First, we want to test a non-borrowing case, to make sure we're not passing due to any
      // extra gas we add to cover a potential lastFeeOperationTime update
      const adjustment = loc.adjustTo(newLoC);
      expect(adjustment.borrowZUSD).to.be.undefined;

      const tx = await zero.populate.adjustLoC(adjustment);
      const originalGasEstimate = await provider.estimateGas(tx.rawPopulatedTransaction);

      // A terribly rude user interferes
      const rudeLoC = newLoC.addDebt(1);
      const rudeCreation = LoC.recreate(rudeLoC);
      await openLoCs([rudeUser], [rudeCreation]);

      const newGasEstimate = await provider.estimateGas(tx.rawPopulatedTransaction);
      const gasIncrease = newGasEstimate.sub(originalGasEstimate).toNumber();

      await waitForSuccess(tx.send());
      expect(gasIncrease).to.be.within(10000, 30000);

      assertDefined(rudeCreation.borrowZUSD);
      const zusdShortage = rudeLoC.debt.sub(rudeCreation.borrowZUSD);

      await zero.sendZUSD(await rudeUser.getAddress(), zusdShortage);
      await rudeZero.closeLoC({ gasPrice: 0 });
    });

    it("should include enough gas for both when borrowing", async () => {
      const locs = await zero.getLoCs({ first: 10, sortedBy: "ascendingCollateralRatio" });

      const loc = await zero.getLoC();
      const newLoC = locWithICRBetween(locs[1], locs[2]);

      // Make sure we're borrowing
      const adjustment = loc.adjustTo(newLoC);
      expect(adjustment.borrowZUSD).to.not.be.undefined;

      const tx = await zero.populate.adjustLoC(adjustment);
      const originalGasEstimate = await provider.estimateGas(tx.rawPopulatedTransaction);

      // A terribly rude user interferes again
      await openLoCs([rudeUser], [LoC.recreate(newLoC.addDebt(1))]);

      // On top of that, we'll need to update lastFeeOperationTime
      await increaseTime(120);

      const newGasEstimate = await provider.estimateGas(tx.rawPopulatedTransaction);
      const gasIncrease = newGasEstimate.sub(originalGasEstimate).toNumber();

      await waitForSuccess(tx.send());
      expect(gasIncrease).to.be.within(15000, 35000);
    });
  });

  describe("Gas estimation (ZERO issuance)", () => {
    const estimate = (tx: PopulatedEthersZeroTransaction) =>
      provider.estimateGas(tx.rawPopulatedTransaction);

    before(async function () {
      if (network.name !== "hardhat") {
        this.skip();
      }

      deployment = await deployZero(deployer,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,true);
      [deployerZero, zero] = await connectUsers([deployer, user]);
    });

    it("should include enough gas for issuing ZERO", async function () {
      this.timeout("2m");

      if (deployment.presaleAddress) {
        const presale = new ethers.Contract(
          deployment.presaleAddress,
          mockBalanceRedirectPresaleAbi,
          provider
        );
        await presale.connect(deployer).closePresale();
      }

      await zero.openLoC({ depositCollateral: 40, borrowZUSD: 4000 });
      await zero.depositZUSDInStabilityPool(19);

      await increaseTime(60);

      // This will issue ZERO for the first time ever. That uses a whole lotta gas, and we don't
      // want to pack any extra gas to prepare for this case specifically, because it only happens
      // once.
      await zero.withdrawGainsFromStabilityPool();

      const claim = await zero.populate.withdrawGainsFromStabilityPool();
      const deposit = await zero.populate.depositZUSDInStabilityPool(1);
      const withdraw = await zero.populate.withdrawZUSDFromStabilityPool(1);

      for (let i = 0; i < 5; ++i) {
        for (const tx of [claim, deposit, withdraw]) {
          const gasLimit = tx.rawPopulatedTransaction.gasLimit?.toNumber();
          const requiredGas = (await estimate(tx)).toNumber();

          assertDefined(gasLimit);
          expect(requiredGas).to.be.at.most(gasLimit);
        }

        await increaseTime(60);
      }

      await waitForSuccess(claim.send());

      const creation = LoC.recreate(new LoC(Decimal.from(11.1), Decimal.from(2000.1)));

      await deployerZero.openLoC(creation);
      await deployerZero.depositZUSDInStabilityPool(creation.borrowZUSD);
      await deployerZero.setPrice(198);

      const liquidateTarget = await zero.populate.liquidate(await deployer.getAddress());
      const liquidateMultiple = await zero.populate.liquidateUpTo(40);

      for (let i = 0; i < 5; ++i) {
        for (const tx of [liquidateTarget, liquidateMultiple]) {
          const gasLimit = tx.rawPopulatedTransaction.gasLimit?.toNumber();
          const requiredGas = (await estimate(tx)).toNumber();

          assertDefined(gasLimit);
          expect(requiredGas).to.be.at.most(gasLimit);
        }

        await increaseTime(60);
      }

      await waitForSuccess(liquidateMultiple.send());
    });
  });
});
