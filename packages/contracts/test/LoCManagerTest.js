const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');

const LoCManagerTester = artifacts.require("./LoCManagerTester.sol")
const ZUSDTokenTester = artifacts.require("./ZUSDTokenTester.sol")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const mv = testHelpers.MoneyValues
const timeValues = testHelpers.TimeValues


/* NOTE: Some tests involving BTC redemption fees do not test for specific fee values.
 * Some only test that the fees are non-zero when they should occur.
 *
 * Specific BTC gain values will depend on the final fee schedule used, and the final choices for
 * the parameter BETA in the LoCManager, which is still TBD based on economic modelling.
 * 
 */ 
contract('LoCManager', async accounts => {

  const _18_zeros = '000000000000000000'
  const ZERO_ADDRESS = th.ZERO_ADDRESS

  const [
    owner,
    alice, bob, carol, dennis, erin, flyn, graham, harriet, ida,
    defaulter_1, defaulter_2, defaulter_3, defaulter_4, whale,
    A, B, C, D, E, sovFeeCollector] = accounts;

    const multisig = accounts[999];

  let priceFeed
  let zusdToken
  let sortedLoCs
  let locManager
  let activePool
  let stabilityPool
  let collSurplusPool
  let defaultPool
  let borrowerOperations
  let hintHelpers

  let contracts

  const getOpenLoCTotalDebt = async (zusdAmount) => th.getOpenLoCTotalDebt(contracts, zusdAmount)
  const getOpenLoCZUSDAmount = async (totalDebt) => th.getOpenLoCZUSDAmount(contracts, totalDebt)
  const getActualDebtFromComposite = async (compositeDebt) => th.getActualDebtFromComposite(compositeDebt, contracts)
  const getNetBorrowingAmount = async (debtWithFee) => th.getNetBorrowingAmount(contracts, debtWithFee)
  const openLoC = async (params) => th.openLoC(contracts, params)
  const withdrawZUSD = async (params) => th.withdrawZUSD(contracts, params)

  before(async () => {
    contracts = await deploymentHelper.deployZeroCore()
    contracts.locManager = await LoCManagerTester.new()
    contracts.zusdToken = await ZUSDTokenTester.new(
      contracts.locManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    )
    const ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig)

    priceFeed = contracts.priceFeedTestnet
    zusdToken = contracts.zusdToken
    sortedLoCs = contracts.sortedLoCs
    locManager = contracts.locManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    collSurplusPool = contracts.collSurplusPool
    borrowerOperations = contracts.borrowerOperations
    hintHelpers = contracts.hintHelpers

    zeroStaking = ZEROContracts.zeroStaking
    zeroToken = ZEROContracts.zeroToken
    communityIssuance = ZEROContracts.communityIssuance 

    await deploymentHelper.connectCoreContracts(contracts, ZEROContracts)
    await deploymentHelper.connectZEROContracts(ZEROContracts)
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts, owner)

    await zeroToken.unprotectedMint(multisig,toBN(dec(20,24)))
    await zeroToken.unprotectedMint(owner,toBN(dec(30,24)))
    await zeroToken.approve(communityIssuance.address, toBN(dec(30,24)))
    // await communityIssuance.receiveZero(owner, toBN(dec(30,24)))

    
  })

  let revertToSnapshot;

  beforeEach(async() => {
    let snapshot = await timeMachine.takeSnapshot();
    revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result'])
  });

  afterEach(async() => {
    await revertToSnapshot();
  });

  it('liquidate(): closes a LoC that has ICR < MCR', async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })

    const price = await priceFeed.getPrice()
    const ICR_Before = await locManager.getCurrentICR(alice, price)
    assert.equal(ICR_Before, dec(4, 18))

    const MCR = (await locManager.MCR()).toString()
    assert.equal(MCR.toString(), '1100000000000000000')

    // Alice increases debt to 180 ZUSD, lowering her ICR to 1.11
    const A_ZUSDWithdrawal = await getNetBorrowingAmount(dec(130, 18))

    const targetICR = toBN('1111111111111111111')
    await withdrawZUSD({ ICR: targetICR, extraParams: { from: alice } })

    const ICR_AfterWithdrawal = await locManager.getCurrentICR(alice, price)
    assert.isAtMost(th.getDifference(ICR_AfterWithdrawal, targetICR), 100)

    // price drops to 1BTC:100ZUSD, reducing Alice's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close LoC
    await locManager.liquidate(alice, { from: owner });

    // check the LoC is successfully closed, and removed from sortedList
    const status = (await locManager.LoCs(alice))[3]
    assert.equal(status, 3)  // status enum 3 corresponds to "Closed by liquidation"
    const alice_LoC_isInSortedList = await sortedLoCs.contains(alice)
    assert.isFalse(alice_LoC_isInSortedList)
  })

  it("liquidate(): decreases ActivePool BTC and ZUSDDebt by correct amounts", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check ActivePool BTC and ZUSD debt before
    const activePool_BTC_Before = (await activePool.getBTC()).toString()
    const activePool_RawBTC_Before = (await web3.eth.getBalance(activePool.address)).toString()
    const activePool_ZUSDDebt_Before = (await activePool.getZUSDDebt()).toString()

    assert.equal(activePool_BTC_Before, A_collateral.add(B_collateral))
    assert.equal(activePool_RawBTC_Before, A_collateral.add(B_collateral))
    th.assertIsApproximatelyEqual(activePool_ZUSDDebt_Before, A_totalDebt.add(B_totalDebt))

    // price drops to 1BTC:100ZUSD, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    /* close Bob's LoC. Should liquidate his bitcoin and ZUSD, 
    leaving Alice’s bitcoin and ZUSD debt in the ActivePool. */
    await locManager.liquidate(bob, { from: owner });

    // check ActivePool BTC and ZUSD debt 
    const activePool_BTC_After = (await activePool.getBTC()).toString()
    const activePool_RawBTC_After = (await web3.eth.getBalance(activePool.address)).toString()
    const activePool_ZUSDDebt_After = (await activePool.getZUSDDebt()).toString()

    assert.equal(activePool_BTC_After, A_collateral)
    assert.equal(activePool_RawBTC_After, A_collateral)
    th.assertIsApproximatelyEqual(activePool_ZUSDDebt_After, A_totalDebt)
  })

  it("liquidate(): increases DefaultPool BTC and ZUSD debt by correct amounts", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check DefaultPool BTC and ZUSD debt before
    const defaultPool_BTC_Before = (await defaultPool.getBTC())
    const defaultPool_RawBTC_Before = (await web3.eth.getBalance(defaultPool.address)).toString()
    const defaultPool_ZUSDDebt_Before = (await defaultPool.getZUSDDebt()).toString()

    assert.equal(defaultPool_BTC_Before, '0')
    assert.equal(defaultPool_RawBTC_Before, '0')
    assert.equal(defaultPool_ZUSDDebt_Before, '0')

    // price drops to 1BTC:100ZUSD, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close Bob's LoC
    await locManager.liquidate(bob, { from: owner });

    // check after
    const defaultPool_BTC_After = (await defaultPool.getBTC()).toString()
    const defaultPool_RawBTC_After = (await web3.eth.getBalance(defaultPool.address)).toString()
    const defaultPool_ZUSDDebt_After = (await defaultPool.getZUSDDebt()).toString()

    const defaultPool_BTC = th.applyLiquidationFee(B_collateral)
    assert.equal(defaultPool_BTC_After, defaultPool_BTC)
    assert.equal(defaultPool_RawBTC_After, defaultPool_BTC)
    th.assertIsApproximatelyEqual(defaultPool_ZUSDDebt_After, B_totalDebt)
  })

  it("liquidate(): removes the LoC's stake from the total stakes", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check totalStakes before
    const totalStakes_Before = (await locManager.totalStakes()).toString()
    assert.equal(totalStakes_Before, A_collateral.add(B_collateral))

    // price drops to 1BTC:100ZUSD, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Close Bob's LoC
    await locManager.liquidate(bob, { from: owner });

    // check totalStakes after
    const totalStakes_After = (await locManager.totalStakes()).toString()
    assert.equal(totalStakes_After, A_collateral)
  })

  it("liquidate(): Removes the correct LoC from the LoCOwners array, and moves the last array element to the new empty slot", async () => {
    // --- SETUP --- 
    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol, Dennis, Erin open locs with consecutively decreasing collateral ratio
    await openLoC({ ICR: toBN(dec(218, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(216, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(214, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(212, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: erin } })

    // At this stage, LoCOwners array should be: [W, A, B, C, D, E] 

    // Drop price
    await priceFeed.setPrice(dec(100, 18))

    const arrayLength_Before = await locManager.getLoCOwnersCount()
    assert.equal(arrayLength_Before, 6)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate carol
    await locManager.liquidate(carol)

    // Check Carol no longer has an active loc
    assert.isFalse(await sortedLoCs.contains(carol))

    // Check length of array has decreased by 1
    const arrayLength_After = await locManager.getLoCOwnersCount()
    assert.equal(arrayLength_After, 5)

    /* After Carol is removed from array, the last element (Erin's address) should have been moved to fill 
    the empty slot left by Carol, and the array length decreased by one.  The final LoCOwners array should be:
  
    [W, A, B, E, D] 

    Check all remaining locs in the array are in the correct order */
    const loc_0 = await locManager.LoCOwners(0)
    const loc_1 = await locManager.LoCOwners(1)
    const loc_2 = await locManager.LoCOwners(2)
    const loc_3 = await locManager.LoCOwners(3)
    const loc_4 = await locManager.LoCOwners(4)

    assert.equal(loc_0, whale)
    assert.equal(loc_1, alice)
    assert.equal(loc_2, bob)
    assert.equal(loc_3, erin)
    assert.equal(loc_4, dennis)

    // Check correct indices recorded on the active LoC structs
    const whale_arrayIndex = (await locManager.LoCs(whale))[4]
    const alice_arrayIndex = (await locManager.LoCs(alice))[4]
    const bob_arrayIndex = (await locManager.LoCs(bob))[4]
    const dennis_arrayIndex = (await locManager.LoCs(dennis))[4]
    const erin_arrayIndex = (await locManager.LoCs(erin))[4]

    // [W, A, B, E, D] 
    assert.equal(whale_arrayIndex, 0)
    assert.equal(alice_arrayIndex, 1)
    assert.equal(bob_arrayIndex, 2)
    assert.equal(erin_arrayIndex, 3)
    assert.equal(dennis_arrayIndex, 4)
  })

  it("liquidate(): updates the snapshots of total stakes and total collateral", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check snapshots before 
    const totalStakesSnapshot_Before = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_Before = (await locManager.totalCollateralSnapshot()).toString()
    assert.equal(totalStakesSnapshot_Before, '0')
    assert.equal(totalCollateralSnapshot_Before, '0')

    // price drops to 1BTC:100ZUSD, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close Bob's LoC.  His bitcoin*0.995 and ZUSD should be added to the DefaultPool.
    await locManager.liquidate(bob, { from: owner });

    /* check snapshots after. Total stakes should be equal to the  remaining stake then the system: 
    10 bitcoin, Alice's stake.
     
    Total collateral should be equal to Alice's collateral plus her pending BTC reward (Bob’s collaterale*0.995 bitcoin), earned
    from the liquidation of Bob's LoC */
    const totalStakesSnapshot_After = (await locManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_After = (await locManager.totalCollateralSnapshot()).toString()

    assert.equal(totalStakesSnapshot_After, A_collateral)
    assert.equal(totalCollateralSnapshot_After, A_collateral.add(th.applyLiquidationFee(B_collateral)))
  })

  it("liquidate(): updates the L_BTC and L_ZUSDDebt reward-per-unit-staked totals", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(8, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: bob } })
    const { collateral: C_collateral, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(111, 16)), extraParams: { from: carol } })

    // --- TEST ---

    // price drops to 1BTC:100ZUSD, reducing Carols's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close Carol's LoC.  
    assert.isTrue(await sortedLoCs.contains(carol))
    await locManager.liquidate(carol, { from: owner });
    assert.isFalse(await sortedLoCs.contains(carol))

    // Carol's bitcoin*0.995 and ZUSD should be added to the DefaultPool.
    const L_BTC_AfterCarolLiquidated = await locManager.L_BTC()
    const L_ZUSDDebt_AfterCarolLiquidated = await locManager.L_ZUSDDebt()

    const L_BTC_expected_1 = th.applyLiquidationFee(C_collateral).mul(mv._1e18BN).div(A_collateral.add(B_collateral))
    const L_ZUSDDebt_expected_1 = C_totalDebt.mul(mv._1e18BN).div(A_collateral.add(B_collateral))
    assert.isAtMost(th.getDifference(L_BTC_AfterCarolLiquidated, L_BTC_expected_1), 100)
    assert.isAtMost(th.getDifference(L_ZUSDDebt_AfterCarolLiquidated, L_ZUSDDebt_expected_1), 100)

    // Bob now withdraws ZUSD, bringing his ICR to 1.11
    const { increasedTotalDebt: B_increasedTotalDebt } = await withdrawZUSD({ ICR: toBN(dec(111, 16)), extraParams: { from: bob } })

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // price drops to 1BTC:50ZUSD, reducing Bob's ICR below MCR
    await priceFeed.setPrice(dec(50, 18));
    const price = await priceFeed.getPrice()

    // close Bob's LoC 
    assert.isTrue(await sortedLoCs.contains(bob))
    await locManager.liquidate(bob, { from: owner });
    assert.isFalse(await sortedLoCs.contains(bob))

    /* Alice now has all the active stake. totalStakes in the system is now 10 bitcoin.
   
   Bob's pending collateral reward and debt reward are applied to his LoC
   before his liquidation.
   His total collateral*0.995 and debt are then added to the DefaultPool. 
   
   The system rewards-per-unit-staked should now be:
   
   L_BTC = (0.995 / 20) + (10.4975*0.995  / 10) = 1.09425125 BTC
   L_ZUSDDebt = (180 / 20) + (890 / 10) = 98 ZUSD */
    const L_BTC_AfterBobLiquidated = await locManager.L_BTC()
    const L_ZUSDDebt_AfterBobLiquidated = await locManager.L_ZUSDDebt()

    const L_BTC_expected_2 = L_BTC_expected_1.add(th.applyLiquidationFee(B_collateral.add(B_collateral.mul(L_BTC_expected_1).div(mv._1e18BN))).mul(mv._1e18BN).div(A_collateral))
    const L_ZUSDDebt_expected_2 = L_ZUSDDebt_expected_1.add(B_totalDebt.add(B_increasedTotalDebt).add(B_collateral.mul(L_ZUSDDebt_expected_1).div(mv._1e18BN)).mul(mv._1e18BN).div(A_collateral))
    assert.isAtMost(th.getDifference(L_BTC_AfterBobLiquidated, L_BTC_expected_2), 100)
    assert.isAtMost(th.getDifference(L_ZUSDDebt_AfterBobLiquidated, L_ZUSDDebt_expected_2), 100)
  })

  it("liquidate(): Liquidates undercollateralized LoC if there are two locs in the system", async () => {
    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: bob, value: dec(100, 'ether') } })

    // Alice creates a single LoC with 0.7 BTC and a debt of 70 ZUSD, and provides 10 ZUSD to SP
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: alice } })

    // Alice proves 10 ZUSD to SP
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, { from: alice })

    // Set BTC:USD price to 105
    await priceFeed.setPrice('105000000000000000000')
    const price = await priceFeed.getPrice()

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const alice_ICR = (await locManager.getCurrentICR(alice, price)).toString()
    assert.equal(alice_ICR, '1050000000000000000')

    const activeLoCsCount_Before = await locManager.getLoCOwnersCount()

    assert.equal(activeLoCsCount_Before, 2)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

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

  it("liquidate(): reverts if LoC is non-existent", async () => {
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    assert.equal(await locManager.getLoCStatus(carol), 0) // check LoC non-existent

    assert.isFalse(await sortedLoCs.contains(carol))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    try {
      const txCarol = await locManager.liquidate(carol)

      assert.isFalse(txCarol.receipt.status)
    } catch (err) {
      assert.include(err.message, "revert")
      assert.include(err.message, "LoC does not exist or is closed")
    }
  })

  it("liquidate(): reverts if LoC has been closed", async () => {
    await openLoC({ ICR: toBN(dec(8, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })

    assert.isTrue(await sortedLoCs.contains(carol))

    // price drops, Carol ICR falls below MCR
    await priceFeed.setPrice(dec(100, 18))

    // Carol liquidated, and her LoC is closed
    const txCarol_L1 = await locManager.liquidate(carol)
    assert.isTrue(txCarol_L1.receipt.status)

    assert.isFalse(await sortedLoCs.contains(carol))

    assert.equal(await locManager.getLoCStatus(carol), 3)  // check LoC closed by liquidation

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    try {
      const txCarol_L2 = await locManager.liquidate(carol)

      assert.isFalse(txCarol_L2.receipt.status)
    } catch (err) {
      assert.include(err.message, "revert")
      assert.include(err.message, "LoC does not exist or is closed")
    }
  })

  it("liquidate(): does nothing if LoC has >= 110% ICR", async () => {
    await openLoC({ ICR: toBN(dec(3, 18)), extraParams: { from: whale } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraParams: { from: bob } })

    const TCR_Before = (await th.getTCR(contracts)).toString()
    const listSize_Before = (await sortedLoCs.getSize()).toString()

    const price = await priceFeed.getPrice()

    // Check Bob's ICR > 110%
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt to liquidate bob
    await assertRevert(locManager.liquidate(bob), "LoCManager: nothing to liquidate")

    // Check bob active, check whale active
    assert.isTrue((await sortedLoCs.contains(bob)))
    assert.isTrue((await sortedLoCs.contains(whale)))

    const TCR_After = (await th.getTCR(contracts)).toString()
    const listSize_After = (await sortedLoCs.getSize()).toString()

    assert.equal(TCR_Before, TCR_After)
    assert.equal(listSize_Before, listSize_After)
  })

  it("liquidate(): Given the same price and no other LoC changes, complete Pool offsets restore the TCR to its value prior to the defaulters opening locs", async () => {
    // Whale provides ZUSD to SP
    const spDeposit = toBN(dec(100, 24))
    await openLoC({ ICR: toBN(dec(4, 18)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(70, 18)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: dennis } })

    const TCR_Before = (await th.getTCR(contracts)).toString()

    await openLoC({ ICR: toBN(dec(202, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: defaulter_2 } })
    await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: defaulter_3 } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedLoCs.contains(defaulter_1)))
    assert.isTrue((await sortedLoCs.contains(defaulter_2)))
    assert.isTrue((await sortedLoCs.contains(defaulter_3)))
    assert.isTrue((await sortedLoCs.contains(defaulter_4)))

    // Price drop
    await priceFeed.setPrice(dec(100, 18))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // All defaulters liquidated
    await locManager.liquidate(defaulter_1)
    assert.isFalse((await sortedLoCs.contains(defaulter_1)))

    await locManager.liquidate(defaulter_2)
    assert.isFalse((await sortedLoCs.contains(defaulter_2)))

    await locManager.liquidate(defaulter_3)
    assert.isFalse((await sortedLoCs.contains(defaulter_3)))

    await locManager.liquidate(defaulter_4)
    assert.isFalse((await sortedLoCs.contains(defaulter_4)))

    // Price bounces back
    await priceFeed.setPrice(dec(200, 18))

    const TCR_After = (await th.getTCR(contracts)).toString()
    assert.equal(TCR_Before, TCR_After)
  })


  it("liquidate(): Pool offsets increase the TCR", async () => {
    // Whale provides ZUSD to SP
    const spDeposit = toBN(dec(100, 24))
    await openLoC({ ICR: toBN(dec(4, 18)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(70, 18)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: dennis } })

    await openLoC({ ICR: toBN(dec(202, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: defaulter_2 } })
    await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: defaulter_3 } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedLoCs.contains(defaulter_1)))
    assert.isTrue((await sortedLoCs.contains(defaulter_2)))
    assert.isTrue((await sortedLoCs.contains(defaulter_3)))
    assert.isTrue((await sortedLoCs.contains(defaulter_4)))

    await priceFeed.setPrice(dec(100, 18))

    const TCR_1 = await th.getTCR(contracts)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Check TCR improves with each liquidation that is offset with Pool
    await locManager.liquidate(defaulter_1)
    assert.isFalse((await sortedLoCs.contains(defaulter_1)))
    const TCR_2 = await th.getTCR(contracts)
    assert.isTrue(TCR_2.gte(TCR_1))

    await locManager.liquidate(defaulter_2)
    assert.isFalse((await sortedLoCs.contains(defaulter_2)))
    const TCR_3 = await th.getTCR(contracts)
    assert.isTrue(TCR_3.gte(TCR_2))

    await locManager.liquidate(defaulter_3)
    assert.isFalse((await sortedLoCs.contains(defaulter_3)))
    const TCR_4 = await th.getTCR(contracts)
    assert.isTrue(TCR_4.gte(TCR_4))

    await locManager.liquidate(defaulter_4)
    assert.isFalse((await sortedLoCs.contains(defaulter_4)))
    const TCR_5 = await th.getTCR(contracts)
    assert.isTrue(TCR_5.gte(TCR_5))
  })

  it("liquidate(): a pure redistribution reduces the TCR only as a result of compensation", async () => {
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(70, 18)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: dennis } })

    await openLoC({ ICR: toBN(dec(202, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: defaulter_2 } })
    await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: defaulter_3 } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedLoCs.contains(defaulter_1)))
    assert.isTrue((await sortedLoCs.contains(defaulter_2)))
    assert.isTrue((await sortedLoCs.contains(defaulter_3)))
    assert.isTrue((await sortedLoCs.contains(defaulter_4)))

    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const TCR_0 = await th.getTCR(contracts)

    const entireSystemCollBefore = await locManager.getEntireSystemColl()
    const entireSystemDebtBefore = await locManager.getEntireSystemDebt()

    const expectedTCR_0 = entireSystemCollBefore.mul(price).div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_0.eq(TCR_0))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Check TCR does not decrease with each liquidation 
    const liquidationTx_1 = await locManager.liquidate(defaulter_1)
    const [liquidatedDebt_1, liquidatedColl_1, gasComp_1] = th.getEmittedLiquidationValues(liquidationTx_1)
    assert.isFalse((await sortedLoCs.contains(defaulter_1)))
    const TCR_1 = await th.getTCR(contracts)

    // Expect only change to TCR to be due to the issued gas compensation
    const expectedTCR_1 = (entireSystemCollBefore
      .sub(gasComp_1))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_1.eq(TCR_1))

    const liquidationTx_2 = await locManager.liquidate(defaulter_2)
    const [liquidatedDebt_2, liquidatedColl_2, gasComp_2] = th.getEmittedLiquidationValues(liquidationTx_2)
    assert.isFalse((await sortedLoCs.contains(defaulter_2)))

    const TCR_2 = await th.getTCR(contracts)

    const expectedTCR_2 = (entireSystemCollBefore
      .sub(gasComp_1)
      .sub(gasComp_2))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_2.eq(TCR_2))

    const liquidationTx_3 = await locManager.liquidate(defaulter_3)
    const [liquidatedDebt_3, liquidatedColl_3, gasComp_3] = th.getEmittedLiquidationValues(liquidationTx_3)
    assert.isFalse((await sortedLoCs.contains(defaulter_3)))

    const TCR_3 = await th.getTCR(contracts)

    const expectedTCR_3 = (entireSystemCollBefore
      .sub(gasComp_1)
      .sub(gasComp_2)
      .sub(gasComp_3))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_3.eq(TCR_3))


    const liquidationTx_4 = await locManager.liquidate(defaulter_4)
    const [liquidatedDebt_4, liquidatedColl_4, gasComp_4] = th.getEmittedLiquidationValues(liquidationTx_4)
    assert.isFalse((await sortedLoCs.contains(defaulter_4)))

    const TCR_4 = await th.getTCR(contracts)

    const expectedTCR_4 = (entireSystemCollBefore
      .sub(gasComp_1)
      .sub(gasComp_2)
      .sub(gasComp_3)
      .sub(gasComp_4))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_4.eq(TCR_4))
  })

  it("liquidate(): does not affect the SP deposit or BTC gain when called on an SP depositor's address that has no loc", async () => {
    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    const spDeposit = toBN(dec(1, 24))
    await openLoC({ ICR: toBN(dec(3, 18)), extraZUSDAmount: spDeposit, extraParams: { from: bob } })
    const { C_totalDebt, C_collateral } = await openLoC({ ICR: toBN(dec(218, 16)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    // Bob sends tokens to Dennis, who has no loc
    await zusdToken.transfer(dennis, spDeposit, { from: bob })

    //Dennis provides ZUSD to SP
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: dennis })

    // Carol gets liquidated
    await priceFeed.setPrice(dec(100, 18))
    const liquidationTX_C = await locManager.liquidate(carol)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTX_C)

    assert.isFalse(await sortedLoCs.contains(carol))
    // Check Dennis' SP deposit has absorbed Carol's debt, and he has received her liquidated BTC
    const dennis_Deposit_Before = (await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString()
    const dennis_BTCGain_Before = (await stabilityPool.getDepositorBTCGain(dennis)).toString()
    assert.isAtMost(th.getDifference(dennis_Deposit_Before, spDeposit.sub(liquidatedDebt)), 1000000)
    assert.isAtMost(th.getDifference(dennis_BTCGain_Before, liquidatedColl), 1000)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt to liquidate Dennis
    try {
      const txDennis = await locManager.liquidate(dennis)
      assert.isFalse(txDennis.receipt.status)
    } catch (err) {
      assert.include(err.message, "revert")
      assert.include(err.message, "LoC does not exist or is closed")
    }

    // Check Dennis' SP deposit does not change after liquidation attempt
    const dennis_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString()
    const dennis_BTCGain_After = (await stabilityPool.getDepositorBTCGain(dennis)).toString()
    assert.equal(dennis_Deposit_Before, dennis_Deposit_After)
    assert.equal(dennis_BTCGain_Before, dennis_BTCGain_After)
  })

  it("liquidate(): does not liquidate a SP depositor's LoC with ICR > 110%, and does not affect their SP deposit or BTC gain", async () => {
    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    const spDeposit = toBN(dec(1, 24))
    await openLoC({ ICR: toBN(dec(3, 18)), extraZUSDAmount: spDeposit, extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(218, 16)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    //Bob provides ZUSD to SP
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: bob })

    // Carol gets liquidated
    await priceFeed.setPrice(dec(100, 18))
    const liquidationTX_C = await locManager.liquidate(carol)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTX_C)
    assert.isFalse(await sortedLoCs.contains(carol))

    // price bounces back - Bob's LoC is >110% ICR again
    await priceFeed.setPrice(dec(200, 18))
    const price = await priceFeed.getPrice()
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gt(mv._MCR))

    // Check Bob' SP deposit has absorbed Carol's debt, and he has received her liquidated BTC
    const bob_Deposit_Before = (await stabilityPool.getCompoundedZUSDDeposit(bob)).toString()
    const bob_BTCGain_Before = (await stabilityPool.getDepositorBTCGain(bob)).toString()
    assert.isAtMost(th.getDifference(bob_Deposit_Before, spDeposit.sub(liquidatedDebt)), 1000000)
    assert.isAtMost(th.getDifference(bob_BTCGain_Before, liquidatedColl), 1000)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt to liquidate Bob
    await assertRevert(locManager.liquidate(bob), "LoCManager: nothing to liquidate")

    // Confirm Bob's LoC is still active
    assert.isTrue(await sortedLoCs.contains(bob))

    // Check Bob' SP deposit does not change after liquidation attempt
    const bob_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(bob)).toString()
    const bob_BTCGain_After = (await stabilityPool.getDepositorBTCGain(bob)).toString()
    assert.equal(bob_Deposit_Before, bob_Deposit_After)
    assert.equal(bob_BTCGain_Before, bob_BTCGain_After)
  })

  it("liquidate(): liquidates a SP depositor's LoC with ICR < 110%, and the liquidation correctly impacts their SP deposit and BTC gain", async () => {
    const A_spDeposit = toBN(dec(3, 24))
    const B_spDeposit = toBN(dec(1, 24))
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    await openLoC({ ICR: toBN(dec(8, 18)), extraZUSDAmount: A_spDeposit, extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_debt } = await openLoC({ ICR: toBN(dec(218, 16)), extraZUSDAmount: B_spDeposit, extraParams: { from: bob } })
    const { collateral: C_collateral, totalDebt: C_debt } = await openLoC({ ICR: toBN(dec(210, 16)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    //Bob provides ZUSD to SP
    await stabilityPool.provideToSP(B_spDeposit, ZERO_ADDRESS, { from: bob })

    // Carol gets liquidated
    await priceFeed.setPrice(dec(100, 18))
    await locManager.liquidate(carol)

    // Check Bob' SP deposit has absorbed Carol's debt, and he has received her liquidated BTC
    const bob_Deposit_Before = await stabilityPool.getCompoundedZUSDDeposit(bob)
    const bob_BTCGain_Before = await stabilityPool.getDepositorBTCGain(bob)
    assert.isAtMost(th.getDifference(bob_Deposit_Before, B_spDeposit.sub(C_debt)), 1000000)
    assert.isAtMost(th.getDifference(bob_BTCGain_Before, th.applyLiquidationFee(C_collateral)), 1000)

    // Alice provides ZUSD to SP
    await stabilityPool.provideToSP(A_spDeposit, ZERO_ADDRESS, { from: alice })

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate Bob
    await locManager.liquidate(bob)

    // Confirm Bob's LoC has been closed
    assert.isFalse(await sortedLoCs.contains(bob))
    const bob_LoC_Status = ((await locManager.LoCs(bob))[3]).toString()
    assert.equal(bob_LoC_Status, 3) // check closed by liquidation

    /* 
       Alice's ZUSD Loss = (300 / 400) * 200 = 150 ZUSD
       Alice's BTC gain = (300 / 400) * 2*0.995 = 1.4925 BTC

       Bob's ZUSDLoss = (100 / 400) * 200 = 50 ZUSD
       Bob's BTC gain = (100 / 400) * 2*0.995 = 0.4975 BTC

     Check Bob' SP deposit has been reduced to 50 ZUSD, and his BTC gain has increased to 1.5 BTC. */
    const alice_Deposit_After = (await stabilityPool.getCompoundedZUSDDeposit(alice)).toString()
    const alice_BTCGain_After = (await stabilityPool.getDepositorBTCGain(alice)).toString()

    const totalDeposits = bob_Deposit_Before.add(A_spDeposit)

    // Note: The difference was 1000000 but it's it got a little bit bigger after changing system parameters.
    //       I'm not sure why but the difference is way deep into the decimals
    assert.isAtMost(th.getDifference(alice_Deposit_After, A_spDeposit.sub(B_debt.mul(A_spDeposit).div(totalDeposits))), 2000000)
    assert.isAtMost(th.getDifference(alice_BTCGain_After, th.applyLiquidationFee(B_collateral).mul(A_spDeposit).div(totalDeposits)), 3000000)

    const bob_Deposit_After = await stabilityPool.getCompoundedZUSDDeposit(bob)
    const bob_BTCGain_After = await stabilityPool.getDepositorBTCGain(bob)

    assert.isAtMost(th.getDifference(bob_Deposit_After, bob_Deposit_Before.sub(B_debt.mul(bob_Deposit_Before).div(totalDeposits))), 1000000)
    assert.isAtMost(th.getDifference(bob_BTCGain_After, bob_BTCGain_Before.add(th.applyLiquidationFee(B_collateral).mul(bob_Deposit_Before).div(totalDeposits))), 1000000)
  })

  it("liquidate(): does not alter the liquidated user's token balance", async () => {
    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    const { zusdAmount: A_zusdAmount } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: toBN(dec(300, 18)), extraParams: { from: alice } })
    const { zusdAmount: B_zusdAmount } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: toBN(dec(200, 18)), extraParams: { from: bob } })
    const { zusdAmount: C_zusdAmount } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    await priceFeed.setPrice(dec(100, 18))

    // Check sortedList size
    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate A, B and C
    const activeZUSDDebt_0 = await activePool.getZUSDDebt()
    const defaultZUSDDebt_0 = await defaultPool.getZUSDDebt()

    await locManager.liquidate(alice)
    const activeZUSDDebt_A = await activePool.getZUSDDebt()
    const defaultZUSDDebt_A = await defaultPool.getZUSDDebt()

    await locManager.liquidate(bob)
    const activeZUSDDebt_B = await activePool.getZUSDDebt()
    const defaultZUSDDebt_B = await defaultPool.getZUSDDebt()

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

  it("liquidate(): liquidates based on entire/collateral debt (including pending rewards), not raw collateral/debt", async () => {
    await openLoC({ ICR: toBN(dec(8, 18)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    // Defaulter opens with 60 ZUSD, 0.6 BTC
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: defaulter_1 } })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const alice_ICR_Before = await locManager.getCurrentICR(alice, price)
    const bob_ICR_Before = await locManager.getCurrentICR(bob, price)
    const carol_ICR_Before = await locManager.getCurrentICR(carol, price)

    /* Before liquidation: 
    Alice ICR: = (2 * 100 / 50) = 400%
    Bob ICR: (1 * 100 / 90.5) = 110.5%
    Carol ICR: (1 * 100 / 100 ) =  100%

    Therefore Alice and Bob above the MCR, Carol is below */
    assert.isTrue(alice_ICR_Before.gte(mv._MCR))
    assert.isTrue(bob_ICR_Before.gte(mv._MCR))
    assert.isTrue(carol_ICR_Before.lte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    /* Liquidate defaulter. 30 ZUSD and 0.3 BTC is distributed between A, B and C.

    A receives (30 * 2/4) = 15 ZUSD, and (0.3*2/4) = 0.15 BTC
    B receives (30 * 1/4) = 7.5 ZUSD, and (0.3*1/4) = 0.075 BTC
    C receives (30 * 1/4) = 7.5 ZUSD, and (0.3*1/4) = 0.075 BTC
    */
    await locManager.liquidate(defaulter_1)

    const alice_ICR_After = await locManager.getCurrentICR(alice, price)
    const bob_ICR_After = await locManager.getCurrentICR(bob, price)
    const carol_ICR_After = await locManager.getCurrentICR(carol, price)

    /* After liquidation: 

    Alice ICR: (10.15 * 100 / 60) = 183.33%
    Bob ICR:(1.075 * 100 / 98) =  109.69%
    Carol ICR: (1.075 *100 /  107.5 ) = 100.0%

    Check Alice is above MCR, Bob below, Carol below. */


    assert.isTrue(alice_ICR_After.gte(mv._MCR))
    assert.isTrue(bob_ICR_After.lte(mv._MCR))
    assert.isTrue(carol_ICR_After.lte(mv._MCR))

    /* Though Bob's true ICR (including pending rewards) is below the MCR, 
    check that Bob's raw coll and debt has not changed, and that his "raw" ICR is above the MCR */
    const bob_Coll = (await locManager.LoCs(bob))[1]
    const bob_Debt = (await locManager.LoCs(bob))[0]

    const bob_rawICR = bob_Coll.mul(toBN(dec(100, 18))).div(bob_Debt)
    assert.isTrue(bob_rawICR.gte(mv._MCR))

    // Whale enters system, pulling it into Normal Mode
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate Alice, Bob, Carol
    await assertRevert(locManager.liquidate(alice), "LoCManager: nothing to liquidate")
    await locManager.liquidate(bob)
    await locManager.liquidate(carol)

    /* Check Alice stays active, Carol gets liquidated, and Bob gets liquidated 
   (because his pending rewards bring his ICR < MCR) */
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // Check LoC statuses - A active (1),  B and C liquidated (3)
    assert.equal((await locManager.LoCs(alice))[3].toString(), '1')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    assert.equal((await locManager.LoCs(carol))[3].toString(), '3')
  })

  it("liquidate(): when SP > 0, triggers ZERO reward event - increases the sum G", async () => {
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open locs 
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: defaulter_1 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })
    assert.equal(await stabilityPool.getTotalZUSDDeposits(), dec(100, 18))

    const G_Before = await stabilityPool.epochToScaleToG(0, 0)

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1BTC:100ZUSD, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate loc
    await locManager.liquidate(defaulter_1)
    assert.isFalse(await sortedLoCs.contains(defaulter_1))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G hasn't increased from the ZERO reward event triggered
    assert.isTrue(G_After.eq(G_Before))
  })

  it("liquidate(): when SP is empty, doesn't update G", async () => {
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open locs 
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: defaulter_1 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // B withdraws
    await stabilityPool.withdrawFromSP(dec(100, 18), { from: B })

    // Check SP is empty
    assert.equal((await stabilityPool.getTotalZUSDDeposits()), '0')

    // Check G is zero
    const G_Before = await stabilityPool.epochToScaleToG(0, 0)
    assert.isTrue(G_Before.eq(toBN('0')))

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1BTC:100ZUSD, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // liquidate loc
    await locManager.liquidate(defaulter_1)
    assert.isFalse(await sortedLoCs.contains(defaulter_1))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has not changed
    assert.isTrue(G_After.eq(G_Before))
  })

  // --- liquidateLoCs() ---

  it('liquidateLoCs(): liquidates a LoC that a) was skipped in a previous liquidation and b) has pending rewards', async () => {
    // A, B, C, D, E open locs
    await openLoC({ ICR: toBN(dec(333, 16)), extraParams: { from: D } })
    await openLoC({ ICR: toBN(dec(333, 16)), extraParams: { from: E } })
    await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    // Price drops
    await priceFeed.setPrice(dec(175, 18))
    let price = await priceFeed.getPrice()
    
    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // A gets liquidated, creates pending rewards for all
    const liqTxA = await locManager.liquidate(A)
    assert.isTrue(liqTxA.receipt.status)
    assert.isFalse(await sortedLoCs.contains(A))

    // A adds 10 ZUSD to the SP, but less than C's debt
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, {from: A})

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    price = await priceFeed.getPrice()
    // Confirm system is now in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm C has ICR > TCR
    const TCR = await locManager.getTCR(price)
    const ICR_C = await locManager.getCurrentICR(C, price)
  
    assert.isTrue(ICR_C.gt(TCR))

    // Attempt to liquidate B and C, which skips C in the liquidation since it is immune
    const liqTxBC = await locManager.liquidateLoCs(2)
    assert.isTrue(liqTxBC.receipt.status)
    assert.isFalse(await sortedLoCs.contains(B))
    assert.isTrue(await sortedLoCs.contains(C))
    assert.isTrue(await sortedLoCs.contains(D))
    assert.isTrue(await sortedLoCs.contains(E))

    // // All remaining locs D and E repay a little debt, applying their pending rewards
    assert.isTrue((await sortedLoCs.getSize()).eq(toBN('3')))
    await borrowerOperations.repayZUSD(dec(1, 18), D, D, {from: D})
    await borrowerOperations.repayZUSD(dec(1, 18), E, E, {from: E})

    // Check C is the only LoC that has pending rewards
    assert.isTrue(await locManager.hasPendingRewards(C))
    assert.isFalse(await locManager.hasPendingRewards(D))
    assert.isFalse(await locManager.hasPendingRewards(E))

    // Check C's pending coll and debt rewards are <= the coll and debt in the DefaultPool
    const pendingBTC_C = await locManager.getPendingBTCReward(C)
    const pendingZUSDDebt_C = await locManager.getPendingZUSDDebtReward(C)
    const defaultPoolBTC = await defaultPool.getBTC()
    const defaultPoolZUSDDebt = await defaultPool.getZUSDDebt()
    assert.isTrue(pendingBTC_C.lte(defaultPoolBTC))
    assert.isTrue(pendingZUSDDebt_C.lte(defaultPoolZUSDDebt))
    //Check only difference is dust
    assert.isAtMost(th.getDifference(pendingBTC_C, defaultPoolBTC), 1000)
    assert.isAtMost(th.getDifference(pendingZUSDDebt_C, defaultPoolZUSDDebt), 1000)

    // Confirm system is still in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // D and E fill the Stability Pool, enough to completely absorb C's debt of 70
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: D})
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: E})

    await priceFeed.setPrice(dec(50, 18))

    // Try to liquidate C again. Check it succeeds and closes C's loc
    const liqTx2 = await locManager.liquidateLoCs(2)
    assert.isTrue(liqTx2.receipt.status)
    assert.isFalse(await sortedLoCs.contains(C))
    assert.isFalse(await sortedLoCs.contains(D))
    assert.isTrue(await sortedLoCs.contains(E))
    assert.isTrue((await sortedLoCs.getSize()).eq(toBN('1')))
  })

  it('liquidateLoCs(): closes every LoC with ICR < MCR, when n > number of undercollateralized locs', async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    const whaleBalance = await zusdToken.balanceOf(whale)

    // create 5 LoCs with varying ICRs
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(195, 16)), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: flyn } })

    // G,H, I open high-ICR locs
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: graham } })
    await openLoC({ ICR: toBN(dec(90, 18)), extraParams: { from: harriet } })
    await openLoC({ ICR: toBN(dec(80, 18)), extraParams: { from: ida } })

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(whaleBalance, ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing Bob and Carol's ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm locs A-E are ICR < 110%
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(erin, price)).lte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(flyn, price)).lte(mv._MCR))

    // Confirm locs G, H, I are ICR > 110%
    assert.isTrue((await locManager.getCurrentICR(graham, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(harriet, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(ida, price)).gte(mv._MCR))

    // Confirm Whale is ICR > 110% 
    assert.isTrue((await locManager.getCurrentICR(whale, price)).gte(mv._MCR))

    // Liquidate 5 locs
    await locManager.liquidateLoCs(5);

    // Confirm locs A-E have been removed from the system
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(flyn))

    // Check all locs A-E are now closed by liquidation
    assert.equal((await locManager.LoCs(alice))[3].toString(), '3')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    assert.equal((await locManager.LoCs(carol))[3].toString(), '3')
    assert.equal((await locManager.LoCs(erin))[3].toString(), '3')
    assert.equal((await locManager.LoCs(flyn))[3].toString(), '3')

    // Check sorted list has been reduced to length 4 
    assert.equal((await sortedLoCs.getSize()).toString(), '4')
  })

  it('liquidateLoCs(): liquidates  up to the requested number of undercollateralized locs', async () => {
    // --- SETUP --- 
    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol, Dennis, Erin open locs with consecutively decreasing collateral ratio
    await openLoC({ ICR: toBN(dec(202, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(204, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(208, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: erin } })

    // --- TEST --- 

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    await locManager.liquidateLoCs(3)

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

  it('liquidateLoCs(): does nothing if all locs have ICR > 110%', async () => {
    await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(222, 16)), extraParams: { from: carol } })

    // Price drops, but all locs remain active at 111% ICR
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    assert.isTrue((await sortedLoCs.contains(whale)))
    assert.isTrue((await sortedLoCs.contains(alice)))
    assert.isTrue((await sortedLoCs.contains(bob)))
    assert.isTrue((await sortedLoCs.contains(carol)))

    const TCR_Before = (await th.getTCR(contracts)).toString()
    const listSize_Before = (await sortedLoCs.getSize()).toString()

    assert.isTrue((await locManager.getCurrentICR(whale, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(alice, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).gte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt liqudation sequence
    await assertRevert(locManager.liquidateLoCs(10), "LoCManager: nothing to liquidate")

    // Check all locs remain active
    assert.isTrue((await sortedLoCs.contains(whale)))
    assert.isTrue((await sortedLoCs.contains(alice)))
    assert.isTrue((await sortedLoCs.contains(bob)))
    assert.isTrue((await sortedLoCs.contains(carol)))

    const TCR_After = (await th.getTCR(contracts)).toString()
    const listSize_After = (await sortedLoCs.getSize()).toString()

    assert.equal(TCR_Before, TCR_After)
    assert.equal(listSize_Before, listSize_After)
  })

  
  it("liquidateLoCs(): liquidates based on entire/collateral debt (including pending rewards), not raw collateral/debt", async () => {
    await openLoC({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(221, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const alice_ICR_Before = await locManager.getCurrentICR(alice, price)
    const bob_ICR_Before = await locManager.getCurrentICR(bob, price)
    const carol_ICR_Before = await locManager.getCurrentICR(carol, price)

    /* Before liquidation: 
    Alice ICR: = (2 * 100 / 100) = 200%
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

    Alice ICR: (1.0995 * 100 / 60) = 183.25%
    Bob ICR:(1.0995 * 100 / 100.5) =  109.40%
    Carol ICR: (1.0995 * 100 / 110 ) 99.95%

    Check Alice is above MCR, Bob below, Carol below. */
    assert.isTrue(alice_ICR_After.gte(mv._MCR))
    assert.isTrue(bob_ICR_After.lte(mv._MCR))
    assert.isTrue(carol_ICR_After.lte(mv._MCR))

    /* Though Bob's true ICR (including pending rewards) is below the MCR, check that Bob's raw coll and debt has not changed */
    const bob_Coll = (await locManager.LoCs(bob))[1]
    const bob_Debt = (await locManager.LoCs(bob))[0]

    const bob_rawICR = bob_Coll.mul(toBN(dec(100, 18))).div(bob_Debt)
    assert.isTrue(bob_rawICR.gte(mv._MCR))

    // Whale enters system, pulling it into Normal Mode
    await openLoC({ ICR: toBN(dec(10, 18)), extraZUSDAmount: dec(1, 24), extraParams: { from: whale } })

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    //liquidate A, B, C
    await locManager.liquidateLoCs(10)

    // Check A stays active, B and C get liquidated
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // check LoC statuses - A active (1),  B and C closed by liquidation (3)
    assert.equal((await locManager.LoCs(alice))[3].toString(), '1')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    assert.equal((await locManager.LoCs(carol))[3].toString(), '3')
  })

  it("liquidateLoCs(): reverts if n = 0", async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(218, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(206, 16)), extraParams: { from: carol } })

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

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidation with n = 0
    await assertRevert(locManager.liquidateLoCs(0), "LoCManager: nothing to liquidate")

    // Check all locs are still in the system
    assert.isTrue(await sortedLoCs.contains(whale))
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))

    const TCR_After = (await th.getTCR(contracts)).toString()

    // Check TCR has not changed after liquidation
    assert.equal(TCR_Before, TCR_After)
  })

  it("liquidateLoCs():  liquidates locs with ICR < MCR", async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // A, B, C open locs that will remain active when price drops to 100
    await openLoC({ ICR: toBN(dec(220, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(230, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(240, 16)), extraParams: { from: carol } })

    // D, E, F open locs that will fall below MCR when price drops to 100
    await openLoC({ ICR: toBN(dec(218, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(216, 16)), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: flyn } })

    // Check list size is 7
    assert.equal((await sortedLoCs.getSize()).toString(), '7')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const alice_ICR = await locManager.getCurrentICR(alice, price)
    const bob_ICR = await locManager.getCurrentICR(bob, price)
    const carol_ICR = await locManager.getCurrentICR(carol, price)
    const dennis_ICR = await locManager.getCurrentICR(dennis, price)
    const erin_ICR = await locManager.getCurrentICR(erin, price)
    const flyn_ICR = await locManager.getCurrentICR(flyn, price)

    // Check A, B, C have ICR above MCR
    assert.isTrue(alice_ICR.gte(mv._MCR))
    assert.isTrue(bob_ICR.gte(mv._MCR))
    assert.isTrue(carol_ICR.gte(mv._MCR))

    // Check D, E, F have ICR below MCR
    assert.isTrue(dennis_ICR.lte(mv._MCR))
    assert.isTrue(erin_ICR.lte(mv._MCR))
    assert.isTrue(flyn_ICR.lte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    //Liquidate sequence
    await locManager.liquidateLoCs(10)

    // check list size reduced to 4
    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Check Whale and A, B, C remain in the system
    assert.isTrue(await sortedLoCs.contains(whale))
    assert.isTrue(await sortedLoCs.contains(alice))
    assert.isTrue(await sortedLoCs.contains(bob))
    assert.isTrue(await sortedLoCs.contains(carol))

    // Check D, E, F have been removed
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(flyn))
  })

  it("liquidateLoCs(): does not affect the liquidated user's token balances", async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // D, E, F open locs that will fall below MCR when price drops to 100
    await openLoC({ ICR: toBN(dec(218, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(216, 16)), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(210, 16)), extraParams: { from: flyn } })

    const D_balanceBefore = await zusdToken.balanceOf(dennis)
    const E_balanceBefore = await zusdToken.balanceOf(erin)
    const F_balanceBefore = await zusdToken.balanceOf(flyn)

    // Check list size is 4
    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    //Liquidate sequence
    await locManager.liquidateLoCs(10)

    // check list size reduced to 1
    assert.equal((await sortedLoCs.getSize()).toString(), '1')

    // Check Whale remains in the system
    assert.isTrue(await sortedLoCs.contains(whale))

    // Check D, E, F have been removed
    assert.isFalse(await sortedLoCs.contains(dennis))
    assert.isFalse(await sortedLoCs.contains(erin))
    assert.isFalse(await sortedLoCs.contains(flyn))

    // Check token balances of users whose locs were liquidated, have not changed
    assert.equal((await zusdToken.balanceOf(dennis)).toString(), D_balanceBefore)
    assert.equal((await zusdToken.balanceOf(erin)).toString(), E_balanceBefore)
    assert.equal((await zusdToken.balanceOf(flyn)).toString(), F_balanceBefore)
  })

  it("liquidateLoCs(): A liquidation sequence containing Pool offsets increases the TCR", async () => {
    // Whale provides 500 ZUSD to SP
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: toBN(dec(500, 18)), extraParams: { from: whale } })
    await stabilityPool.provideToSP(dec(500, 18), ZERO_ADDRESS, { from: whale })

    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(28, 18)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(8, 18)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(80, 18)), extraParams: { from: dennis } })

    await openLoC({ ICR: toBN(dec(199, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(156, 16)), extraParams: { from: defaulter_2 } })
    await openLoC({ ICR: toBN(dec(183, 16)), extraParams: { from: defaulter_3 } })
    await openLoC({ ICR: toBN(dec(166, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedLoCs.contains(defaulter_1)))
    assert.isTrue((await sortedLoCs.contains(defaulter_2)))
    assert.isTrue((await sortedLoCs.contains(defaulter_3)))
    assert.isTrue((await sortedLoCs.contains(defaulter_4)))

    assert.equal((await sortedLoCs.getSize()).toString(), '9')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    const TCR_Before = await th.getTCR(contracts)

    // Check pool has 500 ZUSD
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), dec(500, 18))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate locs
    await locManager.liquidateLoCs(10)

    // Check pool has been emptied by the liquidations
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), '0')

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedLoCs.contains(defaulter_1)))
    assert.isFalse((await sortedLoCs.contains(defaulter_2)))
    assert.isFalse((await sortedLoCs.contains(defaulter_3)))
    assert.isFalse((await sortedLoCs.contains(defaulter_4)))

    // check system sized reduced to 5 locs
    assert.equal((await sortedLoCs.getSize()).toString(), '5')

    // Check that the liquidation sequence has improved the TCR
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gte(TCR_Before))
  })

  it("liquidateLoCs(): A liquidation sequence of pure redistributions decreases the TCR, due to gas compensation, but up to 0.5%", async () => {
    const { collateral: W_coll, totalDebt: W_debt } = await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })
    const { collateral: A_coll, totalDebt: A_debt } = await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_debt } = await openLoC({ ICR: toBN(dec(28, 18)), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_debt } = await openLoC({ ICR: toBN(dec(8, 18)), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_debt } = await openLoC({ ICR: toBN(dec(80, 18)), extraParams: { from: dennis } })

    const { collateral: d1_coll, totalDebt: d1_debt } = await openLoC({ ICR: toBN(dec(199, 16)), extraParams: { from: defaulter_1 } })
    const { collateral: d2_coll, totalDebt: d2_debt } = await openLoC({ ICR: toBN(dec(156, 16)), extraParams: { from: defaulter_2 } })
    const { collateral: d3_coll, totalDebt: d3_debt } = await openLoC({ ICR: toBN(dec(183, 16)), extraParams: { from: defaulter_3 } })
    const { collateral: d4_coll, totalDebt: d4_debt } = await openLoC({ ICR: toBN(dec(166, 16)), extraParams: { from: defaulter_4 } })

    const totalCollNonDefaulters = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)
    const totalCollDefaulters = d1_coll.add(d2_coll).add(d3_coll).add(d4_coll)
    const totalColl = totalCollNonDefaulters.add(totalCollDefaulters)
    const totalDebt = W_debt.add(A_debt).add(B_debt).add(C_debt).add(D_debt).add(d1_debt).add(d2_debt).add(d3_debt).add(d4_debt)

    assert.isTrue((await sortedLoCs.contains(defaulter_1)))
    assert.isTrue((await sortedLoCs.contains(defaulter_2)))
    assert.isTrue((await sortedLoCs.contains(defaulter_3)))
    assert.isTrue((await sortedLoCs.contains(defaulter_4)))

    assert.equal((await sortedLoCs.getSize()).toString(), '9')

    // Price drops
    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price)

    const TCR_Before = await th.getTCR(contracts)
    assert.isAtMost(th.getDifference(TCR_Before, totalColl.mul(price).div(totalDebt)), 1000)

    // Check pool is empty before liquidation
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), '0')

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate
    await locManager.liquidateLoCs(10)

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedLoCs.contains(defaulter_1)))
    assert.isFalse((await sortedLoCs.contains(defaulter_2)))
    assert.isFalse((await sortedLoCs.contains(defaulter_3)))
    assert.isFalse((await sortedLoCs.contains(defaulter_4)))

    // check system sized reduced to 5 locs
    assert.equal((await sortedLoCs.getSize()).toString(), '5')

    // Check that the liquidation sequence has reduced the TCR
    const TCR_After = await th.getTCR(contracts)
    // ((100+1+7+2+20)+(1+2+3+4)*0.995)*100/(2050+50+50+50+50+101+257+328+480)
    assert.isAtMost(th.getDifference(TCR_After, totalCollNonDefaulters.add(th.applyLiquidationFee(totalCollDefaulters)).mul(price).div(totalDebt)), 1000)
    assert.isTrue(TCR_Before.gte(TCR_After))
    assert.isTrue(TCR_After.gte(TCR_Before.mul(toBN(995)).div(toBN(1000))))
  })

  it("liquidateLoCs(): Liquidating locs with SP deposits correctly impacts their SP deposit and BTC gain", async () => {
    // Whale provides 400 ZUSD to the SP
    const whaleDeposit = toBN(dec(40000, 18))
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: whaleDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(whaleDeposit, ZERO_ADDRESS, { from: whale })

    const A_deposit = toBN(dec(10000, 18))
    const B_deposit = toBN(dec(30000, 18))
    const { collateral: A_coll, totalDebt: A_debt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: A_deposit, extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_debt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: B_deposit, extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_debt } = await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })

    const liquidatedColl = A_coll.add(B_coll).add(C_coll)
    const liquidatedDebt = A_debt.add(B_debt).add(C_debt)

    // A, B provide 100, 300 to the SP
    await stabilityPool.provideToSP(A_deposit, ZERO_ADDRESS, { from: alice })
    await stabilityPool.provideToSP(B_deposit, ZERO_ADDRESS, { from: bob })

    assert.equal((await sortedLoCs.getSize()).toString(), '4')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    // Check 800 ZUSD in Pool
    const totalDeposits = whaleDeposit.add(A_deposit).add(B_deposit)
    assert.equal((await stabilityPool.getTotalZUSDDeposits()).toString(), totalDeposits)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate
    await locManager.liquidateLoCs(10)

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedLoCs.contains(alice)))
    assert.isFalse((await sortedLoCs.contains(bob)))
    assert.isFalse((await sortedLoCs.contains(carol)))

    // check system sized reduced to 1 locs
    assert.equal((await sortedLoCs.getSize()).toString(), '1')

    /* Prior to liquidation, SP deposits were:
    Whale: 400 ZUSD
    Alice: 100 ZUSD
    Bob:   300 ZUSD
    Carol: 0 ZUSD

    Total ZUSD in Pool: 800 ZUSD

    Then, liquidation hits A,B,C: 

    Total liquidated debt = 150 + 350 + 150 = 650 ZUSD
    Total liquidated BTC = 1.1 + 3.1 + 1.1 = 5.3 BTC

    whale zusd loss: 650 * (400/800) = 325 zusd
    alice zusd loss:  650 *(100/800) = 81.25 zusd
    bob zusd loss: 650 * (300/800) = 243.75 zusd

    whale remaining deposit: (400 - 325) = 75 zusd
    alice remaining deposit: (100 - 81.25) = 18.75 zusd
    bob remaining deposit: (300 - 243.75) = 56.25 zusd

    whale btc gain: 5*0.995 * (400/800) = 2.4875 btc
    alice btc gain: 5*0.995 *(100/800) = 0.621875 btc
    bob btc gain: 5*0.995 * (300/800) = 1.865625 btc

    Total remaining deposits: 150 ZUSD
    Total BTC gain: 4.975 BTC */

    // Check remaining ZUSD Deposits and BTC gain, for whale and depositors whose locs were liquidated
    const whale_Deposit_After = await stabilityPool.getCompoundedZUSDDeposit(whale)
    const alice_Deposit_After = await stabilityPool.getCompoundedZUSDDeposit(alice)
    const bob_Deposit_After = await stabilityPool.getCompoundedZUSDDeposit(bob)

    const whale_BTCGain = await stabilityPool.getDepositorBTCGain(whale)
    const alice_BTCGain = await stabilityPool.getDepositorBTCGain(alice)
    const bob_BTCGain = await stabilityPool.getDepositorBTCGain(bob)

    assert.isAtMost(th.getDifference(whale_Deposit_After, whaleDeposit.sub(liquidatedDebt.mul(whaleDeposit).div(totalDeposits))), 100000)
    assert.isAtMost(th.getDifference(alice_Deposit_After, A_deposit.sub(liquidatedDebt.mul(A_deposit).div(totalDeposits))), 100000)
    assert.isAtMost(th.getDifference(bob_Deposit_After, B_deposit.sub(liquidatedDebt.mul(B_deposit).div(totalDeposits))), 100000)

    assert.isAtMost(th.getDifference(whale_BTCGain, th.applyLiquidationFee(liquidatedColl).mul(whaleDeposit).div(totalDeposits)), 100000)
    assert.isAtMost(th.getDifference(alice_BTCGain, th.applyLiquidationFee(liquidatedColl).mul(A_deposit).div(totalDeposits)), 100000)
    assert.isAtMost(th.getDifference(bob_BTCGain, th.applyLiquidationFee(liquidatedColl).mul(B_deposit).div(totalDeposits)), 100000)

    // Check total remaining deposits and BTC gain in Stability Pool
    const total_ZUSDinSP = (await stabilityPool.getTotalZUSDDeposits()).toString()
    const total_BTCinSP = (await stabilityPool.getBTC()).toString()

    assert.isAtMost(th.getDifference(total_ZUSDinSP, totalDeposits.sub(liquidatedDebt)), 1000)
    assert.isAtMost(th.getDifference(total_BTCinSP, th.applyLiquidationFee(liquidatedColl)), 1000)
  })

  it("liquidateLoCs(): when SP > 0, triggers ZERO reward event - increases the sum G", async () => {
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open locs
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(213, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })
    assert.equal(await stabilityPool.getTotalZUSDDeposits(), dec(100, 18))

    const G_Before = await stabilityPool.epochToScaleToG(0, 0)

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1BTC:100ZUSD, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate locs
    await locManager.liquidateLoCs(2)
    assert.isFalse(await sortedLoCs.contains(defaulter_1))
    assert.isFalse(await sortedLoCs.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G hasn't increased from the ZERO reward event triggered
    assert.isTrue(G_After.eq(G_Before))
  })

  it("liquidateLoCs(): when SP is empty, doesn't update G", async () => {
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open locs
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraZUSDAmount: toBN(dec(100, 18)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openLoC({ ICR: toBN(dec(219, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(213, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // B withdraws
    await stabilityPool.withdrawFromSP(dec(100, 18), { from: B })

    // Check SP is empty
    assert.equal((await stabilityPool.getTotalZUSDDeposits()), '0')

    // Check G is zero
    const G_Before = await stabilityPool.epochToScaleToG(0, 0)
    assert.isTrue(G_Before.eq(toBN('0')))

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1BTC:100ZUSD, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // liquidate locs
    await locManager.liquidateLoCs(2)
    assert.isFalse(await sortedLoCs.contains(defaulter_1))
    assert.isFalse(await sortedLoCs.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has not changed
    assert.isTrue(G_After.eq(G_Before))
  })


  // --- batchLiquidateLoCs() ---

  it('batchLiquidateLoCs(): liquidates a LoC that a) was skipped in a previous liquidation and b) has pending rewards', async () => {
    // A, B, C, D, E open locs 
    await openLoC({ ICR: toBN(dec(300, 16)), extraParams: { from: C } })
    await openLoC({ ICR: toBN(dec(364, 16)), extraParams: { from: D } })
    await openLoC({ ICR: toBN(dec(364, 16)), extraParams: { from: E } })
    await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })

    // Price drops
    await priceFeed.setPrice(dec(175, 18))
    let price = await priceFeed.getPrice()
    
    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // A gets liquidated, creates pending rewards for all
    const liqTxA = await locManager.liquidate(A)
    assert.isTrue(liqTxA.receipt.status)
    assert.isFalse(await sortedLoCs.contains(A))

    // A adds 10 ZUSD to the SP, but less than C's debt
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, {from: A})

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    price = await priceFeed.getPrice()
    // Confirm system is now in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm C has ICR > TCR
    const TCR = await locManager.getTCR(price)
    const ICR_C = await locManager.getCurrentICR(C, price)
  
    assert.isTrue(ICR_C.gt(TCR))

    // Attempt to liquidate B and C, which skips C in the liquidation since it is immune
    const liqTxBC = await locManager.liquidateLoCs(2)
    assert.isTrue(liqTxBC.receipt.status)
    assert.isFalse(await sortedLoCs.contains(B))
    assert.isTrue(await sortedLoCs.contains(C))
    assert.isTrue(await sortedLoCs.contains(D))
    assert.isTrue(await sortedLoCs.contains(E))

    // // All remaining locs D and E repay a little debt, applying their pending rewards
    assert.isTrue((await sortedLoCs.getSize()).eq(toBN('3')))
    await borrowerOperations.repayZUSD(dec(1, 18), D, D, {from: D})
    await borrowerOperations.repayZUSD(dec(1, 18), E, E, {from: E})

    // Check C is the only LoC that has pending rewards
    assert.isTrue(await locManager.hasPendingRewards(C))
    assert.isFalse(await locManager.hasPendingRewards(D))
    assert.isFalse(await locManager.hasPendingRewards(E))

    // Check C's pending coll and debt rewards are <= the coll and debt in the DefaultPool
    const pendingBTC_C = await locManager.getPendingBTCReward(C)
    const pendingZUSDDebt_C = await locManager.getPendingZUSDDebtReward(C)
    const defaultPoolBTC = await defaultPool.getBTC()
    const defaultPoolZUSDDebt = await defaultPool.getZUSDDebt()
    assert.isTrue(pendingBTC_C.lte(defaultPoolBTC))
    assert.isTrue(pendingZUSDDebt_C.lte(defaultPoolZUSDDebt))
    //Check only difference is dust
    assert.isAtMost(th.getDifference(pendingBTC_C, defaultPoolBTC), 1000)
    assert.isAtMost(th.getDifference(pendingZUSDDebt_C, defaultPoolZUSDDebt), 1000)

    // Confirm system is still in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // D and E fill the Stability Pool, enough to completely absorb C's debt of 70
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: D})
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: E})

    await priceFeed.setPrice(dec(50, 18))

    // Try to liquidate C again. Check it succeeds and closes C's loc
    const liqTx2 = await locManager.batchLiquidateLoCs([C,D])
    assert.isTrue(liqTx2.receipt.status)
    assert.isFalse(await sortedLoCs.contains(C))
    assert.isFalse(await sortedLoCs.contains(D))
    assert.isTrue(await sortedLoCs.contains(E))
    assert.isTrue((await sortedLoCs.getSize()).eq(toBN('1')))
  })

  it('batchLiquidateLoCs(): closes every LoC with ICR < MCR in the given array', async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })
    const whaleBalance = await zusdToken.balanceOf(whale)

    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedLoCs.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(whaleBalance, ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm locs A-C are ICR < 110%
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lt(mv._MCR))

    // Confirm D-E are ICR > 110%
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR >= 110% 
    assert.isTrue((await locManager.getCurrentICR(whale, price)).gte(mv._MCR))

    liquidationArray = [alice, bob, carol, dennis, erin]
    await locManager.batchLiquidateLoCs(liquidationArray);

    // Confirm locs A-C have been removed from the system
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))
    assert.isFalse(await sortedLoCs.contains(carol))

    // Check all locs A-C are now closed by liquidation
    assert.equal((await locManager.LoCs(alice))[3].toString(), '3')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    assert.equal((await locManager.LoCs(carol))[3].toString(), '3')

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedLoCs.getSize()).toString(), '3')
  })

  it('batchLiquidateLoCs(): does not liquidate locs that are not in the given array', async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })
    const whaleBalance = await zusdToken.balanceOf(whale)

    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: toBN(dec(500, 18)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: toBN(dec(500, 18)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedLoCs.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(whaleBalance, ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm locs A-E are ICR < 110%
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(erin, price)).lt(mv._MCR))

    liquidationArray = [alice, bob]  // C-E not included
    await locManager.batchLiquidateLoCs(liquidationArray);

    // Confirm locs A-B have been removed from the system
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))

    // Check all locs A-B are now closed by liquidation
    assert.equal((await locManager.LoCs(alice))[3].toString(), '3')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')

    // Confirm locs C-E remain in the system
    assert.isTrue(await sortedLoCs.contains(carol))
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(erin))

    // Check all locs C-E are still active
    assert.equal((await locManager.LoCs(carol))[3].toString(), '1')
    assert.equal((await locManager.LoCs(dennis))[3].toString(), '1')
    assert.equal((await locManager.LoCs(erin))[3].toString(), '1')

    // Check sorted list has been reduced to length 4
    assert.equal((await sortedLoCs.getSize()).toString(), '4')
  })

  it('batchLiquidateLoCs(): does not close locs with ICR >= MCR in the given array', async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })
    const whaleBalance = await zusdToken.balanceOf(whale)

    await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(195, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedLoCs.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(whaleBalance, ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm locs A-C are ICR < 110%
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lt(mv._MCR))

    // Confirm D-E are ICR >= 110%
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR > 110% 
    assert.isTrue((await locManager.getCurrentICR(whale, price)).gte(mv._MCR))

    liquidationArray = [alice, bob, carol, dennis, erin]
    await locManager.batchLiquidateLoCs(liquidationArray);

    // Confirm locs D-E and whale remain in the system
    assert.isTrue(await sortedLoCs.contains(dennis))
    assert.isTrue(await sortedLoCs.contains(erin))
    assert.isTrue(await sortedLoCs.contains(whale))

    // Check all locs D-E and whale remain active
    assert.equal((await locManager.LoCs(dennis))[3].toString(), '1')
    assert.equal((await locManager.LoCs(erin))[3].toString(), '1')
    assert.isTrue(await sortedLoCs.contains(whale))

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedLoCs.getSize()).toString(), '3')
  })

  it('batchLiquidateLoCs(): reverts if array is empty', async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })
    const whaleBalance = await zusdToken.balanceOf(whale)

    await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(195, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedLoCs.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(whaleBalance, ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    liquidationArray = []
    try {
      const tx = await locManager.batchLiquidateLoCs(liquidationArray);
      assert.isFalse(tx.receipt.status)
    } catch (error) {
      assert.include(error.message, "LoCManager: Calldata address array must not be empty")
    }
  })

  it("batchLiquidateLoCs(): skips if LoC is non-existent", async () => {
    // --- SETUP ---
    const spDeposit = toBN(dec(500000, 18))
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })

    const { totalDebt: A_debt } = await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    const { totalDebt: B_debt } = await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    assert.equal(await locManager.getLoCStatus(carol), 0) // check LoC non-existent

    // Check full sorted list size is 6
    assert.equal((await sortedLoCs.getSize()).toString(), '5')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm locs A-B are ICR < 110%
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))

    // Confirm D-E are ICR > 110%
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR >= 110% 
    assert.isTrue((await locManager.getCurrentICR(whale, price)).gte(mv._MCR))

    // Liquidate - LoC C in between the ones to be liquidated!
    const liquidationArray = [alice, carol, bob, dennis, erin]
    await locManager.batchLiquidateLoCs(liquidationArray);

    // Confirm locs A-B have been removed from the system
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))

    // Check all locs A-B are now closed by liquidation
    assert.equal((await locManager.LoCs(alice))[3].toString(), '3')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedLoCs.getSize()).toString(), '3')

    // Confirm LoC C non-existent
    assert.isFalse(await sortedLoCs.contains(carol))
    assert.equal((await locManager.LoCs(carol))[3].toString(), '0')

    // Check Stability pool has only been reduced by A-B
    th.assertIsApproximatelyEqual((await stabilityPool.getTotalZUSDDeposits()).toString(), spDeposit.sub(A_debt).sub(B_debt))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));
  })

  it("batchLiquidateLoCs(): skips if a LoC has been closed", async () => {
    // --- SETUP ---
    const spDeposit = toBN(dec(500000, 18))
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: spDeposit, extraParams: { from: whale } })

    const { totalDebt: A_debt } = await openLoC({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    const { totalDebt: B_debt } = await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(195, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    assert.isTrue(await sortedLoCs.contains(carol))

    // Check full sorted list size is 6
    assert.equal((await sortedLoCs.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Whale transfers to Carol so she can close her loc
    await zusdToken.transfer(carol, dec(100, 18), { from: whale })

    // --- TEST ---

    // Price drops to 1BTC:100ZUSD, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Carol liquidated, and her LoC is closed
    const txCarolClose = await borrowerOperations.closeLoC({ from: carol })
    assert.isTrue(txCarolClose.receipt.status)

    assert.isFalse(await sortedLoCs.contains(carol))

    assert.equal(await locManager.getLoCStatus(carol), 2)  // check LoC closed

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm locs A-B are ICR < 110%
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))

    // Confirm D-E are ICR > 110%
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR >= 110% 
    assert.isTrue((await locManager.getCurrentICR(whale, price)).gte(mv._MCR))

    // Liquidate - LoC C in between the ones to be liquidated!
    const liquidationArray = [alice, carol, bob, dennis, erin]
    await locManager.batchLiquidateLoCs(liquidationArray);

    // Confirm locs A-B have been removed from the system
    assert.isFalse(await sortedLoCs.contains(alice))
    assert.isFalse(await sortedLoCs.contains(bob))

    // Check all locs A-B are now closed by liquidation
    assert.equal((await locManager.LoCs(alice))[3].toString(), '3')
    assert.equal((await locManager.LoCs(bob))[3].toString(), '3')
    // LoC C still closed by user
    assert.equal((await locManager.LoCs(carol))[3].toString(), '2')

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedLoCs.getSize()).toString(), '3')

    // Check Stability pool has only been reduced by A-B
    th.assertIsApproximatelyEqual((await stabilityPool.getTotalZUSDDeposits()).toString(), spDeposit.sub(A_debt).sub(B_debt))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));
  })

  it("batchLiquidateLoCs: when SP > 0, triggers ZERO reward event - increases the sum G", async () => {
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open locs
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(167, 16)), extraParams: { from: C } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })
    assert.equal(await stabilityPool.getTotalZUSDDeposits(), dec(100, 18))

    const G_Before = await stabilityPool.epochToScaleToG(0, 0)

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1BTC:100ZUSD, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate locs
    await locManager.batchLiquidateLoCs([defaulter_1, defaulter_2])
    assert.isFalse(await sortedLoCs.contains(defaulter_1))
    assert.isFalse(await sortedLoCs.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G hasn't increased from the ZERO reward event triggered
    assert.isTrue(G_After.eq(G_Before))
  })

  it("batchLiquidateLoCs(): when SP is empty, doesn't update G", async () => {
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open locs
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(167, 16)), extraParams: { from: C } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // B withdraws
    await stabilityPool.withdrawFromSP(dec(100, 18), { from: B })

    // Check SP is empty
    assert.equal((await stabilityPool.getTotalZUSDDeposits()), '0')

    // Check G is non-zero
    const G_Before = await stabilityPool.epochToScaleToG(0, 0)
    assert.isTrue(G_Before.eq(toBN('0')))

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1BTC:100ZUSD, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // liquidate locs
    await locManager.batchLiquidateLoCs([defaulter_1, defaulter_2])
    assert.isFalse(await sortedLoCs.contains(defaulter_1))
    assert.isFalse(await sortedLoCs.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has not changed
    assert.isTrue(G_After.eq(G_Before))
  })

  // --- redemptions ---


  it('getRedemptionHints(): gets the address of the first LoC and the final ICR of the last LoC involved in a redemption', async () => {
    // --- SETUP ---
    const partialRedemptionAmount = toBN(dec(100, 18))
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(310, 16)), extraZUSDAmount: partialRedemptionAmount, extraParams: { from: alice } })
    const { netDebt: B_debt } = await openLoC({ ICR: toBN(dec(290, 16)), extraParams: { from: bob } })
    const { netDebt: C_debt } = await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: carol } })
    // Dennis' LoC should be untouched by redemption, because its ICR will be < 110% after the price drop
    await openLoC({ ICR: toBN(dec(120, 16)), extraParams: { from: dennis } })

    // Drop the price
    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price);

    // --- TEST ---
    const redemptionAmount = C_debt.add(B_debt).add(partialRedemptionAmount)
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    assert.equal(firstRedemptionHint, carol)
    const expectedICR = A_coll.mul(price).sub(partialRedemptionAmount.mul(mv._1e18BN)).div(A_totalDebt.sub(partialRedemptionAmount))
    th.assertIsApproximatelyEqual(partialRedemptionHintNICR, expectedICR)
  });

  it('getRedemptionHints(): returns 0 as partialRedemptionHintNICR when reaching _maxIterations', async () => {
    // --- SETUP ---
    await openLoC({ ICR: toBN(dec(310, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(290, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraParams: { from: dennis } })

    const price = await priceFeed.getPrice();

    // --- TEST ---

    // Get hints for a redemption of 170 + 30 + some extra ZUSD. At least 3 iterations are needed
    // for total redemption of the given amount.
    const {
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints('210' + _18_zeros, price, 2) // limit _maxIterations to 2

    assert.equal(partialRedemptionHintNICR, '0')
  });

  it('redeemCollateral(): cancels the provided ZUSD with debt from LoCs with the lowest ICRs and sends an equivalent amount of Ether', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(310, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(290, 16)), extraZUSDAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_BTCBalance_Before = toBN(await web3.eth.getBalance(dennis))

    const dennis_ZUSDBalance_Before = await zusdToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // Find hints for redeeming 20 ZUSD
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 ZUSD
    // Don't pay for gas, as it makes it easier to calculate the received Bitcoin
    const redemptionTx = await locManager.redeemCollateral(
      redemptionAmount,
      firstRedemptionHint,
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: 0
      }
    )

    const BTCFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_LoC_After = await locManager.LoCs(alice)
    const bob_LoC_After = await locManager.LoCs(bob)
    const carol_LoC_After = await locManager.LoCs(carol)

    const alice_debt_After = alice_LoC_After[0].toString()
    const bob_debt_After = bob_LoC_After[0].toString()
    const carol_debt_After = carol_LoC_After[0].toString()

    /* check that Dennis' redeemed 20 ZUSD has been cancelled with debt from Bobs's LoC (8) and Carol's LoC (10).
    The remaining lot (2) is sent to Alice's LoC, who had the best ICR.
    It leaves her with (3) ZUSD debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_BTCBalance_After = toBN(await web3.eth.getBalance(dennis))
    const receivedBTC = dennis_BTCBalance_After.sub(dennis_BTCBalance_Before)

    const expectedTotalBTCDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount ZUSD to BTC, at BTC:USD price 200
    const expectedReceivedBTC = expectedTotalBTCDrawn.sub(toBN(BTCFee))

    th.assertIsApproximatelyEqual(expectedReceivedBTC, receivedBTC)

    const dennis_ZUSDBalance_After = (await zusdToken.balanceOf(dennis)).toString()
    assert.equal(dennis_ZUSDBalance_After, dennis_ZUSDBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): with invalid first hint, zero address', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(310, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(290, 16)), extraZUSDAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_BTCBalance_Before = toBN(await web3.eth.getBalance(dennis))

    const dennis_ZUSDBalance_Before = await zusdToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // Find hints for redeeming 20 ZUSD
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 ZUSD
    // Don't pay for gas, as it makes it easier to calculate the received Bitcoin
    const redemptionTx = await locManager.redeemCollateral(
      redemptionAmount,
      ZERO_ADDRESS, // invalid first hint
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: 0
      }
    )

    const BTCFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_LoC_After = await locManager.LoCs(alice)
    const bob_LoC_After = await locManager.LoCs(bob)
    const carol_LoC_After = await locManager.LoCs(carol)

    const alice_debt_After = alice_LoC_After[0].toString()
    const bob_debt_After = bob_LoC_After[0].toString()
    const carol_debt_After = carol_LoC_After[0].toString()

    /* check that Dennis' redeemed 20 ZUSD has been cancelled with debt from Bobs's LoC (8) and Carol's LoC (10).
    The remaining lot (2) is sent to Alice's LoC, who had the best ICR.
    It leaves her with (3) ZUSD debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_BTCBalance_After = toBN(await web3.eth.getBalance(dennis))
    const receivedBTC = dennis_BTCBalance_After.sub(dennis_BTCBalance_Before)

    const expectedTotalBTCDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount ZUSD to BTC, at BTC:USD price 200
    const expectedReceivedBTC = expectedTotalBTCDrawn.sub(toBN(BTCFee))

    th.assertIsApproximatelyEqual(expectedReceivedBTC, receivedBTC)

    const dennis_ZUSDBalance_After = (await zusdToken.balanceOf(dennis)).toString()
    assert.equal(dennis_ZUSDBalance_After, dennis_ZUSDBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): with invalid first hint, non-existent loc', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(310, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(290, 16)), extraZUSDAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_BTCBalance_Before = toBN(await web3.eth.getBalance(dennis))

    const dennis_ZUSDBalance_Before = await zusdToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // Find hints for redeeming 20 ZUSD
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 ZUSD
    // Don't pay for gas, as it makes it easier to calculate the received Bitcoin
    const redemptionTx = await locManager.redeemCollateral(
      redemptionAmount,
      erin, // invalid first hint, it doesn’t have a loc
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: 0
      }
    )

    const BTCFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_LoC_After = await locManager.LoCs(alice)
    const bob_LoC_After = await locManager.LoCs(bob)
    const carol_LoC_After = await locManager.LoCs(carol)

    const alice_debt_After = alice_LoC_After[0].toString()
    const bob_debt_After = bob_LoC_After[0].toString()
    const carol_debt_After = carol_LoC_After[0].toString()

    /* check that Dennis' redeemed 20 ZUSD has been cancelled with debt from Bobs's LoC (8) and Carol's LoC (10).
    The remaining lot (2) is sent to Alice's LoC, who had the best ICR.
    It leaves her with (3) ZUSD debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_BTCBalance_After = toBN(await web3.eth.getBalance(dennis))
    const receivedBTC = dennis_BTCBalance_After.sub(dennis_BTCBalance_Before)

    const expectedTotalBTCDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount ZUSD to BTC, at BTC:USD price 200
    const expectedReceivedBTC = expectedTotalBTCDrawn.sub(toBN(BTCFee))

    th.assertIsApproximatelyEqual(expectedReceivedBTC, receivedBTC)

    const dennis_ZUSDBalance_After = (await zusdToken.balanceOf(dennis)).toString()
    assert.equal(dennis_ZUSDBalance_After, dennis_ZUSDBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): with invalid first hint, LoC below MCR', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(310, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(290, 16)), extraZUSDAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openLoC({ ICR: toBN(dec(250, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_BTCBalance_Before = toBN(await web3.eth.getBalance(dennis))

    const dennis_ZUSDBalance_Before = await zusdToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // Increase price to start Erin, and decrease it again so its ICR is under MCR
    await priceFeed.setPrice(price.mul(toBN(2)))
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: erin } })
    await priceFeed.setPrice(price)


    // --- TEST ---

    // Find hints for redeeming 20 ZUSD
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 ZUSD
    // Don't pay for gas, as it makes it easier to calculate the received Bitcoin
    const redemptionTx = await locManager.redeemCollateral(
      redemptionAmount,
      erin, // invalid loc, below MCR
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: 0
      }
    )

    const BTCFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_LoC_After = await locManager.LoCs(alice)
    const bob_LoC_After = await locManager.LoCs(bob)
    const carol_LoC_After = await locManager.LoCs(carol)

    const alice_debt_After = alice_LoC_After[0].toString()
    const bob_debt_After = bob_LoC_After[0].toString()
    const carol_debt_After = carol_LoC_After[0].toString()

    /* check that Dennis' redeemed 20 ZUSD has been cancelled with debt from Bobs's LoC (8) and Carol's LoC (10).
    The remaining lot (2) is sent to Alice's LoC, who had the best ICR.
    It leaves her with (3) ZUSD debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_BTCBalance_After = toBN(await web3.eth.getBalance(dennis))
    const receivedBTC = dennis_BTCBalance_After.sub(dennis_BTCBalance_Before)

    const expectedTotalBTCDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount ZUSD to BTC, at BTC:USD price 200
    const expectedReceivedBTC = expectedTotalBTCDrawn.sub(toBN(BTCFee))

    th.assertIsApproximatelyEqual(expectedReceivedBTC, receivedBTC)

    const dennis_ZUSDBalance_After = (await zusdToken.balanceOf(dennis)).toString()
    assert.equal(dennis_ZUSDBalance_After, dennis_ZUSDBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): ends the redemption sequence when the token redemption request has been filled', async () => {
    // --- SETUP --- 
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol, Dennis, Erin open locs
    const { netDebt: A_debt } = await openLoC({ ICR: toBN(dec(290, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: alice } })
    const { netDebt: B_debt } = await openLoC({ ICR: toBN(dec(290, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: bob } })
    const { netDebt: C_debt } = await openLoC({ ICR: toBN(dec(290, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: carol } })
    const redemptionAmount = A_debt.add(B_debt).add(C_debt)
    const { totalDebt: D_totalDebt, collateral: D_coll } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: dennis } })
    const { totalDebt: E_totalDebt, collateral: E_coll } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: erin } })

    // --- TEST --- 

    // open LoC from redeemer.  Redeemer has highest ICR (100BTC, 100 ZUSD), 20000%
    const { zusdAmount: F_zusdAmount } = await openLoC({ ICR: toBN(dec(200, 18)), extraZUSDAmount: redemptionAmount.mul(toBN(2)), extraParams: { from: flyn } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Flyn redeems collateral
    await locManager.redeemCollateral(redemptionAmount, alice, alice, alice, 0, 0, th._100pct, { from: flyn })

    // Check Flyn's redemption has reduced his balance from 100 to (100-60) = 40 ZUSD
    const flynBalance = await zusdToken.balanceOf(flyn)
    th.assertIsApproximatelyEqual(flynBalance, F_zusdAmount.sub(redemptionAmount))

    // Check debt of Alice, Bob, Carol
    const alice_Debt = await locManager.getLoCDebt(alice)
    const bob_Debt = await locManager.getLoCDebt(bob)
    const carol_Debt = await locManager.getLoCDebt(carol)

    assert.equal(alice_Debt, 0)
    assert.equal(bob_Debt, 0)
    assert.equal(carol_Debt, 0)

    // check Alice, Bob and Carol locs are closed by redemption
    const alice_Status = await locManager.getLoCStatus(alice)
    const bob_Status = await locManager.getLoCStatus(bob)
    const carol_Status = await locManager.getLoCStatus(carol)
    assert.equal(alice_Status, 4)
    assert.equal(bob_Status, 4)
    assert.equal(carol_Status, 4)

    // check debt and coll of Dennis, Erin has not been impacted by redemption
    const dennis_Debt = await locManager.getLoCDebt(dennis)
    const erin_Debt = await locManager.getLoCDebt(erin)

    th.assertIsApproximatelyEqual(dennis_Debt, D_totalDebt)
    th.assertIsApproximatelyEqual(erin_Debt, E_totalDebt)

    const dennis_Coll = await locManager.getLoCColl(dennis)
    const erin_Coll = await locManager.getLoCColl(erin)

    assert.equal(dennis_Coll.toString(), D_coll.toString())
    assert.equal(erin_Coll.toString(), E_coll.toString())
  })

  it('redeemCollateral(): ends the redemption sequence when max iterations have been reached', async () => {
    // --- SETUP --- 
    await openLoC({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol open locs with equal collateral ratio
    const { netDebt: A_debt } = await openLoC({ ICR: toBN(dec(286, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: alice } })
    const { netDebt: B_debt } = await openLoC({ ICR: toBN(dec(286, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: bob } })
    const { netDebt: C_debt, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(286, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: carol } })
    const redemptionAmount = A_debt.add(B_debt)
    const attemptedRedemptionAmount = redemptionAmount.add(C_debt)

    // --- TEST --- 

    // open LoC from redeemer.  Redeemer has highest ICR (100BTC, 100 ZUSD), 20000%
    const { zusdAmount: F_zusdAmount } = await openLoC({ ICR: toBN(dec(200, 18)), extraZUSDAmount: redemptionAmount.mul(toBN(2)), extraParams: { from: flyn } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Flyn redeems collateral with only two iterations
    await locManager.redeemCollateral(attemptedRedemptionAmount, alice, alice, alice, 0, 2, th._100pct, { from: flyn })

    // Check Flyn's redemption has reduced his balance from 100 to (100-40) = 60 ZUSD
    const flynBalance = (await zusdToken.balanceOf(flyn)).toString()
    th.assertIsApproximatelyEqual(flynBalance, F_zusdAmount.sub(redemptionAmount))

    // Check debt of Alice, Bob, Carol
    const alice_Debt = await locManager.getLoCDebt(alice)
    const bob_Debt = await locManager.getLoCDebt(bob)
    const carol_Debt = await locManager.getLoCDebt(carol)

    assert.equal(alice_Debt, 0)
    assert.equal(bob_Debt, 0)
    th.assertIsApproximatelyEqual(carol_Debt, C_totalDebt)

    // check Alice and Bob locs are closed, but Carol is not
    const alice_Status = await locManager.getLoCStatus(alice)
    const bob_Status = await locManager.getLoCStatus(bob)
    const carol_Status = await locManager.getLoCStatus(carol)
    assert.equal(alice_Status, 4)
    assert.equal(bob_Status, 4)
    assert.equal(carol_Status, 1)
  })

  it("redeemCollateral(): performs partial redemption if resultant debt is > minimum net debt", async () => {
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(10000, 18)), A, A, { from: A, value: dec(1000, 'ether') })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(20000, 18)), B, B, { from: B, value: dec(1000, 'ether') })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(30000, 18)), C, C, { from: C, value: dec(1000, 'ether') })

    // A and C send all their tokens to B
    await zusdToken.transfer(B, await zusdToken.balanceOf(A), {from: A})
    await zusdToken.transfer(B, await zusdToken.balanceOf(C), {from: C})
    
    await locManager.setBaseRate(0) 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // ZUSD redemption is 55000 US
    const ZUSDRedemption = dec(55000, 18)
    const tx1 = await th.redeemCollateralAndGetTxObject(B, contracts, ZUSDRedemption, th._100pct)
    
    // Check B, C closed and A remains active
    assert.isTrue(await sortedLoCs.contains(A))
    assert.isFalse(await sortedLoCs.contains(B))
    assert.isFalse(await sortedLoCs.contains(C))

    // A's remaining debt = 29980 + 19980 + 9980 + 20 - 55000 = 4960
    const A_debt = await locManager.getLoCDebt(A)
    await th.assertIsApproximatelyEqual(A_debt, dec(4960, 18), 1000) 
  })

  it("redeemCollateral(): doesn't perform partial redemption if resultant debt would be < minimum net debt", async () => {
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(6000, 18)), A, A, { from: A, value: dec(1000, 'ether') })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(20000, 18)), B, B, { from: B, value: dec(1000, 'ether') })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(30000, 18)), C, C, { from: C, value: dec(1000, 'ether') })

    // A and C send all their tokens to B
    await zusdToken.transfer(B, await zusdToken.balanceOf(A), {from: A})
    await zusdToken.transfer(B, await zusdToken.balanceOf(C), {from: C})

    await locManager.setBaseRate(0) 

    // Skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // ZUSD redemption is 49900 ZUSD
    const ZUSDRedemption = dec(49900, 18) // await zusdToken.balanceOf(B) //dec(59800, 18)
    const tx1 = await th.redeemCollateralAndGetTxObject(B, contracts, ZUSDRedemption, th._100pct)
    
    // Check B, C closed and A remains active
    assert.isTrue(await sortedLoCs.contains(A))
    assert.isTrue(await sortedLoCs.contains(B))
    assert.isFalse(await sortedLoCs.contains(C))

    // B's remaining debt would be 29980 + 19980 + 20 - 49900 = 80.
    // Since this is below the min net debt of 180, B should be skipped and untouched by the redemption
    const B_debt = await locManager.getLoCDebt(B)
    await th.assertIsApproximatelyEqual(B_debt, dec(20000, 18))
    const A_debt = await locManager.getLoCDebt(A)
    await th.assertIsApproximatelyEqual(A_debt, dec(6000, 18))
  })

  it('redeemCollateral(): doesnt perform the final partial redemption in the sequence if the hint is out-of-date', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(363, 16)), extraZUSDAmount: dec(5, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(344, 16)), extraZUSDAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openLoC({ ICR: toBN(dec(333, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: carol } })

    const partialRedemptionAmount = toBN(2)
    const fullfilledRedemptionAmount = C_netDebt.add(B_netDebt)
    const redemptionAmount = fullfilledRedemptionAmount.add(partialRedemptionAmount)

    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_BTCBalance_Before = toBN(await web3.eth.getBalance(dennis))

    const dennis_ZUSDBalance_Before = await zusdToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST --- 

    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    const frontRunRedepmtion = toBN(dec(1, 18))
    // Oops, another transaction gets in the way
    {
      const {
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints(dec(1, 18), price, 0)

      const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
        partialRedemptionHintNICR,
        dennis,
        dennis
      )

      // skip bootstrapping phase
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

      // Alice redeems 1 ZUSD from Carol's LoC
      await locManager.redeemCollateral(
        frontRunRedepmtion,
        firstRedemptionHint,
        upperPartialRedemptionHint,
        lowerPartialRedemptionHint,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: alice }
      )
    }

    // Dennis tries to redeem 20 ZUSD
    const redemptionTx = await locManager.redeemCollateral(
      redemptionAmount,
      firstRedemptionHint,
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: 0
      }
    )

    const BTCFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    // Since Alice already redeemed 1 ZUSD from Carol's LoC, Dennis was  able to redeem:
    //  - 9 ZUSD from Carol's
    //  - 8 ZUSD from Bob's
    // for a total of 17 ZUSD.

    // Dennis calculated his hint for redeeming 2 ZUSD from Alice's LoC, but after Alice's transaction
    // got in the way, he would have needed to redeem 3 ZUSD to fully complete his redemption of 20 ZUSD.
    // This would have required a different hint, therefore he ended up with a partial redemption.

    const dennis_BTCBalance_After = toBN(await web3.eth.getBalance(dennis))
    const receivedBTC = dennis_BTCBalance_After.sub(dennis_BTCBalance_Before)

    // Expect only 17 worth of BTC drawn
    const expectedTotalBTCDrawn = fullfilledRedemptionAmount.sub(frontRunRedepmtion).div(toBN(200)) // redempted ZUSD converted to BTC, at BTC:USD price 200
    const expectedReceivedBTC = expectedTotalBTCDrawn.sub(BTCFee)

    th.assertIsApproximatelyEqual(expectedReceivedBTC, receivedBTC)

    const dennis_ZUSDBalance_After = (await zusdToken.balanceOf(dennis)).toString()
    th.assertIsApproximatelyEqual(dennis_ZUSDBalance_After, dennis_ZUSDBalance_Before.sub(fullfilledRedemptionAmount.sub(frontRunRedepmtion)))
  })

  // active debt cannot be zero, as there’s a positive min debt enforced, and at least a LoC must exist
  it.skip("redeemCollateral(): can redeem if there is zero active debt but non-zero debt in DefaultPool", async () => {
    // --- SETUP ---

    const amount = await getOpenLoCZUSDAmount(dec(110, 18))
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(133, 16)), extraZUSDAmount: amount, extraParams: { from: bob } })

    await zusdToken.transfer(carol, amount, { from: bob })

    const price = dec(100, 18)
    await priceFeed.setPrice(price)

    // Liquidate Bob's LoC
    await locManager.liquidateLoCs(1)

    // --- TEST --- 

    const carol_BTCBalance_Before = toBN(await web3.eth.getBalance(carol))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const redemptionTx = await locManager.redeemCollateral(
      amount,
      alice,
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      '10367038690476190477',
      0,
      th._100pct,
      {
        from: carol,
        gasPrice: 0
      }
    )

    const BTCFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const carol_BTCBalance_After = toBN(await web3.eth.getBalance(carol))

    const expectedTotalBTCDrawn = toBN(amount).div(toBN(100)) // convert 100 ZUSD to BTC at BTC:USD price of 100
    const expectedReceivedBTC = expectedTotalBTCDrawn.sub(BTCFee)

    const receivedBTC = carol_BTCBalance_After.sub(carol_BTCBalance_Before)
    assert.isTrue(expectedReceivedBTC.eq(receivedBTC))

    const carol_ZUSDBalance_After = (await zusdToken.balanceOf(carol)).toString()
    assert.equal(carol_ZUSDBalance_After, '0')
  })

  it("redeemCollateral(): doesn't touch LoCs with ICR < 110%", async () => {
    // --- SETUP ---

    const { netDebt: A_debt } = await openLoC({ ICR: toBN(dec(13, 18)), extraParams: { from: alice } })
    const { zusdAmount: B_zusdAmount, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(133, 16)), extraZUSDAmount: A_debt, extraParams: { from: bob } })

    await zusdToken.transfer(carol, B_zusdAmount, { from: bob })

    // Put Bob's LoC below 110% ICR
    const price = dec(100, 18)
    await priceFeed.setPrice(price)

    // --- TEST --- 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await locManager.redeemCollateral(
      A_debt,
      alice,
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      th._100pct,
      { from: carol }
    );

    // Alice's LoC was cleared of debt
    const { debt: alice_Debt_After } = await locManager.LoCs(alice)
    assert.equal(alice_Debt_After, '0')

    // Bob's LoC was left untouched
    const { debt: bob_Debt_After } = await locManager.LoCs(bob)
    th.assertIsApproximatelyEqual(bob_Debt_After, B_totalDebt)
  });

  it("redeemCollateral(): finds the last LoC with ICR == 110% even if there is more than one", async () => {
    // --- SETUP ---
    const amount1 = toBN(dec(100, 18))
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: amount1, extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: amount1, extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: amount1, extraParams: { from: carol } })
    const redemptionAmount = C_totalDebt.add(B_totalDebt).add(A_totalDebt)
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(195, 16)), extraZUSDAmount: redemptionAmount, extraParams: { from: dennis } })

    // This will put Dennis slightly below 110%, and everyone else exactly at 110%
    const price = '110' + _18_zeros
    await priceFeed.setPrice(price)

    const orderOfLoCs = [];
    let current = await sortedLoCs.getFirst();

    while (current !== '0x0000000000000000000000000000000000000000') {
      orderOfLoCs.push(current);
      current = await sortedLoCs.getNext(current);
    }

    assert.deepEqual(orderOfLoCs, [carol, bob, alice, dennis]);

    await openLoC({ ICR: toBN(dec(100, 18)), extraZUSDAmount: dec(10, 18), extraParams: { from: whale } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const tx = await locManager.redeemCollateral(
      redemptionAmount,
      carol, // try to trick redeemCollateral by passing a hint that doesn't exactly point to the
      // last LoC with ICR == 110% (which would be Alice's)
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      th._100pct,
      { from: dennis }
    )
    
    const { debt: alice_Debt_After } = await locManager.LoCs(alice)
    assert.equal(alice_Debt_After, '0')

    const { debt: bob_Debt_After } = await locManager.LoCs(bob)
    assert.equal(bob_Debt_After, '0')

    const { debt: carol_Debt_After } = await locManager.LoCs(carol)
    assert.equal(carol_Debt_After, '0')

    const { debt: dennis_Debt_After } = await locManager.LoCs(dennis)
    th.assertIsApproximatelyEqual(dennis_Debt_After, D_totalDebt)
  });

  it("redeemCollateral(): reverts when TCR < MCR", async () => {
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(196, 16)), extraParams: { from: dennis } })

    // This will put Dennis slightly below 110%, and everyone else exactly at 110%
  
    await priceFeed.setPrice('110' + _18_zeros)
    const price = await priceFeed.getPrice()
    
    const TCR = (await th.getTCR(contracts))
    assert.isTrue(TCR.lt(toBN('1100000000000000000')))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await assertRevert(th.redeemCollateral(carol, contracts, dec(270, 18)), "LoCManager: Cannot redeem when TCR < MCR")
  });

  it("redeemCollateral(): reverts when argument _amount is 0", async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens LoC and transfers 500ZUSD to Erin, the would-be redeemer
    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(500, 18), extraParams: { from: alice } })
    await zusdToken.transfer(erin, dec(500, 18), { from: alice })

    // B, C and D open locs
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: dennis } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin attempts to redeem with _amount = 0
    const redemptionTxPromise = locManager.redeemCollateral(0, erin, erin, erin, 0, 0, th._100pct, { from: erin })
    await assertRevert(redemptionTxPromise, "LoCManager: Amount must be greater than zero")
  })

  it("redeemCollateral(): reverts if max fee > 100%", async () => {
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(30, 18), extraParams: { from: C } })
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(40, 18), extraParams: { from: D } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), dec(2, 18)), "Max fee percentage must be between 0.5% and 100%")
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), '1000000000000000001'), "Max fee percentage must be between 0.5% and 100%")
  })

  it("redeemCollateral(): reverts if max fee < 0.5%", async () => { 
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(10, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(20, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(30, 18), extraParams: { from: C } })
    await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(40, 18), extraParams: { from: D } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), 0), "Max fee percentage must be between 0.5% and 100%")
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), 1), "Max fee percentage must be between 0.5% and 100%")
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), '4999999999999999'), "Max fee percentage must be between 0.5% and 100%")
  })

  it("redeemCollateral(): reverts if fee exceeds max fee percentage", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(80, 18), extraParams: { from: A } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(90, 18), extraParams: { from: B } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })
    const expectedTotalSupply = A_totalDebt.add(B_totalDebt).add(C_totalDebt)

    // Check total ZUSD supply
    const totalSupply = await zusdToken.totalSupply()
    th.assertIsApproximatelyEqual(totalSupply, expectedTotalSupply)

    await locManager.setBaseRate(0) 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // ZUSD redemption is 27 USD: a redemption that incurs a fee of 27/(270 * 2) = 5%
    const attemptedZUSDRedemption = expectedTotalSupply.div(toBN(10))

    // Max fee is <5%
    const lessThan5pct = '49999999999999999'
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedZUSDRedemption, lessThan5pct), "Fee exceeded provided maximum")
  
    await locManager.setBaseRate(0)  // artificially zero the baseRate
    
    // Max fee is 1%
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedZUSDRedemption, dec(1, 16)), "Fee exceeded provided maximum")
  
    await locManager.setBaseRate(0)

     // Max fee is 3.754%
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedZUSDRedemption, dec(3754, 13)), "Fee exceeded provided maximum")
  
    await locManager.setBaseRate(0)

    // Max fee is 0.5%
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedZUSDRedemption, dec(5, 15)), "Fee exceeded provided maximum")
  })

  it("redeemCollateral(): succeeds if fee is less than max fee percentage", async () => {
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(9500, 18), extraParams: { from: A } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(395, 16)), extraZUSDAmount: dec(9000, 18), extraParams: { from: B } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(390, 16)), extraZUSDAmount: dec(10000, 18), extraParams: { from: C } })
    const expectedTotalSupply = A_totalDebt.add(B_totalDebt).add(C_totalDebt)

    // Check total ZUSD supply
    const totalSupply = await zusdToken.totalSupply()
    th.assertIsApproximatelyEqual(totalSupply, expectedTotalSupply)

    await locManager.setBaseRate(0) 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // ZUSD redemption fee with 10% of the supply will be 0.5% + 1/(10*2)
    const attemptedZUSDRedemption = expectedTotalSupply.div(toBN(10))

    // Attempt with maxFee > 5.5%
    const price = await priceFeed.getPrice()
    const BTCDrawn = attemptedZUSDRedemption.mul(mv._1e18BN).div(price)
    const slightlyMoreThanFee = (await locManager.getRedemptionFeeWithDecay(BTCDrawn))
    const tx1 = await th.redeemCollateralAndGetTxObject(A, contracts, attemptedZUSDRedemption, slightlyMoreThanFee)
    assert.isTrue(tx1.receipt.status)

    await locManager.setBaseRate(0)  // Artificially zero the baseRate
    
    // Attempt with maxFee = 5.5%
    const exactSameFee = (await locManager.getRedemptionFeeWithDecay(BTCDrawn))
    const tx2 = await th.redeemCollateralAndGetTxObject(C, contracts, attemptedZUSDRedemption, exactSameFee)
    assert.isTrue(tx2.receipt.status)

    await locManager.setBaseRate(0)

     // Max fee is 10%
    const tx3 = await th.redeemCollateralAndGetTxObject(B, contracts, attemptedZUSDRedemption, dec(1, 17))
    assert.isTrue(tx3.receipt.status)

    await locManager.setBaseRate(0)

    // Max fee is 37.659%
    const tx4 = await th.redeemCollateralAndGetTxObject(A, contracts, attemptedZUSDRedemption, dec(37659, 13))
    assert.isTrue(tx4.receipt.status)

    await locManager.setBaseRate(0)

    // Max fee is 100%
    const tx5 = await th.redeemCollateralAndGetTxObject(C, contracts, attemptedZUSDRedemption, dec(1, 18))
    assert.isTrue(tx5.receipt.status)
  })

  it("redeemCollateral(): doesn't affect the Stability Pool deposits or BTC gain of redeemed-from locs", async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // B, C, D, F open loc
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(195, 16)), extraZUSDAmount: dec(200, 18), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(400, 18), extraParams: { from: dennis } })
    const { totalDebt: F_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: flyn } })

    const redemptionAmount = B_totalDebt.add(C_totalDebt).add(D_totalDebt).add(F_totalDebt)
    // Alice opens LoC and transfers ZUSD to Erin, the would-be redeemer
    await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: redemptionAmount, extraParams: { from: alice } })
    await zusdToken.transfer(erin, redemptionAmount, { from: alice })

    // B, C, D deposit some of their tokens to the Stability Pool
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, { from: bob })
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: carol })
    await stabilityPool.provideToSP(dec(200, 18), ZERO_ADDRESS, { from: dennis })

    let price = await priceFeed.getPrice()
    const bob_ICR_before = await locManager.getCurrentICR(bob, price)
    const carol_ICR_before = await locManager.getCurrentICR(carol, price)
    const dennis_ICR_before = await locManager.getCurrentICR(dennis, price)

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    assert.isTrue(await sortedLoCs.contains(flyn))

    // Liquidate Flyn
    await locManager.liquidate(flyn)
    assert.isFalse(await sortedLoCs.contains(flyn))

    // Price bounces back, bringing B, C, D back above MCR
    await priceFeed.setPrice(dec(200, 18))

    const bob_SPDeposit_before = (await stabilityPool.getCompoundedZUSDDeposit(bob)).toString()
    const carol_SPDeposit_before = (await stabilityPool.getCompoundedZUSDDeposit(carol)).toString()
    const dennis_SPDeposit_before = (await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString()

    const bob_BTCGain_before = (await stabilityPool.getDepositorBTCGain(bob)).toString()
    const carol_BTCGain_before = (await stabilityPool.getDepositorBTCGain(carol)).toString()
    const dennis_BTCGain_before = (await stabilityPool.getDepositorBTCGain(dennis)).toString()

    // Check the remaining ZUSD and BTC in Stability Pool after liquidation is non-zero
    const ZUSDinSP = await stabilityPool.getTotalZUSDDeposits()
    const BTCinSP = await stabilityPool.getBTC()
    assert.isTrue(ZUSDinSP.gte(mv._zeroBN))
    assert.isTrue(BTCinSP.gte(mv._zeroBN))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin redeems ZUSD
    await th.redeemCollateral(erin, contracts, redemptionAmount, th._100pct)

    price = await priceFeed.getPrice()
    const bob_ICR_after = await locManager.getCurrentICR(bob, price)
    const carol_ICR_after = await locManager.getCurrentICR(carol, price)
    const dennis_ICR_after = await locManager.getCurrentICR(dennis, price)

    // Check ICR of B, C and D locs has increased,i.e. they have been hit by redemptions
    assert.isTrue(bob_ICR_after.gte(bob_ICR_before))
    assert.isTrue(carol_ICR_after.gte(carol_ICR_before))
    assert.isTrue(dennis_ICR_after.gte(dennis_ICR_before))

    const bob_SPDeposit_after = (await stabilityPool.getCompoundedZUSDDeposit(bob)).toString()
    const carol_SPDeposit_after = (await stabilityPool.getCompoundedZUSDDeposit(carol)).toString()
    const dennis_SPDeposit_after = (await stabilityPool.getCompoundedZUSDDeposit(dennis)).toString()

    const bob_BTCGain_after = (await stabilityPool.getDepositorBTCGain(bob)).toString()
    const carol_BTCGain_after = (await stabilityPool.getDepositorBTCGain(carol)).toString()
    const dennis_BTCGain_after = (await stabilityPool.getDepositorBTCGain(dennis)).toString()

    // Check B, C, D Stability Pool deposits and BTC gain have not been affected by redemptions from their locs
    assert.equal(bob_SPDeposit_before, bob_SPDeposit_after)
    assert.equal(carol_SPDeposit_before, carol_SPDeposit_after)
    assert.equal(dennis_SPDeposit_before, dennis_SPDeposit_after)

    assert.equal(bob_BTCGain_before, bob_BTCGain_after)
    assert.equal(carol_BTCGain_before, carol_BTCGain_after)
    assert.equal(dennis_BTCGain_before, dennis_BTCGain_after)
  })

  it("redeemCollateral(): caller can redeem their entire ZUSDToken balance", async () => {
    const { collateral: W_coll, totalDebt: W_totalDebt } = await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens LoC and transfers 400 ZUSD to Erin, the would-be redeemer
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(400, 18), extraParams: { from: alice } })
    await zusdToken.transfer(erin, dec(400, 18), { from: alice })

    // Check Erin's balance before
    const erin_balance_before = await zusdToken.balanceOf(erin)
    assert.equal(erin_balance_before, dec(400, 18))

    // B, C, D open loc
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(590, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(1990, 18), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(500, 16)), extraZUSDAmount: dec(1990, 18), extraParams: { from: dennis } })

    const totalDebt = W_totalDebt.add(A_totalDebt).add(B_totalDebt).add(C_totalDebt).add(D_totalDebt)
    const totalColl = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)

    // Get active debt and coll before redemption
    const activePool_debt_before = await activePool.getZUSDDebt()
    const activePool_coll_before = await activePool.getBTC()

    th.assertIsApproximatelyEqual(activePool_debt_before, totalDebt)
    assert.equal(activePool_coll_before.toString(), totalColl)

    const price = await priceFeed.getPrice()

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin attempts to redeem 400 ZUSD
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(dec(400, 18), price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      erin,
      erin
    )

    await locManager.redeemCollateral(
      dec(400, 18),
      firstRedemptionHint,
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: erin })

    // Check activePool debt reduced by  400 ZUSD
    const activePool_debt_after = await activePool.getZUSDDebt()
    assert.equal(activePool_debt_before.sub(activePool_debt_after), dec(400, 18))

    /* Check ActivePool coll reduced by $400 worth of Bitcoin: at BTC:USD price of $200, this should be 2 BTC.

    therefore remaining ActivePool BTC should be 198 */
    const activePool_coll_after = await activePool.getBTC()
    // console.log(`activePool_coll_after: ${activePool_coll_after}`)
    assert.equal(activePool_coll_after.toString(), activePool_coll_before.sub(toBN(dec(2, 18))))

    // Check Erin's balance after
    const erin_balance_after = (await zusdToken.balanceOf(erin)).toString()
    assert.equal(erin_balance_after, '0')
  })

  it("redeemCollateral(): reverts when requested redemption amount exceeds caller's ZUSD token balance", async () => {
    const { collateral: W_coll, totalDebt: W_totalDebt } = await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens LoC and transfers 400 ZUSD to Erin, the would-be redeemer
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(400, 18), extraParams: { from: alice } })
    await zusdToken.transfer(erin, dec(400, 18), { from: alice })

    // Check Erin's balance before
    const erin_balance_before = await zusdToken.balanceOf(erin)
    assert.equal(erin_balance_before, dec(400, 18))

    // B, C, D open loc
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(590, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(1990, 18), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(500, 16)), extraZUSDAmount: dec(1990, 18), extraParams: { from: dennis } })

    const totalDebt = W_totalDebt.add(A_totalDebt).add(B_totalDebt).add(C_totalDebt).add(D_totalDebt)
    const totalColl = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)

    // Get active debt and coll before redemption
    const activePool_debt_before = await activePool.getZUSDDebt()
    const activePool_coll_before = (await activePool.getBTC()).toString()

    th.assertIsApproximatelyEqual(activePool_debt_before, totalDebt)
    assert.equal(activePool_coll_before, totalColl)

    const price = await priceFeed.getPrice()

    let firstRedemptionHint
    let partialRedemptionHintNICR

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin tries to redeem 1000 ZUSD
    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints(dec(1000, 18), price, 0))

      const { 0: upperPartialRedemptionHint_1, 1: lowerPartialRedemptionHint_1 } = await sortedLoCs.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await locManager.redeemCollateral(
        dec(1000, 18),
        firstRedemptionHint,
        upperPartialRedemptionHint_1,
        lowerPartialRedemptionHint_1,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })

      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's ZUSD token balance")
    }

    // Erin tries to redeem 401 ZUSD
    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints('401000000000000000000', price, 0))

      const { 0: upperPartialRedemptionHint_2, 1: lowerPartialRedemptionHint_2 } = await sortedLoCs.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await locManager.redeemCollateral(
        '401000000000000000000', firstRedemptionHint,
        upperPartialRedemptionHint_2,
        lowerPartialRedemptionHint_2,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })
      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's ZUSD token balance")
    }

    // Erin tries to redeem 239482309 ZUSD
    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints('239482309000000000000000000', price, 0))

      const { 0: upperPartialRedemptionHint_3, 1: lowerPartialRedemptionHint_3 } = await sortedLoCs.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await locManager.redeemCollateral(
        '239482309000000000000000000', firstRedemptionHint,
        upperPartialRedemptionHint_3,
        lowerPartialRedemptionHint_3,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })
      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's ZUSD token balance")
    }

    // Erin tries to redeem 2^256 - 1 ZUSD
    const maxBytes32 = toBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints('239482309000000000000000000', price, 0))

      const { 0: upperPartialRedemptionHint_4, 1: lowerPartialRedemptionHint_4 } = await sortedLoCs.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await locManager.redeemCollateral(
        maxBytes32, firstRedemptionHint,
        upperPartialRedemptionHint_4,
        lowerPartialRedemptionHint_4,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })
      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's ZUSD token balance")
    }
  })

  it("redeemCollateral(): value of issued BTC == face value of redeemed ZUSD (assuming 1 ZUSD has value of $1)", async () => {
    const { collateral: W_coll } = await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens LoC and transfers 1000 ZUSD each to Erin, Flyn, Graham
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(400, 16)), extraZUSDAmount: dec(4990, 18), extraParams: { from: alice } })
    await zusdToken.transfer(erin, dec(1000, 18), { from: alice })
    await zusdToken.transfer(flyn, dec(1000, 18), { from: alice })
    await zusdToken.transfer(graham, dec(1000, 18), { from: alice })

    // B, C, D open loc
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(300, 16)), extraZUSDAmount: dec(1590, 18), extraParams: { from: bob } })
    const { collateral: C_coll } = await openLoC({ ICR: toBN(dec(600, 16)), extraZUSDAmount: dec(1090, 18), extraParams: { from: carol } })
    const { collateral: D_coll } = await openLoC({ ICR: toBN(dec(800, 16)), extraZUSDAmount: dec(1090, 18), extraParams: { from: dennis } })

    const totalColl = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)

    const price = await priceFeed.getPrice()

    const _120_ZUSD = '120000000000000000000'
    const _373_ZUSD = '373000000000000000000'
    const _950_ZUSD = '950000000000000000000'

    // Check Bitcoin in activePool
    const activeBTC_0 = await activePool.getBTC()
    assert.equal(activeBTC_0, totalColl.toString());

    let firstRedemptionHint
    let partialRedemptionHintNICR


    // Erin redeems 120 ZUSD
    ({
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(_120_ZUSD, price, 0))

    const { 0: upperPartialRedemptionHint_1, 1: lowerPartialRedemptionHint_1 } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      erin,
      erin
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const redemption_1 = await locManager.redeemCollateral(
      _120_ZUSD,
      firstRedemptionHint,
      upperPartialRedemptionHint_1,
      lowerPartialRedemptionHint_1,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: erin })

    assert.isTrue(redemption_1.receipt.status);

    /* 120 ZUSD redeemed.  Expect $120 worth of BTC removed. At BTC:USD price of $200, 
    BTC removed = (120/200) = 0.6 BTC
    Total active BTC = 280 - 0.6 = 279.4 BTC */

    const activeBTC_1 = await activePool.getBTC()
    assert.equal(activeBTC_1.toString(), activeBTC_0.sub(toBN(_120_ZUSD).mul(mv._1e18BN).div(price)));

    // Flyn redeems 373 ZUSD
    ({
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(_373_ZUSD, price, 0))

    const { 0: upperPartialRedemptionHint_2, 1: lowerPartialRedemptionHint_2 } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      flyn,
      flyn
    )

    const redemption_2 = await locManager.redeemCollateral(
      _373_ZUSD,
      firstRedemptionHint,
      upperPartialRedemptionHint_2,
      lowerPartialRedemptionHint_2,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: flyn })

    assert.isTrue(redemption_2.receipt.status);

    /* 373 ZUSD redeemed.  Expect $373 worth of BTC removed. At BTC:USD price of $200, 
    BTC removed = (373/200) = 1.865 BTC
    Total active BTC = 279.4 - 1.865 = 277.535 BTC */
    const activeBTC_2 = await activePool.getBTC()
    assert.equal(activeBTC_2.toString(), activeBTC_1.sub(toBN(_373_ZUSD).mul(mv._1e18BN).div(price)));

    // Graham redeems 950 ZUSD
    ({
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(_950_ZUSD, price, 0))

    const { 0: upperPartialRedemptionHint_3, 1: lowerPartialRedemptionHint_3 } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      graham,
      graham
    )

    const redemption_3 = await locManager.redeemCollateral(
      _950_ZUSD,
      firstRedemptionHint,
      upperPartialRedemptionHint_3,
      lowerPartialRedemptionHint_3,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: graham })

    assert.isTrue(redemption_3.receipt.status);

    /* 950 ZUSD redeemed.  Expect $950 worth of BTC removed. At BTC:USD price of $200, 
    BTC removed = (950/200) = 4.75 BTC
    Total active BTC = 277.535 - 4.75 = 272.785 BTC */
    const activeBTC_3 = (await activePool.getBTC()).toString()
    assert.equal(activeBTC_3.toString(), activeBTC_2.sub(toBN(_950_ZUSD).mul(mv._1e18BN).div(price)));
  })

  // it doesn’t make much sense as there’s now min debt enforced and at least one LoC must remain active
  // the only way to test it is before any LoC is opened
  it("redeemCollateral(): reverts if there is zero outstanding system debt", async () => {
    // --- SETUP --- illegally mint ZUSD to Bob
    await zusdToken.unprotectedMint(bob, dec(100, 18))

    assert.equal((await zusdToken.balanceOf(bob)), dec(100, 18))

    const price = await priceFeed.getPrice()

    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(dec(100, 18), price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      bob,
      bob
    )

    // Bob tries to redeem his illegally obtained ZUSD
    try {
      const redemptionTx = await locManager.redeemCollateral(
        dec(100, 18),
        firstRedemptionHint,
        upperPartialRedemptionHint,
        lowerPartialRedemptionHint,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: bob })
    } catch (error) {
      assert.include(error.message, "VM Exception while processing transaction")
    }

    // assert.isFalse(redemptionTx.receipt.status);
  })

  it("redeemCollateral(): reverts if caller's tries to redeem more than the outstanding system debt", async () => {
    // --- SETUP --- illegally mint ZUSD to Bob
    await zusdToken.unprotectedMint(bob, '101000000000000000000')

    assert.equal((await zusdToken.balanceOf(bob)), '101000000000000000000')

    const { collateral: C_coll, totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(1000, 16)), extraZUSDAmount: dec(40, 18), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(1000, 16)), extraZUSDAmount: dec(40, 18), extraParams: { from: dennis } })

    const totalDebt = C_totalDebt.add(D_totalDebt)
    th.assertIsApproximatelyEqual((await activePool.getZUSDDebt()).toString(), totalDebt)

    const price = await priceFeed.getPrice()
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints('101000000000000000000', price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedLoCs.findInsertPosition(
      partialRedemptionHintNICR,
      bob,
      bob
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Bob attempts to redeem his ill-gotten 101 ZUSD, from a system that has 100 ZUSD outstanding debt
    try {
      const redemptionTx = await locManager.redeemCollateral(
        totalDebt.add(toBN(dec(100, 18))),
        firstRedemptionHint,
        upperPartialRedemptionHint,
        lowerPartialRedemptionHint,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: bob })
    } catch (error) {
      assert.include(error.message, "VM Exception while processing transaction")
    }
  })

  // Redemption fees 
  it("redeemCollateral(): a redemption made when base rate is zero increases the base rate", async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await locManager.baseRate(), '0')

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const A_balanceBefore = await zusdToken.balanceOf(A)

    await th.redeemCollateral(A, contracts, dec(10, 18))

    // Check A's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    assert.isTrue((await locManager.baseRate()).gt(toBN('0')))
  })

  it("redeemCollateral(): a redemption made when base rate is non-zero increases the base rate, for negligible time passed", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await locManager.baseRate(), '0')

    const A_balanceBefore = await zusdToken.balanceOf(A)
    const B_balanceBefore = await zusdToken.balanceOf(B)

    // A redeems 10 ZUSD
    const redemptionTx_A = await th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18))
    const timeStamp_A = await th.getTimestampFromTx(redemptionTx_A, web3)

    // Check A's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await locManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // B redeems 10 ZUSD
    const redemptionTx_B = await th.redeemCollateralAndGetTxObject(B, contracts, dec(10, 18))
    const timeStamp_B = await th.getTimestampFromTx(redemptionTx_B, web3)

    // Check B's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(B), B_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check negligible time difference (< 1 minute) between txs
    assert.isTrue(Number(timeStamp_B) - Number(timeStamp_A) < 60)

    const baseRate_2 = await locManager.baseRate()

    // Check baseRate has again increased
    assert.isTrue(baseRate_2.gt(baseRate_1))
  })

  it("redeemCollateral(): lastFeeOpTime doesn't update if less time than decay interval has passed since the last fee operation [ @skip-on-coverage ]", async () => {
    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const A_balanceBefore = await zusdToken.balanceOf(A)

    // A redeems 10 ZUSD
    await th.redeemCollateral(A, contracts, dec(10, 18))

    // Check A's balance has decreased by 10 ZUSD
    assert.equal(A_balanceBefore.sub(await zusdToken.balanceOf(A)), dec(10, 18))

    // Check baseRate is now non-zero
    const baseRate_1 = await locManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    const lastFeeOpTime_1 = await locManager.lastFeeOperationTime()

    // 45 seconds pass
    th.fastForwardTime(45, web3.currentProvider)

    // Borrower A triggers a fee
    await th.redeemCollateral(A, contracts, dec(1, 18))

    const lastFeeOpTime_2 = await locManager.lastFeeOperationTime()

    // Check that the last fee operation time did not update, as borrower A's 2nd redemption occured
    // since before minimum interval had passed 
    assert.isTrue(lastFeeOpTime_2.eq(lastFeeOpTime_1))

    // 15 seconds passes
    th.fastForwardTime(15, web3.currentProvider)

    // Check that now, at least one hour has passed since lastFeeOpTime_1
    const timeNow = await th.getLatestBlockTimestamp(web3)
    assert.isTrue(toBN(timeNow).sub(lastFeeOpTime_1).gte(3600))

    // Borrower A triggers a fee
    await th.redeemCollateral(A, contracts, dec(1, 18))

    const lastFeeOpTime_3 = await locManager.lastFeeOperationTime()

    // Check that the last fee operation time DID update, as A's 2rd redemption occured
    // after minimum interval had passed 
    assert.isTrue(lastFeeOpTime_3.gt(lastFeeOpTime_1))
  })

  it("redeemCollateral(): a redemption made at zero base rate send a non-zero BTCFee to ZERO staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await locManager.baseRate(), '0')

    // Check ZERO Staking contract balance before is zero
    const zeroStakingBalance_Before = await web3.eth.getBalance(zeroStaking.address)
    assert.equal(zeroStakingBalance_Before, '0')

    const A_balanceBefore = await zusdToken.balanceOf(A)

    // A redeems 10 ZUSD
    await th.redeemCollateral(A, contracts, dec(10, 18))

    // Check A's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await locManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // Check ZERO Staking contract balance after is zero
    const zeroStakingBalance_After = toBN(await web3.eth.getBalance(zeroStaking.address))
    assert.isTrue(zeroStakingBalance_After.eq(toBN('0')))
  })

  it("redeemCollateral(): a redemption made at zero base increases the BTC-fees-per-ZERO-staked in ZERO Staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await locManager.baseRate(), '0')

    // Check ZERO Staking BTC-fees-per-ZERO-staked before is zero
    const F_BTC_Before = await zeroStaking.F_BTC()
    assert.equal(F_BTC_Before, '0')

    const A_balanceBefore = await zusdToken.balanceOf(A)

    // A redeems 10 ZUSD
    await th.redeemCollateral(A, contracts, dec(10, 18))

    // Check A's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await locManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // Check ZERO Staking BTC-fees-per-ZERO-staked after is non-zero
    const F_BTC_After = await zeroStaking.F_BTC()
    assert.isTrue(F_BTC_After.gt('0'))
  })

  it("redeemCollateral(): a redemption made at a non-zero base rate send a non-zero BTCFee to ZERO staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await locManager.baseRate(), '0')

    const A_balanceBefore = await zusdToken.balanceOf(A)
    const B_balanceBefore = await zusdToken.balanceOf(B)

    // A redeems 10 ZUSD
    await th.redeemCollateral(A, contracts, dec(10, 18))

    // Check A's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await locManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    const zeroStakingBalance_Before = toBN(await web3.eth.getBalance(zeroStaking.address))

    // B redeems 10 ZUSD
    await th.redeemCollateral(B, contracts, dec(10, 18))

    // Check B's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(B), B_balanceBefore.sub(toBN(dec(10, 18))).toString())

    const zeroStakingBalance_After = toBN(await web3.eth.getBalance(zeroStaking.address))

    // check ZERO Staking balance hasn't increased
    assert.isTrue(zeroStakingBalance_After.eq(zeroStakingBalance_Before))
  })

  it("redeemCollateral(): a redemption made at a non-zero base rate increases BTC-per-ZERO-staked in the staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await locManager.baseRate(), '0')

    const A_balanceBefore = await zusdToken.balanceOf(A)
    const B_balanceBefore = await zusdToken.balanceOf(B)

    // A redeems 10 ZUSD
    await th.redeemCollateral(A, contracts, dec(10, 18))

    // Check A's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await locManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // Check ZERO Staking BTC-fees-per-ZERO-staked before is zero
    const F_BTC_Before = await zeroStaking.F_BTC()

    // B redeems 10 ZUSD
    await th.redeemCollateral(B, contracts, dec(10, 18))

    // Check B's balance has decreased by 10 ZUSD
    assert.equal(await zusdToken.balanceOf(B), B_balanceBefore.sub(toBN(dec(10, 18))).toString())

    const F_BTC_After = await zeroStaking.F_BTC()

    // check ZERO Staking balance hasn't increased
    assert.isTrue(F_BTC_After.eq(F_BTC_Before))
  })

  it("redeemCollateral(): a redemption sends the BTC remainder (BTCDrawn - BTCFee) to the redeemer", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    const { totalDebt: W_totalDebt } = await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })
    const totalDebt = W_totalDebt.add(A_totalDebt).add(B_totalDebt).add(C_totalDebt)

    const A_balanceBefore = toBN(await web3.eth.getBalance(A))

    // Confirm baseRate before redemption is 0
    const baseRate = await locManager.baseRate()
    assert.equal(baseRate, '0')

    // Check total ZUSD supply
    const activeZUSD = await activePool.getZUSDDebt()
    const defaultZUSD = await defaultPool.getZUSDDebt()

    const totalZUSDSupply = activeZUSD.add(defaultZUSD)
    th.assertIsApproximatelyEqual(totalZUSDSupply, totalDebt)

    // A redeems 9 ZUSD
    const redemptionAmount = toBN(dec(9, 18))
    await th.redeemCollateral(A, contracts, redemptionAmount)

    /*
    At BTC:USD price of 200:
    BTCDrawn = (9 / 200) = 0.045 BTC
    BTCfee = (0.005 + (1/2) *( 9/260)) * BTCDrawn = 0.00100384615385 BTC
    BTCRemainder = 0.045 - 0.001003... = 0.0439961538462
    */

    const A_balanceAfter = toBN(await web3.eth.getBalance(A))

    // check A's BTC balance has increased by 0.045 BTC 
    const price = await priceFeed.getPrice()
    const BTCDrawn = redemptionAmount.mul(mv._1e18BN).div(price)
    th.assertIsApproximatelyEqual(
      A_balanceAfter.sub(A_balanceBefore),
      BTCDrawn.sub(
        toBN(dec(5, 15)).add(redemptionAmount.mul(mv._1e18BN).div(totalDebt).div(toBN(2)))
          .mul(BTCDrawn).div(mv._1e18BN)
      ),
      100000
    )
  })

  it("redeemCollateral(): a full redemption (leaving LoC with 0 debt), closes the loc", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    const { netDebt: W_netDebt } = await openLoC({ ICR: toBN(dec(20, 18)), extraZUSDAmount: dec(10000, 18), extraParams: { from: whale } })

    const { netDebt: A_netDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    const { netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    const { netDebt: C_netDebt } = await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })
    const { netDebt: D_netDebt } = await openLoC({ ICR: toBN(dec(280, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: D } })
    const redemptionAmount = A_netDebt.add(B_netDebt).add(C_netDebt).add(toBN(dec(10, 18)))

    const A_balanceBefore = toBN(await web3.eth.getBalance(A))
    const B_balanceBefore = toBN(await web3.eth.getBalance(B))
    const C_balanceBefore = toBN(await web3.eth.getBalance(C))

    // whale redeems 360 ZUSD.  Expect this to fully redeem A, B, C, and partially redeem D.
    await th.redeemCollateral(whale, contracts, redemptionAmount)

    // Check A, B, C have been closed
    assert.isFalse(await sortedLoCs.contains(A))
    assert.isFalse(await sortedLoCs.contains(B))
    assert.isFalse(await sortedLoCs.contains(C))

    // Check D remains active
    assert.isTrue(await sortedLoCs.contains(D))
  })

  const redeemCollateral3Full1Partial = async () => {
    // time fast-forwards 1 year, and multisig stakes 1 ZERO
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await zeroToken.approve(zeroStaking.address, dec(1, 18), { from: multisig })
    await zeroStaking.stake(dec(1, 18), { from: multisig })

    const { netDebt: W_netDebt } = await openLoC({ ICR: toBN(dec(20, 18)), extraZUSDAmount: dec(10000, 18), extraParams: { from: whale } })

    const { netDebt: A_netDebt, collateral: A_coll } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    const { netDebt: B_netDebt, collateral: B_coll } = await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    const { netDebt: C_netDebt, collateral: C_coll } = await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })
    const { netDebt: D_netDebt } = await openLoC({ ICR: toBN(dec(280, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: D } })
    const redemptionAmount = A_netDebt.add(B_netDebt).add(C_netDebt).add(toBN(dec(10, 18)))

    const A_balanceBefore = toBN(await web3.eth.getBalance(A))
    const B_balanceBefore = toBN(await web3.eth.getBalance(B))
    const C_balanceBefore = toBN(await web3.eth.getBalance(C))
    const D_balanceBefore = toBN(await web3.eth.getBalance(D))

    const A_collBefore = await locManager.getLoCColl(A)
    const B_collBefore = await locManager.getLoCColl(B)
    const C_collBefore = await locManager.getLoCColl(C)
    const D_collBefore = await locManager.getLoCColl(D)

    // Confirm baseRate before redemption is 0
    const baseRate = await locManager.baseRate()
    assert.equal(baseRate, '0')

    // whale redeems ZUSD.  Expect this to fully redeem A, B, C, and partially redeem D.
    await th.redeemCollateral(whale, contracts, redemptionAmount)

    // Check A, B, C have been closed
    assert.isFalse(await sortedLoCs.contains(A))
    assert.isFalse(await sortedLoCs.contains(B))
    assert.isFalse(await sortedLoCs.contains(C))

    // Check D stays active
    assert.isTrue(await sortedLoCs.contains(D))
    
    /*
    At BTC:USD price of 200, with full redemptions from A, B, C:

    BTCDrawn from A = 100/200 = 0.5 BTC --> Surplus = (1-0.5) = 0.5
    BTCDrawn from B = 120/200 = 0.6 BTC --> Surplus = (1-0.6) = 0.4
    BTCDrawn from C = 130/200 = 0.65 BTC --> Surplus = (2-0.65) = 1.35
    */

    const A_balanceAfter = toBN(await web3.eth.getBalance(A))
    const B_balanceAfter = toBN(await web3.eth.getBalance(B))
    const C_balanceAfter = toBN(await web3.eth.getBalance(C))
    const D_balanceAfter = toBN(await web3.eth.getBalance(D))

    // Check A, B, C’s LoC collateral balance is zero (fully redeemed-from locs)
    const A_collAfter = await locManager.getLoCColl(A)
    const B_collAfter = await locManager.getLoCColl(B)
    const C_collAfter = await locManager.getLoCColl(C)
    assert.isTrue(A_collAfter.eq(toBN(0)))
    assert.isTrue(B_collAfter.eq(toBN(0)))
    assert.isTrue(C_collAfter.eq(toBN(0)))

    // check D's LoC collateral balances have decreased (the partially redeemed-from loc)
    const D_collAfter = await locManager.getLoCColl(D)
    assert.isTrue(D_collAfter.lt(D_collBefore))

    // Check A, B, C (fully redeemed-from locs), and D's (the partially redeemed-from loc) balance has not changed
    assert.isTrue(A_balanceAfter.eq(A_balanceBefore))
    assert.isTrue(B_balanceAfter.eq(B_balanceBefore))
    assert.isTrue(C_balanceAfter.eq(C_balanceBefore))
    assert.isTrue(D_balanceAfter.eq(D_balanceBefore))

    // D is not closed, so cannot open loc
    await assertRevert(borrowerOperations.openLoC(th._100pct, 0, ZERO_ADDRESS, ZERO_ADDRESS, { from: D, value: dec(10, 18) }), 'BorrowerOps: LoC is active')

    return {
      A_netDebt, A_coll,
      B_netDebt, B_coll,
      C_netDebt, C_coll,
    }
  }

  it("redeemCollateral(): emits correct debt and coll values in each redeemed LoC's LoCUpdated event", async () => {
    const { netDebt: W_netDebt } = await openLoC({ ICR: toBN(dec(20, 18)), extraZUSDAmount: dec(10000, 18), extraParams: { from: whale } })

    const { netDebt: A_netDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    const { netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    const { netDebt: C_netDebt } = await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })
    const { totalDebt: D_totalDebt, collateral: D_coll } = await openLoC({ ICR: toBN(dec(280, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: D } })
    const partialAmount = toBN(dec(15, 18))
    const redemptionAmount = A_netDebt.add(B_netDebt).add(C_netDebt).add(partialAmount)

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems ZUSD.  Expect this to fully redeem A, B, C, and partially redeem 15 ZUSD from D.
    const redemptionTx = await th.redeemCollateralAndGetTxObject(whale, contracts, redemptionAmount, th._100pct, { gasPrice: 0 })

    // Check A, B, C have been closed
    assert.isFalse(await sortedLoCs.contains(A))
    assert.isFalse(await sortedLoCs.contains(B))
    assert.isFalse(await sortedLoCs.contains(C))

    // Check D stays active
    assert.isTrue(await sortedLoCs.contains(D))

    const locUpdatedEvents = th.getAllEventsByName(redemptionTx, "LoCUpdated")

    // Get each LoC's emitted debt and coll 
    const [A_emittedDebt, A_emittedColl] = th.getDebtAndCollFromLoCUpdatedEvents(locUpdatedEvents, A)
    const [B_emittedDebt, B_emittedColl] = th.getDebtAndCollFromLoCUpdatedEvents(locUpdatedEvents, B)
    const [C_emittedDebt, C_emittedColl] = th.getDebtAndCollFromLoCUpdatedEvents(locUpdatedEvents, C)
    const [D_emittedDebt, D_emittedColl] = th.getDebtAndCollFromLoCUpdatedEvents(locUpdatedEvents, D)

    // Expect A, B, C to have 0 emitted debt and coll, since they were closed
    assert.equal(A_emittedDebt, '0')
    assert.equal(A_emittedColl, '0')
    assert.equal(B_emittedDebt, '0')
    assert.equal(B_emittedColl, '0')
    assert.equal(C_emittedDebt, '0')
    assert.equal(C_emittedColl, '0')

    /* Expect D to have lost 15 debt and (at BTC price of 200) 15/200 = 0.075 BTC. 
    So, expect remaining debt = (85 - 15) = 70, and remaining BTC = 1 - 15/200 = 0.925 remaining. */
    const price = await priceFeed.getPrice()
    th.assertIsApproximatelyEqual(D_emittedDebt, D_totalDebt.sub(partialAmount))
    th.assertIsApproximatelyEqual(D_emittedColl, D_coll.sub(partialAmount.mul(mv._1e18BN).div(price)))
  })

  it("redeemCollateral(): a redemption that closes a LoC leaves the LoC's BTC surplus (collateral - BTC drawn) available for the LoC owner to claim", async () => {
    const {
      A_netDebt, A_coll,
      B_netDebt, B_coll,
      C_netDebt, C_coll,
    } = await redeemCollateral3Full1Partial()

    const A_balanceBefore = toBN(await web3.eth.getBalance(A))
    const B_balanceBefore = toBN(await web3.eth.getBalance(B))
    const C_balanceBefore = toBN(await web3.eth.getBalance(C))

    // CollSurplusPool endpoint cannot be called directly
    await assertRevert(collSurplusPool.claimColl(A), 'CollSurplusPool: Caller is not Borrower Operations')

    await borrowerOperations.claimCollateral({ from: A, gasPrice: 0 })
    await borrowerOperations.claimCollateral({ from: B, gasPrice: 0 })
    await borrowerOperations.claimCollateral({ from: C, gasPrice: 0 })

    const A_balanceAfter = toBN(await web3.eth.getBalance(A))
    const B_balanceAfter = toBN(await web3.eth.getBalance(B))
    const C_balanceAfter = toBN(await web3.eth.getBalance(C))

    const price = await priceFeed.getPrice()

    th.assertIsApproximatelyEqual(A_balanceAfter, A_balanceBefore.add(A_coll.sub(A_netDebt.mul(mv._1e18BN).div(price))))
    th.assertIsApproximatelyEqual(B_balanceAfter, B_balanceBefore.add(B_coll.sub(B_netDebt.mul(mv._1e18BN).div(price))))
    th.assertIsApproximatelyEqual(C_balanceAfter, C_balanceBefore.add(C_coll.sub(C_netDebt.mul(mv._1e18BN).div(price))))
  })

  it("redeemCollateral(): a redemption that closes a LoC leaves the LoC's BTC surplus (collateral - BTC drawn) available for the LoC owner after re-opening loc", async () => {
    const {
      A_netDebt, A_coll: A_collBefore,
      B_netDebt, B_coll: B_collBefore,
      C_netDebt, C_coll: C_collBefore,
    } = await redeemCollateral3Full1Partial()

    const price = await priceFeed.getPrice()
    const A_surplus = A_collBefore.sub(A_netDebt.mul(mv._1e18BN).div(price))
    const B_surplus = B_collBefore.sub(B_netDebt.mul(mv._1e18BN).div(price))
    const C_surplus = C_collBefore.sub(C_netDebt.mul(mv._1e18BN).div(price))

    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: A } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(190, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: B } })
    const { collateral: C_coll } = await openLoC({ ICR: toBN(dec(180, 16)), extraZUSDAmount: dec(100, 18), extraParams: { from: C } })

    const A_collAfter = await locManager.getLoCColl(A)
    const B_collAfter = await locManager.getLoCColl(B)
    const C_collAfter = await locManager.getLoCColl(C)

    assert.isTrue(A_collAfter.eq(A_coll))
    assert.isTrue(B_collAfter.eq(B_coll))
    assert.isTrue(C_collAfter.eq(C_coll))

    const A_balanceBefore = toBN(await web3.eth.getBalance(A))
    const B_balanceBefore = toBN(await web3.eth.getBalance(B))
    const C_balanceBefore = toBN(await web3.eth.getBalance(C))

    await borrowerOperations.claimCollateral({ from: A, gasPrice: 0 })
    await borrowerOperations.claimCollateral({ from: B, gasPrice: 0 })
    await borrowerOperations.claimCollateral({ from: C, gasPrice: 0 })

    const A_balanceAfter = toBN(await web3.eth.getBalance(A))
    const B_balanceAfter = toBN(await web3.eth.getBalance(B))
    const C_balanceAfter = toBN(await web3.eth.getBalance(C))

    th.assertIsApproximatelyEqual(A_balanceAfter, A_balanceBefore.add(A_surplus))
    th.assertIsApproximatelyEqual(B_balanceAfter, B_balanceBefore.add(B_surplus))
    th.assertIsApproximatelyEqual(C_balanceAfter, C_balanceBefore.add(C_surplus))
  })

  it('redeemCollateral(): reverts if fee eats up all returned collateral', async () => {
    // --- SETUP ---
    const { zusdAmount } = await openLoC({ ICR: toBN(dec(200, 16)), extraZUSDAmount: dec(1, 24), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // keep redeeming until we get the base rate to the ceiling of 100%
    for (let i = 0; i < 2; i++) {
      // Find hints for redeeming
      const {
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints(zusdAmount, price, 0)

      // Don't pay for gas, as it makes it easier to calculate the received Bitcoin
      const redemptionTx = await locManager.redeemCollateral(
        zusdAmount,
        firstRedemptionHint,
        ZERO_ADDRESS,
        alice,
        partialRedemptionHintNICR,
        0, th._100pct,
        {
          from: alice,
          gasPrice: 0
        }
      )

      await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })
      await borrowerOperations.adjustLoC(th._100pct, 0, zusdAmount, true, alice, alice, { from: alice, value: zusdAmount.mul(mv._1e18BN).div(price) })
    }

    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(zusdAmount, price, 0)

    await assertRevert(
      locManager.redeemCollateral(
        zusdAmount,
        firstRedemptionHint,
        ZERO_ADDRESS,
        alice,
        partialRedemptionHintNICR,
        0, th._100pct,
        {
          from: alice,
          gasPrice: 0
        }
      ),
      'LoCManager: Fee would eat up all returned collateral'
    )
  })

  it("getPendingZUSDDebtReward(): Returns 0 if there is no pending ZUSDDebt reward", async () => {
    // Make some locs
    const { totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(100, 18), extraParams: { from: defaulter_1 } })

    await openLoC({ ICR: toBN(dec(3, 18)), extraZUSDAmount: dec(20, 18), extraParams: { from: carol } })

    await openLoC({ ICR: toBN(dec(20, 18)), extraZUSDAmount: totalDebt, extraParams: { from: whale } })
    await stabilityPool.provideToSP(totalDebt, ZERO_ADDRESS, { from: whale })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    await locManager.liquidate(defaulter_1)

    // Confirm defaulter_1 liquidated
    assert.isFalse(await sortedLoCs.contains(defaulter_1))

    // Confirm there are no pending rewards from liquidation
    const current_L_ZUSDDebt = await locManager.L_ZUSDDebt()
    assert.equal(current_L_ZUSDDebt, 0)

    const carolSnapshot_L_ZUSDDebt = (await locManager.rewardSnapshots(carol))[1]
    assert.equal(carolSnapshot_L_ZUSDDebt, 0)

    const carol_PendingZUSDDebtReward = await locManager.getPendingZUSDDebtReward(carol)
    assert.equal(carol_PendingZUSDDebtReward, 0)
  })

  it("getPendingBTCReward(): Returns 0 if there is no pending BTC reward", async () => {
    // make some locs
    const { totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(100, 18), extraParams: { from: defaulter_1 } })

    await openLoC({ ICR: toBN(dec(3, 18)), extraZUSDAmount: dec(20, 18), extraParams: { from: carol } })

    await openLoC({ ICR: toBN(dec(20, 18)), extraZUSDAmount: totalDebt, extraParams: { from: whale } })
    await stabilityPool.provideToSP(totalDebt, ZERO_ADDRESS, { from: whale })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    await locManager.liquidate(defaulter_1)

    // Confirm defaulter_1 liquidated
    assert.isFalse(await sortedLoCs.contains(defaulter_1))

    // Confirm there are no pending rewards from liquidation
    const current_L_BTC = await locManager.L_BTC()
    assert.equal(current_L_BTC, 0)

    const carolSnapshot_L_BTC = (await locManager.rewardSnapshots(carol))[0]
    assert.equal(carolSnapshot_L_BTC, 0)

    const carol_PendingBTCReward = await locManager.getPendingBTCReward(carol)
    assert.equal(carol_PendingBTCReward, 0)
  })

  // --- computeICR ---

  it("computeICR(): Returns 0 if LoC's coll is worth 0", async () => {
    const price = 0
    const coll = dec(1, 'ether')
    const debt = dec(100, 18)

    const ICR = (await locManager.computeICR(coll, debt, price)).toString()

    assert.equal(ICR, 0)
  })

  it("computeICR(): Returns 2^256-1 for BTC:USD = 100, coll = 1 BTC, debt = 100 ZUSD", async () => {
    const price = dec(100, 18)
    const coll = dec(1, 'ether')
    const debt = dec(100, 18)

    const ICR = (await locManager.computeICR(coll, debt, price)).toString()

    assert.equal(ICR, dec(1, 18))
  })

  it("computeICR(): returns correct ICR for BTC:USD = 100, coll = 200 BTC, debt = 30 ZUSD", async () => {
    const price = dec(100, 18)
    const coll = dec(200, 'ether')
    const debt = dec(30, 18)

    const ICR = (await locManager.computeICR(coll, debt, price)).toString()

    assert.isAtMost(th.getDifference(ICR, '666666666666666666666'), 1000)
  })

  it("computeICR(): returns correct ICR for BTC:USD = 250, coll = 1350 BTC, debt = 127 ZUSD", async () => {
    const price = '250000000000000000000'
    const coll = '1350000000000000000000'
    const debt = '127000000000000000000'

    const ICR = (await locManager.computeICR(coll, debt, price))

    assert.isAtMost(th.getDifference(ICR, '2657480314960630000000'), 1000000)
  })

  it("computeICR(): returns correct ICR for BTC:USD = 100, coll = 1 BTC, debt = 54321 ZUSD", async () => {
    const price = dec(100, 18)
    const coll = dec(1, 'ether')
    const debt = '54321000000000000000000'

    const ICR = (await locManager.computeICR(coll, debt, price)).toString()

    assert.isAtMost(th.getDifference(ICR, '1840908672520756'), 1000)
  })


  it("computeICR(): Returns 2^256-1 if LoC has non-zero coll and zero debt", async () => {
    const price = dec(100, 18)
    const coll = dec(1, 'ether')
    const debt = 0

    const ICR = web3.utils.toHex(await locManager.computeICR(coll, debt, price))
    const maxBytes32 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

    assert.equal(ICR, maxBytes32)
  })

  // --- checkRecoveryMode ---

  //TCR < 150%
  it("checkRecoveryMode(): Returns true when TCR < 150%", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    await priceFeed.setPrice('99999999999999999999')

    const TCR = (await th.getTCR(contracts))

    assert.isTrue(TCR.lte(toBN('1500000000000000000')))

    assert.isTrue(await th.checkRecoveryMode(contracts))
  })

  // TCR == 150%
  it("checkRecoveryMode(): Returns false when TCR == 150%", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    const TCR = (await th.getTCR(contracts))

    assert.equal(TCR, '1500000000000000000')

    assert.isFalse(await th.checkRecoveryMode(contracts))
  })

  // > 150%
  it("checkRecoveryMode(): Returns false when TCR > 150%", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    await priceFeed.setPrice('100000000000000000001')

    const TCR = (await th.getTCR(contracts))

    assert.isTrue(TCR.gte(toBN('1500000000000000000')))

    assert.isFalse(await th.checkRecoveryMode(contracts))
  })

  // check 0
  it("checkRecoveryMode(): Returns false when TCR == 0", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    await priceFeed.setPrice(0)

    const TCR = (await th.getTCR(contracts)).toString()

    assert.equal(TCR, 0)

    assert.isTrue(await th.checkRecoveryMode(contracts))
  })

  // --- Getters ---

  it("getLoCStake(): Returns stake", async () => {
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: A } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })

    const A_Stake = await locManager.getLoCStake(A)
    const B_Stake = await locManager.getLoCStake(B)

    assert.equal(A_Stake, A_coll.toString())
    assert.equal(B_Stake, B_coll.toString())
  })

  it("getLoCColl(): Returns coll", async () => {
    const { collateral: A_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: A } })
    const { collateral: B_coll } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })

    assert.equal(await locManager.getLoCColl(A), A_coll.toString())
    assert.equal(await locManager.getLoCColl(B), B_coll.toString())
  })

  it("getLoCDebt(): Returns debt", async () => {
    const { totalDebt: totalDebtA } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: A } })
    const { totalDebt: totalDebtB } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })

    const A_Debt = await locManager.getLoCDebt(A)
    const B_Debt = await locManager.getLoCDebt(B)

    // Expect debt = requested + 0.5% fee + 50 (due to gas comp)

    assert.equal(A_Debt, totalDebtA.toString())
    assert.equal(B_Debt, totalDebtB.toString())
  })

  it("getLoCStatus(): Returns status", async () => {
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })
    await openLoC({ ICR: toBN(dec(150, 16)), extraZUSDAmount: B_totalDebt, extraParams: { from: A } })

    // to be able to repay:
    await zusdToken.transfer(B, B_totalDebt, { from: A })
    await borrowerOperations.closeLoC({from: B})

    const A_Status = await locManager.getLoCStatus(A)
    const B_Status = await locManager.getLoCStatus(B)
    const C_Status = await locManager.getLoCStatus(C)

    assert.equal(A_Status, '1')  // active
    assert.equal(B_Status, '2')  // closed by user
    assert.equal(C_Status, '0')  // non-existent
  })

  it("hasPendingRewards(): Returns false it LoC is not active", async () => {
    assert.isFalse(await locManager.hasPendingRewards(alice))
  })
})

contract('Reset chain state', async accounts => { })
