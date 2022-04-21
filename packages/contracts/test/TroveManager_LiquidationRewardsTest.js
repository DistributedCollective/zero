const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const getDifference = th.getDifference
const mv = testHelpers.MoneyValues

const TroveManagerTester = artifacts.require("TroveManagerTester")
const ZUSDToken = artifacts.require("ZUSDToken")

contract('TroveManager - Redistribution reward calculations', async accounts => {

  const [
    owner,
    alice, bob, carol, dennis, erin, freddy, greta, harry, ida,
    A, B, C, D, E,
    whale, defaulter_1, defaulter_2, defaulter_3, defaulter_4, sovFeeCollector] = accounts;

    const multisig = accounts[999];

  let priceFeed
  let zusdToken
  let sortedTroves
  let troveManager
  let nameRegistry
  let activePool
  let stabilityPool
  let defaultPool
  let functionCaller
  let borrowerOperations

  let contracts

  const getOpenTroveZUSDAmount = async (totalDebt) => th.getOpenTroveZUSDAmount(contracts, totalDebt)
  const getNetBorrowingAmount = async (debtWithFee) => th.getNetBorrowingAmount(contracts, debtWithFee)
  const openTrove = async (params) => th.openTrove(contracts, params)

  before(async () => {
    contracts = await deploymentHelper.deployLiquityCore()
    contracts.troveManager = await TroveManagerTester.new()
    contracts.zusdToken = await ZUSDToken.new()
    await contracts.zusdToken.initialize(
      contracts.troveManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    )
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)

    priceFeed = contracts.priceFeedTestnet
    zusdToken = contracts.zusdToken
    sortedTroves = contracts.sortedTroves
    troveManager = contracts.troveManager
    nameRegistry = contracts.nameRegistry
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    functionCaller = contracts.functionCaller
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

  it("redistribution: A, B Open. B Liquidated. C, D Open. D Liquidated. Distributes correct rewards", async () => {
    // A, B open trove
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: bob } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Confirm not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // L1: B liquidated
    const txB = await troveManager.liquidate(bob)
    assert.isTrue(txB.receipt.status)
    assert.isFalse(await sortedTroves.contains(bob))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    // C, D open troves
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: carol } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: dennis } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Confirm not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // L2: D Liquidated
    const txD = await troveManager.liquidate(dennis)
    assert.isTrue(txB.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    // Get entire coll of A and C
    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()
    const carol_Coll = ((await troveManager.Troves(carol))[1]
      .add(await troveManager.getPendingRBTCReward(carol)))
      .toString()

    /* Expected collateral:
    A: Alice receives 0.995 RBTC from L1, and ~3/5*0.995 RBTC from L2.
    expect aliceColl = 2 + 0.995 + 2.995/4.995 * 0.995 = 3.5916 RBTC

    C: Carol receives ~2/5 RBTC from L2
    expect carolColl = 2 + 2/4.995 * 0.995 = 2.398 RBTC

    Total coll = 4 + 2 * 0.995 RBTC
    */
    const A_collAfterL1 = A_coll.add(th.applyLiquidationFee(B_coll))
    assert.isAtMost(th.getDifference(alice_Coll, A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(D_coll)).div(A_collAfterL1.add(C_coll)))), 1000)
    assert.isAtMost(th.getDifference(carol_Coll, C_coll.add(C_coll.mul(th.applyLiquidationFee(D_coll)).div(A_collAfterL1.add(C_coll)))), 1000)


    const entireSystemColl = (await activePool.getRBTC()).add(await defaultPool.getRBTC()).toString()
    assert.equal(entireSystemColl, A_coll.add(C_coll).add(th.applyLiquidationFee(B_coll.add(D_coll))))

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  it("redistribution: A, B, C Open. C Liquidated. D, E, F Open. F Liquidated. Distributes correct rewards", async () => {
    // A, B C open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: bob } })
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: carol } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Confirm not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // L1: C liquidated
    const txC = await troveManager.liquidate(carol)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(carol))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    // D, E, F open troves
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: dennis } })
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: erin } })
    const { collateral: F_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: freddy } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Confirm not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // L2: F Liquidated
    const txF = await troveManager.liquidate(freddy)
    assert.isTrue(txF.receipt.status)
    assert.isFalse(await sortedTroves.contains(freddy))

    // Get entire coll of A, B, D and E
    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()
    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()
    const dennis_Coll = ((await troveManager.Troves(dennis))[1]
      .add(await troveManager.getPendingRBTCReward(dennis)))
      .toString()
    const erin_Coll = ((await troveManager.Troves(erin))[1]
      .add(await troveManager.getPendingRBTCReward(erin)))
      .toString()

    /* Expected collateral:
    A and B receives 1/2 RBTC * 0.995 from L1.
    total Coll: 3

    A, B, receive (2.4975)/8.995 * 0.995 RBTC from L2.
    
    D, E receive 2/8.995 * 0.995 RBTC from L2.

    expect A, B coll  = 2 +  0.4975 + 0.2763  =  RBTC
    expect D, E coll  = 2 + 0.2212  =  RBTC

    Total coll = 8 (non-liquidated) + 2 * 0.995 (liquidated and redistributed)
    */
    const A_collAfterL1 = A_coll.add(A_coll.mul(th.applyLiquidationFee(C_coll)).div(A_coll.add(B_coll)))
    const B_collAfterL1 = B_coll.add(B_coll.mul(th.applyLiquidationFee(C_coll)).div(A_coll.add(B_coll)))
    const totalBeforeL2 = A_collAfterL1.add(B_collAfterL1).add(D_coll).add(E_coll)
    const expected_A = A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(F_coll)).div(totalBeforeL2))
    const expected_B = B_collAfterL1.add(B_collAfterL1.mul(th.applyLiquidationFee(F_coll)).div(totalBeforeL2))
    const expected_D = D_coll.add(D_coll.mul(th.applyLiquidationFee(F_coll)).div(totalBeforeL2))
    const expected_E = E_coll.add(E_coll.mul(th.applyLiquidationFee(F_coll)).div(totalBeforeL2))
    assert.isAtMost(th.getDifference(alice_Coll, expected_A), 1000)
    assert.isAtMost(th.getDifference(bob_Coll, expected_B), 1000)
    assert.isAtMost(th.getDifference(dennis_Coll, expected_D), 1000)
    assert.isAtMost(th.getDifference(erin_Coll, expected_E), 1000)

    const entireSystemColl = (await activePool.getRBTC()).add(await defaultPool.getRBTC()).toString()
    assert.equal(entireSystemColl, A_coll.add(B_coll).add(D_coll).add(E_coll).add(th.applyLiquidationFee(C_coll.add(F_coll))))

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })
  ////

  it("redistribution: Sequence of alternate opening/liquidation: final surviving trove has RBTC from all previously liquidated troves", async () => {
    // A, B  open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: bob } })

    // Price drops to 1 $/E
    await priceFeed.setPrice(dec(1, 18))

    // L1: A liquidated
    const txA = await troveManager.liquidate(alice)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(alice))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))
    // C, opens trove
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: carol } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(1, 18))

    // L2: B Liquidated
    const txB = await troveManager.liquidate(bob)
    assert.isTrue(txB.receipt.status)
    assert.isFalse(await sortedTroves.contains(bob))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))
    // D opens trove
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: dennis } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(1, 18))

    // L3: C Liquidated
    const txC = await troveManager.liquidate(carol)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(carol))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))
    // E opens trove
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: erin } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(1, 18))

    // L4: D Liquidated
    const txD = await troveManager.liquidate(dennis)
    assert.isTrue(txD.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))
    // F opens trove
    const { collateral: F_coll } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: freddy } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(1, 18))

    // L5: E Liquidated
    const txE = await troveManager.liquidate(erin)
    assert.isTrue(txE.receipt.status)
    assert.isFalse(await sortedTroves.contains(erin))

    // Get entire coll of A, B, D, E and F
    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()
    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()
    const carol_Coll = ((await troveManager.Troves(carol))[1]
      .add(await troveManager.getPendingRBTCReward(carol)))
      .toString()
    const dennis_Coll = ((await troveManager.Troves(dennis))[1]
      .add(await troveManager.getPendingRBTCReward(dennis)))
      .toString()
    const erin_Coll = ((await troveManager.Troves(erin))[1]
      .add(await troveManager.getPendingRBTCReward(erin)))
      .toString()

    const freddy_rawColl = (await troveManager.Troves(freddy))[1].toString()
    const freddy_RBTCReward = (await troveManager.getPendingRBTCReward(freddy)).toString()

    /* Expected collateral:
     A-E should have been liquidated
     trove F should have acquired all RBTC in the system: 1 RBTC initial coll, and 0.995^5+0.995^4+0.995^3+0.995^2+0.995 from rewards = 5.925 RBTC
    */
    assert.isAtMost(th.getDifference(alice_Coll, '0'), 1000)
    assert.isAtMost(th.getDifference(bob_Coll, '0'), 1000)
    assert.isAtMost(th.getDifference(carol_Coll, '0'), 1000)
    assert.isAtMost(th.getDifference(dennis_Coll, '0'), 1000)
    assert.isAtMost(th.getDifference(erin_Coll, '0'), 1000)

    assert.isAtMost(th.getDifference(freddy_rawColl, F_coll), 1000)
    const gainedRBTC = th.applyLiquidationFee(
      E_coll.add(th.applyLiquidationFee(
        D_coll.add(th.applyLiquidationFee(
          C_coll.add(th.applyLiquidationFee(
            B_coll.add(th.applyLiquidationFee(A_coll))
          ))
        ))
      ))
    )
    assert.isAtMost(th.getDifference(freddy_RBTCReward, gainedRBTC), 1000)

    const entireSystemColl = (await activePool.getRBTC()).add(await defaultPool.getRBTC()).toString()
    assert.isAtMost(th.getDifference(entireSystemColl, F_coll.add(gainedRBTC)), 1000)

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(100, 18))
  })

  // ---Trove adds collateral --- 

  // Test based on scenario in: https://docs.google.com/spreadsheets/d/1F5p3nZy749K5jwO-bwJeTsRoY7ewMfWIQ3QHtokxqzo/edit?usp=sharing
  it("redistribution: A,B,C,D,E open. Liq(A). B adds coll. Liq(C). B and D have correct coll and debt", async () => {
    // A, B, C, D, E open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: A } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: B } })
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: C } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(20000, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: D } })
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: E } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate A
    // console.log(`ICR A: ${await troveManager.getCurrentICR(A, price)}`)
    const txA = await troveManager.liquidate(A)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(A))

    // Check entireColl for each trove:
    const B_entireColl_1 = (await th.getEntireCollAndDebt(contracts, B)).entireColl
    const C_entireColl_1 = (await th.getEntireCollAndDebt(contracts, C)).entireColl
    const D_entireColl_1 = (await th.getEntireCollAndDebt(contracts, D)).entireColl
    const E_entireColl_1 = (await th.getEntireCollAndDebt(contracts, E)).entireColl

    const totalCollAfterL1 = B_coll.add(C_coll).add(D_coll).add(E_coll)
    const B_collAfterL1 = B_coll.add(th.applyLiquidationFee(A_coll).mul(B_coll).div(totalCollAfterL1))
    const C_collAfterL1 = C_coll.add(th.applyLiquidationFee(A_coll).mul(C_coll).div(totalCollAfterL1))
    const D_collAfterL1 = D_coll.add(th.applyLiquidationFee(A_coll).mul(D_coll).div(totalCollAfterL1))
    const E_collAfterL1 = E_coll.add(th.applyLiquidationFee(A_coll).mul(E_coll).div(totalCollAfterL1))
    assert.isAtMost(getDifference(B_entireColl_1, B_collAfterL1), 1e8)
    assert.isAtMost(getDifference(C_entireColl_1, C_collAfterL1), 1e8)
    assert.isAtMost(getDifference(D_entireColl_1, D_collAfterL1), 1e8)
    assert.isAtMost(getDifference(E_entireColl_1, E_collAfterL1), 1e8)

    // Bob adds 1 RBTC to his trove
    const addedColl1 = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(B, B, { from: B, value: addedColl1 })

    // Liquidate C
    const txC = await troveManager.liquidate(C)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(C))

    const B_entireColl_2 = (await th.getEntireCollAndDebt(contracts, B)).entireColl
    const D_entireColl_2 = (await th.getEntireCollAndDebt(contracts, D)).entireColl
    const E_entireColl_2 = (await th.getEntireCollAndDebt(contracts, E)).entireColl

    const totalCollAfterL2 = B_collAfterL1.add(addedColl1).add(D_collAfterL1).add(E_collAfterL1)
    const B_collAfterL2 = B_collAfterL1.add(addedColl1).add(th.applyLiquidationFee(C_collAfterL1).mul(B_collAfterL1.add(addedColl1)).div(totalCollAfterL2))
    const D_collAfterL2 = D_collAfterL1.add(th.applyLiquidationFee(C_collAfterL1).mul(D_collAfterL1).div(totalCollAfterL2))
    const E_collAfterL2 = E_collAfterL1.add(th.applyLiquidationFee(C_collAfterL1).mul(E_collAfterL1).div(totalCollAfterL2))
    // console.log(`D_entireColl_2: ${D_entireColl_2}`)
    // console.log(`E_entireColl_2: ${E_entireColl_2}`)
    //assert.isAtMost(getDifference(B_entireColl_2, B_collAfterL2), 1e8)
    assert.isAtMost(getDifference(D_entireColl_2, D_collAfterL2), 1e8)
    assert.isAtMost(getDifference(E_entireColl_2, E_collAfterL2), 1e8)

    // Bob adds 1 RBTC to his trove
    const addedColl2 = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(B, B, { from: B, value: addedColl2 })

    // Liquidate E
    const txE = await troveManager.liquidate(E)
    assert.isTrue(txE.receipt.status)
    assert.isFalse(await sortedTroves.contains(E))

    const totalCollAfterL3 = B_collAfterL2.add(addedColl2).add(D_collAfterL2)
    const B_collAfterL3 = B_collAfterL2.add(addedColl2).add(th.applyLiquidationFee(E_collAfterL2).mul(B_collAfterL2.add(addedColl2)).div(totalCollAfterL3))
    const D_collAfterL3 = D_collAfterL2.add(th.applyLiquidationFee(E_collAfterL2).mul(D_collAfterL2).div(totalCollAfterL3))

    const B_entireColl_3 = (await th.getEntireCollAndDebt(contracts, B)).entireColl
    const D_entireColl_3 = (await th.getEntireCollAndDebt(contracts, D)).entireColl

    const diff_entireColl_B = getDifference(B_entireColl_3, B_collAfterL3)
    const diff_entireColl_D = getDifference(D_entireColl_3, D_collAfterL3)

    assert.isAtMost(diff_entireColl_B, 1e8)
    assert.isAtMost(diff_entireColl_D, 1e8)
  })

  // Test based on scenario in: https://docs.google.com/spreadsheets/d/1F5p3nZy749K5jwO-bwJeTsRoY7ewMfWIQ3QHtokxqzo/edit?usp=sharing
  it("redistribution: A,B,C,D open. Liq(A). B adds coll. Liq(C). B and D have correct coll and debt", async () => {
    // A, B, C, D, E open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: A } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: B } })
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: C } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(20000, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: D } })
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100000, 18), extraParams: { from: E } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Check entireColl for each trove:
    const A_entireColl_0 = (await th.getEntireCollAndDebt(contracts, A)).entireColl
    const B_entireColl_0 = (await th.getEntireCollAndDebt(contracts, B)).entireColl
    const C_entireColl_0 = (await th.getEntireCollAndDebt(contracts, C)).entireColl
    const D_entireColl_0 = (await th.getEntireCollAndDebt(contracts, D)).entireColl
    const E_entireColl_0 = (await th.getEntireCollAndDebt(contracts, E)).entireColl

    // entireSystemColl, excluding A 
    const denominatorColl_1 = (await troveManager.getEntireSystemColl()).sub(A_entireColl_0)

    // Liquidate A
    // console.log(`ICR A: ${await troveManager.getCurrentICR(A, price)}`)
    const txA = await troveManager.liquidate(A)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(A))

    const A_collRedistribution = A_entireColl_0.mul(toBN(995)).div(toBN(1000)) // remove the gas comp

    // console.log(`A_collRedistribution: ${A_collRedistribution}`)
    // Check accumulated RBTC gain for each trove
    const B_RBTCGain_1 = await troveManager.getPendingRBTCReward(B)
    const C_RBTCGain_1 = await troveManager.getPendingRBTCReward(C)
    const D_RBTCGain_1 = await troveManager.getPendingRBTCReward(D)
    const E_RBTCGain_1 = await troveManager.getPendingRBTCReward(E)

    // Check gains are what we'd expect from a distribution proportional to each trove's entire coll
    const B_expectedPendingRBTC_1 = A_collRedistribution.mul(B_entireColl_0).div(denominatorColl_1)
    const C_expectedPendingRBTC_1 = A_collRedistribution.mul(C_entireColl_0).div(denominatorColl_1)
    const D_expectedPendingRBTC_1 = A_collRedistribution.mul(D_entireColl_0).div(denominatorColl_1)
    const E_expectedPendingRBTC_1 = A_collRedistribution.mul(E_entireColl_0).div(denominatorColl_1)

    assert.isAtMost(getDifference(B_expectedPendingRBTC_1, B_RBTCGain_1), 1e8)
    assert.isAtMost(getDifference(C_expectedPendingRBTC_1, C_RBTCGain_1), 1e8)
    assert.isAtMost(getDifference(D_expectedPendingRBTC_1, D_RBTCGain_1), 1e8)
    assert.isAtMost(getDifference(E_expectedPendingRBTC_1, E_RBTCGain_1), 1e8)

    // // Bob adds 1 RBTC to his trove
    await borrowerOperations.addColl(B, B, { from: B, value: dec(1, 'ether') })

    // Check entireColl for each trove
    const B_entireColl_1 = (await th.getEntireCollAndDebt(contracts, B)).entireColl
    const C_entireColl_1 = (await th.getEntireCollAndDebt(contracts, C)).entireColl
    const D_entireColl_1 = (await th.getEntireCollAndDebt(contracts, D)).entireColl
    const E_entireColl_1 = (await th.getEntireCollAndDebt(contracts, E)).entireColl

    // entireSystemColl, excluding C
    const denominatorColl_2 = (await troveManager.getEntireSystemColl()).sub(C_entireColl_1)

    // Liquidate C
    const txC = await troveManager.liquidate(C)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(C))

    const C_collRedistribution = C_entireColl_1.mul(toBN(995)).div(toBN(1000)) // remove the gas comp
    // console.log(`C_collRedistribution: ${C_collRedistribution}`)

    const B_RBTCGain_2 = await troveManager.getPendingRBTCReward(B)
    const D_RBTCGain_2 = await troveManager.getPendingRBTCReward(D)
    const E_RBTCGain_2 = await troveManager.getPendingRBTCReward(E)

    // Since B topped up, he has no previous pending RBTC gain
    const B_expectedPendingRBTC_2 = C_collRedistribution.mul(B_entireColl_1).div(denominatorColl_2)

    // D & E's accumulated pending RBTC gain includes their previous gain
    const D_expectedPendingRBTC_2 = C_collRedistribution.mul(D_entireColl_1).div(denominatorColl_2)
      .add(D_expectedPendingRBTC_1)

    const E_expectedPendingRBTC_2 = C_collRedistribution.mul(E_entireColl_1).div(denominatorColl_2)
      .add(E_expectedPendingRBTC_1)

    assert.isAtMost(getDifference(B_expectedPendingRBTC_2, B_RBTCGain_2), 1e8)
    assert.isAtMost(getDifference(D_expectedPendingRBTC_2, D_RBTCGain_2), 1e8)
    assert.isAtMost(getDifference(E_expectedPendingRBTC_2, E_RBTCGain_2), 1e8)

    // // Bob adds 1 RBTC to his trove
    await borrowerOperations.addColl(B, B, { from: B, value: dec(1, 'ether') })

    // Check entireColl for each trove
    const B_entireColl_2 = (await th.getEntireCollAndDebt(contracts, B)).entireColl
    const D_entireColl_2 = (await th.getEntireCollAndDebt(contracts, D)).entireColl
    const E_entireColl_2 = (await th.getEntireCollAndDebt(contracts, E)).entireColl

    // entireSystemColl, excluding E
    const denominatorColl_3 = (await troveManager.getEntireSystemColl()).sub(E_entireColl_2)

    // Liquidate E
    const txE = await troveManager.liquidate(E)
    assert.isTrue(txE.receipt.status)
    assert.isFalse(await sortedTroves.contains(E))

    const E_collRedistribution = E_entireColl_2.mul(toBN(995)).div(toBN(1000)) // remove the gas comp
    // console.log(`E_collRedistribution: ${E_collRedistribution}`)

    const B_RBTCGain_3 = await troveManager.getPendingRBTCReward(B)
    const D_RBTCGain_3 = await troveManager.getPendingRBTCReward(D)

    // Since B topped up, he has no previous pending RBTC gain
    const B_expectedPendingRBTC_3 = E_collRedistribution.mul(B_entireColl_2).div(denominatorColl_3)

    // D'S accumulated pending RBTC gain includes their previous gain
    const D_expectedPendingRBTC_3 = E_collRedistribution.mul(D_entireColl_2).div(denominatorColl_3)
      .add(D_expectedPendingRBTC_2)

    assert.isAtMost(getDifference(B_expectedPendingRBTC_3, B_RBTCGain_3), 1e8)
    assert.isAtMost(getDifference(D_expectedPendingRBTC_3, D_RBTCGain_3), 1e8)
  })

  it("redistribution: A,B,C Open. Liq(C). B adds coll. Liq(A). B acquires all coll and debt", async () => {
    // A, B, C open troves
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: carol } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Carol
    const txC = await troveManager.liquidate(carol)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(carol))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    //Bob adds RBTC to his trove
    const addedColl = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(bob, bob, { from: bob, value: addedColl })

    // Alice withdraws ZUSD
    await borrowerOperations.withdrawZUSD(th._100pct, await getNetBorrowingAmount(A_totalDebt), alice, alice, { from: alice })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Alice
    const txA = await troveManager.liquidate(alice)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(alice))

    // Expect Bob now holds all RBtcer and ZUSDDebt in the system: 2 + 0.4975+0.4975*0.995+0.995 RBtcer and 110*3 ZUSD (10 each for gas compensation)
    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const bob_ZUSDDebt = ((await troveManager.Troves(bob))[0]
      .add(await troveManager.getPendingZUSDDebtReward(bob)))
      .toString()

    const expected_B_coll = B_coll
          .add(addedColl)
          .add(th.applyLiquidationFee(A_coll))
          .add(th.applyLiquidationFee(C_coll).mul(B_coll).div(A_coll.add(B_coll)))
          .add(th.applyLiquidationFee(th.applyLiquidationFee(C_coll).mul(A_coll).div(A_coll.add(B_coll))))
    assert.isAtMost(th.getDifference(bob_Coll, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(bob_ZUSDDebt, A_totalDebt.mul(toBN(2)).add(B_totalDebt).add(C_totalDebt)), 1000)
  })

  it("redistribution: A,B,C Open. Liq(C). B tops up coll. D Opens. Liq(D). Distributes correct rewards.", async () => {
    // A, B, C open troves
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: carol } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Carol
    const txC = await troveManager.liquidate(carol)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(carol))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    //Bob adds RBTC to his trove
    const addedColl = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(bob, bob, { from: bob, value: addedColl })

    // D opens trove
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: dennis } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate D
    const txA = await troveManager.liquidate(dennis)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    /* Bob rewards:
     L1: 1/2*0.995 RBTC, 55 ZUSD
     L2: (2.4975/3.995)*0.995 = 0.622 RBTC , 110*(2.4975/3.995)= 68.77 ZUSDDebt

    coll: 3.1195 RBTC
    debt: 233.77 ZUSDDebt

     Alice rewards:
    L1 1/2*0.995 RBTC, 55 ZUSD
    L2 (1.4975/3.995)*0.995 = 0.3730 RBTC, 110*(1.4975/3.995) = 41.23 ZUSDDebt

    coll: 1.8705 RBTC
    debt: 146.23 ZUSDDebt

    totalColl: 4.99 RBTC
    totalDebt 380 ZUSD (includes 50 each for gas compensation)
    */
    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const bob_ZUSDDebt = ((await troveManager.Troves(bob))[0]
      .add(await troveManager.getPendingZUSDDebtReward(bob)))
      .toString()

    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()

    const alice_ZUSDDebt = ((await troveManager.Troves(alice))[0]
      .add(await troveManager.getPendingZUSDDebtReward(alice)))
      .toString()

    const totalCollAfterL1 = A_coll.add(B_coll).add(addedColl).add(th.applyLiquidationFee(C_coll))
    const B_collAfterL1 = B_coll.add(B_coll.mul(th.applyLiquidationFee(C_coll)).div(A_coll.add(B_coll))).add(addedColl)
    const expected_B_coll = B_collAfterL1.add(B_collAfterL1.mul(th.applyLiquidationFee(D_coll)).div(totalCollAfterL1))
    const expected_B_debt = B_totalDebt
          .add(B_coll.mul(C_totalDebt).div(A_coll.add(B_coll)))
          .add(B_collAfterL1.mul(D_totalDebt).div(totalCollAfterL1))
    assert.isAtMost(th.getDifference(bob_Coll, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(bob_ZUSDDebt, expected_B_debt), 10000)

    const A_collAfterL1 = A_coll.add(A_coll.mul(th.applyLiquidationFee(C_coll)).div(A_coll.add(B_coll)))
    const expected_A_coll = A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(D_coll)).div(totalCollAfterL1))
    const expected_A_debt = A_totalDebt
          .add(A_coll.mul(C_totalDebt).div(A_coll.add(B_coll)))
          .add(A_collAfterL1.mul(D_totalDebt).div(totalCollAfterL1))
    assert.isAtMost(th.getDifference(alice_Coll, expected_A_coll), 1000)
    assert.isAtMost(th.getDifference(alice_ZUSDDebt, expected_A_debt), 10000)

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  it("redistribution: Trove with the majority stake tops up. A,B,C, D open. Liq(D). C tops up. E Enters, Liq(E). Distributes correct rewards", async () => {
    const _998_RBtcer = toBN('998000000000000000000')
    // A, B, C, D open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll } = await openTrove({ extraZUSDAmount: dec(110, 18), extraParams: { from: carol, value: _998_RBtcer } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: dennis, value: dec(1000, 'ether') } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Dennis
    const txD = await troveManager.liquidate(dennis)
    assert.isTrue(txD.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    // Expected rewards:  alice: 1 RBTC, bob: 1 RBTC, carol: 998 RBTC
    const alice_RBTCReward_1 = await troveManager.getPendingRBTCReward(alice)
    const bob_RBTCReward_1 = await troveManager.getPendingRBTCReward(bob)
    const carol_RBTCReward_1 = await troveManager.getPendingRBTCReward(carol)

    //Expect 1000 + 1000*0.995 RBTC in system now
    const entireSystemColl_1 = (await activePool.getRBTC()).add(await defaultPool.getRBTC()).toString()
    assert.equal(entireSystemColl_1, A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)))

    const totalColl = A_coll.add(B_coll).add(C_coll)
    th.assertIsApproximatelyEqual(alice_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(A_coll).div(totalColl))
    th.assertIsApproximatelyEqual(bob_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(B_coll).div(totalColl))
    th.assertIsApproximatelyEqual(carol_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(C_coll).div(totalColl))

    //Carol adds 1 RBTC to her trove, brings it to 1992.01 total coll
    const C_addedColl = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(carol, carol, { from: carol, value: dec(1, 'ether') })

    //Expect 1996 RBTC in system now
    const entireSystemColl_2 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_2, totalColl.add(th.applyLiquidationFee(D_coll)).add(C_addedColl))

    // E opens with another 1996 RBTC
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: erin, value: entireSystemColl_2 } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Erin
    const txE = await troveManager.liquidate(erin)
    assert.isTrue(txE.receipt.status)
    assert.isFalse(await sortedTroves.contains(erin))

    /* Expected RBTC rewards: 
     Carol = 1992.01/1996 * 1996*0.995 = 1982.05 RBTC
     Alice = 1.995/1996 * 1996*0.995 = 1.985025 RBTC
     Bob = 1.995/1996 * 1996*0.995 = 1.985025 RBTC

    therefore, expected total collateral:

    Carol = 1991.01 + 1991.01 = 3974.06
    Alice = 1.995 + 1.985025 = 3.980025 RBTC
    Bob = 1.995 + 1.985025 = 3.980025 RBTC

    total = 3982.02 RBTC
    */

    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()

    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const carol_Coll = ((await troveManager.Troves(carol))[1]
      .add(await troveManager.getPendingRBTCReward(carol)))
      .toString()

    const totalCollAfterL1 = A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)).add(C_addedColl)
    const A_collAfterL1 = A_coll.add(A_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll)))
    const expected_A_coll = A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const B_collAfterL1 = B_coll.add(B_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll)))
    const expected_B_coll = B_collAfterL1.add(B_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const C_collAfterL1 = C_coll.add(C_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).add(C_addedColl)
    const expected_C_coll = C_collAfterL1.add(C_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))

    assert.isAtMost(th.getDifference(alice_Coll, expected_A_coll), 1000)
    assert.isAtMost(th.getDifference(bob_Coll, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(carol_Coll, expected_C_coll), 1000)

    //Expect 3982.02 RBTC in system now
    const entireSystemColl_3 = (await activePool.getRBTC()).add(await defaultPool.getRBTC()).toString()
    th.assertIsApproximatelyEqual(entireSystemColl_3, totalCollAfterL1.add(th.applyLiquidationFee(E_coll)))

    // check ZUSD gas compensation
    th.assertIsApproximatelyEqual((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  it("redistribution: Trove with the majority stake tops up. A,B,C, D open. Liq(D). A, B, C top up. E Enters, Liq(E). Distributes correct rewards", async () => {
    const _998_RBtcer = toBN('998000000000000000000')
    // A, B, C open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll } = await openTrove({ extraZUSDAmount: dec(110, 18), extraParams: { from: carol, value: _998_RBtcer } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: dennis, value: dec(1000, 'ether') } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Dennis
    const txD = await troveManager.liquidate(dennis)
    assert.isTrue(txD.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    // Expected rewards:  alice: 1 RBTC, bob: 1 RBTC, carol: 998 RBTC (*0.995)
    const alice_RBTCReward_1 = await troveManager.getPendingRBTCReward(alice)
    const bob_RBTCReward_1 = await troveManager.getPendingRBTCReward(bob)
    const carol_RBTCReward_1 = await troveManager.getPendingRBTCReward(carol)

    //Expect 1995 RBTC in system now
    const entireSystemColl_1 = (await activePool.getRBTC()).add(await defaultPool.getRBTC()).toString()
    assert.equal(entireSystemColl_1, A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)))

    const totalColl = A_coll.add(B_coll).add(C_coll)
    th.assertIsApproximatelyEqual(alice_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(A_coll).div(totalColl))
    th.assertIsApproximatelyEqual(bob_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(B_coll).div(totalColl))
    th.assertIsApproximatelyEqual(carol_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(C_coll).div(totalColl))

    /* Alice, Bob, Carol each adds 1 RBTC to their troves, 
    bringing them to 2.995, 2.995, 1992.01 total coll each. */

    const addedColl = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(alice, alice, { from: alice, value: addedColl })
    await borrowerOperations.addColl(bob, bob, { from: bob, value: addedColl })
    await borrowerOperations.addColl(carol, carol, { from: carol, value: addedColl })

    //Expect 1998 RBTC in system now
    const entireSystemColl_2 = (await activePool.getRBTC()).add(await defaultPool.getRBTC()).toString()
    th.assertIsApproximatelyEqual(entireSystemColl_2, totalColl.add(th.applyLiquidationFee(D_coll)).add(addedColl.mul(toBN(3))))

    // E opens with another 1998 RBTC
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: erin, value: entireSystemColl_2 } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Erin
    const txE = await troveManager.liquidate(erin)
    assert.isTrue(txE.receipt.status)
    assert.isFalse(await sortedTroves.contains(erin))

    /* Expected RBTC rewards: 
     Carol = 1992.01/1998 * 1998*0.995 = 1982.04995 RBTC
     Alice = 2.995/1998 * 1998*0.995 = 2.980025 RBTC
     Bob = 2.995/1998 * 1998*0.995 = 2.980025 RBTC

    therefore, expected total collateral:

    Carol = 1992.01 + 1982.04995 = 3974.05995
    Alice = 2.995 + 2.980025 = 5.975025 RBTC
    Bob = 2.995 + 2.980025 = 5.975025 RBTC

    total = 3986.01 RBTC
    */

    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()

    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const carol_Coll = ((await troveManager.Troves(carol))[1]
      .add(await troveManager.getPendingRBTCReward(carol)))
      .toString()

    const totalCollAfterL1 = A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)).add(addedColl.mul(toBN(3)))
    const A_collAfterL1 = A_coll.add(A_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).add(addedColl)
    const expected_A_coll = A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const B_collAfterL1 = B_coll.add(B_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).add(addedColl)
    const expected_B_coll = B_collAfterL1.add(B_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const C_collAfterL1 = C_coll.add(C_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).add(addedColl)
    const expected_C_coll = C_collAfterL1.add(C_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))

    assert.isAtMost(th.getDifference(alice_Coll, expected_A_coll), 1000)
    assert.isAtMost(th.getDifference(bob_Coll, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(carol_Coll, expected_C_coll), 1000)

    //Expect 3986.01 RBTC in system now
    const entireSystemColl_3 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_3, totalCollAfterL1.add(th.applyLiquidationFee(E_coll)))

    // check ZUSD gas compensation
    th.assertIsApproximatelyEqual((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  // --- Trove withdraws collateral ---

  it("redistribution: A,B,C Open. Liq(C). B withdraws coll. Liq(A). B acquires all coll and debt", async () => {
    // A, B, C open troves
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: carol } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Carol
    const txC = await troveManager.liquidate(carol)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(carol))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    //Bob withdraws 0.5 RBTC from his trove
    const withdrawnColl = toBN(dec(500, 'finney'))
    await borrowerOperations.withdrawColl(withdrawnColl, bob, bob, { from: bob })

    // Alice withdraws ZUSD
    await borrowerOperations.withdrawZUSD(th._100pct, await getNetBorrowingAmount(A_totalDebt), alice, alice, { from: alice })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Alice
    const txA = await troveManager.liquidate(alice)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(alice))

    // Expect Bob now holds all RBtcer and ZUSDDebt in the system: 2.5 RBtcer and 300 ZUSD
    // 1 + 0.995/2 - 0.5 + 1.4975*0.995
    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const bob_ZUSDDebt = ((await troveManager.Troves(bob))[0]
      .add(await troveManager.getPendingZUSDDebtReward(bob)))
      .toString()

    const expected_B_coll = B_coll
          .sub(withdrawnColl)
          .add(th.applyLiquidationFee(A_coll))
          .add(th.applyLiquidationFee(C_coll).mul(B_coll).div(A_coll.add(B_coll)))
          .add(th.applyLiquidationFee(th.applyLiquidationFee(C_coll).mul(A_coll).div(A_coll.add(B_coll))))
    assert.isAtMost(th.getDifference(bob_Coll, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(bob_ZUSDDebt, A_totalDebt.mul(toBN(2)).add(B_totalDebt).add(C_totalDebt)), 1000)

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  it("redistribution: A,B,C Open. Liq(C). B withdraws coll. D Opens. Liq(D). Distributes correct rewards.", async () => {
    // A, B, C open troves
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: carol } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Carol
    const txC = await troveManager.liquidate(carol)
    assert.isTrue(txC.receipt.status)
    assert.isFalse(await sortedTroves.contains(carol))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    //Bob  withdraws 0.5 RBTC from his trove
    const withdrawnColl = toBN(dec(500, 'finney'))
    await borrowerOperations.withdrawColl(withdrawnColl, bob, bob, { from: bob })

    // D opens trove
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: dennis } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate D
    const txA = await troveManager.liquidate(dennis)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    /* Bob rewards:
     L1: 0.4975 RBTC, 55 ZUSD
     L2: (0.9975/2.495)*0.995 = 0.3978 RBTC , 110*(0.9975/2.495)= 43.98 ZUSDDebt

    coll: (1 + 0.4975 - 0.5 + 0.3968) = 1.3953 RBTC
    debt: (110 + 55 + 43.98 = 208.98 ZUSDDebt 

     Alice rewards:
    L1 0.4975, 55 ZUSD
    L2 (1.4975/2.495)*0.995 = 0.5972 RBTC, 110*(1.4975/2.495) = 66.022 ZUSDDebt

    coll: (1 + 0.4975 + 0.5972) = 2.0947 RBTC
    debt: (50 + 55 + 66.022) = 171.022 ZUSD Debt

    totalColl: 3.49 RBTC
    totalDebt 380 ZUSD (Includes 50 in each trove for gas compensation)
    */
    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const bob_ZUSDDebt = ((await troveManager.Troves(bob))[0]
      .add(await troveManager.getPendingZUSDDebtReward(bob)))
      .toString()

    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()

    const alice_ZUSDDebt = ((await troveManager.Troves(alice))[0]
      .add(await troveManager.getPendingZUSDDebtReward(alice)))
      .toString()

    const totalCollAfterL1 = A_coll.add(B_coll).sub(withdrawnColl).add(th.applyLiquidationFee(C_coll))
    const B_collAfterL1 = B_coll.add(B_coll.mul(th.applyLiquidationFee(C_coll)).div(A_coll.add(B_coll))).sub(withdrawnColl)
    const expected_B_coll = B_collAfterL1.add(B_collAfterL1.mul(th.applyLiquidationFee(D_coll)).div(totalCollAfterL1))
    const expected_B_debt = B_totalDebt
          .add(B_coll.mul(C_totalDebt).div(A_coll.add(B_coll)))
          .add(B_collAfterL1.mul(D_totalDebt).div(totalCollAfterL1))
    assert.isAtMost(th.getDifference(bob_Coll, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(bob_ZUSDDebt, expected_B_debt), 10000)

    const A_collAfterL1 = A_coll.add(A_coll.mul(th.applyLiquidationFee(C_coll)).div(A_coll.add(B_coll)))
    const expected_A_coll = A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(D_coll)).div(totalCollAfterL1))
    const expected_A_debt = A_totalDebt
          .add(A_coll.mul(C_totalDebt).div(A_coll.add(B_coll)))
          .add(A_collAfterL1.mul(D_totalDebt).div(totalCollAfterL1))
    assert.isAtMost(th.getDifference(alice_Coll, expected_A_coll), 1000)
    assert.isAtMost(th.getDifference(alice_ZUSDDebt, expected_A_debt), 10000)

    const entireSystemColl = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl, A_coll.add(B_coll).add(th.applyLiquidationFee(C_coll)).sub(withdrawnColl).add(th.applyLiquidationFee(D_coll)))
    const entireSystemDebt = (await activePool.getZUSDDebt()).add(await defaultPool.getZUSDDebt())
    th.assertIsApproximatelyEqual(entireSystemDebt, A_totalDebt.add(B_totalDebt).add(C_totalDebt).add(D_totalDebt))

    // check ZUSD gas compensation
    th.assertIsApproximatelyEqual((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  it("redistribution: Trove with the majority stake withdraws. A,B,C,D open. Liq(D). C withdraws some coll. E Enters, Liq(E). Distributes correct rewards", async () => {
    const _998_RBtcer = toBN('998000000000000000000')
    // A, B, C, D open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll } = await openTrove({ extraZUSDAmount: dec(110, 18), extraParams: { from: carol, value: _998_RBtcer } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: dennis, value: dec(1000, 'ether') } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Dennis
    const txD = await troveManager.liquidate(dennis)
    assert.isTrue(txD.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    // Expected rewards:  alice: 1 RBTC, bob: 1 RBTC, carol: 998 RBTC (*0.995)
    const alice_RBTCReward_1 = await troveManager.getPendingRBTCReward(alice)
    const bob_RBTCReward_1 = await troveManager.getPendingRBTCReward(bob)
    const carol_RBTCReward_1 = await troveManager.getPendingRBTCReward(carol)

    //Expect 1995 RBTC in system now
    const entireSystemColl_1 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_1, A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)))

    const totalColl = A_coll.add(B_coll).add(C_coll)
    th.assertIsApproximatelyEqual(alice_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(A_coll).div(totalColl))
    th.assertIsApproximatelyEqual(bob_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(B_coll).div(totalColl))
    th.assertIsApproximatelyEqual(carol_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(C_coll).div(totalColl))

    //Carol wthdraws 1 RBTC from her trove, brings it to 1990.01 total coll
    const C_withdrawnColl = toBN(dec(1, 'ether'))
    await borrowerOperations.withdrawColl(C_withdrawnColl, carol, carol, { from: carol })

    //Expect 1994 RBTC in system now
    const entireSystemColl_2 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_2, totalColl.add(th.applyLiquidationFee(D_coll)).sub(C_withdrawnColl))

    // E opens with another 1994 RBTC
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: erin, value: entireSystemColl_2 } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Erin
    const txE = await troveManager.liquidate(erin)
    assert.isTrue(txE.receipt.status)
    assert.isFalse(await sortedTroves.contains(erin))

    /* Expected RBTC rewards: 
     Carol = 1990.01/1994 * 1994*0.995 = 1980.05995 RBTC
     Alice = 1.995/1994 * 1994*0.995 = 1.985025 RBTC
     Bob = 1.995/1994 * 1994*0.995 = 1.985025 RBTC

    therefore, expected total collateral:

    Carol = 1990.01 + 1980.05995 = 3970.06995
    Alice = 1.995 + 1.985025 = 3.980025 RBTC
    Bob = 1.995 + 1.985025 = 3.980025 RBTC

    total = 3978.03 RBTC
    */

    const alice_Coll = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()

    const bob_Coll = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const carol_Coll = ((await troveManager.Troves(carol))[1]
      .add(await troveManager.getPendingRBTCReward(carol)))
      .toString()

    const totalCollAfterL1 = A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)).sub(C_withdrawnColl)
    const A_collAfterL1 = A_coll.add(A_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll)))
    const expected_A_coll = A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const B_collAfterL1 = B_coll.add(B_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll)))
    const expected_B_coll = B_collAfterL1.add(B_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const C_collAfterL1 = C_coll.add(C_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).sub(C_withdrawnColl)
    const expected_C_coll = C_collAfterL1.add(C_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))

    assert.isAtMost(th.getDifference(alice_Coll, expected_A_coll), 1000)
    assert.isAtMost(th.getDifference(bob_Coll, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(carol_Coll, expected_C_coll), 1000)

    //Expect 3978.03 RBTC in system now
    const entireSystemColl_3 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_3, totalCollAfterL1.add(th.applyLiquidationFee(E_coll)))

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  it("redistribution: Trove with the majority stake withdraws. A,B,C,D open. Liq(D). A, B, C withdraw. E Enters, Liq(E). Distributes correct rewards", async () => {
    const _998_RBtcer = toBN('998000000000000000000')
    // A, B, C, D open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: bob } })
    const { collateral: C_coll } = await openTrove({ extraZUSDAmount: dec(110, 18), extraParams: { from: carol, value: _998_RBtcer } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: dennis, value: dec(1000, 'ether') } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Dennis
    const txD = await troveManager.liquidate(dennis)
    assert.isTrue(txD.receipt.status)
    assert.isFalse(await sortedTroves.contains(dennis))

    // Price bounces back to 200 $/E
    await priceFeed.setPrice(dec(200, 18))

    // Expected rewards:  alice: 1 RBTC, bob: 1 RBTC, carol: 998 RBTC (*0.995)
    const alice_RBTCReward_1 = await troveManager.getPendingRBTCReward(alice)
    const bob_RBTCReward_1 = await troveManager.getPendingRBTCReward(bob)
    const carol_RBTCReward_1 = await troveManager.getPendingRBTCReward(carol)

    //Expect 1995 RBTC in system now
    const entireSystemColl_1 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_1, A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)))

    const totalColl = A_coll.add(B_coll).add(C_coll)
    th.assertIsApproximatelyEqual(alice_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(A_coll).div(totalColl))
    th.assertIsApproximatelyEqual(bob_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(B_coll).div(totalColl))
    th.assertIsApproximatelyEqual(carol_RBTCReward_1.toString(), th.applyLiquidationFee(D_coll).mul(C_coll).div(totalColl))

    /* Alice, Bob, Carol each withdraw 0.5 RBTC to their troves, 
    bringing them to 1.495, 1.495, 1990.51 total coll each. */
    const withdrawnColl = toBN(dec(500, 'finney'))
    await borrowerOperations.withdrawColl(withdrawnColl, alice, alice, { from: alice })
    await borrowerOperations.withdrawColl(withdrawnColl, bob, bob, { from: bob })
    await borrowerOperations.withdrawColl(withdrawnColl, carol, carol, { from: carol })

    const alice_Coll_1 = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()

    const bob_Coll_1 = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const carol_Coll_1 = ((await troveManager.Troves(carol))[1]
      .add(await troveManager.getPendingRBTCReward(carol)))
      .toString()

    const totalColl_1 = A_coll.add(B_coll).add(C_coll)
    assert.isAtMost(th.getDifference(alice_Coll_1, A_coll.add(th.applyLiquidationFee(D_coll).mul(A_coll).div(totalColl_1)).sub(withdrawnColl)), 1000)
    assert.isAtMost(th.getDifference(bob_Coll_1, B_coll.add(th.applyLiquidationFee(D_coll).mul(B_coll).div(totalColl_1)).sub(withdrawnColl)), 1000)
    assert.isAtMost(th.getDifference(carol_Coll_1, C_coll.add(th.applyLiquidationFee(D_coll).mul(C_coll).div(totalColl_1)).sub(withdrawnColl)), 1000)

    //Expect 1993.5 RBTC in system now
    const entireSystemColl_2 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_2, totalColl.add(th.applyLiquidationFee(D_coll)).sub(withdrawnColl.mul(toBN(3))))

    // E opens with another 1993.5 RBTC
    const { collateral: E_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: erin, value: entireSystemColl_2 } })

    // Price drops to 100 $/E
    await priceFeed.setPrice(dec(100, 18))

    // Liquidate Erin
    const txE = await troveManager.liquidate(erin)
    assert.isTrue(txE.receipt.status)
    assert.isFalse(await sortedTroves.contains(erin))

    /* Expected RBTC rewards: 
     Carol = 1990.51/1993.5 * 1993.5*0.995 = 1980.55745 RBTC
     Alice = 1.495/1993.5 * 1993.5*0.995 = 1.487525 RBTC
     Bob = 1.495/1993.5 * 1993.5*0.995 = 1.487525 RBTC

    therefore, expected total collateral:

    Carol = 1990.51 + 1980.55745 = 3971.06745
    Alice = 1.495 + 1.487525 = 2.982525 RBTC
    Bob = 1.495 + 1.487525 = 2.982525 RBTC

    total = 3977.0325 RBTC
    */

    const alice_Coll_2 = ((await troveManager.Troves(alice))[1]
      .add(await troveManager.getPendingRBTCReward(alice)))
      .toString()

    const bob_Coll_2 = ((await troveManager.Troves(bob))[1]
      .add(await troveManager.getPendingRBTCReward(bob)))
      .toString()

    const carol_Coll_2 = ((await troveManager.Troves(carol))[1]
      .add(await troveManager.getPendingRBTCReward(carol)))
      .toString()

    const totalCollAfterL1 = A_coll.add(B_coll).add(C_coll).add(th.applyLiquidationFee(D_coll)).sub(withdrawnColl.mul(toBN(3)))
    const A_collAfterL1 = A_coll.add(A_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).sub(withdrawnColl)
    const expected_A_coll = A_collAfterL1.add(A_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const B_collAfterL1 = B_coll.add(B_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).sub(withdrawnColl)
    const expected_B_coll = B_collAfterL1.add(B_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))
    const C_collAfterL1 = C_coll.add(C_coll.mul(th.applyLiquidationFee(D_coll)).div(A_coll.add(B_coll).add(C_coll))).sub(withdrawnColl)
    const expected_C_coll = C_collAfterL1.add(C_collAfterL1.mul(th.applyLiquidationFee(E_coll)).div(totalCollAfterL1))

    assert.isAtMost(th.getDifference(alice_Coll_2, expected_A_coll), 1000)
    assert.isAtMost(th.getDifference(bob_Coll_2, expected_B_coll), 1000)
    assert.isAtMost(th.getDifference(carol_Coll_2, expected_C_coll), 1000)

    //Expect 3977.0325 RBTC in system now
    const entireSystemColl_3 = (await activePool.getRBTC()).add(await defaultPool.getRBTC())
    th.assertIsApproximatelyEqual(entireSystemColl_3, totalCollAfterL1.add(th.applyLiquidationFee(E_coll)))

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(40, 18))
  })

  // For calculations of correct values used in test, see scenario 1:
  // https://docs.google.com/spreadsheets/d/1F5p3nZy749K5jwO-bwJeTsRoY7ewMfWIQ3QHtokxqzo/edit?usp=sharing
  it("redistribution, all operations: A,B,C open. Liq(A). D opens. B adds, C withdraws. Liq(B). E & F open. D adds. Liq(F). Distributes correct rewards", async () => {
    // A, B, C open troves
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: alice } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: bob } })
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: carol } })

    // Price drops to 1 $/E
    await priceFeed.setPrice(dec(1, 18))

    // Liquidate A
    const txA = await troveManager.liquidate(alice)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(alice))

    // Check rewards for B and C
    const B_pendingRewardsAfterL1 = th.applyLiquidationFee(A_coll).mul(B_coll).div(B_coll.add(C_coll))
    const C_pendingRewardsAfterL1 = th.applyLiquidationFee(A_coll).mul(C_coll).div(B_coll.add(C_coll))
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(bob), B_pendingRewardsAfterL1), 1000000)
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(carol), C_pendingRewardsAfterL1), 1000000)

    const totalStakesSnapshotAfterL1 = B_coll.add(C_coll)
    const totalCollateralSnapshotAfterL1 = totalStakesSnapshotAfterL1.add(th.applyLiquidationFee(A_coll))
    th.assertIsApproximatelyEqual(await troveManager.totalStakesSnapshot(), totalStakesSnapshotAfterL1)
    th.assertIsApproximatelyEqual(await troveManager.totalCollateralSnapshot(), totalCollateralSnapshotAfterL1)

    // Price rises to 1000
    await priceFeed.setPrice(dec(1000, 18))

    // D opens trove
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: dennis } })

    //Bob adds 1 RBTC to his trove
    const B_addedColl = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(bob, bob, { from: bob, value: B_addedColl })

    //Carol  withdraws 1 RBTC from her trove
    const C_withdrawnColl = toBN(dec(1, 'ether'))
    await borrowerOperations.withdrawColl(C_withdrawnColl, carol, carol, { from: carol })

    const B_collAfterL1 = B_coll.add(B_pendingRewardsAfterL1).add(B_addedColl)
    const C_collAfterL1 = C_coll.add(C_pendingRewardsAfterL1).sub(C_withdrawnColl)

    // Price drops
    await priceFeed.setPrice(dec(1, 18))

    // Liquidate B
    const txB = await troveManager.liquidate(bob)
    assert.isTrue(txB.receipt.status)
    assert.isFalse(await sortedTroves.contains(bob))

    // Check rewards for C and D
    const C_pendingRewardsAfterL2 = C_collAfterL1.mul(th.applyLiquidationFee(B_collAfterL1)).div(C_collAfterL1.add(D_coll))
    const D_pendingRewardsAfterL2 = D_coll.mul(th.applyLiquidationFee(B_collAfterL1)).div(C_collAfterL1.add(D_coll))
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(carol), C_pendingRewardsAfterL2), 1000000)
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(dennis), D_pendingRewardsAfterL2), 1000000)

    const totalStakesSnapshotAfterL2 = totalStakesSnapshotAfterL1.add(D_coll.mul(totalStakesSnapshotAfterL1).div(totalCollateralSnapshotAfterL1)).sub(B_coll).sub(C_withdrawnColl.mul(totalStakesSnapshotAfterL1).div(totalCollateralSnapshotAfterL1))
    const defaultedAmountAfterL2 = th.applyLiquidationFee(B_coll.add(B_addedColl).add(B_pendingRewardsAfterL1)).add(C_pendingRewardsAfterL1)
    const totalCollateralSnapshotAfterL2 = C_coll.sub(C_withdrawnColl).add(D_coll).add(defaultedAmountAfterL2)
    th.assertIsApproximatelyEqual(await troveManager.totalStakesSnapshot(), totalStakesSnapshotAfterL2)
    th.assertIsApproximatelyEqual(await troveManager.totalCollateralSnapshot(), totalCollateralSnapshotAfterL2)

    // Price rises to 1000
    await priceFeed.setPrice(dec(1000, 18))

    // E and F open troves
    const { collateral: E_coll, totalDebt: E_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: erin } })
    const { collateral: F_coll, totalDebt: F_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(110, 18), extraParams: { from: freddy } })

    // D tops up
    const D_addedColl = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(dennis, dennis, { from: dennis, value: D_addedColl })

    // Price drops to 1
    await priceFeed.setPrice(dec(1, 18))

    // Liquidate F
    const txF = await troveManager.liquidate(freddy)
    assert.isTrue(txF.receipt.status)
    assert.isFalse(await sortedTroves.contains(freddy))

    // Grab remaining troves' collateral
    const carol_rawColl = (await troveManager.Troves(carol))[1].toString()
    const carol_pendingRBTCReward = (await troveManager.getPendingRBTCReward(carol)).toString()

    const dennis_rawColl = (await troveManager.Troves(dennis))[1].toString()
    const dennis_pendingRBTCReward = (await troveManager.getPendingRBTCReward(dennis)).toString()

    const erin_rawColl = (await troveManager.Troves(erin))[1].toString()
    const erin_pendingRBTCReward = (await troveManager.getPendingRBTCReward(erin)).toString()

    // Check raw collateral of C, D, E
    const C_collAfterL2 = C_collAfterL1.add(C_pendingRewardsAfterL2)
    const D_collAfterL2 = D_coll.add(D_pendingRewardsAfterL2).add(D_addedColl)
    const totalCollForL3 = C_collAfterL2.add(D_collAfterL2).add(E_coll)
    const C_collAfterL3 = C_collAfterL2.add(C_collAfterL2.mul(th.applyLiquidationFee(F_coll)).div(totalCollForL3))
    const D_collAfterL3 = D_collAfterL2.add(D_collAfterL2.mul(th.applyLiquidationFee(F_coll)).div(totalCollForL3))
    const E_collAfterL3 = E_coll.add(E_coll.mul(th.applyLiquidationFee(F_coll)).div(totalCollForL3))
    assert.isAtMost(th.getDifference(carol_rawColl, C_collAfterL1), 1000)
    assert.isAtMost(th.getDifference(dennis_rawColl, D_collAfterL2), 1000000)
    assert.isAtMost(th.getDifference(erin_rawColl, E_coll), 1000)

    // Check pending RBTC rewards of C, D, E
    assert.isAtMost(th.getDifference(carol_pendingRBTCReward, C_collAfterL3.sub(C_collAfterL1)), 1000000)
    assert.isAtMost(th.getDifference(dennis_pendingRBTCReward, D_collAfterL3.sub(D_collAfterL2)), 1000000)
    assert.isAtMost(th.getDifference(erin_pendingRBTCReward, E_collAfterL3.sub(E_coll)), 1000000)

    // Check systemic collateral
    const activeColl = (await activePool.getRBTC()).toString()
    const defaultColl = (await defaultPool.getRBTC()).toString()

    assert.isAtMost(th.getDifference(activeColl, C_collAfterL1.add(D_collAfterL2.add(E_coll))), 1000000)
    assert.isAtMost(th.getDifference(defaultColl, C_collAfterL3.sub(C_collAfterL1).add(D_collAfterL3.sub(D_collAfterL2)).add(E_collAfterL3.sub(E_coll))), 1000000)

    // Check system snapshots
    const totalStakesSnapshotAfterL3 = totalStakesSnapshotAfterL2.add(D_addedColl.add(E_coll).mul(totalStakesSnapshotAfterL2).div(totalCollateralSnapshotAfterL2))
    const totalCollateralSnapshotAfterL3 = C_coll.sub(C_withdrawnColl).add(D_coll).add(D_addedColl).add(E_coll).add(defaultedAmountAfterL2).add(th.applyLiquidationFee(F_coll))
    const totalStakesSnapshot = (await troveManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot = (await troveManager.totalCollateralSnapshot()).toString()
    th.assertIsApproximatelyEqual(totalStakesSnapshot, totalStakesSnapshotAfterL3)
    th.assertIsApproximatelyEqual(totalCollateralSnapshot, totalCollateralSnapshotAfterL3)

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(60, 18))
  })

  // For calculations of correct values used in test, see scenario 2:
  // https://docs.google.com/spreadsheets/d/1F5p3nZy749K5jwO-bwJeTsRoY7ewMfWIQ3QHtokxqzo/edit?usp=sharing
  it("redistribution, all operations: A,B,C open. Liq(A). D opens. B adds, C withdraws. Liq(B). E & F open. D adds. Liq(F). Varying coll. Distributes correct rewards", async () => {
    /* A, B, C open troves.
    A: 450 RBTC
    B: 8901 RBTC
    C: 23.902 RBTC
    */
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(90000, 16)), extraParams: { from: alice, value: toBN('450000000000000000000') } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(1800000, 16)), extraParams: { from: bob, value: toBN('8901000000000000000000') } })
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(4600, 16)), extraParams: { from: carol, value: toBN('23902000000000000000') } })

    // Price drops 
    await priceFeed.setPrice('1')

    // Liquidate A
    const txA = await troveManager.liquidate(alice)
    assert.isTrue(txA.receipt.status)
    assert.isFalse(await sortedTroves.contains(alice))

    // Check rewards for B and C
    const B_pendingRewardsAfterL1 = th.applyLiquidationFee(A_coll).mul(B_coll).div(B_coll.add(C_coll))
    const C_pendingRewardsAfterL1 = th.applyLiquidationFee(A_coll).mul(C_coll).div(B_coll.add(C_coll))
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(bob), B_pendingRewardsAfterL1), 1000000)
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(carol), C_pendingRewardsAfterL1), 1000000)

    const totalStakesSnapshotAfterL1 = B_coll.add(C_coll)
    const totalCollateralSnapshotAfterL1 = totalStakesSnapshotAfterL1.add(th.applyLiquidationFee(A_coll))
    th.assertIsApproximatelyEqual(await troveManager.totalStakesSnapshot(), totalStakesSnapshotAfterL1)
    th.assertIsApproximatelyEqual(await troveManager.totalCollateralSnapshot(), totalCollateralSnapshotAfterL1)

    // Price rises 
    await priceFeed.setPrice(dec(1, 27))

    // D opens trove: 0.035 RBTC
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openTrove({ extraZUSDAmount: dec(100, 18), extraParams: { from: dennis, value: toBN(dec(35, 15)) } })

    // Bob adds 11.33909 RBTC to his trove
    const B_addedColl = toBN('11339090000000000000')
    await borrowerOperations.addColl(bob, bob, { from: bob, value: B_addedColl })

    // Carol withdraws 15 RBTC from her trove
    const C_withdrawnColl = toBN(dec(15, 'ether'))
    await borrowerOperations.withdrawColl(C_withdrawnColl, carol, carol, { from: carol })

    const B_collAfterL1 = B_coll.add(B_pendingRewardsAfterL1).add(B_addedColl)
    const C_collAfterL1 = C_coll.add(C_pendingRewardsAfterL1).sub(C_withdrawnColl)

    // Price drops
    await priceFeed.setPrice('1')

    // Liquidate B
    const txB = await troveManager.liquidate(bob)
    assert.isTrue(txB.receipt.status)
    assert.isFalse(await sortedTroves.contains(bob))

    // Check rewards for C and D
    const C_pendingRewardsAfterL2 = C_collAfterL1.mul(th.applyLiquidationFee(B_collAfterL1)).div(C_collAfterL1.add(D_coll))
    const D_pendingRewardsAfterL2 = D_coll.mul(th.applyLiquidationFee(B_collAfterL1)).div(C_collAfterL1.add(D_coll))
    const C_collAfterL2 = C_collAfterL1.add(C_pendingRewardsAfterL2)
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(carol), C_pendingRewardsAfterL2), 10000000)
    assert.isAtMost(th.getDifference(await troveManager.getPendingRBTCReward(dennis), D_pendingRewardsAfterL2), 10000000)

    const totalStakesSnapshotAfterL2 = totalStakesSnapshotAfterL1.add(D_coll.mul(totalStakesSnapshotAfterL1).div(totalCollateralSnapshotAfterL1)).sub(B_coll).sub(C_withdrawnColl.mul(totalStakesSnapshotAfterL1).div(totalCollateralSnapshotAfterL1))
    const defaultedAmountAfterL2 = th.applyLiquidationFee(B_coll.add(B_addedColl).add(B_pendingRewardsAfterL1)).add(C_pendingRewardsAfterL1)
    const totalCollateralSnapshotAfterL2 = C_coll.sub(C_withdrawnColl).add(D_coll).add(defaultedAmountAfterL2)
    th.assertIsApproximatelyEqual(await troveManager.totalStakesSnapshot(), totalStakesSnapshotAfterL2)
    th.assertIsApproximatelyEqual(await troveManager.totalCollateralSnapshot(), totalCollateralSnapshotAfterL2)

    // Price rises 
    await priceFeed.setPrice(dec(1, 27))

    /* E and F open troves.
    E: 10000 RBTC
    F: 0.0007 RBTC
    */
    const { collateral: E_coll, totalDebt: E_totalDebt } = await openTrove({ extraZUSDAmount: dec(100, 18), extraParams: { from: erin, value: toBN(dec(1, 22)) } })
    const { collateral: F_coll, totalDebt: F_totalDebt } = await openTrove({ extraZUSDAmount: dec(100, 18), extraParams: { from: freddy, value: toBN('700000000000000') } })

    // D tops up
    const D_addedColl = toBN(dec(1, 'ether'))
    await borrowerOperations.addColl(dennis, dennis, { from: dennis, value: D_addedColl })

    const D_collAfterL2 = D_coll.add(D_pendingRewardsAfterL2).add(D_addedColl)

    // Price drops 
    await priceFeed.setPrice('1')

    // Liquidate F
    const txF = await troveManager.liquidate(freddy)
    assert.isTrue(txF.receipt.status)
    assert.isFalse(await sortedTroves.contains(freddy))

    // Grab remaining troves' collateral
    const carol_rawColl = (await troveManager.Troves(carol))[1].toString()
    const carol_pendingRBTCReward = (await troveManager.getPendingRBTCReward(carol)).toString()
    const carol_Stake = (await troveManager.Troves(carol))[2].toString()

    const dennis_rawColl = (await troveManager.Troves(dennis))[1].toString()
    const dennis_pendingRBTCReward = (await troveManager.getPendingRBTCReward(dennis)).toString()
    const dennis_Stake = (await troveManager.Troves(dennis))[2].toString()

    const erin_rawColl = (await troveManager.Troves(erin))[1].toString()
    const erin_pendingRBTCReward = (await troveManager.getPendingRBTCReward(erin)).toString()
    const erin_Stake = (await troveManager.Troves(erin))[2].toString()

    // Check raw collateral of C, D, E
    const totalCollForL3 = C_collAfterL2.add(D_collAfterL2).add(E_coll)
    const C_collAfterL3 = C_collAfterL2.add(C_collAfterL2.mul(th.applyLiquidationFee(F_coll)).div(totalCollForL3))
    const D_collAfterL3 = D_collAfterL2.add(D_collAfterL2.mul(th.applyLiquidationFee(F_coll)).div(totalCollForL3))
    const E_collAfterL3 = E_coll.add(E_coll.mul(th.applyLiquidationFee(F_coll)).div(totalCollForL3))
    assert.isAtMost(th.getDifference(carol_rawColl, C_collAfterL1), 1000)
    assert.isAtMost(th.getDifference(dennis_rawColl, D_collAfterL2), 1000000)
    assert.isAtMost(th.getDifference(erin_rawColl, E_coll), 1000)

    // Check pending RBTC rewards of C, D, E
    assert.isAtMost(th.getDifference(carol_pendingRBTCReward, C_collAfterL3.sub(C_collAfterL1)), 1000000)
    assert.isAtMost(th.getDifference(dennis_pendingRBTCReward, D_collAfterL3.sub(D_collAfterL2)), 1000000)
    assert.isAtMost(th.getDifference(erin_pendingRBTCReward, E_collAfterL3.sub(E_coll)), 1000000)

    // Check systemic collateral
    const activeColl = (await activePool.getRBTC()).toString()
    const defaultColl = (await defaultPool.getRBTC()).toString()

    assert.isAtMost(th.getDifference(activeColl, C_collAfterL1.add(D_collAfterL2.add(E_coll))), 1000000)
    assert.isAtMost(th.getDifference(defaultColl, C_collAfterL3.sub(C_collAfterL1).add(D_collAfterL3.sub(D_collAfterL2)).add(E_collAfterL3.sub(E_coll))), 1000000)

    // Check system snapshots
    const totalStakesSnapshotAfterL3 = totalStakesSnapshotAfterL2.add(D_addedColl.add(E_coll).mul(totalStakesSnapshotAfterL2).div(totalCollateralSnapshotAfterL2))
    const totalCollateralSnapshotAfterL3 = C_coll.sub(C_withdrawnColl).add(D_coll).add(D_addedColl).add(E_coll).add(defaultedAmountAfterL2).add(th.applyLiquidationFee(F_coll))
    const totalStakesSnapshot = (await troveManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot = (await troveManager.totalCollateralSnapshot()).toString()
    th.assertIsApproximatelyEqual(totalStakesSnapshot, totalStakesSnapshotAfterL3)
    th.assertIsApproximatelyEqual(totalCollateralSnapshot, totalCollateralSnapshotAfterL3)

    // check ZUSD gas compensation
    assert.equal((await zusdToken.balanceOf(owner)).toString(), dec(60, 18))
  })
})
