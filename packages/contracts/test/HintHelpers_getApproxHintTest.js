const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")

const th = testHelpers.TestHelper
const { dec, toBN } = th
const moneyVals = testHelpers.MoneyValues

let latestRandomSeed = 31337

const LoCManagerTester = artifacts.require("LoCManagerTester")
const ZUSDToken = artifacts.require("ZUSDToken")

contract('HintHelpers', async accounts => {
 
  const [owner, sovFeeCollector] = accounts;

  const multisig = accounts[999];

  let sortedLoCs
  let locManager
  let borrowerOperations
  let hintHelpers
  let priceFeed

  let contracts

  let numAccounts;

  const getNetBorrowingAmount = async (debtWithFee) => th.getNetBorrowingAmount(contracts, debtWithFee)

  /* Open a LoC for each account. ZUSD debt is 200 ZUSD each, with collateral beginning at
  1.5 bitcoin, and rising by 0.01 bitcoin per LoC.  Hence, the ICR of account (i + 1) is always 1% greater than the ICR of account i. 
 */

 // Open LoCs in parallel, then withdraw ZUSD in parallel
 const makeLoCsInParallel = async (accounts, n) => {
  activeAccounts = accounts.slice(0,n)
  // console.log(`number of accounts used is: ${activeAccounts.length}`)
  // console.time("makeLoCsInParallel")
  const openLoCpromises = activeAccounts.map((account, index) => openLoC(account, index))
  await Promise.all(openLoCpromises)
  const withdrawZUSDpromises = activeAccounts.map(account => withdrawZUSDfromLoC(account))
  await Promise.all(withdrawZUSDpromises)
  // console.timeEnd("makeLoCsInParallel")
 }

 const openLoC = async (account, index) => {
   const amountFinney = 2000 + index * 10
   const coll = web3.utils.toWei((amountFinney.toString()), 'finney')
   await borrowerOperations.openLoC(th._100pct, 0, account, account, { from: account, value: coll })
 }

 const withdrawZUSDfromLoC = async (account) => {
  await borrowerOperations.withdrawZUSD(th._100pct, '100000000000000000000', account, account, { from: account })
 }

 // Sequentially add coll and withdraw ZUSD, 1 account at a time
  const makeLoCsInSequence = async (accounts, n) => {
    activeAccounts = accounts.slice(0,n)
    // console.log(`number of accounts used is: ${activeAccounts.length}`)

    let ICR = 200

    // console.time('makeLoCsInSequence')
    for (const account of activeAccounts) {
      const ICR_BN = toBN(ICR.toString().concat('0'.repeat(16)))
      await th.openLoC(contracts, { extraZUSDAmount: toBN(dec(10000, 18)), ICR: ICR_BN, extraParams: { from: account } })

      ICR += 1
    }
    // console.timeEnd('makeLoCsInSequence')
  }

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

    sortedLoCs = contracts.sortedLoCs
    locManager = contracts.locManager
    borrowerOperations = contracts.borrowerOperations
    hintHelpers = contracts.hintHelpers
    priceFeed = contracts.priceFeedTestnet
  
    await deploymentHelper.connectCoreContracts(contracts, ZEROContracts)
    await deploymentHelper.connectZEROContracts(ZEROContracts)
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts, owner)

    numAccounts = 10

    await priceFeed.setPrice(dec(100, 18))
    await makeLoCsInSequence(accounts, numAccounts) 
    // await makeLoCsInParallel(accounts, numAccounts)  
  })

  it("setup: makes accounts with nominal ICRs increasing by 1% consecutively", async () => {
    // check first 10 accounts
    const ICR_0 = await locManager.getNominalICR(accounts[0])
    const ICR_1 = await locManager.getNominalICR(accounts[1])
    const ICR_2 = await locManager.getNominalICR(accounts[2])
    const ICR_3 = await locManager.getNominalICR(accounts[3])
    const ICR_4 = await locManager.getNominalICR(accounts[4])
    const ICR_5 = await locManager.getNominalICR(accounts[5])
    const ICR_6 = await locManager.getNominalICR(accounts[6])
    const ICR_7 = await locManager.getNominalICR(accounts[7])
    const ICR_8 = await locManager.getNominalICR(accounts[8])
    const ICR_9 = await locManager.getNominalICR(accounts[9])

    assert.isTrue(ICR_0.eq(toBN(dec(200, 16))))
    assert.isTrue(ICR_1.eq(toBN(dec(201, 16))))
    assert.isTrue(ICR_2.eq(toBN(dec(202, 16))))
    assert.isTrue(ICR_3.eq(toBN(dec(203, 16))))
    assert.isTrue(ICR_4.eq(toBN(dec(204, 16))))
    assert.isTrue(ICR_5.eq(toBN(dec(205, 16))))
    assert.isTrue(ICR_6.eq(toBN(dec(206, 16))))
    assert.isTrue(ICR_7.eq(toBN(dec(207, 16))))
    assert.isTrue(ICR_8.eq(toBN(dec(208, 16))))
    assert.isTrue(ICR_9.eq(toBN(dec(209, 16))))
  })

  it("getApproxHint(): returns the address of a LoC within sqrt(length) positions of the correct insert position", async () => {
    const sqrtLength = Math.ceil(Math.sqrt(numAccounts))

    /* As per the setup, the ICRs of LoCs are monotonic and seperated by 1% intervals. Therefore, the difference in ICR between 
    the given CR and the ICR of the hint address equals the number of positions between the hint address and the correct insert position 
    for a LoC with the given CR. */

    // CR = 250%
    const CR_250 = '2500000000000000000'
    const CRPercent_250 = Number(web3.utils.fromWei(CR_250, 'ether')) * 100

    let hintAddress

    // const hintAddress_250 = await functionCaller.locManager_getApproxHint(CR_250, sqrtLength * 10)
    ;({ hintAddress, latestRandomSeed } = await hintHelpers.getApproxHint(CR_250, sqrtLength * 10, latestRandomSeed))
    const ICR_hintAddress_250 = await locManager.getNominalICR(hintAddress)
    const ICRPercent_hintAddress_250 = Number(web3.utils.fromWei(ICR_hintAddress_250, 'ether')) * 100

    // check the hint position is at most sqrtLength positions away from the correct position
    ICR_Difference_250 = (ICRPercent_hintAddress_250 - CRPercent_250)
    assert.isBelow(ICR_Difference_250, sqrtLength)

    // CR = 287% 
    const CR_287 = '2870000000000000000'
    const CRPercent_287 = Number(web3.utils.fromWei(CR_287, 'ether')) * 100

    // const hintAddress_287 = await functionCaller.locManager_getApproxHint(CR_287, sqrtLength * 10)
    ;({ hintAddress, latestRandomSeed } = await hintHelpers.getApproxHint(CR_287, sqrtLength * 10, latestRandomSeed))
    const ICR_hintAddress_287 = await locManager.getNominalICR(hintAddress)
    const ICRPercent_hintAddress_287 = Number(web3.utils.fromWei(ICR_hintAddress_287, 'ether')) * 100
    
    // check the hint position is at most sqrtLength positions away from the correct position
    ICR_Difference_287 = (ICRPercent_hintAddress_287 - CRPercent_287)
    assert.isBelow(ICR_Difference_287, sqrtLength)

    // CR = 213%
    const CR_213 = '2130000000000000000'
    const CRPercent_213 = Number(web3.utils.fromWei(CR_213, 'ether')) * 100

    // const hintAddress_213 = await functionCaller.locManager_getApproxHint(CR_213, sqrtLength * 10)
    ;({ hintAddress, latestRandomSeed } = await hintHelpers.getApproxHint(CR_213, sqrtLength * 10, latestRandomSeed))
    const ICR_hintAddress_213 = await locManager.getNominalICR(hintAddress)
    const ICRPercent_hintAddress_213 = Number(web3.utils.fromWei(ICR_hintAddress_213, 'ether')) * 100
    
    // check the hint position is at most sqrtLength positions away from the correct position
    ICR_Difference_213 = (ICRPercent_hintAddress_213 - CRPercent_213)
    assert.isBelow(ICR_Difference_213, sqrtLength)

     // CR = 201%
     const CR_201 = '2010000000000000000'
     const CRPercent_201 = Number(web3.utils.fromWei(CR_201, 'ether')) * 100
 
    //  const hintAddress_201 = await functionCaller.locManager_getApproxHint(CR_201, sqrtLength * 10)
     ;({ hintAddress, latestRandomSeed } = await hintHelpers.getApproxHint(CR_201, sqrtLength * 10, latestRandomSeed))
     const ICR_hintAddress_201 = await locManager.getNominalICR(hintAddress)
     const ICRPercent_hintAddress_201 = Number(web3.utils.fromWei(ICR_hintAddress_201, 'ether')) * 100
     
     // check the hint position is at most sqrtLength positions away from the correct position
     ICR_Difference_201 = (ICRPercent_hintAddress_201 - CRPercent_201)
     assert.isBelow(ICR_Difference_201, sqrtLength)
  })

  /* Pass 100 random collateral ratios to getApproxHint(). For each, check whether the returned hint address is within 
  sqrt(length) positions of where a LoC with that CR should be inserted. */
  // it("getApproxHint(): for 100 random CRs, returns the address of a LoC within sqrt(length) positions of the correct insert position", async () => {
  //   const sqrtLength = Math.ceil(Math.sqrt(numAccounts))

  //   for (i = 0; i < 100; i++) {
  //     // get random ICR between 200% and (200 + numAccounts)%
  //     const min = 200
  //     const max = 200 + numAccounts
  //     const ICR_Percent = (Math.floor(Math.random() * (max - min) + min)) 

  //     // Convert ICR to a duint
  //     const ICR = web3.utils.toWei((ICR_Percent * 10).toString(), 'finney') 
  
  //     const hintAddress = await hintHelpers.getApproxHint(ICR, sqrtLength * 10)
  //     const ICR_hintAddress = await locManager.getNominalICR(hintAddress)
  //     const ICRPercent_hintAddress = Number(web3.utils.fromWei(ICR_hintAddress, 'ether')) * 100
      
  //     // check the hint position is at most sqrtLength positions away from the correct position
  //     ICR_Difference = (ICRPercent_hintAddress - ICR_Percent)
  //     assert.isBelow(ICR_Difference, sqrtLength)
  //   }
  // })

  it("getApproxHint(): returns the head of the list if the CR is the max uint256 value", async () => {
    const sqrtLength = Math.ceil(Math.sqrt(numAccounts))

    // CR = Maximum value, i.e. 2**256 -1 
    const CR_Max = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

    let hintAddress

    // const hintAddress_Max = await functionCaller.locManager_getApproxHint(CR_Max, sqrtLength * 10)
    ;({ hintAddress, latestRandomSeed } = await hintHelpers.getApproxHint(CR_Max, sqrtLength * 10, latestRandomSeed))

    const ICR_hintAddress_Max = await locManager.getNominalICR(hintAddress)
    const ICRPercent_hintAddress_Max = Number(web3.utils.fromWei(ICR_hintAddress_Max, 'ether')) * 100

     const firstLoC = await sortedLoCs.getFirst()
     const ICR_FirstLoC = await locManager.getNominalICR(firstLoC)
     const ICRPercent_FirstLoC = Number(web3.utils.fromWei(ICR_FirstLoC, 'ether')) * 100
 
     // check the hint position is at most sqrtLength positions away from the correct position
     ICR_Difference_Max = (ICRPercent_hintAddress_Max - ICRPercent_FirstLoC)
     assert.isBelow(ICR_Difference_Max, sqrtLength)
  })

  it("getApproxHint(): returns the tail of the list if the CR is lower than ICR of any LoC", async () => {
    const sqrtLength = Math.ceil(Math.sqrt(numAccounts))

     // CR = MCR
     const CR_Min = '1100000000000000000'

     let hintAddress

    //  const hintAddress_Min = await functionCaller.locManager_getApproxHint(CR_Min, sqrtLength * 10)
    ;({ hintAddress, latestRandomSeed } = await hintHelpers.getApproxHint(CR_Min, sqrtLength * 10, latestRandomSeed))
    const ICR_hintAddress_Min = await locManager.getNominalICR(hintAddress)
    const ICRPercent_hintAddress_Min = Number(web3.utils.fromWei(ICR_hintAddress_Min, 'ether')) * 100

     const lastLoC = await sortedLoCs.getLast()
     const ICR_LastLoC = await locManager.getNominalICR(lastLoC)
     const ICRPercent_LastLoC = Number(web3.utils.fromWei(ICR_LastLoC, 'ether')) * 100
 
     // check the hint position is at most sqrtLength positions away from the correct position
     const ICR_Difference_Min = (ICRPercent_hintAddress_Min - ICRPercent_LastLoC)
     assert.isBelow(ICR_Difference_Min, sqrtLength)
  })

  it('computeNominalCR()', async () => {
    const NICR = await hintHelpers.computeNominalCR(dec(3, 18), dec(200, 18))
    assert.equal(NICR.toString(), dec(150, 16))
  })

})

// Gas usage:  See gas costs spreadsheet. Cost per trial = 10k-ish.
