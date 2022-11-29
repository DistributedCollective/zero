const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const mv = testHelpers.MoneyValues
const timeValues = testHelpers.TimeValues

const LoCManagerTester = artifacts.require("./LoCManagerTester")
const ZUSDToken = artifacts.require("./ZUSDToken.sol")

contract('LoCManager - in Recovery Mode', async accounts => {
  const _1_Bitcoin = web3.utils.toWei('1', 'ether')
  const _2_Bitcoin = web3.utils.toWei('2', 'ether')
  const _3_Bitcoin = web3.utils.toWei('3', 'ether')
  const _3pt5_Bitcoin = web3.utils.toWei('3.5', 'ether')
  const _6_Bitcoin = web3.utils.toWei('6', 'ether')
  const _10_Bitcoin = web3.utils.toWei('10', 'ether')
  const _20_Bitcoin = web3.utils.toWei('20', 'ether')
  const _21_Bitcoin = web3.utils.toWei('21', 'ether')
  const _22_Bitcoin = web3.utils.toWei('22', 'ether')
  const _24_Bitcoin = web3.utils.toWei('24', 'ether')
  const _25_Bitcoin = web3.utils.toWei('25', 'ether')
  const _30_Bitcoin = web3.utils.toWei('30', 'ether')

  const ZERO_ADDRESS = th.ZERO_ADDRESS
  const [
    owner,
    alice, bob, carol, dennis, erin, freddy, greta, harry, ida,
    whale, defaulter_1, defaulter_2, defaulter_3, defaulter_4,
    A, B, C, D, E, F, G, H, I, sovFeeCollector] = accounts;

    const multisig = accounts[999];

  let priceFeed
  let zusdToken
  let sortedLoCs
  let locManager
  let activePool
  let stabilityPool
  let defaultPool
  let functionCaller
  let borrowerOperations
  let collSurplusPool

  let contracts

  const getOpenLoCZUSDAmount = async (totalDebt) => th.getOpenLoCZUSDAmount(contracts, totalDebt)
  const getNetBorrowingAmount = async (debtWithFee) => th.getNetBorrowingAmount(contracts, debtWithFee)
  const openLoC = async (params) => th.openLoC(contracts, params)

  before(async () => {
    contracts = await deploymentHelper.deployZeroCore()
    contracts.locManager = await LoCManagerTester.new()
    contracts.zusdToken = await ZUSDToken.new()
    await contracts.zusdToken.initialize(
      contracts.locManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    )
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)

    priceFeed = contracts.priceFeedTestnet
    zusdToken = contracts.zusdToken
    sortedLoCs = contracts.sortedLoCs
    locManager = contracts.locManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    functionCaller = contracts.functionCaller
    borrowerOperations = contracts.borrowerOperations
    collSurplusPool = contracts.collSurplusPool

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

  it("checkRecoveryMode(): Returns true if TCR falls below CCR", async () => {
    // --- SETUP ---
    //  Alice and Bob withdraw such that the TCR is ~150%
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    const TCR = (await th.getTCR(contracts)).toString()
    assert.equal(TCR, dec(15, 17))

    const recoveryMode_Before = await th.checkRecoveryMode(contracts);
    assert.isFalse(recoveryMode_Before)

    // --- TEST ---

    // price drops to 1BTC:150ZUSD, reducing TCR below 150%.  setPrice() calls checkTCRAndSetRecoveryMode() internally.
    await priceFeed.setPrice(dec(15, 17))

    // const price = await priceFeed.getPrice()
    // await locManager.checkTCRAndSetRecoveryMode(price)

    const recoveryMode_After = await th.checkRecoveryMode(contracts);
    assert.isTrue(recoveryMode_After)
  })

  it("checkRecoveryMode(): Returns true if TCR stays less than CCR", async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    const TCR = (await th.getTCR(contracts)).toString()
    assert.equal(TCR, '1500000000000000000')

    // --- TEST ---

    // price drops to 1BTC:150ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('150000000000000000000')

    const recoveryMode_Before = await th.checkRecoveryMode(contracts);
    assert.isTrue(recoveryMode_Before)

    await borrowerOperations.addColl(alice, alice, { from: alice, value: '1' })

    const recoveryMode_After = await th.checkRecoveryMode(contracts);
    assert.isTrue(recoveryMode_After)
  })

  it("checkRecoveryMode(): returns false if TCR stays above CCR", async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(450, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    // --- TEST ---
    const recoveryMode_Before = await th.checkRecoveryMode(contracts);
    assert.isFalse(recoveryMode_Before)

    await borrowerOperations.withdrawColl(_1_Bitcoin, alice, alice, { from: alice })

    const recoveryMode_After = await th.checkRecoveryMode(contracts);
    assert.isFalse(recoveryMode_After)
  })

  it("checkRecoveryMode(): returns false if TCR rises above CCR", async () => {
    // --- SETUP ---
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    const TCR = (await th.getTCR(contracts)).toString()
    assert.equal(TCR, '1500000000000000000')

    // --- TEST ---
    // price drops to 1BTC:150ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('150000000000000000000')

    const recoveryMode_Before = await th.checkRecoveryMode(contracts);
    assert.isTrue(recoveryMode_Before)

    await borrowerOperations.addColl(alice, alice, { from: alice, value: A_coll })

    const recoveryMode_After = await th.checkRecoveryMode(contracts);
    assert.isFalse(recoveryMode_After)
  })

  // --- liquidate() with ICR < 100% ---

  it("liquidate(), with ICR < 100%: removes stake and updates totalStakes", async () => {
    // --- SETUP ---
    //  Alice and Bob withdraw such that the TCR is ~150%
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: bob } })

    const TCR = (await th.getTCR(contracts)).toString()
    assert.equal(TCR, '1500000000000000000')


    const bob_Stake_Before = (await locManager.LoCs(bob))[2]
    const totalStakes_Before = await locManager.totalStakes()

    assert.equal(bob_Stake_Before.toString(), B_coll)
    assert.equal(totalStakes_Before.toString(), A_coll.add(B_coll))

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // check Bob's ICR falls to 75%
    const bob_ICR = await locManager.getCurrentICR(bob, price);
    assert.equal(bob_ICR, '750000000000000000')

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    const bob_Stake_After = (await locManager.LoCs(bob))[2]
    const totalStakes_After = await locManager.totalStakes()

    assert.equal(bob_Stake_After, 0)
    assert.equal(totalStakes_After.toString(), A_coll)
  })

  it("liquidate(), with ICR < 100%: updates system snapshots correctly", async () => {
    // --- SETUP ---
    //  Alice, Bob and Dennis withdraw such that their ICRs and the TCR is ~150%
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: dennis } })

    const TCR = (await th.getTCR(contracts)).toString()
    assert.equal(TCR, '1500000000000000000')

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%, and all LoCs below 100% ICR
    await priceFeed.setPrice('100000000000000000000')

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Dennis is liquidated
    await locManager.liquidate(dennis, { from: owner })

    const totalStakesSnaphot_before = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_before = (await locManager.totalCollateralSnapshot()).toString()

    assert.equal(totalStakesSnaphot_before, A_coll.add(B_coll))
    assert.equal(totalCollateralSnapshot_before, A_coll.add(B_coll).add(th.applyLiquidationFee(D_coll))) // 6 + 3*0.995

    const A_reward  = th.applyLiquidationFee(D_coll).mul(A_coll).div(A_coll.add(B_coll))
    const B_reward  = th.applyLiquidationFee(D_coll).mul(B_coll).div(A_coll.add(B_coll))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    const totalStakesSnaphot_After = (await locManager.totalStakesSnapshot())
    const totalCollateralSnapshot_After = (await locManager.totalCollateralSnapshot())

    assert.equal(totalStakesSnaphot_After.toString(), A_coll)
    // total collateral should always be 9 minus gas compensations, as all liquidations in this test case are full redistributions
    assert.isAtMost(th.getDifference(totalCollateralSnapshot_After, A_coll.add(A_reward).add(th.applyLiquidationFee(B_coll.add(B_reward)))), 1000) // 3 + 4.5*0.995 + 1.5*0.995^2
  })

  it("liquidate(), with ICR < 100%: closes the LoC and removes it from the LoC array", async () => {
    // --- SETUP ---
    //  Alice and Bob withdraw such that the TCR is ~150%
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: bob } })

    const TCR = (await th.getTCR(contracts)).toString()
    assert.equal(TCR, '1500000000000000000')

    const bob_LoCStatus_Before = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_Before = await sortedLoCs.contains(bob)

    assert.equal(bob_LoCStatus_Before, 1) // status enum element 1 corresponds to "Active"
    assert.isTrue(bob_LoC_isInSortedList_Before)

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // check Bob's ICR falls to 75%
    const bob_ICR = await locManager.getCurrentICR(bob, price);
    assert.equal(bob_ICR, '750000000000000000')

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    // check Bob's LoC is successfully closed, and removed from sortedList
    const bob_LoCStatus_After = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_After = await sortedLoCs.contains(bob)
    assert.equal(bob_LoCStatus_After, 3)  // status enum element 3 corresponds to "Closed by liquidation"
    assert.isFalse(bob_LoC_isInSortedList_After)
  })

  it("liquidate(), with ICR < 100%: only redistributes to active LoCs - no offset to Stability Pool", async () => {
    // --- SETUP ---
    //  Alice, Bob and Dennis withdraw such that their ICRs and the TCR is ~150%
    const spDeposit = toBN(dec(390, 18))
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraZUSDAmount: spDeposit, extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: dennis } })

    // Alice deposits to SP
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: alice })

    // check rewards-per-unit-staked before
    const P_Before = (await stabilityPool.P()).toString()

    assert.equal(P_Before, '1000000000000000000')

    // const TCR = (await th.getTCR(contracts)).toString()
    // assert.equal(TCR, '1500000000000000000')

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%, and all LoCs below 100% ICR
    await priceFeed.setPrice('100000000000000000000')

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // liquidate bob
    await locManager.liquidate(bob, { from: owner })

    // check SP rewards-per-unit-staked after liquidation - should be no increase
    const P_After = (await stabilityPool.P()).toString()

    assert.equal(P_After, '1000000000000000000')
  })

  // --- liquidate() with 100% < ICR < 110%

  it("liquidate(), with 100 < ICR < 110%: removes stake and updates totalStakes", async () => {
    // --- SETUP ---
    //  Bob withdraws up to 2000 ZUSD of debt, bringing his ICR to 210%
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: bob } })

    let price = await priceFeed.getPrice()
    // Total TCR = 24*200/2050 = 234%
    const TCR = await th.getTCR(contracts)
    assert.isAtMost(th.getDifference(TCR, A_coll.add(B_coll).mul(price).div(A_totalDebt.add(B_totalDebt))), 1000)

    const bob_Stake_Before = (await locManager.LoCs(bob))[2]
    const totalStakes_Before = await locManager.totalStakes()

    assert.equal(bob_Stake_Before.toString(), B_coll)
    assert.equal(totalStakes_Before.toString(), A_coll.add(B_coll))

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR to 117%
    await priceFeed.setPrice('100000000000000000000')
    price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // check Bob's ICR falls to 105%
    const bob_ICR = await locManager.getCurrentICR(bob, price);
    assert.equal(bob_ICR, '1050000000000000000')

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    const bob_Stake_After = (await locManager.LoCs(bob))[2]
    const totalStakes_After = await locManager.totalStakes()

    assert.equal(bob_Stake_After, 0)
    assert.equal(totalStakes_After.toString(), A_coll)
  })

  it("liquidate(), with 100% < ICR < 110%: updates system snapshots correctly", async () => {
    // --- SETUP ---
    //  Alice and Dennis withdraw such that their ICR is ~150%
    //  Bob withdraws up to 20000 ZUSD of debt, bringing his ICR to 210%
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraZUSDAmount: dec(20000, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: dennis } })

    const totalStakesSnaphot_1 = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_1 = (await locManager.totalCollateralSnapshot()).toString()
    assert.equal(totalStakesSnaphot_1, 0)
    assert.equal(totalCollateralSnapshot_1, 0)

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%, and all LoCs below 100% ICR
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Dennis is liquidated
    await locManager.liquidate(dennis, { from: owner })

    const A_reward  = th.applyLiquidationFee(D_coll).mul(A_coll).div(A_coll.add(B_coll))
    const B_reward  = th.applyLiquidationFee(D_coll).mul(B_coll).div(A_coll.add(B_coll))

    /*
    Prior to Dennis liquidation, total stakes and total collateral were each 27 bitcoin. 
  
    Check snapshots. Dennis' liquidated collateral is distributed and remains in the system. His 
    stake is removed, leaving 24+3*0.995 bitcoin total collateral, and 24 bitcoin total stakes. */

    const totalStakesSnaphot_2 = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_2 = (await locManager.totalCollateralSnapshot()).toString()
    assert.equal(totalStakesSnaphot_2, A_coll.add(B_coll))
    assert.equal(totalCollateralSnapshot_2, A_coll.add(B_coll).add(th.applyLiquidationFee(D_coll))) // 24 + 3*0.995

    // check Bob's ICR is now in range 100% < ICR 110%
    const _110percent = web3.utils.toBN('1100000000000000000')
    const _100percent = web3.utils.toBN('1000000000000000000')

    const bob_ICR = (await locManager.getCurrentICR(bob, price))

    assert.isTrue(bob_ICR.lt(_110percent))
    assert.isTrue(bob_ICR.gt(_100percent))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    /* After Bob's liquidation, Bob's stake (21 bitcoin) should be removed from total stakes, 
    but his collateral should remain in the system (*0.995). */
    const totalStakesSnaphot_3 = (await locManager.totalStakesSnapshot())
    const totalCollateralSnapshot_3 = (await locManager.totalCollateralSnapshot())
    assert.equal(totalStakesSnaphot_3.toString(), A_coll)
    // total collateral should always be 27 minus gas compensations, as all liquidations in this test case are full redistributions
    assert.isAtMost(th.getDifference(totalCollateralSnapshot_3.toString(), A_coll.add(A_reward).add(th.applyLiquidationFee(B_coll.add(B_reward)))), 1000)
  })

  it("liquidate(), with 100% < ICR < 110%: closes the LoC and removes it from the LoC array", async () => {
    // --- SETUP ---
    //  Bob withdraws up to 2000 ZUSD of debt, bringing his ICR to 210%
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: bob } })

    const bob_LoCStatus_Before = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_Before = await sortedLoCs.contains(bob)

    assert.equal(bob_LoCStatus_Before, 1) // status enum element 1 corresponds to "Active"
    assert.isTrue(bob_LoC_isInSortedList_Before)

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()


    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // check Bob's ICR has fallen to 105%
    const bob_ICR = await locManager.getCurrentICR(bob, price);
    assert.equal(bob_ICR, '1050000000000000000')

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    // check Bob's LoC is successfully closed, and removed from sortedList
    const bob_LoCStatus_After = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_After = await sortedLoCs.contains(bob)
    assert.equal(bob_LoCStatus_After, 3)  // status enum element 3 corresponds to "Closed by liquidation"
    assert.isFalse(bob_LoC_isInSortedList_After)
  })

  it("liquidate(), with 100% < ICR < 110%: offsets as much debt as possible with the Stability Pool, then redistributes the remainder coll and debt", async () => {
    // --- SETUP ---
    //  Alice and Dennis withdraw such that their ICR is ~150%
    //  Bob withdraws up to 2000 ZUSD of debt, bringing his ICR to 210%
    const spDeposit = toBN(dec(390, 18))
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraZUSDAmount: spDeposit, extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: dennis } })

    // Alice deposits 390ZUSD to the Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // check Bob's ICR has fallen to 105%
    const bob_ICR = await locManager.getCurrentICR(bob, price);
    assert.equal(bob_ICR, '1050000000000000000')

    // check pool ZUSD before liquidation
    const stabilityPoolZUSD_Before = (await stabilityPool.getTotalZUSDDeposits()).toString()
    assert.equal(stabilityPoolZUSD_Before, '390000000000000000000')

    // check Pool reward term before liquidation
    const P_Before = (await stabilityPool.P()).toString()

    assert.equal(P_Before, '1000000000000000000')

    /* Now, liquidate Bob. Liquidated coll is 21 bitcoin, and liquidated debt is 2000 ZUSD.
    
    With 390 ZUSD in the StabilityPool, 390 ZUSD should be offset with the pool, leaving 0 in the pool.
  
    Stability Pool rewards for alice should be:
    ZUSDLoss: 390ZUSD
    BTCGain: (390 / 2000) * 21*0.995 = 4.074525 bitcoin

    After offsetting 390 ZUSD and 4.074525 bitcoin, the remainders - 1610 ZUSD and 16.820475 bitcoin - should be redistributed to all active LoCs.
   */
    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    const aliceDeposit = await stabilityPool.getCompoundedZUSDDeposit(alice)
    const aliceBTCGain = await stabilityPool.getDepositorBTCGain(alice)
    const aliceExpectedBTCGain = spDeposit.mul(th.applyLiquidationFee(B_coll)).div(B_totalDebt)

    assert.equal(aliceDeposit.toString(), 0)
    assert.equal(aliceBTCGain.toString(), aliceExpectedBTCGain)

    /* Now, check redistribution to active LoCs. Remainders of 1610 ZUSD and 16.82 bitcoin are distributed.
    
    Now, only Alice and Dennis have a stake in the system - 3 bitcoin each, thus total stakes is 6 bitcoin.
  
    Rewards-per-unit-staked from the redistribution should be:
  
    L_ZUSDDebt = 1610 / 6 = 268.333 ZUSD
    L_BTC = 16.820475 /6 =  2.8034125 bitcoin
    */
    const L_ZUSDDebt = (await locManager.L_ZUSDDebt()).toString()
    const L_BTC = (await locManager.L_BTC()).toString()

    assert.isAtMost(th.getDifference(L_ZUSDDebt, B_totalDebt.sub(spDeposit).mul(mv._1e18BN).div(A_coll.add(D_coll))), 100)
    assert.isAtMost(th.getDifference(L_BTC, th.applyLiquidationFee(B_coll.sub(B_coll.mul(spDeposit).div(B_totalDebt)).mul(mv._1e18BN).div(A_coll.add(D_coll)))), 100)
  })

  // --- liquidate(), applied to LoC with ICR > 110% that has the lowest ICR 

  it("liquidate(), with ICR > 110%, LoC has lowest ICR, and StabilityPool is empty: does nothing", async () => {
    // --- SETUP ---
    // Alice and Dennis withdraw, resulting in ICRs of 266%. 
    // Bob withdraws, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's ICR is >110% but still lowest
    const bob_ICR = (await locManager.getCurrentICR(bob, price)).toString()
    const alice_ICR = (await locManager.getCurrentICR(alice, price)).toString()
    const dennis_ICR = (await locManager.getCurrentICR(dennis, price)).toString()
    assert.equal(bob_ICR, '1200000000000000000')
    assert.equal(alice_ICR, dec(133, 16))
    assert.equal(dennis_ICR, dec(133, 16))

    // console.log(`TCR: ${await th.getTCR(contracts)}`)
    // Try to liquidate Bob
    await assertRevert(locManager.liquidate(bob, { from: owner }), "LoCManager: nothing to liquidate")

    // Check that Pool rewards don't change
    const P_Before = (await stabilityPool.P()).toString()

    assert.equal(P_Before, '1000000000000000000')

    // Check that redistribution rewards don't change
    const L_ZUSDDebt = (await locManager.L_ZUSDDebt()).toString()
    const L_BTC = (await locManager.L_BTC()).toString()

    assert.equal(L_ZUSDDebt, '0')
    assert.equal(L_BTC, '0')

    // Check that Bob's LoC and stake remains active with unchanged coll and debt
    const bob_LoC = await locManager.LoCs(bob);
    const bob_Debt = bob_LoC[0].toString()
    const bob_Coll = bob_LoC[1].toString()
    const bob_Stake = bob_LoC[2].toString()
    const bob_LoCStatus = bob_LoC[3].toString()
    const bob_isInSortedLoCsList = await sortedLoCs.contains(bob)

    th.assertIsApproximatelyEqual(bob_Debt.toString(), B_totalDebt)
    assert.equal(bob_Coll.toString(), B_coll)
    assert.equal(bob_Stake.toString(), B_coll)
    assert.equal(bob_LoCStatus, '1')
    assert.isTrue(bob_isInSortedLoCsList)
  })

  // --- liquidate(), applied to LoC with ICR > 110% that has the lowest ICR, and Stability Pool ZUSD is GREATER THAN liquidated debt ---

  it("liquidate(), with 110% < ICR < TCR, and StabilityPool ZUSD > debt to liquidate: offsets the LoC entirely with the pool", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_totalDebt, extraParams: { from: alice } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits ZUSD in the Stability Pool
    const spDeposit = B_totalDebt.add(toBN(1))
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's ICR is between 110 and TCR
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gt(mv._MCR) && bob_ICR.lt(TCR))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    /* Check accrued Stability Pool rewards after. Total Pool deposits was 1490 ZUSD, Alice sole depositor.
    As liquidated debt (250 ZUSD) was completely offset

    Alice's expected compounded deposit: (1490 - 250) = 1240ZUSD
    Alice's expected BTC gain:  Bob's liquidated capped coll (minus gas comp), 2.75*0.995 bitcoin
  
    */
    const aliceExpectedDeposit = await stabilityPool.getCompoundedZUSDDeposit(alice)
    const aliceExpectedBTCGain = await stabilityPool.getDepositorBTCGain(alice)

    assert.isAtMost(th.getDifference(aliceExpectedDeposit.toString(), spDeposit.sub(B_totalDebt)), 2000)
    assert.isAtMost(th.getDifference(aliceExpectedBTCGain, th.applyLiquidationFee(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))), 3000)

    // check Bob’s collateral surplus
    const bob_remainingCollateral = B_coll.sub(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_remainingCollateral)
    // can claim collateral
    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(th.toBN(bob_remainingCollateral)))
  })

  it("liquidate(), with ICR% = 110 < TCR, and StabilityPool ZUSD > debt to liquidate: offsets the LoC entirely with the pool, there’s no collateral surplus", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 220%. Bob has lowest ICR.
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_totalDebt, extraParams: { from: alice } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits ZUSD in the Stability Pool
    const spDeposit = B_totalDebt.add(toBN(1))
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's ICR = 110
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.eq(mv._MCR))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    /* Check accrued Stability Pool rewards after. Total Pool deposits was 1490 ZUSD, Alice sole depositor.
    As liquidated debt (250 ZUSD) was completely offset

    Alice's expected compounded deposit: (1490 - 250) = 1240ZUSD
    Alice's expected BTC gain:  Bob's liquidated capped coll (minus gas comp), 2.75*0.995 bitcoin

    */
    const aliceExpectedDeposit = await stabilityPool.getCompoundedZUSDDeposit(alice)
    const aliceExpectedBTCGain = await stabilityPool.getDepositorBTCGain(alice)

    assert.isAtMost(th.getDifference(aliceExpectedDeposit.toString(), spDeposit.sub(B_totalDebt)), 2000)
    assert.isAtMost(th.getDifference(aliceExpectedBTCGain, th.applyLiquidationFee(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))), 3000)

    // check Bob’s collateral surplus
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), '0')
  })

  it("liquidate(), with  110% < ICR < TCR, and StabilityPool ZUSD > debt to liquidate: removes stake and updates totalStakes", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_totalDebt, extraParams: { from: alice } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits ZUSD in the Stability Pool
    await stabilityPool.provideToSP(B_totalDebt.add(toBN(1)), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // check stake and totalStakes before
    const bob_Stake_Before = (await locManager.LoCs(bob))[2]
    const totalStakes_Before = await locManager.totalStakes()

    assert.equal(bob_Stake_Before.toString(), B_coll)
    assert.equal(totalStakes_Before.toString(), A_coll.add(B_coll).add(D_coll))

    // Check Bob's ICR is between 110 and 150
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gt(mv._MCR) && bob_ICR.lt(await th.getTCR(contracts)))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    // check stake and totalStakes after
    const bob_Stake_After = (await locManager.LoCs(bob))[2]
    const totalStakes_After = await locManager.totalStakes()

    assert.equal(bob_Stake_After, 0)
    assert.equal(totalStakes_After.toString(), A_coll.add(D_coll))

    // check Bob’s collateral surplus
    const bob_remainingCollateral = B_coll.sub(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_remainingCollateral)
    // can claim collateral
    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(th.toBN(bob_remainingCollateral)))
  })

  it("liquidate(), with  110% < ICR < TCR, and StabilityPool ZUSD > debt to liquidate: updates system snapshots", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_totalDebt, extraParams: { from: alice } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits ZUSD in the Stability Pool
    await stabilityPool.provideToSP(B_totalDebt.add(toBN(1)), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // check system snapshots before
    const totalStakesSnaphot_before = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_before = (await locManager.totalCollateralSnapshot()).toString()

    assert.equal(totalStakesSnaphot_before, '0')
    assert.equal(totalCollateralSnapshot_before, '0')

    // Check Bob's ICR is between 110 and TCR
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gt(mv._MCR) && bob_ICR.lt(await th.getTCR(contracts)))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    const totalStakesSnaphot_After = (await locManager.totalStakesSnapshot())
    const totalCollateralSnapshot_After = (await locManager.totalCollateralSnapshot())

    // totalStakesSnapshot should have reduced to 22 bitcoin - the sum of Alice's coll( 20 bitcoin) and Dennis' coll (2 bitcoin )
    assert.equal(totalStakesSnaphot_After.toString(), A_coll.add(D_coll))
    // Total collateral should also reduce, since all liquidated coll has been moved to a reward for Stability Pool depositors
    assert.equal(totalCollateralSnapshot_After.toString(), A_coll.add(D_coll))
  })

  it("liquidate(), with 110% < ICR < TCR, and StabilityPool ZUSD > debt to liquidate: closes the LoC", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_totalDebt, extraParams: { from: alice } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits ZUSD in the Stability Pool
    await stabilityPool.provideToSP(B_totalDebt.add(toBN(1)), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's LoC is active
    const bob_LoCStatus_Before = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_Before = await sortedLoCs.contains(bob)

    assert.equal(bob_LoCStatus_Before, 1) // status enum element 1 corresponds to "Active"
    assert.isTrue(bob_LoC_isInSortedList_Before)

    // Check Bob's ICR is between 110 and TCR
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gt(mv._MCR) && bob_ICR.lt(await th.getTCR(contracts)))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    // Check Bob's LoC is closed after liquidation
    const bob_LoCStatus_After = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_After = await sortedLoCs.contains(bob)

    assert.equal(bob_LoCStatus_After, 3) // status enum element 3 corresponds to "Closed by liquidation"
    assert.isFalse(bob_LoC_isInSortedList_After)

    // check Bob’s collateral surplus
    const bob_remainingCollateral = B_coll.sub(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_remainingCollateral)
    // can claim collateral
    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(th.toBN(bob_remainingCollateral)))
  })

  it("liquidate(), with 110% < ICR < TCR, and StabilityPool ZUSD > debt to liquidate: can liquidate locs out of order", async () => {
    // taking out 1000 ZUSD, CR of 200%
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(202, 16)), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(204, 16)), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    const { collateral: E_coll } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: erin } })
    const { collateral: F_coll } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: freddy } })

    const totalLiquidatedDebt = A_totalDebt.add(B_totalDebt).add(C_totalDebt).add(D_totalDebt)

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: totalLiquidatedDebt, extraParams: { from: whale } })
    await stabilityPool.provideToSP(totalLiquidatedDebt, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)
  
    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check locs A-D are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)
    const ICR_D = await locManager.getCurrentICR(dennis, price)
    
    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))
    assert.isTrue(ICR_D.gt(mv._MCR) && ICR_D.lt(TCR))

    // LoCs are ordered by ICR, low to high: A, B, C, D.

    // Liquidate out of ICR order: D, B, C.  Confirm Recovery Mode is active prior to each.
    const liquidationTx_D = await locManager.liquidate(dennis)
  
    assert.isTrue(await th.checkRecoveryMode(contracts))
    const liquidationTx_B = await locManager.liquidate(bob)

    assert.isTrue(await th.checkRecoveryMode(contracts))
    const liquidationTx_C = await locManager.liquidate(carol)
    
    // Check transactions all succeeded
    assert.isTrue(liquidationTx_D.receipt.status)
    assert.isTrue(liquidationTx_B.receipt.status)
    assert.isTrue(liquidationTx_C.receipt.status)

    // Confirm locs D, B, C removed
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // Confirm locs have status 'closed by liquidation' (Status enum element idx 3)
    assert.equal((await locManager.LoCs(dennis))[3], '3')
    assert.equal((await locManager.LoCs(bob))[3], '3')
    assert.equal((await locManager.LoCs(carol))[3], '3')

    // check collateral surplus
    const dennis_remainingCollateral = D_coll.sub(D_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const bob_remainingCollateral = B_coll.sub(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const carol_remainingCollateral = C_coll.sub(C_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(dennis), dennis_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(carol), carol_remainingCollateral)

    // can claim collateral
    const dennis_balanceBefore = th.toBN(await web3.eth.getBalance(dennis))
    await borrowerOperations.claimCollateral({ from: dennis, gasPrice: 0 })
    const dennis_balanceAfter = th.toBN(await web3.eth.getBalance(dennis))
    assert.isTrue(dennis_balanceAfter.eq(dennis_balanceBefore.add(th.toBN(dennis_remainingCollateral))))

    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(th.toBN(bob_remainingCollateral)))

    const carol_balanceBefore = th.toBN(await web3.eth.getBalance(carol))
    await borrowerOperations.claimCollateral({ from: carol, gasPrice: 0 })
    const carol_balanceAfter = th.toBN(await web3.eth.getBalance(carol))
    th.assertIsApproximatelyEqual(carol_balanceAfter, carol_balanceBefore.add(th.toBN(carol_remainingCollateral)))
  })


  /* --- liquidate() applied to LoC with ICR > 110% that has the lowest ICR, and Stability Pool 
  ZUSD is LESS THAN the liquidated debt: a non fullfilled liquidation --- */

  it("liquidate(), with ICR > 110%, and StabilityPool ZUSD < liquidated debt: LoC remains active", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(1500, 18), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits 100 ZUSD in the Stability Pool
    // Note:  originally the test was assigning 1490 ZUSD to the pool but later it states the SP only has 100 ZUSD
    //        and actually tests what's expected, that the SP doesn't have enough ZUSD to pay for Bob debt so does nothing 
    await stabilityPool.provideToSP('100000000000000000000', ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's LoC is active
    const bob_LoCStatus_Before = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_Before = await sortedLoCs.contains(bob)

    assert.equal(bob_LoCStatus_Before, 1) // status enum element 1 corresponds to "Active"
    assert.isTrue(bob_LoC_isInSortedList_Before)

    // Try to liquidate Bob
    await assertRevert(locManager.liquidate(bob, { from: owner }), "LoCManager: nothing to liquidate")

    /* Since the pool only contains 100 ZUSD, and Bob's pre-liquidation debt was 250 ZUSD,
    expect Bob's LoC to remain untouched, and remain active after liquidation */

    const bob_LoCStatus_After = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_After = await sortedLoCs.contains(bob)

    assert.equal(bob_LoCStatus_After, 1) // status enum element 1 corresponds to "Active"
    assert.isTrue(bob_LoC_isInSortedList_After)
  })

  it("liquidate(), with ICR > 110%, and StabilityPool ZUSD < liquidated debt: LoC remains in LoCOwners array", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(1500, 18), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits 100 ZUSD in the Stability Pool
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's LoC is active
    const bob_LoCStatus_Before = (await locManager.LoCs(bob))[3]
    const bob_LoC_isInSortedList_Before = await sortedLoCs.contains(bob)

    assert.equal(bob_LoCStatus_Before, 1) // status enum element 1 corresponds to "Active"
    assert.isTrue(bob_LoC_isInSortedList_Before)

    // Try to liquidate Bob
    await assertRevert(locManager.liquidate(bob, { from: owner }), "LoCManager: nothing to liquidate")

    /* Since the pool only contains 100 ZUSD, and Bob's pre-liquidation debt was 250 ZUSD, 
    expect Bob's LoC to only be partially offset, and remain active after liquidation */

    // Check Bob is in LoC owners array
    const arrayLength = (await locManager.getLoCOwnersCount()).toNumber()
    let addressFound = false;
    let addressIdx = 0;

    for (let i = 0; i < arrayLength; i++) {
      const address = (await locManager.LoCOwners(i)).toString()
      if (address == bob) {
        addressFound = true
        addressIdx = i
      }
    }

    assert.isTrue(addressFound);

    // Check LoCOwners idx on LoC struct == idx of address found in LoCOwners array
    const idxOnStruct = (await locManager.LoCs(bob))[4].toString()
    assert.equal(addressIdx.toString(), idxOnStruct)
  })

  it("liquidate(), with ICR > 110%, and StabilityPool ZUSD < liquidated debt: nothing happens", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(1500, 18), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits 100 ZUSD in the Stability Pool
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Try to liquidate Bob
    await assertRevert(locManager.liquidate(bob, { from: owner }), "LoCManager: nothing to liquidate")

    /*  Since Bob's debt (250 ZUSD) is larger than all ZUSD in the Stability Pool, Liquidation won’t happen

    After liquidation, totalStakes snapshot should equal Alice's stake (20 bitcoin) + Dennis stake (2 bitcoin) = 22 bitcoin.

    Since there has been no redistribution, the totalCollateral snapshot should equal the totalStakes snapshot: 22 bitcoin.

    Bob's new coll and stake should remain the same, and the updated totalStakes should still equal 25 bitcoin.
    */
    const bob_LoC = await locManager.LoCs(bob)
    const bob_DebtAfter = bob_LoC[0].toString()
    const bob_CollAfter = bob_LoC[1].toString()
    const bob_StakeAfter = bob_LoC[2].toString()

    th.assertIsApproximatelyEqual(bob_DebtAfter, B_totalDebt)
    assert.equal(bob_CollAfter.toString(), B_coll)
    assert.equal(bob_StakeAfter.toString(), B_coll)

    const totalStakes_After = (await locManager.totalStakes()).toString()
    assert.equal(totalStakes_After.toString(), A_coll.add(B_coll).add(D_coll))
  })

  it("liquidate(), with ICR > 110%, and StabilityPool ZUSD < liquidated debt: updates system shapshots", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(1500, 18), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits 100 ZUSD in the Stability Pool
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check snapshots before
    const totalStakesSnaphot_Before = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_Before = (await locManager.totalCollateralSnapshot()).toString()

    assert.equal(totalStakesSnaphot_Before, 0)
    assert.equal(totalCollateralSnapshot_Before, 0)

    // Liquidate Bob, it won’t happen as there are no funds in the SP
    await assertRevert(locManager.liquidate(bob, { from: owner }), "LoCManager: nothing to liquidate")

    /* After liquidation, totalStakes snapshot should still equal the total stake: 25 bitcoin

    Since there has been no redistribution, the totalCollateral snapshot should equal the totalStakes snapshot: 25 bitcoin.*/

    const totalStakesSnaphot_After = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_After = (await locManager.totalCollateralSnapshot()).toString()

    assert.equal(totalStakesSnaphot_After, totalStakesSnaphot_Before)
    assert.equal(totalCollateralSnapshot_After, totalCollateralSnapshot_Before)
  })

  it("liquidate(), with ICR > 110%, and StabilityPool ZUSD < liquidated debt: causes correct Pool offset and BTC gain, and doesn't redistribute to active locs", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(1500, 18), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })

    // Alice deposits 100 ZUSD in the Stability Pool
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Try to liquidate Bob. Shouldn’t happen
    await assertRevert(locManager.liquidate(bob, { from: owner }), "LoCManager: nothing to liquidate")

    // check Stability Pool rewards. Nothing happened, so everything should remain the same

    const aliceExpectedDeposit = await stabilityPool.getCompoundedZUSDDeposit(alice)
    const aliceExpectedBTCGain = await stabilityPool.getDepositorBTCGain(alice)

    assert.equal(aliceExpectedDeposit.toString(), dec(100, 18))
    assert.equal(aliceExpectedBTCGain.toString(), '0')

    /* For this Recovery Mode test case with ICR > 110%, there should be no redistribution of remainder to active LoCs. 
    Redistribution rewards-per-unit-staked should be zero. */

    const L_ZUSDDebt_After = (await locManager.L_ZUSDDebt()).toString()
    const L_BTC_After = (await locManager.L_BTC()).toString()

    assert.equal(L_ZUSDDebt_After, '0')
    assert.equal(L_BTC_After, '0')
  })

  it("liquidate(), with ICR > 110%, and StabilityPool ZUSD < liquidated debt: ICR of non liquidated LoC does not change", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, and Dennis up to 150, resulting in ICRs of 266%.
    // Bob withdraws up to 250 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    // Carol withdraws up to debt of 240 ZUSD, -> ICR of 250%.
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(1500, 18), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(250, 18), extraParams: { from: bob } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: dennis } })
    const { collateral: C_coll } = await openLoC({ ICR: toBN(dec(250, 16)), extraZUSDAmount: dec(240, 18), extraParams: { from: carol } })

    // Alice deposits 100 ZUSD in the Stability Pool
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const bob_ICR_Before = (await locManager.getCurrentICR(bob, price)).toString()
    const carol_ICR_Before = (await locManager.getCurrentICR(carol, price)).toString()

    assert.isTrue(await th.checkRecoveryMode(contracts))

    const bob_Coll_Before = (await locManager.LoCs(bob))[1]
    const bob_Debt_Before = (await locManager.LoCs(bob))[0]

    // confirm Bob is last LoC in list, and has >110% ICR
    assert.equal((await sortedLoCs.getLast()).toString(), bob)
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gt(mv._MCR))

    // L1: Try to liquidate Bob. Nothing happens
    await assertRevert(locManager.liquidate(bob, { from: owner }), "LoCManager: nothing to liquidate")

    //Check SP ZUSD has been completely emptied
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), dec(100, 18))

    // Check Bob remains active
    assert.isTrue(await sortedLoCs.contains(bob))

    // Check Bob's collateral and debt remains the same
    const bob_Coll_After = (await locManager.LoCs(bob))[1]
    const bob_Debt_After = (await locManager.LoCs(bob))[0]
    assert.isTrue(bob_Coll_After.eq(bob_Coll_Before))
    assert.isTrue(bob_Debt_After.eq(bob_Debt_Before))

    const bob_ICR_After = (await locManager.getCurrentICR(bob, price)).toString()

    // check Bob's ICR has not changed
    assert.equal(bob_ICR_After, bob_ICR_Before)


    // to compensate origination fees
    await zusdToken.transfer(bob, dec(100, 18), { from: alice })

    // Remove Bob from system to test Carol's loc: price rises, Bob closes loc, price drops to 100 again
    await priceFeed.setPrice(dec(200, 18))
    await borrowerOperations.closeLoC({ from: bob })
    await priceFeed.setPrice(dec(100, 18))
    assert.isFalse(await sortedLoCs.contains(bob))

    // Alice provides another 50 ZUSD to pool
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, { from: alice })

    assert.isTrue(await th.checkRecoveryMode(contracts))

    const carol_Coll_Before = (await locManager.LoCs(carol))[1]
    const carol_Debt_Before = (await locManager.LoCs(carol))[0]

    // Confirm Carol is last LoC in list, and has >110% ICR
    assert.equal((await sortedLoCs.getLast()), carol)
    assert.isTrue((await locManager.getCurrentICR(carol, price)).gt(mv._MCR))

    // L2: Try to liquidate Carol. Nothing happens
    await assertRevert(locManager.liquidate(carol), "LoCManager: nothing to liquidate")

    //Check SP ZUSD has been completely emptied
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), dec(150, 18))

    // Check Carol's collateral and debt remains the same
    const carol_Coll_After = (await locManager.LoCs(carol))[1]
    const carol_Debt_After = (await locManager.LoCs(carol))[0]
    assert.isTrue(carol_Coll_After.eq(carol_Coll_Before))
    assert.isTrue(carol_Debt_After.eq(carol_Debt_Before))

    const carol_ICR_After = (await locManager.getCurrentICR(carol, price)).toString()

    // check Carol's ICR has not changed
    assert.equal(carol_ICR_After, carol_ICR_Before)

    //Confirm liquidations have not led to any redistributions to locs
    const L_ZUSDDebt_After = (await locManager.L_ZUSDDebt()).toString()
    const L_BTC_After = (await locManager.L_BTC()).toString()

    assert.equal(L_ZUSDDebt_After, '0')
    assert.equal(L_BTC_After, '0')
  })

  it("liquidate() with ICR > 110%, and StabilityPool ZUSD < liquidated debt: total liquidated coll and debt is correct", async () => {
    // Whale provides 50 ZUSD to the SP
    await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(50, 18), extraParams: { from: whale } })
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, { from: whale })

    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(202, 16)), extraParams: { from: bob } })
    const { collateral: C_coll } = await openLoC({ ICR: toBN(dec(204, 16)), extraParams: { from: carol } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    const { collateral: E_coll } = await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check C is in range 110% < ICR < 150%
    const ICR_A = await locManager.getCurrentICR(alice, price)
    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(await th.getTCR(contracts)))

    const entireSystemCollBefore = await locManager.getEntireSystemColl()
    const entireSystemDebtBefore = await locManager.getEntireSystemDebt()

    // Try to liquidate Alice
    await assertRevert(locManager.liquidate(alice), "LoCManager: nothing to liquidate")

    // Expect system debt and system coll not reduced
    const entireSystemCollAfter = await locManager.getEntireSystemColl()
    const entireSystemDebtAfter = await locManager.getEntireSystemDebt()

    const changeInEntireSystemColl = entireSystemCollBefore.sub(entireSystemCollAfter)
    const changeInEntireSystemDebt = entireSystemDebtBefore.sub(entireSystemDebtAfter)

    assert.equal(changeInEntireSystemColl, '0')
    assert.equal(changeInEntireSystemDebt, '0')
  })

  // --- 

  it("liquidate(): Doesn't liquidate undercollateralized LoC if it is the only LoC in the system", async () => {
    // Alice creates a single LoC with 0.62 BTC and a debt of 62 ZUSD, and provides 10 ZUSD to SP
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, { from: alice })

    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Set BTC:USD price to 105
    await priceFeed.setPrice('105000000000000000000')
    const price = await priceFeed.getPrice()

    assert.isTrue(await th.checkRecoveryMode(contracts))

    const alice_ICR = (await locManager.getCurrentICR(alice, price)).toString()
    assert.equal(alice_ICR, '1050000000000000000')

    const activeLoCsCount_Before = await locManager.getLoCOwnersCount()

    assert.equal(activeLoCsCount_Before, 1)

    // Try to liquidate the loc
    await assertRevert(locManager.liquidate(alice, { from: owner }), "LoCManager: nothing to liquidate")

    // Check Alice's LoC has not been removed
    const activeLoCsCount_After = await locManager.getLoCOwnersCount()
    assert.equal(activeLoCsCount_After, 1)

    const alice_isInSortedList = await sortedLoCs.contains(alice)
    assert.isTrue(alice_isInSortedList)
  })

  it("liquidate(): Liquidates undercollateralized LoC if there are two locs in the system", async () => {
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: bob } })

    // Alice creates a single LoC with 0.62 BTC and a debt of 62 ZUSD, and provides 10 ZUSD to SP
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })

    // Alice proves 10 ZUSD to SP
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, { from: alice })

    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Set BTC:USD price to 105
    await priceFeed.setPrice('105000000000000000000')
    const price = await priceFeed.getPrice()

    assert.isTrue(await th.checkRecoveryMode(contracts))

    const alice_ICR = (await locManager.getCurrentICR(alice, price)).toString()
    assert.equal(alice_ICR, '1050000000000000000')

    const activeLoCsCount_Before = await locManager.getLoCOwnersCount()

    assert.equal(activeLoCsCount_Before, 2)

    // Liquidate the loc
    await locManager.liquidate(alice, { from: owner })

    // Check Alice's LoC is removed, and bob remains
    const activeLoCsCount_After = await locManager.getLoCOwnersCount()
    assert.equal(activeLoCsCount_After, 1)

    const alice_isInSortedList = await sortedLoCs.contains(alice)
    assert.isFalse(alice_isInSortedList)

    const bob_isInSortedList = await sortedLoCs.contains(bob)
    assert.isTrue(bob_isInSortedList)
  })

  it("liquidate(): does nothing if LoC has >= 110% ICR and the Stability Pool is empty", async () => {
    await openLoC({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(220, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(266, 16)), extraParams: { from: carol } })

    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const TCR_Before = (await th.getTCR(contracts)).toString()
    const listSize_Before = (await sortedLoCs.getSize()).toString()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check Bob's ICR > 110%
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gte(mv._MCR))

    // Confirm SP is empty
    const ZUSDinSP = (await stabilityPool.getTotalZUSDDeposits()).toString()
    assert.equal(ZUSDinSP, '0')

    // Attempt to liquidate bob
    await assertRevert(locManager.liquidate(bob), "LoCManager: nothing to liquidate")

    // check A, B, C remain active
    assert.isTrue((await sortedLoCs.contains(bob)))
    assert.isTrue((await sortedLoCs.contains(alice)))
    assert.isTrue((await sortedLoCs.contains(carol)))

    const TCR_After = (await th.getTCR(contracts)).toString()
    const listSize_After = (await sortedLoCs.getSize()).toString()

    // Check TCR and list size have not changed
    assert.equal(TCR_Before, TCR_After)
    assert.equal(listSize_Before, listSize_After)
  })

  it("liquidate(): does nothing if LoC ICR >= TCR, and SP covers LoC's debt", async () => { 
    await openLoC({ ICR: toBN(dec(166, 16)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(154, 16)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(142, 16)), extraParams: { from: C } })

    // C fills SP with 130 ZUSD
    await stabilityPool.provideToSP(dec(130, 18), ZERO_ADDRESS, {from: C})

    await priceFeed.setPrice(dec(150, 18))
    const price = await priceFeed.getPrice()
    assert.isTrue(await th.checkRecoveryMode(contracts))

    const TCR = await th.getTCR(contracts)

    const ICR_A = await locManager.getCurrentICR(A, price)
    const ICR_B = await locManager.getCurrentICR(B, price)
    const ICR_C = await locManager.getCurrentICR(C, price)

    assert.isTrue(ICR_A.gt(TCR))
    // Try to liquidate A
    await assertRevert(locManager.liquidate(A), "LoCManager: nothing to liquidate")

    // Check liquidation of A does nothing - LoC remains in system
    assert.isTrue(await sortedLoCs.contains(A))
    assert.equal(await locManager.getLoCStatus(A), 1) // Status 1 -> active

    // Check C, with ICR < TCR, can be liquidated
    assert.isTrue(ICR_C.lt(TCR))
    const liqTxC = await locManager.liquidate(C)
    assert.isTrue(liqTxC.receipt.status)

    assert.isFalse(await sortedLoCs.contains(C))
    assert.equal(await locManager.getLoCStatus(C), 3) // Status liquidated
  })

  it("liquidate(): reverts if LoC is non-existent", async () => {
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: bob } })

    await priceFeed.setPrice(dec(100, 18))

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check Carol does not have an existing loc
    assert.equal(await locManager.getLoCStatus(carol), 0)
    assert.isFalse(await sortedLoCs.contains(carol))

    try {
      await locManager.liquidate(carol)

      assert.isFalse(txCarol.receipt.status)
    } catch (err) {
      assert.include(err.message, "revert")
    }
  })

  it("liquidate(): reverts if LoC has been closed", async () => {
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: carol } })

    assert.isTrue(await sortedLoCs.contains(carol))

    // Price drops, Carol ICR falls below MCR
    await priceFeed.setPrice(dec(100, 18))

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Carol liquidated, and her LoC is closed
    const txCarol_L1 = await locManager.liquidate(carol)
    assert.isTrue(txCarol_L1.receipt.status)

    // Check Carol's LoC is closed by liquidation
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.equal(await locManager.getLoCStatus(carol), 3)

    try {
      await locManager.liquidate(carol)
    } catch (err) {
      assert.include(err.message, "revert")
    }
  })

  it("liquidate(): liquidates based on entire/collateral debt (including pending rewards), not raw collateral/debt", async () => {
    await openLoC({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(220, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })

    // Defaulter opens with 60 ZUSD, 0.6 BTC
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    const alice_ICR_Before = await locManager.getCurrentICR(alice, price)
    const bob_ICR_Before = await locManager.getCurrentICR(bob, price)
    const carol_ICR_Before = await locManager.getCurrentICR(carol, price)

    /* Before liquidation: 
    Alice ICR: = (1 * 100 / 50) = 200%
    Bob ICR: (1 * 100 / 90.5) = 110.5%
    Carol ICR: (1 * 100 / 100 ) =  100%

    Therefore Alice and Bob above the MCR, Carol is below */
    assert.isTrue(alice_ICR_Before.gte(mv._MCR))
    assert.isTrue(bob_ICR_Before.gte(mv._MCR))
    assert.isTrue(carol_ICR_Before.lte(mv._MCR))

    // Liquidate defaulter. 30 ZUSD and 0.3 BTC is distributed uniformly between A, B and C. Each receive 10 ZUSD, 0.1 BTC
    await locManager.liquidate(defaulter_1)

    const alice_ICR_After = await locManager.getCurrentICR(alice, price)
    const bob_ICR_After = await locManager.getCurrentICR(bob, price)
    const carol_ICR_After = await locManager.getCurrentICR(carol, price)

    /* After liquidation: 

    Alice ICR: (1.1 * 100 / 60) = 183.33%
    Bob ICR:(1.1 * 100 / 100.5) =  109.45%
    Carol ICR: (1.1 * 100 ) 100%

    Check Alice is above MCR, Bob below, Carol below. */
    assert.isTrue(alice_ICR_After.gte(mv._MCR))
    assert.isTrue(bob_ICR_After.lte(mv._MCR))
    assert.isTrue(carol_ICR_After.lte(mv._MCR))

    /* Though Bob's true ICR (including pending rewards) is below the MCR, 
    check that Bob's raw coll and debt has not changed, and that his "raw" ICR is above the MCR */
    const bob_Coll = (await locManager.LoCs(bob))[1]
    const bob_Debt = (await locManager.LoCs(bob))[0]

    const bob_rawICR = bob_Coll.mul(th.toBN(dec(100, 18))).div(bob_Debt)
    assert.isTrue(bob_rawICR.gte(mv._MCR))

    //liquidate A, B, C
    await assertRevert(locManager.liquidate(alice), "LoCManager: nothing to liquidate")
    await locManager.liquidate(bob)
    await locManager.liquidate(carol)

    /*  Since there is 0 ZUSD in the stability Pool, A, with ICR >110%, should stay active.
    Check Alice stays active, Carol gets liquidated, and Bob gets liquidated 
    (because his pending rewards bring his ICR < MCR) */
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // check LoC statuses - A active (1), B and C liquidated (3)
    assert.equal((await locManager.LoCs(alice))[3].toString(), '1')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    assert.equal((await locManager.LoCs(carol))[3].toString(), '3')
  })

  it("liquidate(): does not affect the SP deposit or BTC gain when called on an SP depositor's address that has no loc", async () => {
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    const spDeposit = C_totalDebt.add(toBN(dec(1000, 18)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: bob } })

    // Bob sends tokens to Dennis, who has no loc
    await zusdToken.transfer(dennis, spDeposit, { from: bob })

    //Dennis provides 200 ZUSD to SP
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: dennis })

    // Price drop
    await priceFeed.setPrice(dec(105, 18))

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Carol gets liquidated
    await locManager.liquidate(carol)

    // Check Dennis' SP deposit has absorbed Carol's debt, and he has received her liquidated BTC
    const dennis_Deposit_Before = (await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString()
    const dennis_BTCGain_Before = (await stabilityPool.getDepositorBTCGain(dennis)).toString()
    assert.isAtMost(th.getDifference(dennis_Deposit_Before, spDeposit.sub(C_totalDebt)), 1000)
    assert.isAtMost(th.getDifference(dennis_BTCGain_Before, th.applyLiquidationFee(C_coll)), 1000)

    // Attempt to liquidate Dennis
    try {
      await locManager.liquidate(dennis)
    } catch (err) {
      assert.include(err.message, "revert")
    }

    // Check Dennis' SP deposit does not change after liquidation attempt
    const dennis_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString()
    const dennis_BTCGain_After = (await stabilityPool.getDepositorBTCGain(dennis)).toString()
    assert.equal(dennis_Deposit_Before, dennis_Deposit_After)
    assert.equal(dennis_BTCGain_Before, dennis_BTCGain_After)
  })

  it("liquidate(): does not alter the liquidated user's token balance", async () => {
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: dec(1000, 18), extraParams: { from: whale } })

    const { zusdAmount: A_zusdAmount } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(300, 18), extraParams: { from: alice } })
    const { zusdAmount: B_zusdAmount } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(200, 18), extraParams: { from: bob } })
    const { zusdAmount: C_zusdAmount } = await openLoC({ ICR: toBN(dec(206, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: carol } })

    await priceFeed.setPrice(dec(105, 18))

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check token balances 
    assert.equal((await zusdToken.balanceOf(alice)).toString(), A_zusdAmount)
    assert.equal((await zusdToken.balanceOf(bob)).toString(), B_zusdAmount)
    assert.equal((await zusdToken.balanceOf(carol)).toString(), C_zusdAmount)

    // Check sortedList size is 4
    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Liquidate A, B and C
    await locManager.liquidate(alice)
    await locManager.liquidate(bob)
    await locManager.liquidate(carol)

    // Confirm A, B, C closed
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // Check sortedList size reduced to 1
    assert.equal((await sortedLoCs.getSize()).toString(), '1')

    // Confirm token balances have not changed
    assert.equal((await zusdToken.balanceOf(alice)).toString(), A_zusdAmount)
    assert.equal((await zusdToken.balanceOf(bob)).toString(), B_zusdAmount)
    assert.equal((await zusdToken.balanceOf(carol)).toString(), C_zusdAmount)
  })

  it("liquidate(), with 110% < ICR < TCR, can claim collateral, re-open, be reedemed and claim again", async () => {
    // --- SETUP ---
    // Alice withdraws up to 1500 ZUSD of debt, resulting in ICRs of 266%.
    // Bob withdraws up to 480 ZUSD of debt, resulting in ICR of 240%. Bob has lowest ICR.
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: dec(480, 18), extraParams: { from: bob } })
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_totalDebt, extraParams: { from: alice } })

    // Alice deposits ZUSD in the Stability Pool
    await stabilityPool.provideToSP(B_totalDebt, ZERO_ADDRESS, { from: alice })

    // --- TEST ---
    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    let price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's ICR is between 110 and TCR
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gt(mv._MCR) && bob_ICR.lt(TCR))

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    // check Bob’s collateral surplus: 5.76 * 100 - 480 * 1.1
    const bob_remainingCollateral = B_coll.sub(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_remainingCollateral)
    // can claim collateral
    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(th.toBN(bob_remainingCollateral)))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Bob re-opens the loc, price 200, total debt 80 ZUSD, ICR = 120% (lowest one)
    // Dennis redeems 30, so Bob has a surplus of (200 * 0.48 - 30) / 200 = 0.33 BTC
    await priceFeed.setPrice('200000000000000000000')
    const { collateral: B_coll_2, netDebt: B_netDebt_2 } = await openLoC({ ICR: toBN(dec(150, 16)), extraZUSDAmount: dec(480, 18), extraParams: { from: bob, value: bob_remainingCollateral } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_netDebt_2, extraParams: { from: dennis } })
    await th.redeemCollateral(dennis, contracts, B_netDebt_2)
    price = await priceFeed.getPrice()
    const bob_surplus = B_coll_2.sub(B_netDebt_2.mul(mv._1e18BN).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_surplus)
    // can claim collateral
    const bob_balanceBefore_2 = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter_2 = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter_2, bob_balanceBefore_2.add(th.toBN(bob_surplus)))
  })

  it("liquidate(), with 110% < ICR < TCR, can claim collateral, after another claim from a redemption", async () => {
    // --- SETUP ---
    // Bob withdraws up to 90 ZUSD of debt, resulting in ICR of 222%
    const { collateral: B_coll, netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraZUSDAmount: dec(90, 18), extraParams: { from: bob } })
    // Dennis withdraws to 150 ZUSD of debt, resulting in ICRs of 266%.
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_netDebt, extraParams: { from: dennis } })

    // --- TEST ---
    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 40, so Bob has a surplus of (200 * 1 - 40) / 200 = 0.8 BTC
    await th.redeemCollateral(dennis, contracts, B_netDebt)
    let price = await priceFeed.getPrice()
    const bob_surplus = B_coll.sub(B_netDebt.mul(mv._1e18BN).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_surplus)

    // can claim collateral
    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(bob_surplus))

    // Bob re-opens the loc, price 200, total debt 250 ZUSD, ICR = 240% (lowest one)
    const { collateral: B_coll_2, totalDebt: B_totalDebt_2 } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: bob, value: _3_Ether } })
    // Alice deposits ZUSD in the Stability Pool
    await openLoC({ ICR: toBN(dec(266, 16)), extraZUSDAmount: B_totalDebt_2, extraParams: { from: alice } })
    await stabilityPool.provideToSP(B_totalDebt_2, ZERO_ADDRESS, { from: alice })

    // price drops to 1BTC:100ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('100000000000000000000')
    price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    const recoveryMode = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode)

    // Check Bob's ICR is between 110 and TCR
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gt(mv._MCR) && bob_ICR.lt(TCR))
    // debt is increased by fee, due to previous redemption
    const bob_debt = await locManager.getLoCDebt(bob)

    // Liquidate Bob
    await locManager.liquidate(bob, { from: owner })

    // check Bob’s collateral surplus
    const bob_remainingCollateral = B_coll_2.sub(B_totalDebt_2.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual((await collSurplusPool.getCollateral(bob)).toString(), bob_remainingCollateral.toString())

    // can claim collateral
    const bob_balanceBefore_2 = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter_2 = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter_2, bob_balanceBefore_2.add(th.toBN(bob_remainingCollateral)))
  })

  // --- liquidateLoCs ---

  it("liquidateLoCs(): With all ICRs > 110%, Liquidates LoCs until system leaves recovery mode", async () => {
    // make 8 LoCs accordingly
    // --- SETUP ---

    // Everyone withdraws some ZUSD from their LoC, resulting in different ICRs
    await openLoC({ ICR: toBN(dec(350, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(286, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(273, 16)), extraParams: { from: dennis } })
    const { totalDebt: E_totalDebt } = await openLoC({ ICR: toBN(dec(261, 16)), extraParams: { from: erin } })
    const { totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: freddy } })
    const { totalDebt: G_totalDebt } = await openLoC({ ICR: toBN(dec(235, 16)), extraParams: { from: greta } })
    const { totalDebt: H_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraZUSDAmount: dec(5000, 16), extraParams: { from: harry } })
    const liquidationAmount = E_totalDebt.add(F_totalDebt).add(G_totalDebt).add(H_totalDebt)
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: liquidationAmount, extraParams: { from: alice } })

    // Alice deposits ZUSD to Stability Pool
    await stabilityPool.provideToSP(liquidationAmount, ZERO_ADDRESS, { from: alice })

    // price drops
    // price drops to 1BTC:90ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('90000000000000000000')
    const price = await priceFeed.getPrice()

    const recoveryMode_Before = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode_Before)

    // check TCR < 150%
    const _150percent = web3.utils.toBN('1500000000000000000')
    const TCR_Before = await th.getTCR(contracts)
    assert.isTrue(TCR_Before.lt(_150percent))

    /* 
   After the price drop and prior to any liquidations, ICR should be:

    LoC         ICR
    Alice       161%
    Bob         158%
    Carol       129%
    Dennis      123%
    Elisa       117%
    Freddy      113%
    Greta       106%
    Harry       100%

    */
    const alice_ICR = await locManager.getCurrentICR(alice, price)
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    const carol_ICR = await locManager.getCurrentICR(carol, price)
    const dennis_ICR = await locManager.getCurrentICR(dennis, price)
    const erin_ICR = await locManager.getCurrentICR(erin, price)
    const freddy_ICR = await locManager.getCurrentICR(freddy, price)
    const greta_ICR = await locManager.getCurrentICR(greta, price)
    const harry_ICR = await locManager.getCurrentICR(harry, price)
    const TCR = await th.getTCR(contracts)

    // Alice and Bob should have ICR > TCR
    assert.isTrue(alice_ICR.gt(TCR))
    assert.isTrue(bob_ICR.gt(TCR))
    // All other LoCs should have ICR < TCR
    assert.isTrue(carol_ICR.lt(TCR))
    assert.isTrue(dennis_ICR.lt(TCR))
    assert.isTrue(erin_ICR.lt(TCR))
    assert.isTrue(freddy_ICR.lt(TCR))
    assert.isTrue(greta_ICR.lt(TCR))
    assert.isTrue(harry_ICR.lt(TCR))

    /* Liquidations should occur from the lowest ICR LoC upwards, i.e. 
    1) Harry, 2) Greta, 3) Freddy, etc.

      LoC         ICR
    Alice       161%
    Bob         158%
    Carol       129%
    Dennis      123%
    Elisa       117%
    ---- CUTOFF ----
    Freddy      113%
    Greta       106%
    Harry       100%

    If all LoCs below the cutoff are liquidated, the TCR of the system rises above the CCR, to 152%.  (see calculations in Google Sheet)

    Thus, after liquidateLoCs(), expect all LoCs to be liquidated up to the cut-off.
    
    Note: Originally Erin LoC was liquidate but after changing the parameters it isn't. The numbers make sense but we don't have
          the Google Sheet to verify.
    
    Only Alice, Bob, Carol and Dennis should remain active - all others should be closed. */

    await locManager.liquidateLoCs(10);

    // check system is no longer in Recovery Mode
    const recoveryMode_After = await th.checkRecoveryMode(contracts)
    assert.isFalse(recoveryMode_After)

    // After liquidation, TCR should rise to above 150%. 
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gt(_150percent))

    // get all LoCs
    const alice_LoC = await locManager.LoCs(alice)
    const bob_LoC = await locManager.LoCs(bob)
    const carol_LoC = await locManager.LoCs(carol)
    const dennis_LoC = await locManager.LoCs(dennis)
    const erin_LoC = await locManager.LoCs(erin)
    const freddy_LoC = await locManager.LoCs(freddy)
    const greta_LoC = await locManager.LoCs(greta)
    const harry_LoC = await locManager.LoCs(harry)

    // check that Alice, Bob, Carol, & Dennis' LoCs remain active
    assert.equal(alice_LoC[3], 1)
    assert.equal(bob_LoC[3], 1)
    assert.equal(carol_LoC[3], 1)
    assert.equal(dennis_LoC[3], 1)
    assert.equal(erin_LoC[3], 1)
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(erin))

    // check all other LoCs are liquidated
    assert.equal(freddy_LoC[3], 3)
    assert.equal(greta_LoC[3], 3)
    assert.equal(harry_LoC[3], 3)
    assert.isFalse(await sortedLoCs.contains(freddy))
    assert.isFalse(await sortedLoCs.contains(greta))
    assert.isFalse(await sortedLoCs.contains(harry))
  })

  it("liquidateLoCs(): Liquidates LoCs until 1) system has left recovery mode AND 2) it reaches a LoC with ICR >= 110%", async () => {
    // make 6 LoCs accordingly
    // --- SETUP ---
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(230, 16)), extraParams: { from: dennis } })
    const { totalDebt: E_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: erin } })
    const { totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: freddy } })

    const liquidationAmount = B_totalDebt.add(C_totalDebt).add(D_totalDebt).add(E_totalDebt).add(F_totalDebt)
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: liquidationAmount, extraParams: { from: alice } })

    // Alice deposits ZUSD to Stability Pool
    await stabilityPool.provideToSP(liquidationAmount, ZERO_ADDRESS, { from: alice })

    // price drops to 1BTC:85ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('85000000000000000000')
    const price = await priceFeed.getPrice()

    // check Recovery Mode kicks in

    const recoveryMode_Before = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode_Before)

    // check TCR < 150%
    const _150percent = web3.utils.toBN('1500000000000000000')
    const TCR_Before = await th.getTCR(contracts)
    assert.isTrue(TCR_Before.lt(_150percent))

    /* 
   After the price drop and prior to any liquidations, ICR should be:

    LoC         ICR
    Alice       182%
    Bob         102%
    Carol       102%
    Dennis      102%
    Elisa       102%
    Freddy      102%
    */
    alice_ICR = await locManager.getCurrentICR(alice, price)
    bob_ICR = await locManager.getCurrentICR(bob, price)
    carol_ICR = await locManager.getCurrentICR(carol, price)
    dennis_ICR = await locManager.getCurrentICR(dennis, price)
    erin_ICR = await locManager.getCurrentICR(erin, price)
    freddy_ICR = await locManager.getCurrentICR(freddy, price)

    // Alice should have ICR > 150%
    assert.isTrue(alice_ICR.gt(_150percent))
    // All other LoCs should have ICR < 150%
    assert.isTrue(carol_ICR.lt(_150percent))
    assert.isTrue(dennis_ICR.lt(_150percent))
    assert.isTrue(erin_ICR.lt(_150percent))
    assert.isTrue(freddy_ICR.lt(_150percent))

    /* Liquidations should occur from the lowest ICR LoC upwards, i.e. 
    1) Freddy, 2) Elisa, 3) Dennis.

    After liquidating Freddy and Elisa, the the TCR of the system rises above the CCR, to 154%.  
   (see calculations in Google Sheet)

    Liquidations continue until all LoCs with ICR < MCR have been closed. 
    Only Alice should remain active - all others should be closed. */

    // call liquidate LoCs
    await locManager.liquidateLoCs(6);

    // check system is no longer in Recovery Mode
    const recoveryMode_After = await th.checkRecoveryMode(contracts)
    assert.isFalse(recoveryMode_After)

    // After liquidation, TCR should rise to above 150%. 
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gt(_150percent))

    // get all LoCs
    const alice_LoC = await locManager.LoCs(alice)
    const bob_LoC = await locManager.LoCs(bob)
    const carol_LoC = await locManager.LoCs(carol)
    const dennis_LoC = await locManager.LoCs(dennis)
    const erin_LoC = await locManager.LoCs(erin)
    const freddy_LoC = await locManager.LoCs(freddy)

    // check that Alice's LoC remains active
    assert.equal(alice_LoC[3], 1)
    assert.isTrue(await sortedLoCs.contains(alice))

    // check all other LoCs are liquidated
    assert.equal(bob_LoC[3], 3)
    assert.equal(carol_LoC[3], 3)
    assert.equal(dennis_LoC[3], 3)
    assert.equal(erin_LoC[3], 3)
    assert.equal(freddy_LoC[3], 3)

    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(freddy))
  })

  it('liquidateLoCs(): liquidates only up to the requested number of undercollateralized locs', async () => {
    await openLoC({ ICR: toBN(dec(300, 16)), extraParams: { from: whale, value: dec(300, 'ether') } })

    // --- SETUP --- 
    // Alice, Bob, Carol, Dennis, Erin open locs with consecutively increasing collateral ratio
    await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(214, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(216, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(218, 16)), extraParams: { from: erin } })

    await priceFeed.setPrice(dec(100, 18))

    const TCR = await th.getTCR(contracts)

    assert.isTrue(TCR.lte(web3.utils.toBN(dec(150, 18))))
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // --- TEST --- 

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    await locManager.liquidateLoCs(3)

    // Check system still in Recovery Mode after liquidation tx
    assert.isTrue(await th.checkRecoveryMode(contracts))

    const LoCOwnersArrayLength = await locManager.getLoCOwnersCount()
    assert.equal(LoCOwnersArrayLength, '3')

    // Check Alice, Bob, Carol locs have been closed
    const aliceLoCStatus = (await locManager.getLoCStatus(alice)).toString()
    const bobLoCStatus = (await locManager.getLoCStatus(bob)).toString()
    const carolLoCStatus = (await locManager.getLoCStatus(carol)).toString()

    assert.equal(aliceLoCStatus, '3')
    assert.equal(bobLoCStatus, '3')
    assert.equal(carolLoCStatus, '3')

    //  Check Alice, Bob, and Carol's LoC are no longer in the sorted list
    const alice_isInSortedList = await sortedLoCs.contains(alice)
    const bob_isInSortedList = await sortedLoCs.contains(bob)
    const carol_isInSortedList = await sortedLoCs.contains(carol)

    assert.isFalse(alice_isInSortedList)
    assert.isFalse(bob_isInSortedList)
    assert.isFalse(carol_isInSortedList)

    // Check Dennis, Erin still have active locs
    const dennisLoCStatus = (await locManager.getLoCStatus(dennis)).toString()
    const erinLoCStatus = (await locManager.getLoCStatus(erin)).toString()

    assert.equal(dennisLoCStatus, '1')
    assert.equal(erinLoCStatus, '1')

    // Check Dennis, Erin still in sorted list
    const dennis_isInSortedList = await sortedLoCs.contains(dennis)
    const erin_isInSortedList = await sortedLoCs.contains(erin)

    assert.isTrue(dennis_isInSortedList)
    assert.isTrue(erin_isInSortedList)
  })

  it("liquidateLoCs(): does nothing if n = 0", async () => {
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(200, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(300, 18), extraParams: { from: carol } })

    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const TCR_Before = (await th.getTCR(contracts)).toString()

    // Confirm A, B, C ICRs are below 110%

    const alice_ICR = await locManager.getCurrentICR(alice, price)
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    const carol_ICR = await locManager.getCurrentICR(carol, price)
    assert.isTrue(alice_ICR.lte(mv._MCR))
    assert.isTrue(bob_ICR.lte(mv._MCR))
    assert.isTrue(carol_ICR.lte(mv._MCR))

    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Liquidation with n = 0
    await assertRevert(locManager.liquidateLoCs(0), "LoCManager: nothing to liquidate")

    // Check all locs are still in the system
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))

    const TCR_After = (await th.getTCR(contracts)).toString()

    // Check TCR has not changed after liquidation
    assert.equal(TCR_Before, TCR_After)
  })

  it('liquidateLoCs(): closes every LoC with ICR < MCR, when n > number of undercollateralized locs', async () => {
    // --- SETUP --- 
    await openLoC({ ICR: toBN(dec(300, 16)), extraParams: { from: whale, value: dec(300, 'ether') } })

    // create 5 LoCs with varying ICRs
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(300, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(182, 16)), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(111, 16)), extraParams: { from: freddy } })

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(dec(300, 16), ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing Bob and Carol's ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm locs A-E are ICR < 110%
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(erin, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(freddy, price)).lte(mv._MCR))

    // Confirm Whale is ICR > 110% 
    assert.isTrue((await locManager.getCurrentICR(whale, price)).gte(mv._MCR))

    // Liquidate 5 locs
    await locManager.liquidateLoCs(5);

    // Confirm locs A-E have been removed from the system
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(freddy))

    // Check all locs are now liquidated
    assert.equal((await locManager.LoCs(alice))[3].toString(), '3')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    assert.equal((await locManager.LoCs(carol))[3].toString(), '3')
    assert.equal((await locManager.LoCs(erin))[3].toString(), '3')
    assert.equal((await locManager.LoCs(freddy))[3].toString(), '3')
  })

  it("liquidateLoCs(): a liquidation sequence containing Pool offsets increases the TCR", async () => {
    // Whale provides 500 ZUSD to SP
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(500, 18), extraParams: { from: whale } })
    await stabilityPool.provideToSP(dec(500, 18), ZERO_ADDRESS, { from: whale })

    await openLoC({ ICR: toBN(dec(300, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(320, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(340, 16)), extraParams: { from: dennis } })

    await openLoC({ ICR: toBN(dec(198, 16)), extraZUSDAmount: dec(101, 18), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(184, 16)), extraZUSDAmount: dec(217, 18), extraParams: { from: defaulter_2 } })
    await openLoC({ ICR: toBN(dec(183, 16)), extraZUSDAmount: dec(328, 18), extraParams: { from: defaulter_3 } })
    await openLoC({ ICR: toBN(dec(186, 16)), extraZUSDAmount: dec(431, 18), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedLoCs.contains(defaulter_1)))
    assert.isTrue((await sortedLoCs.contains(defaulter_2)))
    assert.isTrue((await sortedLoCs.contains(defaulter_3)))
    assert.isTrue((await sortedLoCs.contains(defaulter_4)))


    // Price drops
    await priceFeed.setPrice(dec(110, 18))
    const price = await priceFeed.getPrice()

    assert.isTrue(await th.ICRbetween100and110(defaulter_1, locManager, price))
    assert.isTrue(await th.ICRbetween100and110(defaulter_2, locManager, price))
    assert.isTrue(await th.ICRbetween100and110(defaulter_3, locManager, price))
    assert.isTrue(await th.ICRbetween100and110(defaulter_4, locManager, price))

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    const TCR_Before = await th.getTCR(contracts)

    // Check Stability Pool has 500 ZUSD
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), dec(500, 18))

    await locManager.liquidateLoCs(8)

    // assert.isFalse((await sortedLoCs.contains(defaulter_1)))
    // assert.isFalse((await sortedLoCs.contains(defaulter_2)))
    // assert.isFalse((await sortedLoCs.contains(defaulter_3)))
    assert.isFalse((await sortedLoCs.contains(defaulter_4)))

    // Check Stability Pool has been emptied by the liquidations
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), '0')

    // Check that the liquidation sequence has improved the TCR
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gte(TCR_Before))
  })

  it("liquidateLoCs(): A liquidation sequence of pure redistributions decreases the TCR, due to gas compensation, but up to 0.5%", async () => {
    const { collateral: W_coll, totalDebt: W_totalDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraZUSDAmount: dec(500, 18), extraParams: { from: whale } })

    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(300, 16)), extraParams: { from: alice } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(400, 16)), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(600, 16)), extraParams: { from: dennis } })

    const { collateral: d1_coll, totalDebt: d1_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraZUSDAmount: dec(101, 18), extraParams: { from: defaulter_1 } })
    const { collateral: d2_coll, totalDebt: d2_totalDebt } = await openLoC({ ICR: toBN(dec(184, 16)), extraZUSDAmount: dec(217, 18), extraParams: { from: defaulter_2 } })
    const { collateral: d3_coll, totalDebt: d3_totalDebt } = await openLoC({ ICR: toBN(dec(183, 16)), extraZUSDAmount: dec(328, 18), extraParams: { from: defaulter_3 } })
    const { collateral: d4_coll, totalDebt: d4_totalDebt } = await openLoC({ ICR: toBN(dec(166, 16)), extraZUSDAmount: dec(431, 18), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedLoCs.contains(defaulter_1)))
    assert.isTrue((await sortedLoCs.contains(defaulter_2)))
    assert.isTrue((await sortedLoCs.contains(defaulter_3)))
    assert.isTrue((await sortedLoCs.contains(defaulter_4)))

    // Price drops
    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price)

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    const TCR_Before = await th.getTCR(contracts)
    // (5+1+2+3+1+2+3+4)*100/(410+50+50+50+101+257+328+480)
    const totalCollBefore = W_coll.add(A_coll).add(C_coll).add(D_coll).add(d1_coll).add(d2_coll).add(d3_coll).add(d4_coll)
    const totalDebtBefore = W_totalDebt.add(A_totalDebt).add(C_totalDebt).add(D_totalDebt).add(d1_totalDebt).add(d2_totalDebt).add(d3_totalDebt).add(d4_totalDebt)
    assert.isAtMost(th.getDifference(TCR_Before, totalCollBefore.mul(price).div(totalDebtBefore)), 1000)

    // Check pool is empty before liquidation
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), '0')

    // Liquidate
    await locManager.liquidateLoCs(8)

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedLoCs.contains(defaulter_1)))
    assert.isFalse((await sortedLoCs.contains(defaulter_2)))
    assert.isFalse((await sortedLoCs.contains(defaulter_3)))
    assert.isFalse((await sortedLoCs.contains(defaulter_4)))

    // Check that the liquidation sequence has reduced the TCR
    const TCR_After = await th.getTCR(contracts)
    // ((5+1+2+3)+(1+2+3+4)*0.995)*100/(410+50+50+50+101+257+328+480)
    const totalCollAfter = W_coll.add(A_coll).add(C_coll).add(D_coll).add(th.applyLiquidationFee(d1_coll.add(d2_coll).add(d3_coll).add(d4_coll)))
    const totalDebtAfter = W_totalDebt.add(A_totalDebt).add(C_totalDebt).add(D_totalDebt).add(d1_totalDebt).add(d2_totalDebt).add(d3_totalDebt).add(d4_totalDebt)
    assert.isAtMost(th.getDifference(TCR_After, totalCollAfter.mul(price).div(totalDebtAfter)), 1000)
    assert.isTrue(TCR_Before.gte(TCR_After))
    assert.isTrue(TCR_After.gte(TCR_Before.mul(th.toBN(995)).div(th.toBN(1000))))
  })

  it("liquidateLoCs(): liquidates based on entire/collateral debt (including pending rewards), not raw collateral/debt", async () => {
    await openLoC({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(220, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })

    // Defaulter opens with 60 ZUSD, 0.6 BTC
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    const alice_ICR_Before = await locManager.getCurrentICR(alice, price)
    const bob_ICR_Before = await locManager.getCurrentICR(bob, price)
    const carol_ICR_Before = await locManager.getCurrentICR(carol, price)

    /* Before liquidation: 
    Alice ICR: = (1 * 100 / 50) = 200%
    Bob ICR: (1 * 100 / 90.5) = 110.5%
    Carol ICR: (1 * 100 / 100 ) =  100%

    Therefore Alice and Bob above the MCR, Carol is below */
    assert.isTrue(alice_ICR_Before.gte(mv._MCR))
    assert.isTrue(bob_ICR_Before.gte(mv._MCR))
    assert.isTrue(carol_ICR_Before.lte(mv._MCR))

    // Liquidate defaulter. 30 ZUSD and 0.3 BTC is distributed uniformly between A, B and C. Each receive 10 ZUSD, 0.1 BTC
    await locManager.liquidate(defaulter_1)

    const alice_ICR_After = await locManager.getCurrentICR(alice, price)
    const bob_ICR_After = await locManager.getCurrentICR(bob, price)
    const carol_ICR_After = await locManager.getCurrentICR(carol, price)

    /* After liquidation: 

    Alice ICR: (1.1 * 100 / 60) = 183.33%
    Bob ICR:(1.1 * 100 / 100.5) =  109.45%
    Carol ICR: (1.1 * 100 ) 100%

    Check Alice is above MCR, Bob below, Carol below. */
    assert.isTrue(alice_ICR_After.gte(mv._MCR))
    assert.isTrue(bob_ICR_After.lte(mv._MCR))
    assert.isTrue(carol_ICR_After.lte(mv._MCR))

    /* Though Bob's true ICR (including pending rewards) is below the MCR, 
   check that Bob's raw coll and debt has not changed, and that his "raw" ICR is above the MCR */
    const bob_Coll = (await locManager.LoCs(bob))[1]
    const bob_Debt = (await locManager.LoCs(bob))[0]

    const bob_rawICR = bob_Coll.mul(th.toBN(dec(100, 18))).div(bob_Debt)
    assert.isTrue(bob_rawICR.gte(mv._MCR))

    // Liquidate A, B, C
    await locManager.liquidateLoCs(10)

    /*  Since there is 0 ZUSD in the stability Pool, A, with ICR >110%, should stay active.
   Check Alice stays active, Carol gets liquidated, and Bob gets liquidated 
   (because his pending rewards bring his ICR < MCR) */
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // check LoC statuses - A active (1),  B and C liquidated (3)
    assert.equal((await locManager.LoCs(alice))[3].toString(), '1')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    assert.equal((await locManager.LoCs(carol))[3].toString(), '3')
  })

  it('liquidateLoCs(): does nothing if all locs have ICR > 110% and Stability Pool is empty', async () => {
    await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(285, 16)), extraParams: { from: carol } })

    // Price drops, but all locs remain active
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    assert.isTrue((await sortedLoCs.contains(alice)))
    assert.isTrue((await sortedLoCs.contains(bob)))
    assert.isTrue((await sortedLoCs.contains(carol)))

    const TCR_Before = (await th.getTCR(contracts)).toString()
    const listSize_Before = (await sortedLoCs.getSize()).toString()


    assert.isTrue((await locManager.getCurrentICR(alice, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).gte(mv._MCR))

    // Confirm 0 ZUSD in Stability Pool
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), '0')

    // Attempt liqudation sequence
    await assertRevert(locManager.liquidateLoCs(10), "LoCManager: nothing to liquidate")

    // Check all locs remain active
    assert.isTrue((await sortedLoCs.contains(alice)))
    assert.isTrue((await sortedLoCs.contains(bob)))
    assert.isTrue((await sortedLoCs.contains(carol)))

    const TCR_After = (await th.getTCR(contracts)).toString()
    const listSize_After = (await sortedLoCs.getSize()).toString()

    assert.equal(TCR_Before, TCR_After)
    assert.equal(listSize_Before, listSize_After)
  })

  it('liquidateLoCs(): emits liquidation event with correct values when all locs have ICR > 110% and Stability Pool covers a subset of locs', async () => {
    // LoCs to be absorbed by SP
    const { collateral: F_coll, totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: freddy } })
    const { collateral: G_coll, totalDebt: G_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: greta } })

    // LoCs to be spared
    await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(266, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(285, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(308, 16)), extraParams: { from: dennis } })

    // Whale adds ZUSD to SP
    const spDeposit = F_totalDebt.add(G_totalDebt)
    await openLoC({ ICR: toBN(dec(285, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops, but all locs remain active
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm all locs have ICR > MCR
    assert.isTrue((await locManager.getCurrentICR(freddy, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(greta, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(alice, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).gte(mv._MCR))

    // Confirm ZUSD in Stability Pool
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), spDeposit.toString())

    // Attempt liqudation sequence
    const liquidationTx = await locManager.liquidateLoCs(10)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTx)

    // Check F and G were liquidated
    assert.isFalse(await sortedLoCs.contains(freddy))
    assert.isFalse(await sortedLoCs.contains(greta))

    // Check whale and A-D remain active
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(whale))

    // Liquidation event emits coll = (F_debt + G_debt)/price*1.1*0.995, and debt = (F_debt + G_debt)
    th.assertIsApproximatelyEqual(liquidatedDebt, F_totalDebt.add(G_totalDebt))
    th.assertIsApproximatelyEqual(liquidatedColl, th.applyLiquidationFee(F_totalDebt.add(G_totalDebt).mul(toBN(dec(11, 17))).div(price)))

    // check collateral surplus
    const freddy_remainingCollateral = F_coll.sub(F_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const greta_remainingCollateral = G_coll.sub(G_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(freddy), freddy_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(greta), greta_remainingCollateral)

    // can claim collateral
    const freddy_balanceBefore = th.toBN(await web3.eth.getBalance(freddy))
    await borrowerOperations.claimCollateral({ from: freddy, gasPrice: 0 })
    const freddy_balanceAfter = th.toBN(await web3.eth.getBalance(freddy))
    th.assertIsApproximatelyEqual(freddy_balanceAfter, freddy_balanceBefore.add(th.toBN(freddy_remainingCollateral)))

    const greta_balanceBefore = th.toBN(await web3.eth.getBalance(greta))
    await borrowerOperations.claimCollateral({ from: greta, gasPrice: 0 })
    const greta_balanceAfter = th.toBN(await web3.eth.getBalance(greta))
    th.assertIsApproximatelyEqual(greta_balanceAfter, greta_balanceBefore.add(th.toBN(greta_remainingCollateral)))
  })

  it('liquidateLoCs():  emits liquidation event with correct values when all locs have ICR > 110% and Stability Pool covers a subset of locs, including a partial', async () => {
    // LoCs to be absorbed by SP
    const { collateral: F_coll, totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: freddy } })
    const { collateral: G_coll, totalDebt: G_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: greta } })

    // LoCs to be spared
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(266, 16)), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(285, 16)), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(308, 16)), extraParams: { from: dennis } })

    // Whale adds ZUSD to SP
    const spDeposit = F_totalDebt.add(G_totalDebt).add(A_totalDebt.div(toBN(2)))
    const { collateral: W_coll, totalDebt: W_totalDebt } = await openLoC({ ICR: toBN(dec(285, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops, but all locs remain active
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm all locs have ICR > MCR
    assert.isTrue((await locManager.getCurrentICR(freddy, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(greta, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(alice, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).gte(mv._MCR))

    // Confirm ZUSD in Stability Pool
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), spDeposit.toString())

    // Attempt liqudation sequence
    const liquidationTx = await locManager.liquidateLoCs(10)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTx)

    // Check F and G were liquidated
    assert.isFalse(await sortedLoCs.contains(freddy))
    assert.isFalse(await sortedLoCs.contains(greta))

    // Check whale and A-D remain active
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(whale))

    // Check A's collateral and debt remain the same
    const entireColl_A = (await locManager.LoCs(alice))[1].add(await locManager.getPendingBTCReward(alice))
    const entireDebt_A = (await locManager.LoCs(alice))[0].add(await locManager.getPendingZUSDDebtReward(alice))

    assert.equal(entireColl_A.toString(), A_coll)
    assert.equal(entireDebt_A.toString(), A_totalDebt)

    /* Liquidation event emits:
    coll = (F_debt + G_debt)/price*1.1*0.995
    debt = (F_debt + G_debt) */
    th.assertIsApproximatelyEqual(liquidatedDebt, F_totalDebt.add(G_totalDebt))
    th.assertIsApproximatelyEqual(liquidatedColl, th.applyLiquidationFee(F_totalDebt.add(G_totalDebt).mul(toBN(dec(11, 17))).div(price)))

    // check collateral surplus
    const freddy_remainingCollateral = F_coll.sub(F_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const greta_remainingCollateral = G_coll.sub(G_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(freddy), freddy_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(greta), greta_remainingCollateral)

    // can claim collateral
    const freddy_balanceBefore = th.toBN(await web3.eth.getBalance(freddy))
    await borrowerOperations.claimCollateral({ from: freddy, gasPrice: 0 })
    const freddy_balanceAfter = th.toBN(await web3.eth.getBalance(freddy))
    th.assertIsApproximatelyEqual(freddy_balanceAfter, freddy_balanceBefore.add(th.toBN(freddy_remainingCollateral)))

    const greta_balanceBefore = th.toBN(await web3.eth.getBalance(greta))
    await borrowerOperations.claimCollateral({ from: greta, gasPrice: 0 })
    const greta_balanceAfter = th.toBN(await web3.eth.getBalance(greta))
    th.assertIsApproximatelyEqual(greta_balanceAfter, greta_balanceBefore.add(th.toBN(greta_remainingCollateral)))
  })

  it("liquidateLoCs(): does not affect the liquidated user's token balances", async () => {
    await openLoC({ ICR: toBN(dec(300, 16)), extraParams: { from: whale } })

    // D, E, F open locs that will fall below MCR when price drops to 100
    const { zusdAmount: zusdAmountD } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: dennis } })
    const { zusdAmount: zusdAmountE } = await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: erin } })
    const { zusdAmount: zusdAmountF } = await openLoC({ ICR: toBN(dec(111, 16)), extraParams: { from: freddy } })

    // Check list size is 4
    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Check token balances before
    assert.equal((await zusdToken.balanceOf(dennis)).toString(), zusdAmountD)
    assert.equal((await zusdToken.balanceOf(erin)).toString(), zusdAmountE)
    assert.equal((await zusdToken.balanceOf(freddy)).toString(), zusdAmountF)

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    //Liquidate sequence
    await locManager.liquidateLoCs(10)

    // Check Whale remains in the system
    assert.isTrue(await sortedLoCs.contains(whale))

    // Check D, E, F have been removed
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(freddy))

    // Check token balances of users whose locs were liquidated, have not changed
    assert.equal((await zusdToken.balanceOf(dennis)).toString(), zusdAmountD)
    assert.equal((await zusdToken.balanceOf(erin)).toString(), zusdAmountE)
    assert.equal((await zusdToken.balanceOf(freddy)).toString(), zusdAmountF)
  })

  it("liquidateLoCs(): Liquidating locs at 100 < ICR < 110 with SP deposits correctly impacts their SP deposit and BTC gain", async () => {
    // Whale provides ZUSD to the SP
    const { zusdAmount: W_zusdAmount } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(4000, 18), extraParams: { from: whale } })
    await stabilityPool.provideToSP(W_zusdAmount, ZERO_ADDRESS, { from: whale })

    const { zusdAmount: A_zusdAmount, totalDebt: A_totalDebt, collateral: A_coll } = await openLoC({ ICR: toBN(dec(191, 16)), extraZUSDAmount: dec(40, 18), extraParams: { from: alice } })
    const { zusdAmount: B_zusdAmount, totalDebt: B_totalDebt, collateral: B_coll } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(240, 18), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt, collateral: C_coll} = await openLoC({ ICR: toBN(dec(209, 16)), extraParams: { from: carol } })

    // A, B provide to the SP
    await stabilityPool.provideToSP(A_zusdAmount, ZERO_ADDRESS, { from: alice })
    await stabilityPool.provideToSP(B_zusdAmount, ZERO_ADDRESS, { from: bob })

    const totalDeposit = W_zusdAmount.add(A_zusdAmount).add(B_zusdAmount)

    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Price drops
    await priceFeed.setPrice(dec(105, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check ZUSD in Pool
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), totalDeposit)

    // *** Check A, B, C ICRs 100<ICR<110
    const alice_ICR = await locManager.getCurrentICR(alice, price)
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    const carol_ICR = await locManager.getCurrentICR(carol, price)

    assert.isTrue(alice_ICR.gte(mv._ICR100) && alice_ICR.lte(mv._MCR))
    assert.isTrue(bob_ICR.gte(mv._ICR100) && bob_ICR.lte(mv._MCR))
    assert.isTrue(carol_ICR.gte(mv._ICR100) && carol_ICR.lte(mv._MCR))

    

    // Liquidate
    await locManager.liquidateLoCs(10)

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedLoCs.contains(alice)))
    assert.isFalse((await sortedLoCs.contains(bob)))
    assert.isFalse((await sortedLoCs.contains(carol)))

    // check system sized reduced to 1 locs
    assert.equal((await sortedLoCs.getSize()).toString(), '1')

    // FIXME: This text was not correct in the original test
    /* Prior to liquidation, SP deposits were:
    Whale: 400 ZUSD
    Alice:  40 ZUSD
    Bob:   240 ZUSD
    Carol: 0 ZUSD

    Total ZUSD in Pool: 680 ZUSD

    Then, liquidation hits A,B,C: 

    Total liquidated debt = 100 + 300 + 100 = 500 ZUSD
    Total liquidated BTC = 1 + 3 + 1 = 5 BTC

    Whale ZUSD Loss: 500 * (400/680) = 294.12 ZUSD
    Alice ZUSD Loss:  500 *(40/680) = 29.41 ZUSD
    Bob ZUSD Loss: 500 * (240/680) = 176.47 ZUSD

    Whale remaining deposit: (400 - 294.12) = 105.88 ZUSD
    Alice remaining deposit: (40 - 29.41) = 10.59 ZUSD
    Bob remaining deposit: (240 - 176.47) = 63.53 ZUSD

    Whale BTC Gain: 5*0.995 * (400/680) = 2.93 BTC
    Alice BTC Gain: 5*0.995 *(40/680) = 0.293 BTC
    Bob BTC Gain: 5*0.995 * (240/680) = 1.76 BTC

    Total remaining deposits: 180 ZUSD
    Total BTC gain: 5*0.995 BTC */

    const ZUSDinSP = (await stabilityPool.getTotalZUSDDeposits()).toString()
    const BTCinSP = (await stabilityPool.getBTC()).toString()

    // Check remaining ZUSD Deposits and BTC gain, for whale and depositors whose locs were liquidated
    const whale_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(whale)).toString()
    const alice_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(alice)).toString()
    const bob_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(bob)).toString()

    const whale_BTCGain = (await stabilityPool.getDepositorBTCGain(whale)).toString()
    const alice_BTCGain = (await stabilityPool.getDepositorBTCGain(alice)).toString()
    const bob_BTCGain = (await stabilityPool.getDepositorBTCGain(bob)).toString()

    const liquidatedDebt = A_totalDebt.add(B_totalDebt).add(C_totalDebt)
    const liquidatedColl = A_coll.add(B_coll).add(C_coll)
    assert.isAtMost(th.getDifference(whale_Deposit_After, W_zusdAmount.sub(liquidatedDebt.mul(W_zusdAmount).div(totalDeposit))), 100000)
    assert.isAtMost(th.getDifference(alice_Deposit_After, A_zusdAmount.sub(liquidatedDebt.mul(A_zusdAmount).div(totalDeposit))), 100000)
    assert.isAtMost(th.getDifference(bob_Deposit_After, B_zusdAmount.sub(liquidatedDebt.mul(B_zusdAmount).div(totalDeposit))), 100000)

    assert.isAtMost(th.getDifference(whale_BTCGain, th.applyLiquidationFee(liquidatedColl).mul(W_zusdAmount).div(totalDeposit)), 4000)
    assert.isAtMost(th.getDifference(alice_BTCGain, th.applyLiquidationFee(liquidatedColl).mul(A_zusdAmount).div(totalDeposit)), 4000)
    assert.isAtMost(th.getDifference(bob_BTCGain, th.applyLiquidationFee(liquidatedColl).mul(B_zusdAmount).div(totalDeposit)), 4000)

    // Check total remaining deposits and BTC gain in Stability Pool
    const total_ZUSDinSP = (await stabilityPool.getTotalZUSDDeposits()).toString()
    const total_BTCinSP = (await stabilityPool.getBTC()).toString()

    assert.isAtMost(th.getDifference(total_ZUSDinSP, totalDeposit.sub(liquidatedDebt)), 1000)
    assert.isAtMost(th.getDifference(total_BTCinSP, th.applyLiquidationFee(liquidatedColl)), 1000)
  })

  it("liquidateLoCs(): Liquidating locs at ICR <=100% with SP deposits does not alter their deposit or BTC gain", async () => {
    // Whale provides 400 ZUSD to the SP
    await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(400, 18), extraParams: { from: whale } })
    await stabilityPool.provideToSP(dec(400, 18), ZERO_ADDRESS, { from: whale })

    await openLoC({ ICR: toBN(dec(182, 16)), extraZUSDAmount: dec(170, 18), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(300, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(170, 16)), extraParams: { from: carol } })

    // A, B provide 100, 300 to the SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: alice })
    await stabilityPool.provideToSP(dec(300, 18), ZERO_ADDRESS, { from: bob })

    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check ZUSD and BTC in Pool  before
    const ZUSDinSP_Before = (await stabilityPool.getTotalZUSDDeposits()).toString()
    const BTCinSP_Before = (await stabilityPool.getBTC()).toString()
    assert.equal(ZUSDinSP_Before, dec(800, 18))
    assert.equal(BTCinSP_Before, '0')

    // *** Check A, B, C ICRs < 100
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lte(mv._ICR100))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lte(mv._ICR100))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lte(mv._ICR100))

    // Liquidate
    await locManager.liquidateLoCs(10)

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedLoCs.contains(alice)))
    assert.isFalse((await sortedLoCs.contains(bob)))
    assert.isFalse((await sortedLoCs.contains(carol)))

    // check system sized reduced to 1 locs
    assert.equal((await sortedLoCs.getSize()).toString(), '1')

    // Check ZUSD and BTC in Pool after
    const ZUSDinSP_After = (await stabilityPool.getTotalZUSDDeposits()).toString()
    const BTCinSP_After = (await stabilityPool.getBTC()).toString()
    assert.equal(ZUSDinSP_Before, ZUSDinSP_After)
    assert.equal(BTCinSP_Before, BTCinSP_After)

    // Check remaining ZUSD Deposits and BTC gain, for whale and depositors whose locs were liquidated
    const whale_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(whale)).toString()
    const alice_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(alice)).toString()
    const bob_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(bob)).toString()

    const whale_BTCGain_After = (await stabilityPool.getDepositorBTCGain(whale)).toString()
    const alice_BTCGain_After = (await stabilityPool.getDepositorBTCGain(alice)).toString()
    const bob_BTCGain_After = (await stabilityPool.getDepositorBTCGain(bob)).toString()

    assert.equal(whale_Deposit_After, dec(400, 18))
    assert.equal(alice_Deposit_After, dec(100, 18))
    assert.equal(bob_Deposit_After, dec(300, 18))

    assert.equal(whale_BTCGain_After, '0')
    assert.equal(alice_BTCGain_After, '0')
    assert.equal(bob_BTCGain_After, '0')
  })

  it("liquidateLoCs() with a non fullfilled liquidation: non liquidated LoC remains active", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D, E locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    /* Liquidate locs. LoCs are ordered by ICR, from low to high:  A, B, C, D, E.
    With 253 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated. 
    That leaves 50 ZUSD in the Pool to absorb exactly half of Carol's debt (100) */
    await locManager.liquidateLoCs(10)

    // Check A and B closed
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))

    // Check C remains active
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.equal((await locManager.LoCs(carol))[3].toString(), '1') // check Status is active
  })

  it("liquidateLoCs() with a non fullfilled liquidation: non liquidated LoC remains in LoCOwners Array", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(211, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    /* Liquidate locs. LoCs are ordered by ICR, from low to high:  A, B, C.
    With 253 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated. 
    That leaves 50 ZUSD in the Pool to absorb exactly half of Carol's debt (100) */
    await locManager.liquidateLoCs(10)

    // Check C is in LoC owners array
    const arrayLength = (await locManager.getLoCOwnersCount()).toNumber()
    let addressFound = false;
    let addressIdx = 0;

    for (let i = 0; i < arrayLength; i++) {
      const address = (await locManager.LoCOwners(i)).toString()
      if (address == carol) {
        addressFound = true
        addressIdx = i
      }
    }

    assert.isTrue(addressFound);

    // Check LoCOwners idx on LoC struct == idx of address found in LoCOwners array
    const idxOnStruct = (await locManager.LoCs(carol))[4].toString()
    assert.equal(addressIdx.toString(), idxOnStruct)
  })

  it("liquidateLoCs() with a non fullfilled liquidation: still can liquidate further locs after the non-liquidated, emptied pool", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: D_totalDebt, extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(D_totalDebt)
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D, E locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)
    const ICR_D = await locManager.getCurrentICR(dennis, price)
    const ICR_E = await locManager.getCurrentICR(erin, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))
    assert.isTrue(ICR_D.gt(mv._MCR) && ICR_D.lt(TCR))
    assert.isTrue(ICR_E.gt(mv._MCR) && ICR_E.lt(TCR))

    /* Liquidate locs. LoCs are ordered by ICR, from low to high:  A, B, C, D, E.
     With 300 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated.
     That leaves 97 ZUSD in the Pool that won’t be enough to absorb Carol,
     but it will be enough to liquidate Dennis. Afterwards the pool will be empty,
     so Erin won’t liquidated. */
    const tx = await locManager.liquidateLoCs(10)
    console.log('gasUsed: ', tx.receipt.gasUsed)

    // Check A, B and D are closed
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    console.log(await sortedLoCs.contains(carol))
    assert.isFalse(await sortedLoCs.contains(dennis))

    // Check whale, C and E stay active
    assert.isTrue(await sortedLoCs.contains(whale))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(erin))
  })

  it("liquidateLoCs() with a non fullfilled liquidation: still can liquidate further locs after the non-liquidated, non emptied pool", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: D_totalDebt, extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(D_totalDebt)
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D, E locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)
    const ICR_D = await locManager.getCurrentICR(dennis, price)
    const ICR_E = await locManager.getCurrentICR(erin, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))
    assert.isTrue(ICR_D.gt(mv._MCR) && ICR_D.lt(TCR))
    assert.isTrue(ICR_E.gt(mv._MCR) && ICR_E.lt(TCR))

    /* Liquidate locs. LoCs are ordered by ICR, from low to high:  A, B, C, D, E.
     With 301 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated.
     That leaves 97 ZUSD in the Pool that won’t be enough to absorb Carol,
     but it will be enough to liquidate Dennis. Afterwards the pool will be empty,
     so Erin won’t liquidated.
     Note that, compared to the previous test, this one will make 1 more loop iteration,
     so it will consume more gas. */
    const tx = await locManager.liquidateLoCs(10)
    console.log('gasUsed: ', tx.receipt.gasUsed)

    // Check A, B and D are closed
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(dennis))

    // Check whale, C and E stay active
    assert.isTrue(await sortedLoCs.contains(whale))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(erin))
  })

  it("liquidateLoCs() with a non fullfilled liquidation: total liquidated coll and debt is correct", async () => {
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    const entireSystemCollBefore = await locManager.getEntireSystemColl()
    const entireSystemDebtBefore = await locManager.getEntireSystemDebt()

    /* Liquidate locs. LoCs are ordered by ICR, from low to high:  A, B, C, D, E.
    With 253 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated. 
    That leaves 50 ZUSD in the Pool that won’t be enough to absorb any other LoC */
    const tx = await locManager.liquidateLoCs(10)

    // Expect system debt reduced by 203 ZUSD and system coll 2.3 BTC
    const entireSystemCollAfter = await locManager.getEntireSystemColl()
    const entireSystemDebtAfter = await locManager.getEntireSystemDebt()

    const changeInEntireSystemColl = entireSystemCollBefore.sub(entireSystemCollAfter)
    const changeInEntireSystemDebt = entireSystemDebtBefore.sub(entireSystemDebtAfter)

    assert.equal(changeInEntireSystemColl.toString(), A_coll.add(B_coll))
    th.assertIsApproximatelyEqual(changeInEntireSystemDebt.toString(), A_totalDebt.add(B_totalDebt))
  })

  it("liquidateLoCs() with a non fullfilled liquidation: emits correct liquidation event values", async () => {
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(211, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(240, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    /* Liquidate locs. LoCs are ordered by ICR, from low to high:  A, B, C, D, E.
    With 253 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated. 
    That leaves 50 ZUSD in the Pool which won’t be enough for any other liquidation */
    const liquidationTx = await locManager.liquidateLoCs(10)

    const [liquidatedDebt, liquidatedColl, collGasComp, zusdGasComp] = th.getEmittedLiquidationValues(liquidationTx)

    th.assertIsApproximatelyEqual(liquidatedDebt, A_totalDebt.add(B_totalDebt))
    const equivalentColl = A_totalDebt.add(B_totalDebt).mul(toBN(dec(11, 17))).div(price)
    th.assertIsApproximatelyEqual(liquidatedColl, th.applyLiquidationFee(equivalentColl))
    th.assertIsApproximatelyEqual(collGasComp, equivalentColl.sub(th.applyLiquidationFee(equivalentColl))) // 0.5% of 283/120*1.1
    assert.equal(zusdGasComp.toString(), dec(40, 18))

    // check collateral surplus
    const alice_remainingCollateral = A_coll.sub(A_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const bob_remainingCollateral = B_coll.sub(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(alice), alice_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_remainingCollateral)

    // can claim collateral
    const alice_balanceBefore = th.toBN(await web3.eth.getBalance(alice))
    await borrowerOperations.claimCollateral({ from: alice, gasPrice: 0 })
    const alice_balanceAfter = th.toBN(await web3.eth.getBalance(alice))
    th.assertIsApproximatelyEqual(alice_balanceAfter, alice_balanceBefore.add(th.toBN(alice_remainingCollateral)))

    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(th.toBN(bob_remainingCollateral)))
  })

  it("liquidateLoCs() with a non fullfilled liquidation: ICR of non liquidated LoC does not change", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C_Before = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C_Before.gt(mv._MCR) && ICR_C_Before.lt(TCR))

    /* Liquidate locs. LoCs are ordered by ICR, from low to high:  A, B, C, D, E.
    With 253 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated. 
    That leaves 50 ZUSD in the Pool to absorb exactly half of Carol's debt (100) */
    await locManager.liquidateLoCs(10)

    const ICR_C_After = await locManager.getCurrentICR(carol, price)
    assert.equal(ICR_C_Before.toString(), ICR_C_After)
  })

  // TODO: LiquidateLoCs tests that involve locs with ICR > TCR

  // --- batchLiquidateLoCs() ---

  it("batchLiquidateLoCs(): Liquidates all locs with ICR < 110%, transitioning Normal -> Recovery Mode", async () => {
    // make 6 LoCs accordingly
    // --- SETUP ---
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(230, 16)), extraParams: { from: dennis } })
    const { totalDebt: E_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: erin } })
    const { totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: freddy } })

    const spDeposit = B_totalDebt.add(C_totalDebt).add(D_totalDebt).add(E_totalDebt).add(F_totalDebt)
    await openLoC({ ICR: toBN(dec(426, 16)), extraZUSDAmount: spDeposit, extraParams: { from: alice } })

    // Alice deposits ZUSD to Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: alice })

    // price drops to 1BTC:85ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('85000000000000000000')
    const price = await priceFeed.getPrice()

    // check Recovery Mode kicks in

    const recoveryMode_Before = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode_Before)

    // check TCR < 150%
    const _150percent = web3.utils.toBN('1500000000000000000')
    const TCR_Before = await th.getTCR(contracts)
    assert.isTrue(TCR_Before.lt(_150percent))

    /* 
    After the price drop and prior to any liquidations, ICR should be:

    LoC         ICR
    Alice       182%
    Bob         102%
    Carol       102%
    Dennis      102%
    Elisa       102%
    Freddy      102%
    */
    alice_ICR = await locManager.getCurrentICR(alice, price)
    bob_ICR = await locManager.getCurrentICR(bob, price)
    carol_ICR = await locManager.getCurrentICR(carol, price)
    dennis_ICR = await locManager.getCurrentICR(dennis, price)
    erin_ICR = await locManager.getCurrentICR(erin, price)
    freddy_ICR = await locManager.getCurrentICR(freddy, price)

    // Alice should have ICR > 150%
    assert.isTrue(alice_ICR.gt(_150percent))
    // All other LoCs should have ICR < 150%
    assert.isTrue(carol_ICR.lt(_150percent))
    assert.isTrue(dennis_ICR.lt(_150percent))
    assert.isTrue(erin_ICR.lt(_150percent))
    assert.isTrue(freddy_ICR.lt(_150percent))

    /* After liquidating Bob and Carol, the the TCR of the system rises above the CCR, to 154%.  
    (see calculations in Google Sheet)

    Liquidations continue until all LoCs with ICR < MCR have been closed. 
    Only Alice should remain active - all others should be closed. */

    // call batchLiquidateLoCs
    await locManager.batchLiquidateLoCs([alice, bob, carol, dennis, erin, freddy]);

    // check system is no longer in Recovery Mode
    const recoveryMode_After = await th.checkRecoveryMode(contracts)
    assert.isFalse(recoveryMode_After)

    // After liquidation, TCR should rise to above 150%. 
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gt(_150percent))

    // get all LoCs
    const alice_LoC = await locManager.LoCs(alice)
    const bob_LoC = await locManager.LoCs(bob)
    const carol_LoC = await locManager.LoCs(carol)
    const dennis_LoC = await locManager.LoCs(dennis)
    const erin_LoC = await locManager.LoCs(erin)
    const freddy_LoC = await locManager.LoCs(freddy)

    // check that Alice's LoC remains active
    assert.equal(alice_LoC[3], 1)
    assert.isTrue(await sortedLoCs.contains(alice))

    // check all other LoCs are liquidated
    assert.equal(bob_LoC[3], 3)
    assert.equal(carol_LoC[3], 3)
    assert.equal(dennis_LoC[3], 3)
    assert.equal(erin_LoC[3], 3)
    assert.equal(freddy_LoC[3], 3)

    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(freddy))
  })

  it("batchLiquidateLoCs(): Liquidates all locs with ICR < 110%, transitioning Recovery -> Normal Mode", async () => {
    /* This is essentially the same test as before, but changing the order of the batch,
     * now the remaining LoC (alice) goes at the end.
     * This way alice will be skipped in a different part of the code, as in the previous test,
     * when attempting alice the system was in Recovery mode, while in this test,
     * when attempting alice the system has gone back to Normal mode
     * (see function `_getTotalFromBatchLiquidate_RecoveryMode`)
     */
    // make 6 LoCs accordingly
    // --- SETUP ---

    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(230, 16)), extraParams: { from: dennis } })
    const { totalDebt: E_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: erin } })
    const { totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: freddy } })

    const spDeposit = B_totalDebt.add(C_totalDebt).add(D_totalDebt).add(E_totalDebt).add(F_totalDebt)
    await openLoC({ ICR: toBN(dec(426, 16)), extraZUSDAmount: spDeposit, extraParams: { from: alice } })

    // Alice deposits ZUSD to Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: alice })

    // price drops to 1BTC:85ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('85000000000000000000')
    const price = await priceFeed.getPrice()

    // check Recovery Mode kicks in

    const recoveryMode_Before = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode_Before)

    // check TCR < 150%
    const _150percent = web3.utils.toBN('1500000000000000000')
    const TCR_Before = await th.getTCR(contracts)
    assert.isTrue(TCR_Before.lt(_150percent))

    /*
    After the price drop and prior to any liquidations, ICR should be:

    LoC         ICR
    Alice       182%
    Bob         102%
    Carol       102%
    Dennis      102%
    Elisa       102%
    Freddy      102%
    */
    const alice_ICR = await locManager.getCurrentICR(alice, price)
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    const carol_ICR = await locManager.getCurrentICR(carol, price)
    const dennis_ICR = await locManager.getCurrentICR(dennis, price)
    const erin_ICR = await locManager.getCurrentICR(erin, price)
    const freddy_ICR = await locManager.getCurrentICR(freddy, price)

    // Alice should have ICR > 150%
    assert.isTrue(alice_ICR.gt(_150percent))
    // All other LoCs should have ICR < 150%
    assert.isTrue(carol_ICR.lt(_150percent))
    assert.isTrue(dennis_ICR.lt(_150percent))
    assert.isTrue(erin_ICR.lt(_150percent))
    assert.isTrue(freddy_ICR.lt(_150percent))

    /* After liquidating Bob and Carol, the the TCR of the system rises above the CCR, to 154%.  
    (see calculations in Google Sheet)

    Liquidations continue until all LoCs with ICR < MCR have been closed. 
    Only Alice should remain active - all others should be closed. */

    // call batchLiquidateLoCs
    await locManager.batchLiquidateLoCs([bob, carol, dennis, erin, freddy, alice]);

    // check system is no longer in Recovery Mode
    const recoveryMode_After = await th.checkRecoveryMode(contracts)
    assert.isFalse(recoveryMode_After)

    // After liquidation, TCR should rise to above 150%. 
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gt(_150percent))

    // get all LoCs
    const alice_LoC = await locManager.LoCs(alice)
    const bob_LoC = await locManager.LoCs(bob)
    const carol_LoC = await locManager.LoCs(carol)
    const dennis_LoC = await locManager.LoCs(dennis)
    const erin_LoC = await locManager.LoCs(erin)
    const freddy_LoC = await locManager.LoCs(freddy)

    // check that Alice's LoC remains active
    assert.equal(alice_LoC[3], 1)
    assert.isTrue(await sortedLoCs.contains(alice))

    // check all other LoCs are liquidated
    assert.equal(bob_LoC[3], 3)
    assert.equal(carol_LoC[3], 3)
    assert.equal(dennis_LoC[3], 3)
    assert.equal(erin_LoC[3], 3)
    assert.equal(freddy_LoC[3], 3)

    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(freddy))
  })

  it("batchLiquidateLoCs(): Liquidates all locs with ICR < 110%, transitioning Normal -> Recovery Mode", async () => {
    // This is again the same test as the before the last one, but now Alice is skipped because she is not active
    // It also skips bob, as he is added twice, for being already liquidated
    // make 6 LoCs accordingly
    // --- SETUP ---
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(230, 16)), extraParams: { from: dennis } })
    const { totalDebt: E_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: erin } })
    const { totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: freddy } })

    const spDeposit = B_totalDebt.add(C_totalDebt).add(D_totalDebt).add(E_totalDebt).add(F_totalDebt)
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(426, 16)), extraZUSDAmount: spDeposit, extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(426, 16)), extraZUSDAmount: A_totalDebt, extraParams: { from: whale } })

    // Alice deposits ZUSD to Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: alice })

    // to compensate origination fee
    await zusdToken.transfer(alice, A_totalDebt, { from: whale })
    // Alice closes loc
    await borrowerOperations.closeLoC({ from: alice })

    // price drops to 1BTC:85ZUSD, reducing TCR below 150%
    await priceFeed.setPrice('85000000000000000000')
    const price = await priceFeed.getPrice()

    // check Recovery Mode kicks in

    const recoveryMode_Before = await th.checkRecoveryMode(contracts)
    assert.isTrue(recoveryMode_Before)

    // check TCR < 150%
    const _150percent = web3.utils.toBN('1500000000000000000')
    const TCR_Before = await th.getTCR(contracts)
    assert.isTrue(TCR_Before.lt(_150percent))

    /*
    After the price drop and prior to any liquidations, ICR should be:

    LoC         ICR
    Alice       182%
    Bob         102%
    Carol       102%
    Dennis      102%
    Elisa       102%
    Freddy      102%
    */
    alice_ICR = await locManager.getCurrentICR(alice, price)
    bob_ICR = await locManager.getCurrentICR(bob, price)
    carol_ICR = await locManager.getCurrentICR(carol, price)
    dennis_ICR = await locManager.getCurrentICR(dennis, price)
    erin_ICR = await locManager.getCurrentICR(erin, price)
    freddy_ICR = await locManager.getCurrentICR(freddy, price)

    // Alice should have ICR > 150%
    assert.isTrue(alice_ICR.gt(_150percent))
    // All other LoCs should have ICR < 150%
    assert.isTrue(carol_ICR.lt(_150percent))
    assert.isTrue(dennis_ICR.lt(_150percent))
    assert.isTrue(erin_ICR.lt(_150percent))
    assert.isTrue(freddy_ICR.lt(_150percent))

    /* After liquidating Bob and Carol, the the TCR of the system rises above the CCR, to 154%.
    (see calculations in Google Sheet)

    Liquidations continue until all LoCs with ICR < MCR have been closed.
    Only Alice should remain active - all others should be closed. */

    // call batchLiquidateLoCs
    await locManager.batchLiquidateLoCs([alice, bob, bob, carol, dennis, erin, freddy]);

    // check system is no longer in Recovery Mode
    const recoveryMode_After = await th.checkRecoveryMode(contracts)
    assert.isFalse(recoveryMode_After)

    // After liquidation, TCR should rise to above 150%.
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gt(_150percent))

    // get all LoCs
    const alice_LoC = await locManager.LoCs(alice)
    const bob_LoC = await locManager.LoCs(bob)
    const carol_LoC = await locManager.LoCs(carol)
    const dennis_LoC = await locManager.LoCs(dennis)
    const erin_LoC = await locManager.LoCs(erin)
    const freddy_LoC = await locManager.LoCs(freddy)

    // check that Alice's LoC is closed
    assert.equal(alice_LoC[3], 2)

    // check all other LoCs are liquidated
    assert.equal(bob_LoC[3], 3)
    assert.equal(carol_LoC[3], 3)
    assert.equal(dennis_LoC[3], 3)
    assert.equal(erin_LoC[3], 3)
    assert.equal(freddy_LoC[3], 3)

    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(freddy))
  })

  it("batchLiquidateLoCs() with a non fullfilled liquidation: non liquidated LoC remains active", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(211, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    const locsToLiquidate = [alice, bob, carol]
    await locManager.batchLiquidateLoCs(locsToLiquidate)

    // Check A and B closed
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))

    // Check C remains active
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.equal((await locManager.LoCs(carol))[3].toString(), '1') // check Status is active
  })

  it("batchLiquidateLoCs() with a non fullfilled liquidation: non liquidated LoC remains in LoC Owners array", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(211, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    const locsToLiquidate = [alice, bob, carol]
    await locManager.batchLiquidateLoCs(locsToLiquidate)

    // Check C is in LoC owners array
    const arrayLength = (await locManager.getLoCOwnersCount()).toNumber()
    let addressFound = false;
    let addressIdx = 0;

    for (let i = 0; i < arrayLength; i++) {
      const address = (await locManager.LoCOwners(i)).toString()
      if (address == carol) {
        addressFound = true
        addressIdx = i
      }
    }

    assert.isTrue(addressFound);

    // Check LoCOwners idx on LoC struct == idx of address found in LoCOwners array
    const idxOnStruct = (await locManager.LoCs(carol))[4].toString()
    assert.equal(addressIdx.toString(), idxOnStruct)
  })

  it("batchLiquidateLoCs() with a non fullfilled liquidation: still can liquidate further locs after the non-liquidated, emptied pool", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: D_totalDebt, extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D, E locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)
    const ICR_D = await locManager.getCurrentICR(dennis, price)
    const ICR_E = await locManager.getCurrentICR(erin, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))
    assert.isTrue(ICR_D.gt(mv._MCR) && ICR_D.lt(TCR))
    assert.isTrue(ICR_E.gt(mv._MCR) && ICR_E.lt(TCR))

    /* With 300 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated.
     That leaves 97 ZUSD in the Pool that won’t be enough to absorb Carol,
     but it will be enough to liquidate Dennis. Afterwards the pool will be empty,
     so Erin won’t liquidated. */
    const locsToLiquidate = [alice, bob, carol, dennis, erin]
    const tx = await locManager.batchLiquidateLoCs(locsToLiquidate)
    console.log('gasUsed: ', tx.receipt.gasUsed)

    // Check A, B and D are closed
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(dennis))

    // Check whale, C, D and E stay active
    assert.isTrue(await sortedLoCs.contains(whale))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(erin))
  })

  it("batchLiquidateLoCs() with a non fullfilled liquidation: still can liquidate further locs after the non-liquidated, non emptied pool", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: D_totalDebt, extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D, E locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)
    const ICR_D = await locManager.getCurrentICR(dennis, price)
    const ICR_E = await locManager.getCurrentICR(erin, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))
    assert.isTrue(ICR_D.gt(mv._MCR) && ICR_D.lt(TCR))
    assert.isTrue(ICR_E.gt(mv._MCR) && ICR_E.lt(TCR))

    /* With 301 in the SP, Alice (102 debt) and Bob (101 debt) should be entirely liquidated.
     That leaves 97 ZUSD in the Pool that won’t be enough to absorb Carol,
     but it will be enough to liquidate Dennis. Afterwards the pool will be empty,
     so Erin won’t liquidated.
     Note that, compared to the previous test, this one will make 1 more loop iteration,
     so it will consume more gas. */
    const locsToLiquidate = [alice, bob, carol, dennis, erin]
    const tx = await locManager.batchLiquidateLoCs(locsToLiquidate)
    console.log('gasUsed: ', tx.receipt.gasUsed)

    // Check A, B and D are closed
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(dennis))

    // Check whale, C, D and E stay active
    assert.isTrue(await sortedLoCs.contains(whale))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(erin))
  })

  it("batchLiquidateLoCs() with a non fullfilled liquidation: total liquidated coll and debt is correct", async () => {
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    const { collateral: E_coll, totalDebt: E_totalDebt } = await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D, E locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    const entireSystemCollBefore = await locManager.getEntireSystemColl()
    const entireSystemDebtBefore = await locManager.getEntireSystemDebt()

    const locsToLiquidate = [alice, bob, carol]
    await locManager.batchLiquidateLoCs(locsToLiquidate)

    // Expect system debt reduced by 203 ZUSD and system coll by 2 BTC
    const entireSystemCollAfter = await locManager.getEntireSystemColl()
    const entireSystemDebtAfter = await locManager.getEntireSystemDebt()

    const changeInEntireSystemColl = entireSystemCollBefore.sub(entireSystemCollAfter)
    const changeInEntireSystemDebt = entireSystemDebtBefore.sub(entireSystemDebtAfter)

    assert.equal(changeInEntireSystemColl.toString(), A_coll.add(B_coll))
    th.assertIsApproximatelyEqual(changeInEntireSystemDebt.toString(), A_totalDebt.add(B_totalDebt))
  })

  it("batchLiquidateLoCs() with a non fullfilled liquidation: emits correct liquidation event values", async () => {
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(211, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    const locsToLiquidate = [alice, bob, carol]
    const liquidationTx = await locManager.batchLiquidateLoCs(locsToLiquidate)

    const [liquidatedDebt, liquidatedColl, collGasComp, zusdGasComp] = th.getEmittedLiquidationValues(liquidationTx)

    th.assertIsApproximatelyEqual(liquidatedDebt, A_totalDebt.add(B_totalDebt))
    const equivalentColl = A_totalDebt.add(B_totalDebt).mul(toBN(dec(11, 17))).div(price)
    th.assertIsApproximatelyEqual(liquidatedColl, th.applyLiquidationFee(equivalentColl))
    th.assertIsApproximatelyEqual(collGasComp, equivalentColl.sub(th.applyLiquidationFee(equivalentColl))) // 0.5% of 283/120*1.1
    assert.equal(zusdGasComp.toString(), dec(40, 18))

    // check collateral surplus
    const alice_remainingCollateral = A_coll.sub(A_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const bob_remainingCollateral = B_coll.sub(B_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(alice), alice_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(bob), bob_remainingCollateral)

    // can claim collateral
    const alice_balanceBefore = th.toBN(await web3.eth.getBalance(alice))
    await borrowerOperations.claimCollateral({ from: alice, gasPrice: 0 })
    const alice_balanceAfter = th.toBN(await web3.eth.getBalance(alice))
    th.assertIsApproximatelyEqual(alice_balanceAfter, alice_balanceBefore.add(th.toBN(alice_remainingCollateral)))

    const bob_balanceBefore = th.toBN(await web3.eth.getBalance(bob))
    await borrowerOperations.claimCollateral({ from: bob, gasPrice: 0 })
    const bob_balanceAfter = th.toBN(await web3.eth.getBalance(bob))
    th.assertIsApproximatelyEqual(bob_balanceAfter, bob_balanceBefore.add(th.toBN(bob_remainingCollateral)))
  })

  it("batchLiquidateLoCs() with a non fullfilled liquidation: ICR of non liquidated LoC does not change", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(211, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: erin } })

    // Whale provides ZUSD to the SP
    const spDeposit = A_totalDebt.add(B_totalDebt).add(C_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(220, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops 
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check A, B, C locs are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C_Before = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C_Before.gt(mv._MCR) && ICR_C_Before.lt(TCR))

    const locsToLiquidate = [alice, bob, carol]
    await locManager.batchLiquidateLoCs(locsToLiquidate)

    const ICR_C_After = await locManager.getCurrentICR(carol, price)
    assert.equal(ICR_C_Before.toString(), ICR_C_After)
  })

  it("batchLiquidateLoCs(), with 110% < ICR < TCR, and StabilityPool ZUSD > debt to liquidate: can liquidate locs out of order", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(202, 16)), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(204, 16)), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(280, 16)), extraZUSDAmount: dec(500, 16), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(282, 16)), extraZUSDAmount: dec(500, 16), extraParams: { from: freddy } })

    // Whale provides 1000 ZUSD to the SP
    const spDeposit = A_totalDebt.add(C_totalDebt).add(D_totalDebt)
    await openLoC({ ICR: toBN(dec(219, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check locs A-D are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)
    const ICR_D = await locManager.getCurrentICR(dennis, price)
    const TCR = await th.getTCR(contracts)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))
    assert.isTrue(ICR_D.gt(mv._MCR) && ICR_D.lt(TCR))

    // LoCs are ordered by ICR, low to high: A, B, C, D.

    // Liquidate out of ICR order: D, B, C. A (lowest ICR) not included.
    const locsToLiquidate = [dennis, bob, carol]

    const liquidationTx = await locManager.batchLiquidateLoCs(locsToLiquidate)

    // Check transaction succeeded
    assert.isTrue(liquidationTx.receipt.status)

    // Confirm locs D, B, C removed
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // Confirm locs have status 'liquidated' (Status enum element idx 3)
    assert.equal((await locManager.LoCs(dennis))[3], '3')
    assert.equal((await locManager.LoCs(dennis))[3], '3')
    assert.equal((await locManager.LoCs(dennis))[3], '3')
  })

  it("batchLiquidateLoCs(), with 110% < ICR < TCR, and StabilityPool empty: doesn't liquidate any locs", async () => {
    await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: alice } })
    const { totalDebt: bobDebt_Before } = await openLoC({ ICR: toBN(dec(224, 16)), extraParams: { from: bob } })
    const { totalDebt: carolDebt_Before } = await openLoC({ ICR: toBN(dec(226, 16)), extraParams: { from: carol } })
    const { totalDebt: dennisDebt_Before } = await openLoC({ ICR: toBN(dec(228, 16)), extraParams: { from: dennis } })

    const bobColl_Before = (await locManager.LoCs(bob))[1]
    const carolColl_Before = (await locManager.LoCs(carol))[1]
    const dennisColl_Before = (await locManager.LoCs(dennis))[1]

    await openLoC({ ICR: toBN(dec(228, 16)), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(230, 16)), extraParams: { from: freddy } })

    // Price drops
    await priceFeed.setPrice(dec(120, 18))
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Check Recovery Mode is active
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Check locs A-D are in range 110% < ICR < TCR
    const ICR_A = await locManager.getCurrentICR(alice, price)
    const ICR_B = await locManager.getCurrentICR(bob, price)
    const ICR_C = await locManager.getCurrentICR(carol, price)

    assert.isTrue(ICR_A.gt(mv._MCR) && ICR_A.lt(TCR))
    assert.isTrue(ICR_B.gt(mv._MCR) && ICR_B.lt(TCR))
    assert.isTrue(ICR_C.gt(mv._MCR) && ICR_C.lt(TCR))

    // LoCs are ordered by ICR, low to high: A, B, C, D. 
    // Liquidate out of ICR order: D, B, C. A (lowest ICR) not included.
    const locsToLiquidate = [dennis, bob, carol]
    await assertRevert(locManager.batchLiquidateLoCs(locsToLiquidate), "LoCManager: nothing to liquidate")

    // Confirm locs D, B, C remain in system
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))

    // Confirm locs have status 'active' (Status enum element idx 1)
    assert.equal((await locManager.LoCs(dennis))[3], '1')
    assert.equal((await locManager.LoCs(dennis))[3], '1')
    assert.equal((await locManager.LoCs(dennis))[3], '1')

    // Confirm D, B, C coll & debt have not changed
    const dennisDebt_After = (await locManager.LoCs(dennis))[0].add(await locManager.getPendingZUSDDebtReward(dennis))
    const bobDebt_After = (await locManager.LoCs(bob))[0].add(await locManager.getPendingZUSDDebtReward(bob))
    const carolDebt_After = (await locManager.LoCs(carol))[0].add(await locManager.getPendingZUSDDebtReward(carol))

    const dennisColl_After = (await locManager.LoCs(dennis))[1].add(await locManager.getPendingBTCReward(dennis))  
    const bobColl_After = (await locManager.LoCs(bob))[1].add(await locManager.getPendingBTCReward(bob))
    const carolColl_After = (await locManager.LoCs(carol))[1].add(await locManager.getPendingBTCReward(carol))

    assert.isTrue(dennisColl_After.eq(dennisColl_Before))
    assert.isTrue(bobColl_After.eq(bobColl_Before))
    assert.isTrue(carolColl_After.eq(carolColl_Before))

    th.assertIsApproximatelyEqual(th.toBN(dennisDebt_Before).toString(), dennisDebt_After.toString())
    th.assertIsApproximatelyEqual(th.toBN(bobDebt_Before).toString(), bobDebt_After.toString())
    th.assertIsApproximatelyEqual(th.toBN(carolDebt_Before).toString(), carolDebt_After.toString())
  })

  it('batchLiquidateLoCs(): skips liquidation of locs with ICR > TCR, regardless of Stability Pool size', async () => {
    // LoCs that will fall into ICR range 100-MCR
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(194, 16)), extraParams: { from: A } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: B } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(198, 16)), extraParams: { from: C } })

    // LoCs that will fall into ICR range 110-TCR
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: D } })
    await openLoC({ ICR: toBN(dec(223, 16)), extraParams: { from: E } })
    await openLoC({ ICR: toBN(dec(225, 16)), extraParams: { from: F } })

    // LoCs that will fall into ICR range >= TCR
    const { totalDebt: G_totalDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: G } })
    const { totalDebt: H_totalDebt } = await openLoC({ ICR: toBN(dec(270, 16)), extraParams: { from: H } })
    const { totalDebt: I_totalDebt } = await openLoC({ ICR: toBN(dec(290, 16)), extraParams: { from: I } })

    // Whale adds ZUSD to SP
    const spDeposit = A_totalDebt.add(C_totalDebt).add(D_totalDebt).add(G_totalDebt).add(H_totalDebt).add(I_totalDebt)
    await openLoC({ ICR: toBN(dec(245, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops, but all locs remain active
    await priceFeed.setPrice(dec(110, 18)) 
    const price = await priceFeed.getPrice()
    const TCR = await th.getTCR(contracts)

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    const G_collBefore = (await locManager.LoCs(G))[1]
    const G_debtBefore = (await locManager.LoCs(G))[0]
    const H_collBefore = (await locManager.LoCs(H))[1]
    const H_debtBefore = (await locManager.LoCs(H))[0]
    const I_collBefore = (await locManager.LoCs(I))[1]
    const I_debtBefore = (await locManager.LoCs(I))[0]

    const ICR_A = await locManager.getCurrentICR(A, price) 
    const ICR_B = await locManager.getCurrentICR(B, price) 
    const ICR_C = await locManager.getCurrentICR(C, price) 
    const ICR_D = await locManager.getCurrentICR(D, price)
    const ICR_E = await locManager.getCurrentICR(E, price)
    const ICR_F = await locManager.getCurrentICR(F, price)
    const ICR_G = await locManager.getCurrentICR(G, price)
    const ICR_H = await locManager.getCurrentICR(H, price)
    const ICR_I = await locManager.getCurrentICR(I, price)

    // Check A-C are in range 100-110
    assert.isTrue(ICR_A.gte(mv._ICR100) && ICR_A.lt(mv._MCR))
    assert.isTrue(ICR_B.gte(mv._ICR100) && ICR_B.lt(mv._MCR))
    assert.isTrue(ICR_C.gte(mv._ICR100) && ICR_C.lt(mv._MCR))

    // Check D-F are in range 110-TCR
    assert.isTrue(ICR_D.gt(mv._MCR) && ICR_D.lt(TCR))
    assert.isTrue(ICR_E.gt(mv._MCR) && ICR_E.lt(TCR))
    assert.isTrue(ICR_F.gt(mv._MCR) && ICR_F.lt(TCR))

    // Check G-I are in range >= TCR
    assert.isTrue(ICR_G.gte(TCR))
    assert.isTrue(ICR_H.gte(TCR))
    assert.isTrue(ICR_I.gte(TCR))

    // Attempt to liquidate only locs with ICR > TCR% 
    await assertRevert(locManager.batchLiquidateLoCs([G, H, I]), "LoCManager: nothing to liquidate")

    // Check G, H, I remain in system
    assert.isTrue(await sortedLoCs.contains(G))
    assert.isTrue(await sortedLoCs.contains(H))
    assert.isTrue(await sortedLoCs.contains(I))

    // Check G, H, I coll and debt have not changed
    assert.equal(G_collBefore.eq(await locManager.LoCs(G))[1])
    assert.equal(G_debtBefore.eq(await locManager.LoCs(G))[0])
    assert.equal(H_collBefore.eq(await locManager.LoCs(H))[1])
    assert.equal(H_debtBefore.eq(await locManager.LoCs(H))[0])
    assert.equal(I_collBefore.eq(await locManager.LoCs(I))[1])
    assert.equal(I_debtBefore.eq(await locManager.LoCs(I))[0])

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))
  
    // Attempt to liquidate a variety of locs with SP covering whole batch.
    // Expect A, C, D to be liquidated, and G, H, I to remain in system
    await locManager.batchLiquidateLoCs([C, D, G, H, A, I])
    
    // Confirm A, C, D liquidated  
    assert.isFalse(await sortedLoCs.contains(C))
    assert.isFalse(await sortedLoCs.contains(A))
    assert.isFalse(await sortedLoCs.contains(D))
    
    // Check G, H, I remain in system
    assert.isTrue(await sortedLoCs.contains(G))
    assert.isTrue(await sortedLoCs.contains(H))
    assert.isTrue(await sortedLoCs.contains(I))

    // Check coll and debt have not changed
    assert.equal(G_collBefore.eq(await locManager.LoCs(G))[1])
    assert.equal(G_debtBefore.eq(await locManager.LoCs(G))[0])
    assert.equal(H_collBefore.eq(await locManager.LoCs(H))[1])
    assert.equal(H_debtBefore.eq(await locManager.LoCs(H))[0])
    assert.equal(I_collBefore.eq(await locManager.LoCs(I))[1])
    assert.equal(I_debtBefore.eq(await locManager.LoCs(I))[0])

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Whale withdraws entire deposit, and re-deposits 132 ZUSD
    // Increasing the price for a moment to avoid pending liquidations to block withdrawal
    await priceFeed.setPrice(dec(200, 18))
    await stabilityPool.withdrawFromSP(spDeposit, {from: whale})
    await priceFeed.setPrice(dec(110, 18))
    await stabilityPool.provideToSP(B_totalDebt.add(toBN(dec(50, 18))), ZERO_ADDRESS, {from: whale})

    // B and E are still in range 110-TCR.
    // Attempt to liquidate B, G, H, I, E.
    // Expected Stability Pool to fully absorb B (92 ZUSD + 10 virtual debt), 
    // but not E as there are not enough funds in Stability Pool
    
    const stabilityBefore = await stabilityPool.getTotalZUSDDeposits()
    const dEbtBefore = (await locManager.LoCs(E))[0]

    await locManager.batchLiquidateLoCs([B, G, H, I, E])
    
    const dEbtAfter = (await locManager.LoCs(E))[0]
    const stabilityAfter = await stabilityPool.getTotalZUSDDeposits()
    
    const stabilityDelta = stabilityBefore.sub(stabilityAfter)  
    const dEbtDelta = dEbtBefore.sub(dEbtAfter)

    th.assertIsApproximatelyEqual(stabilityDelta, B_totalDebt)
    assert.equal((dEbtDelta.toString()), '0')
    
    // Confirm B removed and E active 
    assert.isFalse(await sortedLoCs.contains(B)) 
    assert.isTrue(await sortedLoCs.contains(E))

    // Check G, H, I remain in system
    assert.isTrue(await sortedLoCs.contains(G))
    assert.isTrue(await sortedLoCs.contains(H))
    assert.isTrue(await sortedLoCs.contains(I))

    // Check coll and debt have not changed
    assert.equal(G_collBefore.eq(await locManager.LoCs(G))[1])
    assert.equal(G_debtBefore.eq(await locManager.LoCs(G))[0])
    assert.equal(H_collBefore.eq(await locManager.LoCs(H))[1])
    assert.equal(H_debtBefore.eq(await locManager.LoCs(H))[0])
    assert.equal(I_collBefore.eq(await locManager.LoCs(I))[1])
    assert.equal(I_debtBefore.eq(await locManager.LoCs(I))[0])
  })

  it('batchLiquidateLoCs(): emits liquidation event with correct values when all locs have ICR > 110% and Stability Pool covers a subset of locs', async () => {
    // LoCs to be absorbed by SP
    const { collateral: F_coll, totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: freddy } })
    const { collateral: G_coll, totalDebt: G_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: greta } })

    // LoCs to be spared
    await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(266, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(285, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(308, 16)), extraParams: { from: dennis } })

    // Whale adds ZUSD to SP
    const spDeposit = F_totalDebt.add(G_totalDebt)
    await openLoC({ ICR: toBN(dec(285, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops, but all locs remain active
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm all locs have ICR > MCR
    assert.isTrue((await locManager.getCurrentICR(freddy, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(greta, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(alice, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).gte(mv._MCR))

    // Confirm ZUSD in Stability Pool
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), spDeposit.toString())

    const locsToLiquidate = [freddy, greta, alice, bob, carol, dennis, whale]

    // Attempt liqudation sequence
    const liquidationTx = await locManager.batchLiquidateLoCs(locsToLiquidate)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTx)

    // Check F and G were liquidated
    assert.isFalse(await sortedLoCs.contains(freddy))
    assert.isFalse(await sortedLoCs.contains(greta))

    // Check whale and A-D remain active
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(whale))

    // Liquidation event emits coll = (F_debt + G_debt)/price*1.1*0.995, and debt = (F_debt + G_debt)
    th.assertIsApproximatelyEqual(liquidatedDebt, F_totalDebt.add(G_totalDebt))
    th.assertIsApproximatelyEqual(liquidatedColl, th.applyLiquidationFee(F_totalDebt.add(G_totalDebt).mul(toBN(dec(11, 17))).div(price)))

    // check collateral surplus
    const freddy_remainingCollateral = F_coll.sub(F_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const greta_remainingCollateral = G_coll.sub(G_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(freddy), freddy_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(greta), greta_remainingCollateral)

    // can claim collateral
    const freddy_balanceBefore = th.toBN(await web3.eth.getBalance(freddy))
    await borrowerOperations.claimCollateral({ from: freddy, gasPrice: 0 })
    const freddy_balanceAfter = th.toBN(await web3.eth.getBalance(freddy))
    th.assertIsApproximatelyEqual(freddy_balanceAfter, freddy_balanceBefore.add(th.toBN(freddy_remainingCollateral)))

    const greta_balanceBefore = th.toBN(await web3.eth.getBalance(greta))
    await borrowerOperations.claimCollateral({ from: greta, gasPrice: 0 })
    const greta_balanceAfter = th.toBN(await web3.eth.getBalance(greta))
    th.assertIsApproximatelyEqual(greta_balanceAfter, greta_balanceBefore.add(th.toBN(greta_remainingCollateral)))
  })

  it('batchLiquidateLoCs(): emits liquidation event with correct values when all locs have ICR > 110% and Stability Pool covers a subset of locs, including a partial', async () => {
    // LoCs to be absorbed by SP
    const { collateral: F_coll, totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: freddy } })
    const { collateral: G_coll, totalDebt: G_totalDebt } = await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: greta } })

    // LoCs to be spared
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(266, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(285, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(308, 16)), extraParams: { from: dennis } })

    // Whale opens LoC and adds 220 ZUSD to SP
    const spDeposit = F_totalDebt.add(G_totalDebt).add(A_totalDebt.div(toBN(2)))
    await openLoC({ ICR: toBN(dec(285, 16)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Price drops, but all locs remain active
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm all locs have ICR > MCR
    assert.isTrue((await locManager.getCurrentICR(freddy, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(greta, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(alice, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).gte(mv._MCR))

    // Confirm ZUSD in Stability Pool
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), spDeposit.toString())

    const locsToLiquidate = [freddy, greta, alice, bob, carol, dennis, whale]

    // Attempt liqudation sequence
    const liquidationTx = await locManager.batchLiquidateLoCs(locsToLiquidate)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTx)

    // Check F and G were liquidated
    assert.isFalse(await sortedLoCs.contains(freddy))
    assert.isFalse(await sortedLoCs.contains(greta))

    // Check whale and A-D remain active
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(whale))

    // Check A's collateral and debt are the same
    const entireColl_A = (await locManager.LoCs(alice))[1].add(await locManager.getPendingBTCReward(alice))
    const entireDebt_A = (await locManager.LoCs(alice))[0].add(await locManager.getPendingZUSDDebtReward(alice))

    assert.equal(entireColl_A.toString(), A_coll)
    th.assertIsApproximatelyEqual(entireDebt_A.toString(), A_totalDebt)

    /* Liquidation event emits:
    coll = (F_debt + G_debt)/price*1.1*0.995
    debt = (F_debt + G_debt) */
    th.assertIsApproximatelyEqual(liquidatedDebt, F_totalDebt.add(G_totalDebt))
    th.assertIsApproximatelyEqual(liquidatedColl, th.applyLiquidationFee(F_totalDebt.add(G_totalDebt).mul(toBN(dec(11, 17))).div(price)))

    // check collateral surplus
    const freddy_remainingCollateral = F_coll.sub(F_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    const greta_remainingCollateral = G_coll.sub(G_totalDebt.mul(th.toBN(dec(11, 17))).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(freddy), freddy_remainingCollateral)
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(greta), greta_remainingCollateral)

    // can claim collateral
    const freddy_balanceBefore = th.toBN(await web3.eth.getBalance(freddy))
    await borrowerOperations.claimCollateral({ from: freddy, gasPrice: 0 })
    const freddy_balanceAfter = th.toBN(await web3.eth.getBalance(freddy))
    th.assertIsApproximatelyEqual(freddy_balanceAfter, freddy_balanceBefore.add(th.toBN(freddy_remainingCollateral)))

    const greta_balanceBefore = th.toBN(await web3.eth.getBalance(greta))
    await borrowerOperations.claimCollateral({ from: greta, gasPrice: 0 })
    const greta_balanceAfter = th.toBN(await web3.eth.getBalance(greta))
    th.assertIsApproximatelyEqual(greta_balanceAfter, greta_balanceBefore.add(th.toBN(greta_remainingCollateral)))
  })

})

contract('Reset chain state', async accounts => { })
