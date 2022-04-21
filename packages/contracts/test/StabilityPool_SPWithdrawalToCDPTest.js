const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');
const TroveManagerTester = artifacts.require("./TroveManagerTester.sol")

const { dec, toBN } = testHelpers.TestHelper
const th = testHelpers.TestHelper

contract('StabilityPool - Withdrawal of stability deposit - Reward calculations', async accounts => {

  const [owner,
    defaulter_1,
    defaulter_2,
    defaulter_3,
    defaulter_4,
    defaulter_5,
    defaulter_6,
    whale,
    // whale_2,
    alice,
    bob,
    carol,
    dennis,
    erin,
    flyn,
    graham,
    harriet,
    A,
    B,
    C,
    D,
    E,
    F,
    sovFeeCollector
  ] = accounts;

  const multisig = accounts[999];

  let contracts

  let priceFeed
  let zusdToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let defaultPool
  let borrowerOperations

  let gasPriceInWei

  const ZERO_ADDRESS = th.ZERO_ADDRESS

  const getOpenTroveZUSDAmount = async (totalDebt) => th.getOpenTroveZUSDAmount(contracts, totalDebt)

  describe("Stability Pool Withdrawal", async () => {

    before(async () => {
      gasPriceInWei = await web3.eth.getGasPrice()
    })

    before(async () => {
      contracts = await deploymentHelper.deployLiquityCore()
      const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)
      contracts.troveManager = await TroveManagerTester.new()
      contracts = await deploymentHelper.deployZUSDToken(contracts)

      priceFeed = contracts.priceFeedTestnet
      zusdToken = contracts.zusdToken
      sortedTroves = contracts.sortedTroves
      troveManager = contracts.troveManager
      activePool = contracts.activePool
      stabilityPool = contracts.stabilityPool
      defaultPool = contracts.defaultPool
      borrowerOperations = contracts.borrowerOperations

      await deploymentHelper.connectZEROContracts(ZEROContracts)
      await deploymentHelper.connectCoreContracts(contracts, ZEROContracts)
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts, owner)
    })

    let revertToSnapshot;

    beforeEach(async() => {
      let snapshot = await timeMachine.takeSnapshot();
      revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result'])
    });

    afterEach(async() => {
      await revertToSnapshot();
    });
    
    // --- Compounding tests ---

    // --- withdrawRBTCGainToTrove() ---

    // --- Identical deposits, identical liquidation amounts---
    it("withdrawRBTCGainToTrove(): Depositors with equal initial deposit withdraw correct compounded deposit and RBTC Gain after one liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulter opens trove with 200% ICR and 10k ZUSD net debt
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });

      // Check depositors' compounded deposit is 6666.66 ZUSD and RBTC Gain is 33.16 RBTC
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '6666666666666666666666'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '6666666666666666666666'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '6666666666666666666666'), 10000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '33166666666666666667'), 10000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '33166666666666666667'), 10000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '33166666666666666667'), 10000)
    })

    it("withdrawRBTCGainToTrove(): Depositors with equal initial deposit withdraw correct compounded deposit and RBTC Gain after two identical liquidations", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Two defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Check depositors' compounded deposit is 3333.33 ZUSD and RBTC Gain is 66.33 RBTC
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '3333333333333333333333'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '3333333333333333333333'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '3333333333333333333333'), 10000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '66333333333333333333'), 10000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '66333333333333333333'), 10000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '66333333333333333333'), 10000)
    })

    it("withdrawRBTCGainToTrove():  Depositors with equal initial deposit withdraw correct compounded deposit and RBTC Gain after three identical liquidations", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Three defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });
      await troveManager.liquidate(defaulter_3, { from: owner });

      // Check depositors' compounded deposit is 0 ZUSD and RBTC Gain is 99.5 RBTC 
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '0'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '0'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '0'), 10000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(99500, 15)), 10000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(99500, 15)), 10000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(99500, 15)), 10000)
    })

    // --- Identical deposits, increasing liquidation amounts ---
    it("withdrawRBTCGainToTrove(): Depositors with equal initial deposit withdraw correct compounded deposit and RBTC Gain after two liquidations of increasing ZUSD", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(5000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: '50000000000000000000' })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(7000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: '70000000000000000000' })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Check depositors' compounded deposit
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '6000000000000000000000'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '6000000000000000000000'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '6000000000000000000000'), 10000)

      // (0.5 + 0.7) * 99.5 / 3
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(398, 17)), 10000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(398, 17)), 10000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(398, 17)), 10000)
    })

    it("withdrawRBTCGainToTrove(): Depositors with equal initial deposit withdraw correct compounded deposit and RBTC Gain after three liquidations of increasing ZUSD", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(5000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: '50000000000000000000' })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(6000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: '60000000000000000000' })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(7000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: '70000000000000000000' })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Three defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });
      await troveManager.liquidate(defaulter_3, { from: owner });

      // Check depositors' compounded deposit
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '4000000000000000000000'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '4000000000000000000000'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '4000000000000000000000'), 10000)

      // (0.5 + 0.6 + 0.7) * 99.5 / 3
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(597, 17)), 10000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(597, 17)), 10000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(597, 17)), 10000)
    })

    // --- Increasing deposits, identical liquidation amounts ---
    it("withdrawRBTCGainToTrove(): Depositors with varying deposits withdraw correct compounded deposit and RBTC Gain after two identical liquidations", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      // Whale transfers 10k, 20k, 30k ZUSD to A, B and C respectively who then deposit it to the SP
      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })
      await zusdToken.transfer(bob, dec(20000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(20000, 18), ZERO_ADDRESS, { from: bob })
      await zusdToken.transfer(carol, dec(30000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(30000, 18), ZERO_ADDRESS, { from: carol })

      // 2 Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Three defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Depositors attempt to withdraw everything
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '6666666666666666666666'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '13333333333333333333333'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '20000000000000000000000'), 100000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '33166666666666666667'), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '66333333333333333333'), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(995, 17)), 100000)
    })

    it("withdrawRBTCGainToTrove(): Depositors with varying deposits withdraw correct compounded deposit and RBTC Gain after three identical liquidations", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      // Whale transfers 10k, 20k, 30k ZUSD to A, B and C respectively who then deposit it to the SP
      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })
      await zusdToken.transfer(bob, dec(20000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(20000, 18), ZERO_ADDRESS, { from: bob })
      await zusdToken.transfer(carol, dec(30000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(30000, 18), ZERO_ADDRESS, { from: carol })

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Three defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });
      await troveManager.liquidate(defaulter_3, { from: owner });

      // Depositors attempt to withdraw everything
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '5000000000000000000000'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '10000000000000000000000'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '15000000000000000000000'), 100000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '49750000000000000000'), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '149250000000000000000'), 100000)
    })

    // --- Varied deposits and varied liquidation amount ---
    it("withdrawRBTCGainToTrove(): Depositors with varying deposits withdraw correct compounded deposit and RBTC Gain after three varying liquidations", async () => {
      // Whale opens Trove with 1m RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(1000000, 18)), whale, whale, { from: whale, value: dec(1000000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })

      /* Depositors provide:-
      Alice:  2000 ZUSD
      Bob:  456000 ZUSD
      Carol: 13100 ZUSD */
      // Whale transfers ZUSD to  A, B and C respectively who then deposit it to the SP
      await zusdToken.transfer(alice, dec(2000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(2000, 18), ZERO_ADDRESS, { from: alice })
      await zusdToken.transfer(bob, dec(456000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(456000, 18), ZERO_ADDRESS, { from: bob })
      await zusdToken.transfer(carol, dec(13100, 18), { from: whale })
      await stabilityPool.provideToSP(dec(13100, 18), ZERO_ADDRESS, { from: carol })

      /* Defaulters open troves
     
      Defaulter 1: 207000 ZUSD & 2160 RBTC
      Defaulter 2: 5000 ZUSD & 50 RBTC
      Defaulter 3: 46700 ZUSD & 500 RBTC
      */
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('207000000000000000000000'), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(2160, 18) })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(5, 21)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(50, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('46700000000000000000000'), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(500, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Three defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });
      await troveManager.liquidate(defaulter_3, { from: owner });

      // Depositors attempt to withdraw everything
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      // ()
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '901719380174061000000'), 100000000000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '205592018679686000000000'), 10000000000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '5906261940140100000000'), 10000000000)

      // 2710 * 0.995 * {2000, 456000, 13100}/4711
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '11447463383570366500'), 10000000000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '2610021651454043834000'), 10000000000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '74980885162385912900'), 10000000000)
    })

    // --- Deposit enters at t > 0

    it("withdrawRBTCGainToTrove(): A, B, C Deposit -> 2 liquidations -> D deposits -> 1 liquidation. All deposits and liquidations = 100 ZUSD.  A, B, C, D withdraw correct ZUSD deposit and RBTC Gain", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // First two defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Whale transfers 10k to Dennis who then provides to SP
      await zusdToken.transfer(dennis, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: dennis })

      // Third defaulter liquidated
      await troveManager.liquidate(defaulter_3, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()

      console.log()
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '1666666666666666666666'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '1666666666666666666666'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '1666666666666666666666'), 100000)

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), '5000000000000000000000'), 100000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '82916666666666666667'), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '82916666666666666667'), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '82916666666666666667'), 100000)

      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '49750000000000000000'), 100000)
    })

    it("withdrawRBTCGainToTrove(): A, B, C Deposit -> 2 liquidations -> D deposits -> 2 liquidations. All deposits and liquidations = 100 ZUSD.  A, B, C, D withdraw correct ZUSD deposit and RBTC Gain", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_4, defaulter_4, { from: defaulter_4, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // First two defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Dennis opens a trove and provides to SP
      await zusdToken.transfer(dennis, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: dennis })

      // Third and fourth defaulters liquidated
      await troveManager.liquidate(defaulter_3, { from: owner });
      await troveManager.liquidate(defaulter_4, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), '0'), 100000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, dec(995, 17)), 100000)
    })

    it("withdrawRBTCGainToTrove(): A, B, C Deposit -> 2 liquidations -> D deposits -> 2 liquidations. Various deposit and liquidation vals.  A, B, C, D withdraw correct ZUSD deposit and RBTC Gain", async () => {
      // Whale opens Trove with 1m RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(1000000, 18)), whale, whale, { from: whale, value: dec(1000000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })

      /* Depositors open troves and make SP deposit:
      Alice: 60000 ZUSD
      Bob: 20000 ZUSD
      Carol: 15000 ZUSD
      */
      // Whale transfers ZUSD to  A, B and C respectively who then deposit it to the SP
      await zusdToken.transfer(alice, dec(60000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(60000, 18), ZERO_ADDRESS, { from: alice })
      await zusdToken.transfer(bob, dec(20000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(20000, 18), ZERO_ADDRESS, { from: bob })
      await zusdToken.transfer(carol, dec(15000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(15000, 18), ZERO_ADDRESS, { from: carol })

      /* Defaulters open troves:
      Defaulter 1:  10000 ZUSD, 100 RBTC
      Defaulter 2:  25000 ZUSD, 250 RBTC
      Defaulter 3:  5000 ZUSD, 50 RBTC
      Defaulter 4:  40000 ZUSD, 400 RBTC
      */
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(25000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: '250000000000000000000' })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(5000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: '50000000000000000000' })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(40000, 18)), defaulter_4, defaulter_4, { from: defaulter_4, value: dec(400, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // First two defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Dennis provides 25000 ZUSD
      await zusdToken.transfer(dennis, dec(25000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(25000, 18), ZERO_ADDRESS, { from: dennis })

      // Last two defaulters liquidated
      await troveManager.liquidate(defaulter_3, { from: owner });
      await troveManager.liquidate(defaulter_4, { from: owner });

      // Each depositor withdraws as much as possible
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '17832817337461300000000'), 100000000000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '5944272445820430000000'), 100000000000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '4458204334365320000000'), 100000000000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), '11764705882352900000000'), 100000000000)

      // 3.5*0.995 * {60000,20000,15000,0} / 95000 + 450*0.995 * {60000/950*{60000,20000,15000},25000} / (120000-35000)
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '419563467492260055900'), 100000000000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '139854489164086692700'), 100000000000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '104890866873065014000'), 100000000000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '131691176470588233700'), 100000000000)
    })

    // --- Depositor leaves ---

    it("withdrawRBTCGainToTrove(): A, B, C, D deposit -> 2 liquidations -> D withdraws -> 2 liquidations. All deposits and liquidations = 100 ZUSD.  A, B, C, D withdraw correct ZUSD deposit and RBTC Gain", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B and C who then deposit it to the SP
      const depositors = [alice, bob, carol, dennis]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_4, defaulter_4, { from: defaulter_4, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // First two defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Dennis withdraws his deposit and RBTC gain
      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })
      await priceFeed.setPrice(dec(100, 18))

      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), '5000000000000000000000'), 100000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '49750000000000000000'), 100000)

      // Two more defaulters are liquidated
      await troveManager.liquidate(defaulter_3, { from: owner });
      await troveManager.liquidate(defaulter_4, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '0'), 1000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '0'), 1000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '0'), 1000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(995, 17)), 100000)
    })

    it("withdrawRBTCGainToTrove(): A, B, C, D deposit -> 2 liquidations -> D withdraws -> 2 liquidations. Various deposit and liquidation vals. A, B, C, D withdraw correct ZUSD deposit and RBTC Gain", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
     
      /* Initial deposits:
      Alice: 20000 ZUSD
      Bob: 25000 ZUSD
      Carol: 12500 ZUSD
      Dennis: 40000 ZUSD
      */
      // Whale transfers ZUSD to  A, B,C and D respectively who then deposit it to the SP
      await zusdToken.transfer(alice, dec(20000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(20000, 18), ZERO_ADDRESS, { from: alice })
      await zusdToken.transfer(bob, dec(25000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(25000, 18), ZERO_ADDRESS, { from: bob })
      await zusdToken.transfer(carol, dec(12500, 18), { from: whale })
      await stabilityPool.provideToSP(dec(12500, 18), ZERO_ADDRESS, { from: carol })
      await zusdToken.transfer(dennis, dec(40000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(40000, 18), ZERO_ADDRESS, { from: dennis })

      /* Defaulters open troves:
      Defaulter 1: 10000 ZUSD
      Defaulter 2: 20000 ZUSD
      Defaulter 3: 30000 ZUSD
      Defaulter 4: 5000 ZUSD
      */
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(20000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(30000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(300, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(5000, 18)), defaulter_4, defaulter_4, { from: defaulter_4, value: '50000000000000000000' })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // First two defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Dennis withdraws his deposit and RBTC gain
      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txD = await stabilityPool.withdrawFromSP(dec(40000, 18), { from: dennis })
      await priceFeed.setPrice(dec(100, 18))

      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()
      assert.isAtMost(th.getDifference((await zusdToken.balanceOf(dennis)).toString(), '27692307692307700000000'), 100000000000)
      // 300*0.995 * 40000/97500
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '122461538461538466100'), 100000000000)

      // Two more defaulters are liquidated
      await troveManager.liquidate(defaulter_3, { from: owner });
      await troveManager.liquidate(defaulter_4, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '1672240802675590000000'), 10000000000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '2090301003344480000000'), 100000000000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '1045150501672240000000'), 100000000000)

      // 300*0.995 * {20000,25000,12500}/97500 + 350*0.995 * {20000,25000,12500}/57500
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '182361204013377919900'), 100000000000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '227951505016722411000'), 100000000000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '113975752508361205500'), 100000000000)
    })

    // --- One deposit enters at t > 0, and another leaves later ---
    it("withdrawRBTCGainToTrove(): A, B, D deposit -> 2 liquidations -> C makes deposit -> 1 liquidation -> D withdraws -> 1 liquidation. All deposits: 100 ZUSD. Liquidations: 100,100,100,50.  A, B, C, D withdraw correct ZUSD deposit and RBTC Gain", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
   
      // Whale transfers 10k ZUSD to A, B and D who then deposit it to the SP
      const depositors = [alice, bob, dennis]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulters open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(5000, 18)), defaulter_4, defaulter_4, { from: defaulter_4, value: '50000000000000000000' })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // First two defaulters liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Carol makes deposit
      await zusdToken.transfer(carol, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: carol })

      await troveManager.liquidate(defaulter_3, { from: owner });

      // Dennis withdraws his deposit and RBTC gain
      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txD = await stabilityPool.withdrawFromSP(dec(10000, 18), { from: dennis })
      await priceFeed.setPrice(dec(100, 18))

      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()
      assert.isAtMost(th.getDifference((await zusdToken.balanceOf(dennis)).toString(), '1666666666666666666666'), 100000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '82916666666666666667'), 100000)

      await troveManager.liquidate(defaulter_4, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '666666666666666666666'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '666666666666666666666'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '2000000000000000000000'), 100000)

      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, '92866666666666666667'), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '92866666666666666667'), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '79600000000000000000'), 100000)
    })

    // --- Tests for full offset - Pool empties to 0 ---

    // A, B deposit 10000
    // L1 cancels 20000, 200
    // C, D deposit 10000
    // L2 cancels 10000,100

    // A, B withdraw 0ZUSD & 100e
    // C, D withdraw 5000ZUSD  & 500e
    it("withdrawRBTCGainToTrove(): Depositor withdraws correct compounded deposit after liquidation empties the pool", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B who then deposit it to the SP
      const depositors = [alice, bob]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // 2 Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(20000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter 1 liquidated. 20000 ZUSD fully offset with pool.
      await troveManager.liquidate(defaulter_1, { from: owner });

      // Carol, Dennis each deposit 10000 ZUSD
      const depositors_2 = [carol, dennis]
      for (account of depositors_2) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulter 2 liquidated. 10000 ZUSD offset
      await troveManager.liquidate(defaulter_2, { from: owner });

      // await borrowerOperations.openTrove(th._100pct, dec(1, 18), account, account, { from: erin, value: dec(2, 'ether') })
      // await stabilityPool.provideToSP(dec(1, 18), ZERO_ADDRESS, { from: erin })

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })

      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()

      // Expect Alice And Bob's compounded deposit to be 0 ZUSD
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '0'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '0'), 10000)

      // Expect Alice and Bob's RBTC Gain to be 100 RBTC
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 100000)

      // Expect Carol And Dennis' compounded deposit to be 50 ZUSD
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '5000000000000000000000'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), '5000000000000000000000'), 100000)

      // Expect Carol and and Dennis RBTC Gain to be 50 RBTC
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '49750000000000000000'), 100000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '49750000000000000000'), 100000)
    })

    // A, B deposit 10000
    // L1 cancels 10000, 1
    // L2 10000, 200 empties Pool
    // C, D deposit 10000
    // L3 cancels 10000, 1 
    // L2 20000, 200 empties Pool
    it("withdrawRBTCGainToTrove(): Pool-emptying liquidation increases epoch by one, resets scaleFactor to 0, and resets P to 1e18", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B who then deposit it to the SP
      const depositors = [alice, bob]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // 4 Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_4, defaulter_4, { from: defaulter_4, value: dec(100, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      const epoch_0 = (await stabilityPool.currentEpoch()).toString()
      const scale_0 = (await stabilityPool.currentScale()).toString()
      const P_0 = (await stabilityPool.P()).toString()

      assert.equal(epoch_0, '0')
      assert.equal(scale_0, '0')
      assert.equal(P_0, dec(1, 18))

      // Defaulter 1 liquidated. 10--0 ZUSD fully offset, Pool remains non-zero
      await troveManager.liquidate(defaulter_1, { from: owner });

      //Check epoch, scale and sum
      const epoch_1 = (await stabilityPool.currentEpoch()).toString()
      const scale_1 = (await stabilityPool.currentScale()).toString()
      const P_1 = (await stabilityPool.P()).toString()

      assert.equal(epoch_1, '0')
      assert.equal(scale_1, '0')
      assert.isAtMost(th.getDifference(P_1, dec(5, 17)), 1000)

      // Defaulter 2 liquidated. 1--00 ZUSD, empties pool
      await troveManager.liquidate(defaulter_2, { from: owner });

      //Check epoch, scale and sum
      const epoch_2 = (await stabilityPool.currentEpoch()).toString()
      const scale_2 = (await stabilityPool.currentScale()).toString()
      const P_2 = (await stabilityPool.P()).toString()

      assert.equal(epoch_2, '1')
      assert.equal(scale_2, '0')
      assert.equal(P_2, dec(1, 18))

      // Carol, Dennis each deposit 10000 ZUSD
      const depositors_2 = [carol, dennis]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulter 3 liquidated. 10000 ZUSD fully offset, Pool remains non-zero
      await troveManager.liquidate(defaulter_3, { from: owner });

      //Check epoch, scale and sum
      const epoch_3 = (await stabilityPool.currentEpoch()).toString()
      const scale_3 = (await stabilityPool.currentScale()).toString()
      const P_3 = (await stabilityPool.P()).toString()

      assert.equal(epoch_3, '1')
      assert.equal(scale_3, '0')
      assert.isAtMost(th.getDifference(P_3, dec(5, 17)), 1000)

      // Defaulter 4 liquidated. 10000 ZUSD, empties pool
      await troveManager.liquidate(defaulter_4, { from: owner });

      //Check epoch, scale and sum
      const epoch_4 = (await stabilityPool.currentEpoch()).toString()
      const scale_4 = (await stabilityPool.currentScale()).toString()
      const P_4 = (await stabilityPool.P()).toString()

      assert.equal(epoch_4, '2')
      assert.equal(scale_4, '0')
      assert.equal(P_4, dec(1, 18))
    })


    // A, B deposit 10000
    // L1 cancels 20000, 200
    // C, D, E deposit 10000, 20000, 30000
    // L2 cancels 10000,100 

    // A, B withdraw 0 ZUSD & 100e
    // C, D withdraw 5000 ZUSD  & 50e
    it("withdrawRBTCGainToTrove(): Depositors withdraw correct compounded deposit after liquidation empties the pool", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: erin, value: dec(10000, 'ether') })

      // Whale transfers 10k ZUSD to A, B who then deposit it to the SP
      const depositors = [alice, bob]
      for (account of depositors) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // 2 Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(20000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })

      // price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter 1 liquidated. 20000 ZUSD fully offset with pool.
      await troveManager.liquidate(defaulter_1, { from: owner });

      // Carol, Dennis, Erin each deposit 10000, 20000, 30000 ZUSD respectively
      await zusdToken.transfer(carol, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: carol })

      await zusdToken.transfer(dennis, dec(20000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(20000, 18), ZERO_ADDRESS, { from: dennis })

      await zusdToken.transfer(erin, dec(30000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(30000, 18), ZERO_ADDRESS, { from: erin })

      // Defaulter 2 liquidated. 10000 ZUSD offset
      await troveManager.liquidate(defaulter_2, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })
      const txE = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: erin })

      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()
      const erin_RBTCWithdrawn = th.getEventArgByName(txE, 'RBTCGainWithdrawn', '_RBTC').toString()

      // Expect Alice And Bob's compounded deposit to be 0 ZUSD
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '0'), 10000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '0'), 10000)

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '8333333333333333333333'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), '16666666666666666666666'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(erin)).toString(), '25000000000000000000000'), 100000)

      //Expect Alice and Bob's RBTC Gain to be 1 RBTC
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 100000)

      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '16583333333333333333'), 100000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '33166666666666666667'), 100000)
      assert.isAtMost(th.getDifference(erin_RBTCWithdrawn, '49750000000000000000'), 100000)
    })

    // A deposits 10000
    // L1, L2, L3 liquidated with 10000 ZUSD each
    // A withdraws all
    // Expect A to withdraw 0 deposit and ether only from reward L1
    it("withdrawRBTCGainToTrove(): single deposit fully offset. After subsequent liquidations, depositor withdraws 0 deposit and *only* the RBTC Gain from one liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })

      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })

      // Defaulter 1,2,3 withdraw 10000 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })

      // price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter 1, 2  and 3 liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });
      await troveManager.liquidate(defaulter_3, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), 0), 100000)
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(995, 17)), 100000)
    })

    //--- Serial full offsets ---

    // A,B deposit 10000 ZUSD
    // L1 cancels 20000 ZUSD, 2E
    // B,C deposits 10000 ZUSD
    // L2 cancels 20000 ZUSD, 2E
    // E,F deposit 10000 ZUSD
    // L3 cancels 20000, 200E
    // G,H deposits 10000
    // L4 cancels 20000, 200E

    // Expect all depositors withdraw 0 ZUSD and 100 RBTC

    it("withdrawRBTCGainToTrove(): Depositor withdraws correct compounded deposit after liquidation empties the pool", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // A, B, C, D, E, F, G, H open troves
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: erin, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: flyn, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: harriet, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: graham, value: dec(10000, 'ether') })

      // 4 Defaulters open trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(20000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(20000, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(20000, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(20000, 18)), defaulter_4, defaulter_4, { from: defaulter_4, value: dec(200, 'ether') })

      // price drops by 50%: defaulter ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Alice, Bob each deposit 10k ZUSD
      const depositors_1 = [alice, bob]
      for (account of depositors_1) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulter 1 liquidated. 20k ZUSD fully offset with pool.
      await troveManager.liquidate(defaulter_1, { from: owner });

      // Carol, Dennis each deposit 10000 ZUSD
      const depositors_2 = [carol, dennis]
      for (account of depositors_2) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulter 2 liquidated. 10000 ZUSD offset
      await troveManager.liquidate(defaulter_2, { from: owner });

      // Erin, Flyn each deposit 10000 ZUSD
      const depositors_3 = [erin, flyn]
      for (account of depositors_3) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulter 3 liquidated. 10000 ZUSD offset
      await troveManager.liquidate(defaulter_3, { from: owner });

      // Graham, Harriet each deposit 10000 ZUSD
      const depositors_4 = [graham, harriet]
      for (account of depositors_4) {
        await zusdToken.transfer(account, dec(10000, 18), { from: whale })
        await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: account })
      }

      // Defaulter 4 liquidated. 10k ZUSD offset
      await troveManager.liquidate(defaulter_4, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })
      const txE = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: erin })
      const txF = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: flyn })
      const txG = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: graham })
      const txH = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: harriet })

      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()
      const erin_RBTCWithdrawn = th.getEventArgByName(txE, 'RBTCGainWithdrawn', '_RBTC').toString()
      const flyn_RBTCWithdrawn = th.getEventArgByName(txF, 'RBTCGainWithdrawn', '_RBTC').toString()
      const graham_RBTCWithdrawn = th.getEventArgByName(txG, 'RBTCGainWithdrawn', '_RBTC').toString()
      const harriet_RBTCWithdrawn = th.getEventArgByName(txH, 'RBTCGainWithdrawn', '_RBTC').toString()

      // Expect all deposits to be 0 ZUSD
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(alice)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(erin)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(flyn)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(graham)).toString(), '0'), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(harriet)).toString(), '0'), 100000)

      /* Expect all RBTC gains to be 100 RBTC:  Since each liquidation of empties the pool, depositors
      should only earn RBTC from the single liquidation that cancelled with their deposit */
      assert.isAtMost(th.getDifference(alice_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(erin_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(flyn_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(graham_RBTCWithdrawn, dec(995, 17)), 100000)
      assert.isAtMost(th.getDifference(harriet_RBTCWithdrawn, dec(995, 17)), 100000)

      const finalEpoch = (await stabilityPool.currentEpoch()).toString()
      assert.equal(finalEpoch, 4)
    })

    // --- Scale factor tests ---

     // A deposits 10000
    // L1 brings P close to boundary, i.e. 9e-9: liquidate 9999.99991
    // A withdraws all
    // B deposits 10000
    // L2 of 9900 ZUSD, should bring P slightly past boundary i.e. 1e-9 -> 1e-10

    // expect d(B) = d0(B)/100
    // expect correct RBTC gain, i.e. all of the reward
    it("withdrawRBTCGainToTrove(): deposit spans one scale factor change: Single depositor withdraws correct compounded deposit and RBTC Gain after one liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })

      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })

      // Defaulter 1 withdraws 'almost' 10000 ZUSD:  9999.99991 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999999910000000000000'), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })

      assert.equal(await stabilityPool.currentScale(), '0')

      // Defaulter 2 withdraws 9900 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(9900, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(60, 'ether') })

      // price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter 1 liquidated.  Value of P reduced to 9e9.
      await troveManager.liquidate(defaulter_1, { from: owner });
      assert.equal((await stabilityPool.P()).toString(), dec(9, 9))

      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txA = await stabilityPool.withdrawFromSP(dec(10000, 18), { from: alice })
      await priceFeed.setPrice(dec(100, 18))

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = await th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()

      await zusdToken.transfer(bob, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: bob })

      // Defaulter 2 liquidated.  9900 ZUSD liquidated. P altered by a factor of 1-(9900/10000) = 0.01.  Scale changed.
      await troveManager.liquidate(defaulter_2, { from: owner });

      assert.equal(await stabilityPool.currentScale(), '1')

      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const bob_RBTCWithdrawn = await th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()

      // Expect Bob to retain 1% of initial deposit (100 ZUSD) and all the liquidated RBTC (60 ether)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), '100000000000000000000'), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '59700000000000000000'), 100000)
      
    })

    // A deposits 10000
    // L1 brings P close to boundary, i.e. 9e-9: liquidate 9999.99991 ZUSD
    // A withdraws all
    // B, C, D deposit 10000, 20000, 30000
    // L2 of 59400, should bring P slightly past boundary i.e. 1e-9 -> 1e-10

    // expect d(B) = d0(B)/100
    // expect correct RBTC gain, i.e. all of the reward
    it("withdrawRBTCGainToTrove(): Several deposits of varying amounts span one scale factor change. Depositors withdraw correct compounded deposit and RBTC Gain after one liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })
      
      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })

      // Defaulter 1 withdraws 'almost' 10k ZUSD.
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999999910000000000000'), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })

      // Defaulter 2 withdraws 59400 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('59400000000000000000000'), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(330, 'ether') })

      // price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter 1 liquidated.  Value of P reduced to 9e9
      await troveManager.liquidate(defaulter_1, { from: owner });
      assert.equal((await stabilityPool.P()).toString(), dec(9, 9))

      assert.equal(await stabilityPool.currentScale(), '0')

      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txA = await stabilityPool.withdrawFromSP(dec(10000, 18), { from: alice })
      await priceFeed.setPrice(dec(100, 18))

      //B, C, D deposit to Stability Pool
      await zusdToken.transfer(bob, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: bob })

      await zusdToken.transfer(carol, dec(20000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(20000, 18), ZERO_ADDRESS, { from: carol })

      await zusdToken.transfer(dennis, dec(30000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(30000, 18), ZERO_ADDRESS, { from: dennis })

      // 54000 ZUSD liquidated.  P altered by a factor of 1-(59400/60000) = 0.01. Scale changed.
      const txL2 = await troveManager.liquidate(defaulter_2, { from: owner });
      assert.isTrue(txL2.receipt.status)

      assert.equal(await stabilityPool.currentScale(), '1')

      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })

      /* Expect depositors to retain 1% of their initial deposit, and an RBTC gain 
      in proportion to their initial deposit:
     
      Bob:  1000 ZUSD, 55 RBtcer
      Carol:  2000 ZUSD, 110 RBtcer
      Dennis:  3000 ZUSD, 165 RBtcer
     
      Total: 6000 ZUSD, 300 RBtcer
      */
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), dec(100, 18)), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), dec(200, 18)), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), dec(300, 18)), 100000)

      const bob_RBTCWithdrawn = await th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = await th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = await th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()

      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, '54725000000000000000'), 100000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, '109450000000000000000'), 100000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, '164175000000000000000'), 100000)
    })

    // Deposit's RBTC reward spans one scale change - deposit reduced by correct amount

    // A make deposit 10000 ZUSD
    // L1 brings P to 1e-5*P. L1:  9999.9000000000000000 ZUSD
    // A withdraws
    // B makes deposit 10000 ZUSD
    // L2 decreases P again by 1e-5, over the scale boundary: 9999.9000000000000000 (near to the 10000 ZUSD total deposits)
    // B withdraws
    // expect d(B) = d0(B) * 1e-5
    // expect B gets entire RBTC gain from L2
    it("withdrawRBTCGainToTrove(): deposit spans one scale factor change: Single depositor withdraws correct compounded deposit and RBTC Gain after one liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      
      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })

      // Defaulter 1 and default 2 each withdraw 9999.999999999 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(99999, 17)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(99999, 17)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })

      // price drops by 50%: defaulter 1 ICR falls to 100%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter 1 liquidated.  Value of P updated to  to 1e13
      const txL1 = await troveManager.liquidate(defaulter_1, { from: owner });
      assert.isTrue(txL1.receipt.status)
      assert.equal(await stabilityPool.P(), dec(1, 13))  // P decreases. P = 1e(18-5) = 1e13
      assert.equal(await stabilityPool.currentScale(), '0')

      // Alice withdraws
      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txA = await stabilityPool.withdrawFromSP(dec(10000, 18), { from: alice })
      await priceFeed.setPrice(dec(100, 18))

      // Bob deposits 10k ZUSD
      await zusdToken.transfer(bob, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: bob })

      // Defaulter 2 liquidated
      const txL2 = await troveManager.liquidate(defaulter_2, { from: owner });
      assert.isTrue(txL2.receipt.status)
      assert.equal(await stabilityPool.P(), dec(1, 17))  // Scale changes and P changes. P = 1e(13-5+9) = 1e17
      assert.equal(await stabilityPool.currentScale(), '1')

      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const bob_RBTCWithdrawn = await th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()

      // Bob should withdraw 1e-5 of initial deposit: 0.1 ZUSD and the full RBTC gain of 100 ether
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), dec(1, 17)), 100000)
      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 100000000000)
    })

    // A make deposit 10000 ZUSD
    // L1 brings P to 1e-5*P. L1:  9999.9000000000000000 ZUSD
    // A withdraws
    // B,C D make deposit 10000, 20000, 30000
    // L2 decreases P again by 1e-5, over boundary. L2: 59999.4000000000000000  (near to the 60000 ZUSD total deposits)
    // B withdraws
    // expect d(B) = d0(B) * 1e-5
    // expect B gets entire RBTC gain from L2
    it("withdrawRBTCGainToTrove(): Several deposits of varying amounts span one scale factor change. Depositors withdraws correct compounded deposit and RBTC Gain after one liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })
      
      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })

      // Defaulter 1 and default 2 withdraw up to debt of 9999.9 ZUSD and 59999.4 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999900000000000000000'), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('59999400000000000000000'), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(600, 'ether') })

      // price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      // Defaulter 1 liquidated.  Value of P updated to  to 9999999, i.e. in decimal, ~1e-10
      const txL1 = await troveManager.liquidate(defaulter_1, { from: owner });
      assert.equal(await stabilityPool.P(), dec(1, 13))  // P decreases. P = 1e(18-5) = 1e13
      assert.equal(await stabilityPool.currentScale(), '0')

      // Alice withdraws
      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txA = await stabilityPool.withdrawFromSP(dec(100, 18), { from: alice })
      await priceFeed.setPrice(dec(100, 18))

      // B, C, D deposit 10000, 20000, 30000 ZUSD
      await zusdToken.transfer(bob, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: bob })

      await zusdToken.transfer(carol, dec(20000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(20000, 18), ZERO_ADDRESS, { from: carol })

      await zusdToken.transfer(dennis, dec(30000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(30000, 18), ZERO_ADDRESS, { from: dennis })

      // Defaulter 2 liquidated
      const txL2 = await troveManager.liquidate(defaulter_2, { from: owner });
      assert.isTrue(txL2.receipt.status)
      assert.equal(await stabilityPool.P(), dec(1, 17))  // P decreases. P = 1e(13-5+9) = 1e17
      assert.equal(await stabilityPool.currentScale(), '1')

      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const bob_RBTCWithdrawn = await th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()

      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const carol_RBTCWithdrawn = await th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()

      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })
      const dennis_RBTCWithdrawn = await th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()

      // {B, C, D} should have a compounded deposit of {0.1, 0.2, 0.3} ZUSD
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(bob)).toString(), dec(1, 17)), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(carol)).toString(), dec(2, 17)), 100000)
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), dec(3, 17)), 100000)

      assert.isAtMost(th.getDifference(bob_RBTCWithdrawn, dec(995, 17)), 10000000000)
      assert.isAtMost(th.getDifference(carol_RBTCWithdrawn, dec(1990, 17)), 100000000000)
      assert.isAtMost(th.getDifference(dennis_RBTCWithdrawn, dec(2985, 17)), 100000000000)
    })

    // A make deposit 10000 ZUSD
    // L1 brings P to (~1e-10)*P. L1: 9999.9999999000000000 ZUSD
    // Expect A to withdraw 0 deposit
    it("withdrawRBTCGainToTrove(): Deposit that decreases to less than 1e-9 of it's original value is reduced to 0", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })
      
      // Defaulters 1 withdraws 9999.9999999 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999999999900000000000'), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })

      // Price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })

      // Defaulter 1 liquidated. P -> (~1e-10)*P
      const txL1 = await troveManager.liquidate(defaulter_1, { from: owner });
      assert.isTrue(txL1.receipt.status)

      const aliceDeposit = (await stabilityPool.getCompoundedZUSDDeposit(alice)).toString()
      console.log(`alice deposit: ${aliceDeposit}`)
      assert.equal(aliceDeposit, 0)
    })

    // --- Serial scale changes ---

    /* A make deposit 10000 ZUSD
    L1 brings P to 0.0001P. L1:  9999.900000000000000000 ZUSD, 1 RBTC
    B makes deposit 9999.9, brings SP to 10k
    L2 decreases P by(~1e-5)P. L2:  9999.900000000000000000 ZUSD, 1 RBTC
    C makes deposit 9999.9, brings SP to 10k
    L3 decreases P by(~1e-5)P. L3:  9999.900000000000000000 ZUSD, 1 RBTC
    D makes deposit 9999.9, brings SP to 10k
    L4 decreases P by(~1e-5)P. L4:  9999.900000000000000000 ZUSD, 1 RBTC
    expect A, B, C, D each withdraw ~100 RBtcer
    */
    it("withdrawRBTCGainToTrove(): Several deposits of 10000 ZUSD span one scale factor change. Depositors withdraws correct compounded deposit and RBTC Gain after one liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: alice, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: bob, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: carol, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis, value: dec(10000, 'ether') })
      
      // Defaulters 1-4 each withdraw 9999.9 ZUSD
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999900000000000000000'), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999900000000000000000'), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999900000000000000000'), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(100, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount('9999900000000000000000'), defaulter_4, defaulter_4, { from: defaulter_4, value: dec(100, 'ether') })

      // price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      await zusdToken.transfer(alice, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: alice })

      // Defaulter 1 liquidated. 
      const txL1 = await troveManager.liquidate(defaulter_1, { from: owner });
      assert.isTrue(txL1.receipt.status)
      assert.equal(await stabilityPool.P(), dec(1, 13)) // P decreases to 1e(18-5) = 1e13
      assert.equal(await stabilityPool.currentScale(), '0')

      // B deposits 9999.9 ZUSD
      await zusdToken.transfer(bob, dec(99999, 17), { from: whale })
      await stabilityPool.provideToSP(dec(99999, 17), ZERO_ADDRESS, { from: bob })

      // Defaulter 2 liquidated
      const txL2 = await troveManager.liquidate(defaulter_2, { from: owner });
      assert.isTrue(txL2.receipt.status)
      assert.equal(await stabilityPool.P(), dec(1, 17)) // Scale changes and P changes to 1e(13-5+9) = 1e17
      assert.equal(await stabilityPool.currentScale(), '1')

      // C deposits 9999.9 ZUSD
      await zusdToken.transfer(carol, dec(99999, 17), { from: whale })
      await stabilityPool.provideToSP(dec(99999, 17), ZERO_ADDRESS, { from: carol })

      // Defaulter 3 liquidated
      const txL3 = await troveManager.liquidate(defaulter_3, { from: owner });
      assert.isTrue(txL3.receipt.status)
      assert.equal(await stabilityPool.P(), dec(1, 12)) // P decreases to 1e(17-5) = 1e12
      assert.equal(await stabilityPool.currentScale(), '1')

      // D deposits 9999.9 ZUSD
      await zusdToken.transfer(dennis, dec(99999, 17), { from: whale })
      await stabilityPool.provideToSP(dec(99999, 17), ZERO_ADDRESS, { from: dennis })

      // Defaulter 4 liquidated
      const txL4 = await troveManager.liquidate(defaulter_4, { from: owner });
      assert.isTrue(txL4.receipt.status)
      assert.equal(await stabilityPool.P(), dec(1, 16)) // Scale changes and P changes to 1e(12-5+9) = 1e16
      assert.equal(await stabilityPool.currentScale(), '2')

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: carol })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: dennis })

      const alice_RBTCWithdrawn = await th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC').toString()
      const bob_RBTCWithdrawn = await th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC').toString()
      const carol_RBTCWithdrawn = await th.getEventArgByName(txC, 'RBTCGainWithdrawn', '_RBTC').toString()
      const dennis_RBTCWithdrawn = await th.getEventArgByName(txD, 'RBTCGainWithdrawn', '_RBTC').toString()

      // A, B, C should retain 0 - their deposits have been completely used up
      assert.equal(await stabilityPool.getCompoundedZUSDDeposit(alice), '0')
      assert.equal(await stabilityPool.getCompoundedZUSDDeposit(alice), '0')
      assert.equal(await stabilityPool.getCompoundedZUSDDeposit(alice), '0')
      // D should retain around 0.9999 ZUSD, since his deposit of 9999.9 was reduced by a factor of 1e-5
      assert.isAtMost(th.getDifference((await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString(), dec(99999, 12)), 100000)

      // 99.5 RBTC is offset at each L, 0.5 goes to gas comp
      // Each depositor gets RBTC rewards of around 99.5 RBTC. 1e17 error tolerance
      assert.isTrue(toBN(alice_RBTCWithdrawn).sub(toBN(dec(995, 17))).abs().lte(toBN(dec(1, 17))))
      assert.isTrue(toBN(bob_RBTCWithdrawn).sub(toBN(dec(995, 17))).abs().lte(toBN(dec(1, 17))))
      assert.isTrue(toBN(carol_RBTCWithdrawn).sub(toBN(dec(995, 17))).abs().lte(toBN(dec(1, 17))))
      assert.isTrue(toBN(dennis_RBTCWithdrawn).sub(toBN(dec(995, 17))).abs().lte(toBN(dec(1, 17))))
    })

    it("withdrawRBTCGainToTrove(): 2 depositors can withdraw after each receiving half of a pool-emptying liquidation", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: A, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: B, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: C, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: D, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: E, value: dec(10000, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(10000, 18)), ZERO_ADDRESS, ZERO_ADDRESS, { from: F, value: dec(10000, 'ether') })
      
      // Defaulters 1-3 each withdraw 24100, 24300, 24500 ZUSD (inc gas comp)
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(24100, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(24300, 18)), defaulter_2, defaulter_2, { from: defaulter_2, value: dec(200, 'ether') })
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(24500, 18)), defaulter_3, defaulter_3, { from: defaulter_3, value: dec(200, 'ether') })

      // price drops by 50%
      await priceFeed.setPrice(dec(100, 18));

      // A, B provide 10k ZUSD 
      await zusdToken.transfer(A, dec(10000, 18), { from: whale })
      await zusdToken.transfer(B, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: A })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: B })

      // Defaulter 1 liquidated. SP emptied
      const txL1 = await troveManager.liquidate(defaulter_1, { from: owner });
      assert.isTrue(txL1.receipt.status)

      // Check compounded deposits
      const A_deposit = await stabilityPool.getCompoundedZUSDDeposit(A)
      const B_deposit = await stabilityPool.getCompoundedZUSDDeposit(B)
      // console.log(`A_deposit: ${A_deposit}`)
      // console.log(`B_deposit: ${B_deposit}`)
      assert.equal(A_deposit, '0')
      assert.equal(B_deposit, '0')

      // Check SP tracker is zero
      const ZUSDinSP_1 = await stabilityPool.getTotalZUSDDeposits()
      // console.log(`ZUSDinSP_1: ${ZUSDinSP_1}`)
      assert.equal(ZUSDinSP_1, '0')

      // Check SP ZUSD balance is zero
      const SPZUSDBalance_1 = await zusdToken.balanceOf(stabilityPool.address)
      // console.log(`SPZUSDBalance_1: ${SPZUSDBalance_1}`)
      assert.equal(SPZUSDBalance_1, '0')

      // Attempt withdrawals
      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: A })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: B })
      await priceFeed.setPrice(dec(100, 18))

      assert.isTrue(txA.receipt.status)
      assert.isTrue(txB.receipt.status)

      // ==========

      // C, D provide 10k ZUSD 
      await zusdToken.transfer(C, dec(10000, 18), { from: whale })
      await zusdToken.transfer(D, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: C })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: D })

      // Defaulter 2 liquidated.  SP emptied
      const txL2 = await troveManager.liquidate(defaulter_2, { from: owner });
      assert.isTrue(txL2.receipt.status)

      // Check compounded deposits
      const C_deposit = await stabilityPool.getCompoundedZUSDDeposit(C)
      const D_deposit = await stabilityPool.getCompoundedZUSDDeposit(D)
      // console.log(`A_deposit: ${C_deposit}`)
      // console.log(`B_deposit: ${D_deposit}`)
      assert.equal(C_deposit, '0')
      assert.equal(D_deposit, '0')

      // Check SP tracker is zero
      const ZUSDinSP_2 = await stabilityPool.getTotalZUSDDeposits()
      // console.log(`ZUSDinSP_2: ${ZUSDinSP_2}`)
      assert.equal(ZUSDinSP_2, '0')

      // Check SP ZUSD balance is zero
      const SPZUSDBalance_2 = await zusdToken.balanceOf(stabilityPool.address)
      // console.log(`SPZUSDBalance_2: ${SPZUSDBalance_2}`)
      assert.equal(SPZUSDBalance_2, '0')

      // Attempt withdrawals
      // Increasing the price for a moment to avoid pending liquidations to block withdrawal
      await priceFeed.setPrice(dec(200, 18))
      const txC = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: C })
      const txD = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: D })
      await priceFeed.setPrice(dec(100, 18))

      assert.isTrue(txC.receipt.status)
      assert.isTrue(txD.receipt.status)

      // ============

      // E, F provide 10k ZUSD 
      await zusdToken.transfer(E, dec(10000, 18), { from: whale })
      await zusdToken.transfer(F, dec(10000, 18), { from: whale })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: E })
      await stabilityPool.provideToSP(dec(10000, 18), ZERO_ADDRESS, { from: F })

      // Defaulter 3 liquidated. SP emptied
      const txL3 = await troveManager.liquidate(defaulter_3, { from: owner });
      assert.isTrue(txL3.receipt.status)

      // Check compounded deposits
      const E_deposit = await stabilityPool.getCompoundedZUSDDeposit(E)
      const F_deposit = await stabilityPool.getCompoundedZUSDDeposit(F)
      // console.log(`E_deposit: ${E_deposit}`)
      // console.log(`F_deposit: ${F_deposit}`)
      assert.equal(E_deposit, '0')
      assert.equal(F_deposit, '0')

      // Check SP tracker is zero
      const ZUSDinSP_3 = await stabilityPool.getTotalZUSDDeposits()
      assert.equal(ZUSDinSP_3, '0')

      // Check SP ZUSD balance is zero
      const SPZUSDBalance_3 = await zusdToken.balanceOf(stabilityPool.address)
      // console.log(`SPZUSDBalance_3: ${SPZUSDBalance_3}`)
      assert.equal(SPZUSDBalance_3, '0')

      // Attempt withdrawals
      const txE = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: E })
      const txF = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: F })
      assert.isTrue(txE.receipt.status)
      assert.isTrue(txF.receipt.status)
    })

    // --- Extreme values, confirm no overflows ---

    it("withdrawRBTCGainToTrove(): Large liquidated coll/debt, deposits and RBTC price", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // RBTC:USD price is $2 billion per RBTC
      await priceFeed.setPrice(dec(2, 27));

      const depositors = [alice, bob]
      for (account of depositors) {
        await borrowerOperations.openTrove(th._100pct, dec(1, 36), account, account, { from: account, value: dec(2, 27) })
        await stabilityPool.provideToSP(dec(1, 36), ZERO_ADDRESS, { from: account })
      }

      // Defaulter opens trove with 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(1, 36)), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(1, 27) })

      // RBTC:USD price drops to $1 billion per RBTC
      await priceFeed.setPrice(dec(1, 27));

      // Defaulter liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });

      const txA = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txB = await stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })

      // Grab the RBTC gain from the emitted event in the tx log
      const alice_RBTCWithdrawn = th.getEventArgByName(txA, 'RBTCGainWithdrawn', '_RBTC')
      const bob_RBTCWithdrawn = th.getEventArgByName(txB, 'RBTCGainWithdrawn', '_RBTC')

      // Check ZUSD balances
      const aliceZUSDBalance = await stabilityPool.getCompoundedZUSDDeposit(alice)
      const aliceExpectedZUSDBalance = web3.utils.toBN(dec(5, 35))
      const aliceZUSDBalDiff = aliceZUSDBalance.sub(aliceExpectedZUSDBalance).abs()

      assert.isTrue(aliceZUSDBalDiff.lte(toBN(dec(1, 18)))) // error tolerance of 1e18

      const bobZUSDBalance = await stabilityPool.getCompoundedZUSDDeposit(bob)
      const bobExpectedZUSDBalance = toBN(dec(5, 35))
      const bobZUSDBalDiff = bobZUSDBalance.sub(bobExpectedZUSDBalance).abs()

      assert.isTrue(bobZUSDBalDiff.lte(toBN(dec(1, 18))))

      // Check RBTC gains
      const aliceExpectedRBTCGain = toBN(dec(4975, 23))
      const aliceRBTCDiff = aliceExpectedRBTCGain.sub(toBN(alice_RBTCWithdrawn))

      assert.isTrue(aliceRBTCDiff.lte(toBN(dec(1, 18))))

      const bobExpectedRBTCGain = toBN(dec(4975, 23))
      const bobRBTCDiff = bobExpectedRBTCGain.sub(toBN(bob_RBTCWithdrawn))

      assert.isTrue(bobRBTCDiff.lte(toBN(dec(1, 18))))
    })

    it("withdrawRBTCGainToTrove(): Small liquidated coll/debt, large deposits and RBTC price", async () => {
      // Whale opens Trove with 100k RBTC
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(100000, 18)), whale, whale, { from: whale, value: dec(100000, 'ether') })

      // RBTC:USD price is $2 billion per RBTC
      await priceFeed.setPrice(dec(2, 27));
      const price = await priceFeed.getPrice()

      const depositors = [alice, bob]
      for (account of depositors) {
        await borrowerOperations.openTrove(th._100pct, dec(1, 38), account, account, { from: account, value: dec(2, 29) })
        await stabilityPool.provideToSP(dec(1, 38), ZERO_ADDRESS, { from: account })
      }

      // Defaulter opens trove with 50e-7 RBTC and  5000 ZUSD. 200% ICR
      await borrowerOperations.openTrove(th._100pct, await getOpenTroveZUSDAmount(dec(5000, 18)), defaulter_1, defaulter_1, { from: defaulter_1, value: '5000000000000' })
      
      // RBTC:USD price drops to $1 billion per RBTC
      await priceFeed.setPrice(dec(1, 27));

      // Defaulter liquidated
      await troveManager.liquidate(defaulter_1, { from: owner });

      const txAPromise = stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: alice })
      const txBPromise = stabilityPool.withdrawRBTCGainToTrove(ZERO_ADDRESS, ZERO_ADDRESS, { from: bob })

      // Expect RBTC gain per depositor of ~1e11 wei to be rounded to 0 by the RBTCGainedPerUnitStaked calculation (e / D), where D is ~1e36.
      await th.assertRevert(txAPromise, 'StabilityPool: caller must have non-zero RBTC Gain')
      await th.assertRevert(txBPromise, 'StabilityPool: caller must have non-zero RBTC Gain')

      const aliceZUSDBalance = await stabilityPool.getCompoundedZUSDDeposit(alice)
      // const aliceZUSDBalance = await zusdToken.balanceOf(alice)
      const aliceExpectedZUSDBalance = toBN('99999999999999997500000000000000000000')
      const aliceZUSDBalDiff = aliceZUSDBalance.sub(aliceExpectedZUSDBalance).abs()

      assert.isTrue(aliceZUSDBalDiff.lte(toBN(dec(1, 18))))

      const bobZUSDBalance = await stabilityPool.getCompoundedZUSDDeposit(bob)
      const bobExpectedZUSDBalance = toBN('99999999999999997500000000000000000000')
      const bobZUSDBalDiff = bobZUSDBalance.sub(bobExpectedZUSDBalance).abs()

      assert.isTrue(bobZUSDBalDiff.lte(toBN('100000000000000000000')))
    })
  })
})

contract('Reset chain state', async accounts => { })
