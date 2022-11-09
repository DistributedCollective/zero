import yargs from "yargs";
import fs from "fs";
import dotenv from "dotenv";
import "colors";

import { Wallet } from "@ethersproject/wallet";
import { JsonRpcProvider } from "@ethersproject/providers";

import {
  Decimal,
  Difference,
  ZUSD_LIQUIDATION_RESERVE,
  Trove,
  TroveWithPendingRedistribution
} from "@sovryn-zero/lib-base";

import { EthersZero as Zero } from "@sovryn-zero/lib-ethers";

import {
  checkPoolBalances,
  checkSubgraph,
  checkTroveOrdering,
  connectUsers,
  createRandomWallets,
  dumpTroves,
  getListOfTrovesBeforeRedistribution,
  shortenAddress
} from "./utils";

import { Fixture } from "./Fixture";

dotenv.config();

const provider = new JsonRpcProvider("http://localhost:8545");

const deployer = process.env.DEPLOYER_PRIVATE_KEY
  ? new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider)
  : Wallet.createRandom().connect(provider);

const funder = new Wallet(
  "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7",
  provider
);

yargs
  .scriptName("yarn fuzzer")

  .command(
    "warzone",
    "Create lots of Troves.",
    {
      troves: {
        alias: "n",
        default: 1000,
        description: "Number of troves to create"
      }
    },
    async ({ troves }) => {
      const deployerZero = await Zero.connect(deployer);

      const price = await deployerZero.getPrice();

      for (let i = 1; i <= troves; ++i) {
        const user = Wallet.createRandom().connect(provider);
        const userAddress = await user.getAddress();
        const debt = ZUSD_LIQUIDATION_RESERVE.add(99999 * Math.random());
        const collateral = debt.mul(price).mul(1.11 + 3 * Math.random());

        const zero = await Zero.connect(user);

        await funder.sendTransaction({
          to: userAddress,
          value: Decimal.from(collateral).hex
        });

        const fees = await zero.getFees();
        await zero.openTrove(Trove.recreate(new Trove(collateral, debt), fees.borrowingRate()), {
          gasPrice: 0
        });

        if (i % 4 === 0) {
          const zusdBalance = await zero.getZUSDBalance();
          await zero.depositZUSDInStabilityPool(zusdBalance);
        }

        if (i % 10 === 0) {
          console.log(`Created ${i} Troves.`);
        }

        //await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }
  )

  .command(
    "chaos",
    "Try to break Zero by randomly interacting with it.",
    {
      users: {
        alias: "u",
        default: 40,
        description: "Number of users to spawn"
      },
      rounds: {
        alias: "n",
        default: 25,
        description: "How many times each user should interact with Zero"
      }
    },
    async ({ rounds: numberOfRounds, users: numberOfUsers }) => {
      const [frontend, ...randomUsers] = createRandomWallets(numberOfUsers + 1, provider);

      const [
        deployerZero,
        funderZero,
        frontendZero,
        ...randomLiquities
      ] = await connectUsers([deployer, funder, frontend, ...randomUsers]);

      const fixture = await Fixture.setup(
        deployerZero,
        funder,
        funderZero,
        frontend.address,
        frontendZero
      );

      let previousListOfTroves: [string, TroveWithPendingRedistribution][] | undefined = undefined;

      console.log();
      console.log("// Keys");
      console.log(`[frontend]: ${frontend.privateKey}`);
      randomUsers.forEach(user =>
        console.log(`[${shortenAddress(user.address)}]: ${user.privateKey}`)
      );

      for (let i = 1; i <= numberOfRounds; ++i) {
        console.log();
        console.log(`// Round #${i}`);

        const price = await fixture.setRandomPrice();
        await fixture.liquidateRandomNumberOfTroves(price);

        for (let i = 0; i < randomUsers.length; ++i) {
          const user = randomUsers[i];
          const zero = randomLiquities[i];

          const x = Math.random();

          if (x < 0.5) {
            const trove = await zero.getTrove();

            if (trove.isEmpty) {
              await fixture.openRandomTrove(user.address, zero);
            } else {
              if (x < 0.4) {
                await fixture.randomlyAdjustTrove(user.address, zero, trove);
              } else {
                await fixture.closeTrove(user.address, zero, trove);
              }
            }
          } else if (x < 0.7) {
            const deposit = await zero.getStabilityDeposit();

            if (deposit.initialZUSD.isZero || x < 0.6) {
              await fixture.depositRandomAmountInStabilityPool(user.address, zero);
            } else {
              await fixture.withdrawRandomAmountFromStabilityPool(user.address, zero, deposit);
            }
          } else if (x < 0.9) {
            const stake = await zero.getZEROStake();

            if (stake.stakedZERO.isZero || x < 0.8) {
              await fixture.stakeRandomAmount(user.address, zero);
            } else {
              await fixture.unstakeRandomAmount(user.address, zero, stake);
            }
          } else {
            await fixture.redeemRandomAmount(user.address, zero);
          }

          // await fixture.sweepZUSD(zero);
          await fixture.sweepZERO(zero);

          const listOfTroves = await getListOfTrovesBeforeRedistribution(deployerZero);
          const totalRedistributed = await deployerZero.getTotalRedistributed();

          checkTroveOrdering(listOfTroves, totalRedistributed, price, previousListOfTroves);
          await checkPoolBalances(deployerZero, listOfTroves, totalRedistributed);

          previousListOfTroves = listOfTroves;
        }
      }

      fs.appendFileSync("chaos.csv", fixture.summarizeGasStats());
    }
  )

  .command(
    "order",
    "End chaos and restore order by liquidating every Trove except the Funder's.",
    {},
    async () => {
      const [deployerZero, funderZero] = await connectUsers([deployer, funder]);

      const initialPrice = await deployerZero.getPrice();
      let initialNumberOfTroves = await funderZero.getNumberOfTroves();

      let [[firstTroveOwner]] = await funderZero.getTroves({
        first: 1,
        sortedBy: "descendingCollateralRatio"
      });

      if (firstTroveOwner !== funder.address) {
        let trove = await funderZero.getTrove();

        if (trove.isEmpty) {
          await funderZero.openTrove({ depositCollateral: 1000 });
          trove = await funderZero.getTrove();
        }

        const zusdBalance = await funderZero.getZUSDBalance();

        if (zusdBalance.lt(trove.netDebt)) {
          const [randomUser] = createRandomWallets(1, provider);
          const randomZero = await Zero.connect(randomUser);

          const zusdNeeded = trove.netDebt.sub(zusdBalance);
          const tempTrove = {
            depositCollateral: ZUSD_LIQUIDATION_RESERVE.add(zusdNeeded).div(initialPrice).mul(3),
            borrowZUSD: zusdNeeded
          };

          await funder.sendTransaction({
            to: randomUser.address,
            value: tempTrove.depositCollateral.hex
          });

          await randomZero.openTrove(tempTrove, { gasPrice: 0 });
          initialNumberOfTroves++;
          await randomZero.sendZUSD(funder.address, zusdNeeded, { gasPrice: 0 });
        }

        await funderZero.repayZUSD(trove.netDebt);
      }

      [[firstTroveOwner]] = await funderZero.getTroves({
        first: 1,
        sortedBy: "descendingCollateralRatio"
      });

      if (firstTroveOwner !== funder.address) {
        throw new Error("didn't manage to hoist Funder's Trove to head of SortedTroves");
      }

      await deployerZero.setPrice(0.001);

      let numberOfTroves: number;
      while ((numberOfTroves = await funderZero.getNumberOfTroves()) > 1) {
        const numberOfTrovesToLiquidate = numberOfTroves > 10 ? 10 : numberOfTroves - 1;

        console.log(`${numberOfTroves} Troves left.`);
        await funderZero.liquidateUpTo(numberOfTrovesToLiquidate);
      }

      await deployerZero.setPrice(initialPrice);

      if ((await funderZero.getNumberOfTroves()) !== 1) {
        throw new Error("didn't manage to liquidate every Trove");
      }

      const funderTrove = await funderZero.getTrove();
      const total = await funderZero.getTotal();

      const collateralDifference = Difference.between(total.collateral, funderTrove.collateral);
      const debtDifference = Difference.between(total.debt, funderTrove.debt);

      console.log();
      console.log("Discrepancies:");
      console.log(`Collateral: ${collateralDifference}`);
      console.log(`Debt: ${debtDifference}`);
    }
  )

  .command("check-sorting", "Check if Troves are sorted by ICR.", {}, async () => {
    const deployerZero = await Zero.connect(deployer);
    const listOfTroves = await getListOfTrovesBeforeRedistribution(deployerZero);
    const totalRedistributed = await deployerZero.getTotalRedistributed();
    const price = await deployerZero.getPrice();

    checkTroveOrdering(listOfTroves, totalRedistributed, price);

    console.log("All Troves are sorted.");
  })

  .command("check-subgraph", "Check that subgraph data matches layer 1.", {}, async () => {
    const deployerZero = await Zero.connect(deployer);

    await checkSubgraph(subgraph, deployerZero);

    console.log("Subgraph looks fine.");
  })

  .command("dump-troves", "Dump list of Troves.", {}, async () => {
    const deployerZero = await Zero.connect(deployer);
    const listOfTroves = await getListOfTrovesBeforeRedistribution(deployerZero);
    const totalRedistributed = await deployerZero.getTotalRedistributed();
    const price = await deployerZero.getPrice();

    dumpTroves(listOfTroves, totalRedistributed, price);
  })

  .demandCommand()
  .wrap(null)
  .parse();
