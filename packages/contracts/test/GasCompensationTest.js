const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');
const LoCManagerTester = artifacts.require("./LoCManagerTester.sol")
const BorrowerOperationsTester = artifacts.require("./BorrowerOperationsTester.sol")
const ZUSDToken = artifacts.require("ZUSDToken")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const mv = testHelpers.MoneyValues
const ZERO_ADDRESS = th.ZERO_ADDRESS

contract('Gas compensation tests', async accounts => {
  const [
    owner, liquidator,
    alice, bob, carol, dennis, erin, flyn, graham, harriet, ida,
    defaulter_1, defaulter_2, defaulter_3, defaulter_4, whale, sovFeeCollector] = accounts;

    const multisig = accounts[999];

  let priceFeed
  let zusdToken
  let sortedLoCs
  let activePool
  let stabilityPool
  let defaultPool
  let borrowerOperations

  let contracts
  let locManager
  let borrowerOperationsTester

  const getOpenLoCZUSDAmount = async (totalDebt) => th.getOpenLoCZUSDAmount(contracts, totalDebt)
  const openLoC = async (params) => th.openLoC(contracts, params)

  const logICRs = (ICRList) => {
    for (let i = 0; i < ICRList.length; i++) {
      console.log(`account: ${i + 1} ICR: ${ICRList[i].toString()}`)
    }
  }

  before(async () => {
    //locManager = await LoCManagerTester.new()
    borrowerOperationsTester = await BorrowerOperationsTester.new()

    //LoCManagerTester.setAsDeployed(locManager)
    BorrowerOperationsTester.setAsDeployed(borrowerOperationsTester)
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

  // --- Raw gas compensation calculations ---

  it('_getCollGasCompensation(): returns the 0.5% of collaterall if it is < $10 in value', async () => {
    /* 
    BTC:USD price = 1
    coll = 1 BTC: $1 in value
    -> Expect 0.5% of collaterall as gas compensation */
    await priceFeed.setPrice(dec(1, 18))
    // const price_1 = await priceFeed.getPrice()
    const gasCompensation_1 = (await locManager.getCollGasCompensation(dec(1, 'ether'))).toString()
    assert.equal(gasCompensation_1, dec(5, 15))

    /* 
    BTC:USD price = 28.4
    coll = 0.1 BTC: $2.84 in value
    -> Expect 0.5% of collaterall as gas compensation */
    await priceFeed.setPrice('28400000000000000000')
    // const price_2 = await priceFeed.getPrice()
    const gasCompensation_2 = (await locManager.getCollGasCompensation(dec(100, 'finney'))).toString()
    assert.equal(gasCompensation_2, dec(5, 14))

    /* 
    BTC:USD price = 1000000000 (1 billion)
    coll = 0.000000005 BTC (5e9 wei): $5 in value 
    -> Expect 0.5% of collaterall as gas compensation */
    await priceFeed.setPrice(dec(1, 27))
    // const price_3 = await priceFeed.getPrice()
    const gasCompensation_3 = (await locManager.getCollGasCompensation('5000000000')).toString()
    assert.equal(gasCompensation_3, '25000000')
  })

  it('_getCollGasCompensation(): returns 0.5% of collaterall when 0.5% of collateral < $10 in value', async () => {
    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    /* 
    BTC:USD price = 200
    coll = 9.999 BTC  
    0.5% of coll = 0.04995 BTC. USD value: $9.99
    -> Expect 0.5% of collaterall as gas compensation */
    const gasCompensation_1 = (await locManager.getCollGasCompensation('9999000000000000000')).toString()
    assert.equal(gasCompensation_1, '49995000000000000')

    /* BTC:USD price = 200
     coll = 0.055 BTC  
     0.5% of coll = 0.000275 BTC. USD value: $0.055
     -> Expect 0.5% of collaterall as gas compensation */
    const gasCompensation_2 = (await locManager.getCollGasCompensation('55000000000000000')).toString()
    assert.equal(gasCompensation_2, dec(275, 12))

    /* BTC:USD price = 200
    coll = 6.09232408808723580 BTC  
    0.5% of coll = 0.004995 BTC. USD value: $6.09
    -> Expect 0.5% of collaterall as gas compensation */
    const gasCompensation_3 = (await locManager.getCollGasCompensation('6092324088087235800')).toString()
    assert.equal(gasCompensation_3, '30461620440436179')
  })

  it('getCollGasCompensation(): returns 0.5% of collaterall when 0.5% of collateral = $10 in value', async () => {
    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    /* 
    BTC:USD price = 200
    coll = 10 BTC  
    0.5% of coll = 0.5 BTC. USD value: $10
    -> Expect 0.5% of collaterall as gas compensation */
    const gasCompensation = (await locManager.getCollGasCompensation(dec(10, 'ether'))).toString()
    assert.equal(gasCompensation, '50000000000000000')
  })

  it('getCollGasCompensation(): returns 0.5% of collaterall when 0.5% of collateral = $10 in value', async () => {
    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    /* 
    BTC:USD price = 200 $/E
    coll = 100 BTC  
    0.5% of coll = 0.5 BTC. USD value: $100
    -> Expect $100 gas compensation, i.e. 0.5 BTC */
    const gasCompensation_1 = (await locManager.getCollGasCompensation(dec(100, 'ether'))).toString()
    assert.equal(gasCompensation_1, dec(500, 'finney'))

    /* 
    BTC:USD price = 200 $/E
    coll = 10.001 BTC  
    0.5% of coll = 0.050005 BTC. USD value: $10.001
    -> Expect $100 gas compensation, i.e.  0.050005  BTC */
    const gasCompensation_2 = (await locManager.getCollGasCompensation('10001000000000000000')).toString()
    assert.equal(gasCompensation_2, '50005000000000000')

    /* 
    BTC:USD price = 200 $/E
    coll = 37.5 BTC  
    0.5% of coll = 0.1875 BTC. USD value: $37.5
    -> Expect $37.5 gas compensation i.e.  0.1875  BTC */
    const gasCompensation_3 = (await locManager.getCollGasCompensation('37500000000000000000')).toString()
    assert.equal(gasCompensation_3, '187500000000000000')

    /* 
    BTC:USD price = 45323.54542 $/E
    coll = 94758.230582309850 BTC  
    0.5% of coll = 473.7911529 BTC. USD value: $21473894.84
    -> Expect $21473894.8385808 gas compensation, i.e.  473.7911529115490  BTC */
    await priceFeed.setPrice('45323545420000000000000')
    const gasCompensation_4 = await locManager.getCollGasCompensation('94758230582309850000000')
    assert.isAtMost(th.getDifference(gasCompensation_4, '473791152911549000000'), 1000000)

    /* 
    BTC:USD price = 1000000 $/E (1 million)
    coll = 300000000 BTC   (300 million)
    0.5% of coll = 1500000 BTC. USD value: $150000000000
    -> Expect $150000000000 gas compensation, i.e. 1500000 BTC */
    await priceFeed.setPrice(dec(1, 24))
    const price_2 = await priceFeed.getPrice()
    const gasCompensation_5 = (await locManager.getCollGasCompensation('300000000000000000000000000')).toString()
    assert.equal(gasCompensation_5, '1500000000000000000000000')
  })

  // --- Composite debt calculations ---

  // gets debt + 50 when 0.5% of coll < $10
  it('_getCompositeDebt(): returns (debt + 50) when collateral < $10 in value', async () => {
    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    /* 
    BTC:USD price = 200
    coll = 9.999 BTC 
    debt = 10 ZUSD
    0.5% of coll = 0.04995 BTC. USD value: $9.99
    -> Expect composite debt = 10 + 20  = 30 ZUSD*/
    const compositeDebt_1 = await locManager.getCompositeDebt(dec(10, 18))
    assert.equal(compositeDebt_1, dec(30, 18))

    /* BTC:USD price = 200
     coll = 0.055 BTC  
     debt = 0 ZUSD
     0.5% of coll = 0.000275 BTC. USD value: $0.055
     -> Expect composite debt = 0 + 20 = 20 ZUSD*/
    const compositeDebt_2 = await locManager.getCompositeDebt(0)
    assert.equal(compositeDebt_2, dec(20, 18))

    // /* BTC:USD price = 200
    // coll = 6.09232408808723580 BTC 
    // debt = 200 ZUSD 
    // 0.5% of coll = 0.004995 BTC. USD value: $6.09
    // -> Expect  composite debt =  200 + 20 = 220  ZUSD */
    const compositeDebt_3 = await locManager.getCompositeDebt(dec(200, 18))
    assert.equal(compositeDebt_3, '220000000000000000000')
  })

  // returns $10 worth of BTC when 0.5% of coll == $10
  it('getCompositeDebt(): returns (debt + 50) collateral = $10 in value', async () => {
    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    /* 
    BTC:USD price = 200
    coll = 10 BTC  
    debt = 123.45 ZUSD
    0.5% of coll = 0.5 BTC. USD value: $10
    -> Expect composite debt = (123.45 + 20) = 143.45 ZUSD  */
    const compositeDebt = await locManager.getCompositeDebt('123450000000000000000')
    assert.equal(compositeDebt, '143450000000000000000')
  })

  /// *** 

  // gets debt + 50 when 0.5% of coll > 10
  it('getCompositeDebt(): returns (debt + 50) when 0.5% of collateral > $10 in value', async () => {
    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    /* 
    BTC:USD price = 200 $/E
    coll = 100 BTC  
    debt = 2000 ZUSD
    -> Expect composite debt = (2000 + 20) = 2020 ZUSD  */
    const compositeDebt_1 = (await locManager.getCompositeDebt(dec(2000, 18))).toString()
    assert.equal(compositeDebt_1, '2020000000000000000000')

    /* 
    BTC:USD price = 200 $/E
    coll = 10.001 BTC  
    debt = 200 ZUSD
    -> Expect composite debt = (200 + 20) = 220 ZUSD  */
    const compositeDebt_2 = (await locManager.getCompositeDebt(dec(200, 18))).toString()
    assert.equal(compositeDebt_2, '220000000000000000000')

    /* 
    BTC:USD price = 200 $/E
    coll = 37.5 BTC  
    debt = 500 ZUSD
    -> Expect composite debt = (500 + 20) = 520 ZUSD  */
    const compositeDebt_3 = (await locManager.getCompositeDebt(dec(500, 18))).toString()
    assert.equal(compositeDebt_3, '520000000000000000000')

    /* 
    BTC:USD price = 45323.54542 $/E
    coll = 94758.230582309850 BTC  
    debt = 1 billion ZUSD
    -> Expect composite debt = (1000000000 + 20) = 1000000020 ZUSD  */
    await priceFeed.setPrice('45323545420000000000000')
    const price_2 = await priceFeed.getPrice()
    const compositeDebt_4 = (await locManager.getCompositeDebt(dec(1, 27))).toString()
    assert.isAtMost(th.getDifference(compositeDebt_4, '1000000020000000000000000000'), 100000000000)

    /* 
    BTC:USD price = 1000000 $/E (1 million)
    coll = 300000000 BTC   (300 million)
    debt = 54321.123456789 ZUSD
   -> Expect composite debt = (54321.123456789 + 20) = 54341.123456789 ZUSD */
    await priceFeed.setPrice(dec(1, 24))
    const price_3 = await priceFeed.getPrice()
    const compositeDebt_5 = (await locManager.getCompositeDebt('54321123456789000000000')).toString()
    assert.equal(compositeDebt_5, '54341123456789000000000')
  })

  // --- Test ICRs with virtual debt ---
  it('getCurrentICR(): Incorporates virtual debt, and returns the correct ICR for new locs', async () => {
    const price = await priceFeed.getPrice()
    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: whale } })

    // A opens with 1 BTC, 110 ZUSD
    await openLoC({ ICR: toBN('1818181818181818181'), extraParams: { from: alice } })
    const alice_ICR = (await locManager.getCurrentICR(alice, price)).toString()
    // Expect aliceICR = (1 * 200) / (110) = 181.81%
    assert.isAtMost(th.getDifference(alice_ICR, '1818181818181818181'), 1000)

    // B opens with 0.5 BTC, 50 ZUSD
    await openLoC({ ICR: toBN(dec(2, 18)), extraParams: { from: bob } })
    const bob_ICR = (await locManager.getCurrentICR(bob, price)).toString()
    // Expect Bob's ICR = (0.5 * 200) / 50 = 200%
    assert.isAtMost(th.getDifference(bob_ICR, dec(2, 18)), 1000)

    // F opens with 1 BTC, 100 ZUSD
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(100, 18), extraParams: { from: flyn } })
    const flyn_ICR = (await locManager.getCurrentICR(flyn, price)).toString()
    // Expect Flyn's ICR = (1 * 200) / 100 = 200%
    assert.isAtMost(th.getDifference(flyn_ICR, dec(2, 18)), 1000)

    // C opens with 2.5 BTC, 160 ZUSD
    await openLoC({ ICR: toBN(dec(3125, 15)), extraParams: { from: carol } })
    const carol_ICR = (await locManager.getCurrentICR(carol, price)).toString()
    // Expect Carol's ICR = (2.5 * 200) / (160) = 312.50%
    assert.isAtMost(th.getDifference(carol_ICR, '3125000000000000000'), 1000)

    // D opens with 1 BTC, 0 ZUSD
    await openLoC({ ICR: toBN(dec(4, 18)), extraParams: { from: dennis } })
    const dennis_ICR = (await locManager.getCurrentICR(dennis, price)).toString()
    // Expect Dennis's ICR = (1 * 200) / (50) = 400.00%
    assert.isAtMost(th.getDifference(dennis_ICR, dec(4, 18)), 1000)

    // E opens with 4405.45 BTC, 32598.35 ZUSD
    await openLoC({ ICR: toBN('27028668628933700000'), extraParams: { from: erin } })
    const erin_ICR = (await locManager.getCurrentICR(erin, price)).toString()
    // Expect Erin's ICR = (4405.45 * 200) / (32598.35) = 2702.87%
    assert.isAtMost(th.getDifference(erin_ICR, '27028668628933700000'), 100000)

    // H opens with 1 BTC, 180 ZUSD
    await openLoC({ ICR: toBN('1111111111111111111'), extraParams: { from: harriet } })
    const harriet_ICR = (await locManager.getCurrentICR(harriet, price)).toString()
    // Expect Harriet's ICR = (1 * 200) / (180) = 111.11%
    assert.isAtMost(th.getDifference(harriet_ICR, '1111111111111111111'), 1000)
  })

  // Test compensation amounts and liquidation amounts

  it('Gas compensation from pool-offset liquidations. All collateral paid as compensation', async () => {
    await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: whale } })

    // A-E open locs
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(100, 18), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(200, 18), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(300, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: A_totalDebt, extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: B_totalDebt.add(C_totalDebt), extraParams: { from: erin } })

    // D, E each provide ZUSD to SP
    await stabilityPool.provideToSP(A_totalDebt, ZERO_ADDRESS, { from: dennis })
    await stabilityPool.provideToSP(B_totalDebt.add(C_totalDebt), ZERO_ADDRESS, { from: erin })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()

    // --- Price drops to 9.99 ---
    await priceFeed.setPrice('9990000000000000000')
    const price_1 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 9.99
    -> Expect 0.5% of collaterall to be sent to liquidator, as gas compensation */

    // Check collateral value in USD is < $10
    const aliceColl = (await locManager.LoCs(alice))[1]

    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate A (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidatorBalance_before_A = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidate(alice, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after_A = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check liquidator's balance increases by 0.5% of A's coll (1 BTC)
    const compensationReceived_A = (liquidatorBalance_after_A.sub(liquidatorBalance_before_A)).toString()
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))
    assert.equal(compensationReceived_A, _0pt5percent_aliceColl)

    // Check SP ZUSD has decreased due to the liquidation 
    const ZUSDinSP_A = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_A.lte(ZUSDinSP_0))

    // Check BTC in SP has received the liquidation
    const BTCinSP_A = await stabilityPool.getBTC()
    assert.equal(BTCinSP_A.toString(), aliceColl.sub(_0pt5percent_aliceColl)) // 1 BTC - 0.5%

    // --- Price drops to 3 ---
    await priceFeed.setPrice(dec(3, 18))
    const price_2 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 3
    -> Expect 0.5% of collaterall to be sent to liquidator, as gas compensation */

    // Check collateral value in USD is < $10
    const bobColl = (await locManager.LoCs(bob))[1]

    assert.isFalse(await th.checkRecoveryMode(contracts))
    // Liquidate B (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidatorBalance_before_B = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidate(bob, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after_B = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check liquidator's balance increases by B's 0.5% of coll, 2 BTC
    const compensationReceived_B = (liquidatorBalance_after_B.sub(liquidatorBalance_before_B)).toString()
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))
    assert.equal(compensationReceived_B, _0pt5percent_bobColl) // 0.5% of 2 BTC

    // Check SP ZUSD has decreased due to the liquidation of B
    const ZUSDinSP_B = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_B.lt(ZUSDinSP_A))

    // Check BTC in SP has received the liquidation
    const BTCinSP_B = await stabilityPool.getBTC()
    assert.equal(BTCinSP_B.toString(), aliceColl.sub(_0pt5percent_aliceColl).add(bobColl).sub(_0pt5percent_bobColl)) // (1 + 2 BTC) * 0.995


    // --- Price drops to 3 ---
    await priceFeed.setPrice('3141592653589793238')
    const price_3 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 3.141592653589793238
    Carol coll = 3 BTC. Value = (3 * 3.141592653589793238) = $6
    -> Expect 0.5% of collaterall to be sent to liquidator, as gas compensation */

    // Check collateral value in USD is < $10
    const carolColl = (await locManager.LoCs(carol))[1]

    assert.isFalse(await th.checkRecoveryMode(contracts))
    // Liquidate B (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidatorBalance_before_C = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidate(carol, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after_C = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check liquidator's balance increases by C's 0.5% of coll, 3 BTC
    const compensationReceived_C = (liquidatorBalance_after_C.sub(liquidatorBalance_before_C)).toString()
    const _0pt5percent_carolColl = carolColl.div(web3.utils.toBN('200'))
    assert.equal(compensationReceived_C, _0pt5percent_carolColl)

    // Check SP ZUSD has decreased due to the liquidation of C
    const ZUSDinSP_C = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_C.lt(ZUSDinSP_B))

    // Check BTC in SP has not changed due to the lquidation of C
    const BTCinSP_C = await stabilityPool.getBTC()
    assert.equal(BTCinSP_C.toString(), aliceColl.sub(_0pt5percent_aliceColl).add(bobColl).sub(_0pt5percent_bobColl).add(carolColl).sub(_0pt5percent_carolColl)) // (1+2+3 BTC) * 0.995
  })

  it('gas compensation from pool-offset liquidations: 0.5% collateral < $10 in value. Compensates $10 worth of collateral, liquidates the remainder', async () => {
    await priceFeed.setPrice(dec(400, 18))
    await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: whale } })

    // A-E open locs
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(200, 18), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(120, 16)), extraZUSDAmount: dec(5000, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(60, 18)), extraZUSDAmount: dec(600, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(80, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(80, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: erin } })

    // D, E each provide 10000 ZUSD to SP
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: dennis })
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: erin })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()
    const BTCinSP_0 = await stabilityPool.getBTC()

    // --- Price drops to 199.999 ---
    await priceFeed.setPrice('199999000000000000000')
    const price_1 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 199.999
    Alice coll = 1 BTC. Value: $199.999
    0.5% of coll  = 0.05 BTC. Value: (0.05 * 199.999) = $9.99995
    Minimum comp = $10 = 0.05000025000125001 BTC.
    -> Expect 0.05000025000125001 BTC sent to liquidator, 
    and (1 - 0.05000025000125001) = 0.94999974999875 BTC remainder liquidated */

    // Check collateral value in USD is > $10
    const aliceColl = (await locManager.LoCs(alice))[1]

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const aliceICR = await locManager.getCurrentICR(alice, price_1)
    assert.isTrue(aliceICR.lt(mv._MCR))

    // Liquidate A (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidatorBalance_before_A = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidate(alice, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after_A = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check liquidator's balance increases by 0.5% of coll
    const compensationReceived_A = (liquidatorBalance_after_A.sub(liquidatorBalance_before_A)).toString()
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))
    assert.equal(compensationReceived_A, _0pt5percent_aliceColl)

    // Check SP ZUSD has decreased due to the liquidation of A
    const ZUSDinSP_A = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_A.lt(ZUSDinSP_0))

    // Check BTC in SP has increased by the remainder of B's coll
    const collRemainder_A = aliceColl.sub(_0pt5percent_aliceColl)
    const BTCinSP_A = await stabilityPool.getBTC()

    const SPBTCIncrease_A = BTCinSP_A.sub(BTCinSP_0)

    assert.isAtMost(th.getDifference(SPBTCIncrease_A, collRemainder_A), 1000)

    // --- Price drops to 15 ---
    await priceFeed.setPrice(dec(15, 18))
    const price_2 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 15
    Bob coll = 15 BTC. Value: $165
    0.5% of coll  = 0.75 BTC. Value: (0.75 * 11) = $8.25
    Minimum comp = $10 =  0.66666...BTC.
    -> Expect 0.666666666666666666 BTC sent to liquidator, 
    and (15 - 0.666666666666666666) BTC remainder liquidated */

    // Check collateral value in USD is > $10
    const bobColl = (await locManager.LoCs(bob))[1]

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const bobICR = await locManager.getCurrentICR(bob, price_2)
    assert.isTrue(bobICR.lte(mv._MCR))

    // Liquidate B (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidatorBalance_before_B = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidate(bob, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after_B = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check liquidator's balance increases by $10 worth of coll
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))
    const compensationReceived_B = (liquidatorBalance_after_B.sub(liquidatorBalance_before_B)).toString()
    assert.equal(compensationReceived_B, _0pt5percent_bobColl)

    // Check SP ZUSD has decreased due to the liquidation of B
    const ZUSDinSP_B = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_B.lt(ZUSDinSP_A))

    // Check BTC in SP has increased by the remainder of B's coll
    const collRemainder_B = bobColl.sub(_0pt5percent_bobColl)
    const BTCinSP_B = await stabilityPool.getBTC()

    const SPBTCIncrease_B = BTCinSP_B.sub(BTCinSP_A)

    assert.isAtMost(th.getDifference(SPBTCIncrease_B, collRemainder_B), 1000)
  })

  it('gas compensation from pool-offset liquidations: 0.5% collateral > $10 in value. Compensates 0.5% of  collateral, liquidates the remainder', async () => {
    // open locs
    await priceFeed.setPrice(dec(400, 18))
    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: whale } })

    // A-E open locs
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(2000, 18), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(1875, 15)), extraZUSDAmount: dec(8000, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(600, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(4, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(4, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: erin } })

    // D, E each provide 10000 ZUSD to SP
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: dennis })
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: erin })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()
    const BTCinSP_0 = await stabilityPool.getBTC()

    await priceFeed.setPrice(dec(200, 18))
    const price_1 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 200
    Alice coll = 10.001 BTC. Value: $2000.2
    0.5% of coll  = 0.050005 BTC. Value: (0.050005 * 200) = $10.01
    Minimum comp = $10 = 0.05 BTC.
    -> Expect  0.050005 BTC sent to liquidator, 
    and (10.001 - 0.050005) BTC remainder liquidated */

    // Check value of 0.5% of collateral in USD is > $10
    const aliceColl = (await locManager.LoCs(alice))[1]
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const aliceICR = await locManager.getCurrentICR(alice, price_1)
    assert.isTrue(aliceICR.lt(mv._MCR))

    // Liquidate A (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidatorBalance_before_A = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidate(alice, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after_A = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check liquidator's balance increases by 0.5% of coll
    const compensationReceived_A = (liquidatorBalance_after_A.sub(liquidatorBalance_before_A)).toString()
    assert.equal(compensationReceived_A, _0pt5percent_aliceColl)

    // Check SP ZUSD has decreased due to the liquidation of A 
    const ZUSDinSP_A = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_A.lt(ZUSDinSP_0))

    // Check BTC in SP has increased by the remainder of A's coll
    const collRemainder_A = aliceColl.sub(_0pt5percent_aliceColl)
    const BTCinSP_A = await stabilityPool.getBTC()

    const SPBTCIncrease_A = BTCinSP_A.sub(BTCinSP_0)

    assert.isAtMost(th.getDifference(SPBTCIncrease_A, collRemainder_A), 1000)


    /* 
   BTC:USD price = 200
   Bob coll = 37.5 BTC. Value: $7500
   0.5% of coll  = 0.1875 BTC. Value: (0.1875 * 200) = $37.5
   Minimum comp = $10 = 0.05 BTC.
   -> Expect 0.1875 BTC sent to liquidator, 
   and (37.5 - 0.1875 BTC) BTC remainder liquidated */

    // Check value of 0.5% of collateral in USD is > $10
    const bobColl = (await locManager.LoCs(bob))[1]
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const bobICR = await locManager.getCurrentICR(bob, price_1)
    assert.isTrue(bobICR.lt(mv._MCR))

    // Liquidate B (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidatorBalance_before_B = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidate(bob, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after_B = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check liquidator's balance increases by 0.5% of coll
    const compensationReceived_B = (liquidatorBalance_after_B.sub(liquidatorBalance_before_B)).toString()
    assert.equal(compensationReceived_B, _0pt5percent_bobColl)

    // Check SP ZUSD has decreased due to the liquidation of B
    const ZUSDinSP_B = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_B.lt(ZUSDinSP_A))

    // Check BTC in SP has increased by the remainder of B's coll
    const collRemainder_B = bobColl.sub(_0pt5percent_bobColl)
    const BTCinSP_B = await stabilityPool.getBTC()

    const SPBTCIncrease_B = BTCinSP_B.sub(BTCinSP_A)

    assert.isAtMost(th.getDifference(SPBTCIncrease_B, collRemainder_B), 1000)

  })

  // --- Event emission in single liquidation ---

  it('Gas compensation from pool-offset liquidations. Liquidation event emits the correct gas compensation and total liquidated coll and debt', async () => {
    await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: whale } })

    // A-E open locs
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(100, 18), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(200, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(300, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: A_totalDebt, extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: B_totalDebt, extraParams: { from: erin } })

    // D, E each provide ZUSD to SP
    await stabilityPool.provideToSP(A_totalDebt, ZERO_ADDRESS, { from: dennis })
    await stabilityPool.provideToSP(B_totalDebt, ZERO_ADDRESS, { from: erin })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()

    th.logBN('TCR', await locManager.getTCR(await priceFeed.getPrice()))
    // --- Price drops to 9.99 ---
    await priceFeed.setPrice('9990000000000000000')
    const price_1 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 9.99
    -> Expect 0.5% of collaterall to be sent to liquidator, as gas compensation */

    // Check collateral value in USD is < $10
    const aliceColl = (await locManager.LoCs(alice))[1]
    const aliceDebt = (await locManager.LoCs(alice))[0]

    th.logBN('TCR', await locManager.getTCR(await priceFeed.getPrice()))
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate A (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidationTxA = await locManager.liquidate(alice, { from: liquidator, gasPrice: 0 })

    const expectedGasComp_A = aliceColl.mul(th.toBN(5)).div(th.toBN(1000))
    const expectedLiquidatedColl_A = aliceColl.sub(expectedGasComp_A)
    const expectedLiquidatedDebt_A =  aliceDebt

    const [loggedDebt_A, loggedColl_A, loggedGasComp_A, ] = th.getEmittedLiquidationValues(liquidationTxA)

    assert.isAtMost(th.getDifference(expectedLiquidatedDebt_A, loggedDebt_A), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl_A, loggedColl_A), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp_A, loggedGasComp_A), 1000)

    // --- Price drops to 3 ---
    await priceFeed.setPrice(dec(3, 18))
    const price_2 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 3
    -> Expect 0.5% of collaterall to be sent to liquidator, as gas compensation */

    // Check collateral value in USD is < $10
    const bobColl = (await locManager.LoCs(bob))[1]
    const bobDebt = (await locManager.LoCs(bob))[0]

    assert.isFalse(await th.checkRecoveryMode(contracts))
    // Liquidate B (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidationTxB = await locManager.liquidate(bob, { from: liquidator, gasPrice: 0 })

    const expectedGasComp_B = bobColl.mul(th.toBN(5)).div(th.toBN(1000))
    const expectedLiquidatedColl_B = bobColl.sub(expectedGasComp_B)
    const expectedLiquidatedDebt_B =  bobDebt

    const [loggedDebt_B, loggedColl_B, loggedGasComp_B, ] = th.getEmittedLiquidationValues(liquidationTxB)

    assert.isAtMost(th.getDifference(expectedLiquidatedDebt_B, loggedDebt_B), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl_B, loggedColl_B), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp_B, loggedGasComp_B), 1000)
  })


  it('gas compensation from pool-offset liquidations. Liquidation event emits the correct gas compensation and total liquidated coll and debt', async () => {
    await priceFeed.setPrice(dec(400, 18))
    await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: whale } })

    // A-E open locs
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(200, 18), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(120, 16)), extraZUSDAmount: dec(5000, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(60, 18)), extraZUSDAmount: dec(600, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(80, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(80, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: erin } })

    // D, E each provide 10000 ZUSD to SP
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: dennis })
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: erin })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()
    const BTCinSP_0 = await stabilityPool.getBTC()

    // --- Price drops to 199.999 ---
    await priceFeed.setPrice('199999000000000000000')
    const price_1 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 199.999
    Alice coll = 1 BTC. Value: $199.999
    0.5% of coll  = 0.05 BTC. Value: (0.05 * 199.999) = $9.99995
    Minimum comp = $10 = 0.05000025000125001 BTC.
    -> Expect 0.05000025000125001 BTC sent to liquidator, 
    and (1 - 0.05000025000125001) = 0.94999974999875 BTC remainder liquidated */

    // Check collateral value in USD is > $10
    const aliceColl = (await locManager.LoCs(alice))[1]
    const aliceDebt = (await locManager.LoCs(alice))[0]
    const aliceCollValueInUSD = (await borrowerOperationsTester.getUSDValue(aliceColl, price_1))
    assert.isTrue(aliceCollValueInUSD.gt(th.toBN(dec(10, 18))))

    // Check value of 0.5% of collateral in USD is < $10
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const aliceICR = await locManager.getCurrentICR(alice, price_1)
    assert.isTrue(aliceICR.lt(mv._MCR))

    // Liquidate A (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidationTxA = await locManager.liquidate(alice, { from: liquidator, gasPrice: 0 })

    const expectedGasComp_A = _0pt5percent_aliceColl
    const expectedLiquidatedColl_A = aliceColl.sub(expectedGasComp_A)
    const expectedLiquidatedDebt_A =  aliceDebt

    const [loggedDebt_A, loggedColl_A, loggedGasComp_A, ] = th.getEmittedLiquidationValues(liquidationTxA)

    assert.isAtMost(th.getDifference(expectedLiquidatedDebt_A, loggedDebt_A), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl_A, loggedColl_A), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp_A, loggedGasComp_A), 1000)

      // --- Price drops to 15 ---
      await priceFeed.setPrice(dec(15, 18))
      const price_2 = await priceFeed.getPrice()

    /* 
    BTC:USD price = 15
    Bob coll = 15 BTC. Value: $165
    0.5% of coll  = 0.75 BTC. Value: (0.75 * 11) = $8.25
    Minimum comp = $10 =  0.66666...BTC.
    -> Expect 0.666666666666666666 BTC sent to liquidator, 
    and (15 - 0.666666666666666666) BTC remainder liquidated */

    // Check collateral value in USD is > $10
    const bobColl = (await locManager.LoCs(bob))[1]
    const bobDebt = (await locManager.LoCs(bob))[0]


    assert.isFalse(await th.checkRecoveryMode(contracts))

    const bobICR = await locManager.getCurrentICR(bob, price_2)
    assert.isTrue(bobICR.lte(mv._MCR))

    // Liquidate B (use 0 gas price to easily check the amount the compensation amount the liquidator receives
    const liquidationTxB = await locManager.liquidate(bob, { from: liquidator, gasPrice: 0 })

    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))
    const expectedGasComp_B = _0pt5percent_bobColl
    const expectedLiquidatedColl_B = bobColl.sub(expectedGasComp_B)
    const expectedLiquidatedDebt_B =  bobDebt

    const [loggedDebt_B, loggedColl_B, loggedGasComp_B, ] = th.getEmittedLiquidationValues(liquidationTxB)

    assert.isAtMost(th.getDifference(expectedLiquidatedDebt_B, loggedDebt_B), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl_B, loggedColl_B), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp_B, loggedGasComp_B), 1000)
  })


  it('gas compensation from pool-offset liquidations: 0.5% collateral > $10 in value. Liquidation event emits the correct gas compensation and total liquidated coll and debt', async () => {
    // open locs
    await priceFeed.setPrice(dec(400, 18))
    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: whale } })

    // A-E open locs
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(2000, 18), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(1875, 15)), extraZUSDAmount: dec(8000, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(2, 18)), extraZUSDAmount: dec(600, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(4, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(4, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: erin } })

    // D, E each provide 10000 ZUSD to SP
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: dennis })
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: erin })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()
    const BTCinSP_0 = await stabilityPool.getBTC()

    await priceFeed.setPrice(dec(200, 18))
    const price_1 = await priceFeed.getPrice()

    // Check value of 0.5% of collateral in USD is > $10
    const aliceColl = (await locManager.LoCs(alice))[1]
    const aliceDebt = (await locManager.LoCs(alice))[0]
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const aliceICR = await locManager.getCurrentICR(alice, price_1)
    assert.isTrue(aliceICR.lt(mv._MCR))

    // Liquidate A (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidationTxA = await locManager.liquidate(alice, { from: liquidator, gasPrice: 0 })
    
    const expectedGasComp_A = _0pt5percent_aliceColl
    const expectedLiquidatedColl_A = aliceColl.sub(_0pt5percent_aliceColl)
    const expectedLiquidatedDebt_A =  aliceDebt

    const [loggedDebt_A, loggedColl_A, loggedGasComp_A, ] = th.getEmittedLiquidationValues(liquidationTxA)

    assert.isAtMost(th.getDifference(expectedLiquidatedDebt_A, loggedDebt_A), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl_A, loggedColl_A), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp_A, loggedGasComp_A), 1000)


    /* 
   BTC:USD price = 200
   Bob coll = 37.5 BTC. Value: $7500
   0.5% of coll  = 0.1875 BTC. Value: (0.1875 * 200) = $37.5
   Minimum comp = $10 = 0.05 BTC.
   -> Expect 0.1875 BTC sent to liquidator, 
   and (37.5 - 0.1875 BTC) BTC remainder liquidated */

    // Check value of 0.5% of collateral in USD is > $10
    const bobColl = (await locManager.LoCs(bob))[1]
    const bobDebt = (await locManager.LoCs(bob))[0]
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const bobICR = await locManager.getCurrentICR(bob, price_1)
    assert.isTrue(bobICR.lt(mv._MCR))

    // Liquidate B (use 0 gas price to easily check the amount the compensation amount the liquidator receives)
    const liquidationTxB = await locManager.liquidate(bob, { from: liquidator, gasPrice: 0 })
    
    const expectedGasComp_B = _0pt5percent_bobColl
    const expectedLiquidatedColl_B = bobColl.sub(_0pt5percent_bobColl)
    const expectedLiquidatedDebt_B =  bobDebt

    const [loggedDebt_B, loggedColl_B, loggedGasComp_B, ] = th.getEmittedLiquidationValues(liquidationTxB)

    assert.isAtMost(th.getDifference(expectedLiquidatedDebt_B, loggedDebt_B), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl_B, loggedColl_B), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp_B, loggedGasComp_B), 1000)
  })


  // liquidateLoCs - full offset
  it('liquidateLoCs(): full offset.  Compensates the correct amount, and liquidates the remainder', async () => {
    await priceFeed.setPrice(dec(1000, 18))

    await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: whale } })

    // A-F open locs
    await openLoC({ ICR: toBN(dec(118, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(526, 16)), extraZUSDAmount: dec(8000, 18), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(488, 16)), extraZUSDAmount: dec(600, 18), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(545, 16)), extraZUSDAmount: dec(1, 23), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(10, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(10, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: flyn } })

    // D, E each provide 10000 ZUSD to SP
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: erin })
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: flyn })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()

    // price drops to 200 
    await priceFeed.setPrice(dec(200, 18))
    const price = await priceFeed.getPrice()

    // Check not in Recovery Mode 
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D have ICR < MCR
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).lt(mv._MCR))

    // Check E, F have ICR > MCR
    assert.isTrue((await locManager.getCurrentICR(erin, price)).gt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(flyn, price)).gt(mv._MCR))


    // --- Check value of of A's collateral is < $10, and value of B,C,D collateral are > $10  ---
    const aliceColl = (await locManager.LoCs(alice))[1]
    const bobColl = (await locManager.LoCs(bob))[1]
    const carolColl = (await locManager.LoCs(carol))[1]
    const dennisColl = (await locManager.LoCs(dennis))[1]

    // --- Check value of 0.5% of A, B, and C's collateral is <$10, and value of 0.5% of D's collateral is > $10 ---
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))
    const _0pt5percent_carolColl = carolColl.div(web3.utils.toBN('200'))
    const _0pt5percent_dennisColl = dennisColl.div(web3.utils.toBN('200'))

    const collGasCompensation = await locManager.getCollGasCompensation(price)
    assert.equal(collGasCompensation, dec(1, 18))

    /* Expect total gas compensation = 
    0.5% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedGasComp = _0pt5percent_aliceColl
      .add(_0pt5percent_bobColl)
      .add(_0pt5percent_carolColl)
      .add(_0pt5percent_dennisColl)

    /* Expect liquidated coll = 
    0.95% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedLiquidatedColl = aliceColl.sub(_0pt5percent_aliceColl)
      .add(bobColl.sub(_0pt5percent_bobColl))
      .add(carolColl.sub(_0pt5percent_carolColl))
      .add(dennisColl.sub(_0pt5percent_dennisColl))

    // Liquidate locs A-D

    const liquidatorBalance_before = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidateLoCs(4, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check ZUSD in SP has decreased
    const ZUSDinSP_1 = await stabilityPool.getTotalZUSDDeposits()
    assert.isTrue(ZUSDinSP_1.lt(ZUSDinSP_0))

    // Check liquidator's balance has increased by the expected compensation amount
    const compensationReceived = (liquidatorBalance_after.sub(liquidatorBalance_before)).toString()
    assert.equal(expectedGasComp, compensationReceived)

    // Check BTC in stability pool now equals the expected liquidated collateral
    const BTCinSP = (await stabilityPool.getBTC()).toString()
    assert.equal(expectedLiquidatedColl, BTCinSP)
  })

  // liquidateLoCs - full redistribution
  it('liquidateLoCs(): full redistribution. Compensates the correct amount, and liquidates the remainder', async () => {
    await priceFeed.setPrice(dec(1000, 18))

    await openLoC({ ICR: toBN(dec(200, 18)), extraParams: { from: whale } })

    // A-D open locs
    await openLoC({ ICR: toBN(dec(118, 16)), extraZUSDAmount: dec(2000, 16), extraParams: { from: alice } })
    await openLoC({ ICR: toBN(dec(526, 16)), extraZUSDAmount: dec(8000, 16), extraParams: { from: bob } })
    await openLoC({ ICR: toBN(dec(488, 16)), extraZUSDAmount: dec(600, 16), extraParams: { from: carol } })
    await openLoC({ ICR: toBN(dec(545, 16)), extraZUSDAmount: dec(1, 21), extraParams: { from: dennis } })

    const ZUSDinDefaultPool_0 = await defaultPool.getZUSDDebt()

    // price drops to 200 
    await priceFeed.setPrice(dec(200, 18))
    const price = await priceFeed.getPrice()

    // Check not in Recovery Mode 
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D have ICR < MCR
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).lt(mv._MCR))

    // --- Check value of of A's collateral is < $10, and value of B,C,D collateral are > $10  ---
    const aliceColl = (await locManager.LoCs(alice))[1]
    const bobColl = (await locManager.LoCs(bob))[1]
    const carolColl = (await locManager.LoCs(carol))[1]
    const dennisColl = (await locManager.LoCs(dennis))[1]

    // --- Check value of 0.5% of A, B, and C's collateral is <$10, and value of 0.5% of D's collateral is > $10 ---
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))
    const _0pt5percent_carolColl = carolColl.div(web3.utils.toBN('200'))
    const _0pt5percent_dennisColl = dennisColl.div(web3.utils.toBN('200'))

    const collGasCompensation = await locManager.getCollGasCompensation(price)
    assert.equal(collGasCompensation, dec(1 , 18))

    /* Expect total gas compensation = 
       0.5% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedGasComp = _0pt5percent_aliceColl
          .add(_0pt5percent_bobColl)
          .add(_0pt5percent_carolColl)
          .add(_0pt5percent_dennisColl)

    /* Expect liquidated coll = 
    0.95% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedLiquidatedColl = aliceColl.sub(_0pt5percent_aliceColl)
      .add(bobColl.sub(_0pt5percent_bobColl))
      .add(carolColl.sub(_0pt5percent_carolColl))
      .add(dennisColl.sub(_0pt5percent_dennisColl))

    // Liquidate locs A-D
    const liquidatorBalance_before = web3.utils.toBN(await web3.eth.getBalance(liquidator))
    await locManager.liquidateLoCs(4, { from: liquidator, gasPrice: 0 })
    const liquidatorBalance_after = web3.utils.toBN(await web3.eth.getBalance(liquidator))

    // Check ZUSD in DefaultPool has decreased
    const ZUSDinDefaultPool_1 = await defaultPool.getZUSDDebt()
    assert.isTrue(ZUSDinDefaultPool_1.gt(ZUSDinDefaultPool_0))

    // Check liquidator's balance has increased by the expected compensation amount
    const compensationReceived = (liquidatorBalance_after.sub(liquidatorBalance_before)).toString()

    assert.isAtMost(th.getDifference(expectedGasComp, compensationReceived), 1000)

    // Check BTC in defaultPool now equals the expected liquidated collateral
    const BTCinDefaultPool = (await defaultPool.getBTC()).toString()
    assert.isAtMost(th.getDifference(expectedLiquidatedColl, BTCinDefaultPool), 1000)
  })

  //  --- event emission in liquidation sequence ---
  it('liquidateLoCs(): full offset. Liquidation event emits the correct gas compensation and total liquidated coll and debt', async () => {
    await priceFeed.setPrice(dec(1000, 18))

    await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: whale } })

    // A-F open locs
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(118, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(526, 16)), extraZUSDAmount: dec(8000, 18), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(488, 16)), extraZUSDAmount: dec(600, 18), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(545, 16)), extraZUSDAmount: dec(1, 23), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(10, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(10, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: flyn } })

    // D, E each provide 10000 ZUSD to SP
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: erin })
    await stabilityPool.provideToSP(dec(1, 23), ZERO_ADDRESS, { from: flyn })

    const ZUSDinSP_0 = await stabilityPool.getTotalZUSDDeposits()

    // price drops to 200 
    await priceFeed.setPrice(dec(200, 18))
    const price = await priceFeed.getPrice()

    // Check not in Recovery Mode 
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D have ICR < MCR
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).lt(mv._MCR))

    // Check E, F have ICR > MCR
    assert.isTrue((await locManager.getCurrentICR(erin, price)).gt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(flyn, price)).gt(mv._MCR))


    // --- Check value of of A's collateral is < $10, and value of B,C,D collateral are > $10  ---
    const aliceColl = (await locManager.LoCs(alice))[1]
    const bobColl = (await locManager.LoCs(bob))[1]
    const carolColl = (await locManager.LoCs(carol))[1]
    const dennisColl = (await locManager.LoCs(dennis))[1]

    // --- Check value of 0.5% of A, B, and C's collateral is <$10, and value of 0.5% of D's collateral is > $10 ---
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))
    const _0pt5percent_carolColl = carolColl.div(web3.utils.toBN('200'))
    const _0pt5percent_dennisColl = dennisColl.div(web3.utils.toBN('200'))

    const collGasCompensation = await locManager.getCollGasCompensation(price)
    assert.equal(collGasCompensation, dec(1, 18))

    /* Expect total gas compensation = 
    0.5% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedGasComp = _0pt5percent_aliceColl
      .add(_0pt5percent_bobColl)
      .add(_0pt5percent_carolColl)
      .add(_0pt5percent_dennisColl)

    /* Expect liquidated coll = 
       0.95% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedLiquidatedColl = aliceColl.sub(_0pt5percent_aliceColl)
          .add(bobColl.sub(_0pt5percent_bobColl))
          .add(carolColl.sub(_0pt5percent_carolColl))
          .add(dennisColl.sub(_0pt5percent_dennisColl))

    // Expect liquidatedDebt = 51 + 190 + 1025 + 13510 = 14646 ZUSD
    const expectedLiquidatedDebt = A_totalDebt.add(B_totalDebt).add(C_totalDebt).add(D_totalDebt)

    // Liquidate locs A-D
    const liquidationTxData = await locManager.liquidateLoCs(4, { from: liquidator, gasPrice: 0 })

    // Get data from the liquidation event logs
    const [loggedDebt, loggedColl, loggedGasComp, ] = th.getEmittedLiquidationValues(liquidationTxData)
    
    assert.isAtMost(th.getDifference(expectedLiquidatedDebt, loggedDebt), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl, loggedColl), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp, loggedGasComp), 1000)
  })

  it('liquidateLoCs(): full redistribution. Liquidation event emits the correct gas compensation and total liquidated coll and debt', async () => {
    await priceFeed.setPrice(dec(1000, 18))

    await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: whale } })

    // A-F open locs
    const { totalDebt: A_totalDebt } = await openLoC({ ICR: toBN(dec(118, 16)), extraZUSDAmount: dec(2000, 18), extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openLoC({ ICR: toBN(dec(526, 16)), extraZUSDAmount: dec(8000, 18), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openLoC({ ICR: toBN(dec(488, 16)), extraZUSDAmount: dec(600, 18), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openLoC({ ICR: toBN(dec(545, 16)), extraZUSDAmount: dec(1, 23), extraParams: { from: dennis } })
    await openLoC({ ICR: toBN(dec(10, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: erin } })
    await openLoC({ ICR: toBN(dec(10, 18)), extraZUSDAmount: dec(1, 23), extraParams: { from: flyn } })

    const ZUSDinDefaultPool_0 = await defaultPool.getZUSDDebt()

    // price drops to 200 
    await priceFeed.setPrice(dec(200, 18))
    const price = await priceFeed.getPrice()

    // Check not in Recovery Mode 
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Check A, B, C, D have ICR < MCR
    assert.isTrue((await locManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(carol, price)).lt(mv._MCR))
    assert.isTrue((await locManager.getCurrentICR(dennis, price)).lt(mv._MCR))

    const aliceColl = (await locManager.LoCs(alice))[1]
    const bobColl = (await locManager.LoCs(bob))[1]
    const carolColl = (await locManager.LoCs(carol))[1]
    const dennisColl = (await locManager.LoCs(dennis))[1]

    // --- Check value of 0.5% of A, B, and C's collateral is <$10, and value of 0.5% of D's collateral is > $10 ---
    const _0pt5percent_aliceColl = aliceColl.div(web3.utils.toBN('200'))
    const _0pt5percent_bobColl = bobColl.div(web3.utils.toBN('200'))
    const _0pt5percent_carolColl = carolColl.div(web3.utils.toBN('200'))
    const _0pt5percent_dennisColl = dennisColl.div(web3.utils.toBN('200'))

    /* Expect total gas compensation = 
    0.5% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedGasComp = _0pt5percent_aliceColl
      .add(_0pt5percent_bobColl)
      .add(_0pt5percent_carolColl)
      .add(_0pt5percent_dennisColl).toString()

    /* Expect liquidated coll = 
    0.95% of [A_coll + B_coll + C_coll + D_coll]
    */
    const expectedLiquidatedColl = aliceColl.sub(_0pt5percent_aliceColl)
      .add(bobColl.sub(_0pt5percent_bobColl))
      .add(carolColl.sub(_0pt5percent_carolColl))
      .add(dennisColl.sub(_0pt5percent_dennisColl))

    // Expect liquidatedDebt = 51 + 190 + 1025 + 13510 = 14646 ZUSD
    const expectedLiquidatedDebt = A_totalDebt.add(B_totalDebt).add(C_totalDebt).add(D_totalDebt)

    // Liquidate locs A-D
    const liquidationTxData = await locManager.liquidateLoCs(4, { from: liquidator, gasPrice: 0 })

    // Get data from the liquidation event logs
    const [loggedDebt, loggedColl, loggedGasComp, ] = th.getEmittedLiquidationValues(liquidationTxData)

    assert.isAtMost(th.getDifference(expectedLiquidatedDebt, loggedDebt), 1000)
    assert.isAtMost(th.getDifference(expectedLiquidatedColl, loggedColl), 1000)
    assert.isAtMost(th.getDifference(expectedGasComp, loggedGasComp), 1000)
  })

  // --- LoC ordering by ICR tests ---

  it('LoC ordering: same collateral, decreasing debt. Price successively increases. LoCs should maintain ordering by ICR', async () => {
    const _10_accounts = accounts.slice(1, 11)

    let debt = 50
    // create 10 locs, constant coll, descending debt 100 to 90 ZUSD
    for (const account of _10_accounts) {

      const debtString = debt.toString().concat('000000000000000000')
      await openLoC({ extraZUSDAmount: debtString, extraParams: { from: account, value: dec(30, 'ether') } })

      const squeezedLoCAddr = th.squeezeAddr(account)

      debt -= 1
    }

    const initialPrice = await priceFeed.getPrice()
    const firstColl = (await locManager.LoCs(_10_accounts[0]))[1]

    // Vary price 200-210
    let price = 200
    while (price < 210) {

      const priceString = price.toString().concat('000000000000000000')
      await priceFeed.setPrice(priceString)

      const ICRList = []
      const coll_firstLoC = (await locManager.LoCs(_10_accounts[0]))[1]
      const gasComp_firstLoC = (await locManager.getCollGasCompensation(coll_firstLoC)).toString()

      for (account of _10_accounts) {
        // Check gas compensation is the same for all locs
        const coll = (await locManager.LoCs(account))[1]
        const gasCompensation = (await locManager.getCollGasCompensation(coll)).toString()

        assert.equal(gasCompensation, gasComp_firstLoC)

        const ICR = await locManager.getCurrentICR(account, price)
        ICRList.push(ICR)


        // Check LoC ordering by ICR is maintained
        if (ICRList.length > 1) {
          const prevICR = ICRList[ICRList.length - 2]

          try {
            assert.isTrue(ICR.gte(prevICR))
          } catch (error) {
            console.log(`BTC price at which LoC ordering breaks: ${price}`)
            logICRs(ICRList)
          }
        }

        price += 1
      }
    }
  })

  it('LoC ordering: increasing collateral, constant debt. Price successively increases. LoCs should maintain ordering by ICR', async () => {
    const _20_accounts = accounts.slice(1, 21)

    let coll = 50
    // create 20 locs, increasing collateral, constant debt = 100ZUSD
    for (const account of _20_accounts) {

      const collString = coll.toString().concat('000000000000000000')
      await openLoC({ extraZUSDAmount: dec(100, 18), extraParams: { from: account, value: collString } })

      coll += 5
    }

    const initialPrice = await priceFeed.getPrice()

    // Vary price 
    let price = 1
    while (price < 300) {

      const priceString = price.toString().concat('000000000000000000')
      await priceFeed.setPrice(priceString)

      const ICRList = []

      for (account of _20_accounts) {
        const ICR = await locManager.getCurrentICR(account, price)
        ICRList.push(ICR)

        // Check LoC ordering by ICR is maintained
        if (ICRList.length > 1) {
          const prevICR = ICRList[ICRList.length - 2]

          try {
            assert.isTrue(ICR.gte(prevICR))
          } catch (error) {
            console.log(`BTC price at which LoC ordering breaks: ${price}`)
            logICRs(ICRList)
          }
        }

        price += 10
      }
    }
  })

  it('LoC ordering: Constant raw collateral ratio (excluding virtual debt). Price successively increases. LoCs should maintain ordering by ICR', async () => {
    let collVals = [1, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000].map(v => v * 20)
    const accountsList = accounts.slice(1, collVals.length + 1)

    let accountIdx = 0
    for (const coll of collVals) {

      const debt = coll * 110

      const account = accountsList[accountIdx]
      const collString = coll.toString().concat('000000000000000000')
      await openLoC({ extraZUSDAmount: dec(100, 18), extraParams: { from: account, value: collString } })

      accountIdx += 1
    }

    const initialPrice = await priceFeed.getPrice()

    // Vary price
    let price = 1
    while (price < 300) {

      const priceString = price.toString().concat('000000000000000000')
      await priceFeed.setPrice(priceString)

      const ICRList = []

      for (account of accountsList) {
        const ICR = await locManager.getCurrentICR(account, price)
        ICRList.push(ICR)

        // Check LoC ordering by ICR is maintained
        if (ICRList.length > 1) {
          const prevICR = ICRList[ICRList.length - 2]

          try {
            assert.isTrue(ICR.gte(prevICR))
          } catch (error) {
            console.log(error)
            console.log(`BTC price at which LoC ordering breaks: ${price}`)
            logICRs(ICRList)
          }
        }

        price += 10
      }
    }
  })
})

