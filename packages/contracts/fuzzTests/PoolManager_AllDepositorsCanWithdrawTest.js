const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN

const ZERO_ADDRESS = th.ZERO_ADDRESS

const ZERO = toBN('0')

/*
* Naive fuzz test that checks whether all SP depositors can successfully withdraw from the SP, after a random sequence
* of deposits and liquidations.
*
* The test cases tackle different size ranges for liquidated collateral and SP deposits.
*/

contract("PoolManager - random liquidations/deposits, then check all depositors can withdraw", async accounts => {

  const whale = accounts[accounts.length - 1]
  const bountyAddress = accounts[998]

  let priceFeed
  let zusdToken
  let locManager
  let stabilityPool
  let sortedLoCs
  let borrowerOperations

  const skyrocketPriceAndCheckAllLoCsSafe = async () => {
        // price skyrockets, therefore no undercollateralized troes
        await priceFeed.setPrice(dec(1000, 18));
        const lowestICR = await locManager.getCurrentICR(await sortedLoCs.getLast(), dec(1000, 18))
        assert.isTrue(lowestICR.gt(toBN(dec(110, 16))))
  }

  const performLiquidation = async (remainingDefaulters, liquidatedAccountsDict) => {
    if (remainingDefaulters.length === 0) { return }

    const randomDefaulterIndex = Math.floor(Math.random() * (remainingDefaulters.length))
    const randomDefaulter = remainingDefaulters[randomDefaulterIndex]

    const liquidatedZUSD = (await locManager.LoCs(randomDefaulter))[0]
    const liquidatedBTC = (await locManager.LoCs(randomDefaulter))[1]

    const price = await priceFeed.getPrice()
    const ICR = (await locManager.getCurrentICR(randomDefaulter, price)).toString()
    const ICRPercent = ICR.slice(0, ICR.length - 16)

    console.log(`SP address: ${stabilityPool.address}`)
    const ZUSDinPoolBefore = await stabilityPool.getTotalZUSDDeposits()
    const liquidatedTx = await locManager.liquidate(randomDefaulter, { from: accounts[0] })
    const ZUSDinPoolAfter = await stabilityPool.getTotalZUSDDeposits()

    assert.isTrue(liquidatedTx.receipt.status)

    if (liquidatedTx.receipt.status) {
      liquidatedAccountsDict[randomDefaulter] = true
      remainingDefaulters.splice(randomDefaulterIndex, 1)
    }
    if (await locManager.checkRecoveryMode(price)) { console.log("recovery mode: TRUE") }

    console.log(`Liquidation. addr: ${th.squeezeAddr(randomDefaulter)} ICR: ${ICRPercent}% coll: ${liquidatedBTC} debt: ${liquidatedZUSD} SP ZUSD before: ${ZUSDinPoolBefore} SP ZUSD after: ${ZUSDinPoolAfter} tx success: ${liquidatedTx.receipt.status}`)
  }

  const performSPDeposit = async (depositorAccounts, currentDepositors, currentDepositorsDict) => {
    const randomIndex = Math.floor(Math.random() * (depositorAccounts.length))
    const randomDepositor = depositorAccounts[randomIndex]

    const userBalance = (await zusdToken.balanceOf(randomDepositor))
    const maxZUSDDeposit = userBalance.div(toBN(dec(1, 18)))

    const randomZUSDAmount = th.randAmountInWei(1, maxZUSDDeposit)

    const depositTx = await stabilityPool.provideToSP(randomZUSDAmount, ZERO_ADDRESS, { from: randomDepositor })

    assert.isTrue(depositTx.receipt.status)

    if (depositTx.receipt.status && !currentDepositorsDict[randomDepositor]) {
      currentDepositorsDict[randomDepositor] = true
      currentDepositors.push(randomDepositor)
    }

    console.log(`SP deposit. addr: ${th.squeezeAddr(randomDepositor)} amount: ${randomZUSDAmount} tx success: ${depositTx.receipt.status} `)
  }

  const randomOperation = async (depositorAccounts,
    remainingDefaulters,
    currentDepositors,
    liquidatedAccountsDict,
    currentDepositorsDict,
  ) => {
    const randomSelection = Math.floor(Math.random() * 2)

    if (randomSelection === 0) {
      await performLiquidation(remainingDefaulters, liquidatedAccountsDict)

    } else if (randomSelection === 1) {
      await performSPDeposit(depositorAccounts, currentDepositors, currentDepositorsDict)
    }
  }

  const systemContainsLoCUnder110 = async (price) => {
    const lowestICR = await locManager.getCurrentICR(await sortedLoCs.getLast(), price)
    console.log(`lowestICR: ${lowestICR}, lowestICR.lt(dec(110, 16)): ${lowestICR.lt(toBN(dec(110, 16)))}`)
    return lowestICR.lt(dec(110, 16))
  }

  const systemContainsLoCUnder100 = async (price) => {
    const lowestICR = await locManager.getCurrentICR(await sortedLoCs.getLast(), price)
    console.log(`lowestICR: ${lowestICR}, lowestICR.lt(dec(100, 16)): ${lowestICR.lt(toBN(dec(100, 16)))}`)
    return lowestICR.lt(dec(100, 16))
  }

  const getTotalDebtFromUndercollateralizedLoCs = async (n, price) => {
    let totalDebt = ZERO
    let loc = await sortedLoCs.getLast()

    for (let i = 0; i < n; i++) {
      const ICR = await locManager.getCurrentICR(loc, price)
      const debt = ICR.lt(toBN(dec(110, 16))) ? (await locManager.getEntireDebtAndColl(loc))[0] : ZERO

      totalDebt = totalDebt.add(debt)
      loc = await sortedLoCs.getPrev(loc)
    }

    return totalDebt
  }

  const clearAllUndercollateralizedLoCs = async (price) => {
    /* Somewhat arbitrary way to clear under-collateralized locs: 
    *
    * - If system is in Recovery Mode and contains locs with ICR < 100, whale draws the lowest LoC's debt amount 
    * and sends to lowest LoC owner, who then closes their loc.
    *
    * - If system contains locs with ICR < 110, whale simply draws and makes an SP deposit 
    * equal to the debt of the last 50 locs, before a liquidateLoCs tx hits the last 50 locs.
    *
    * The intent is to avoid the system entering an endless loop where the SP is empty and debt is being forever liquidated/recycled 
    * between active locs, and the existence of some under-collateralized locs blocks all SP depositors from withdrawing.
    * 
    * Since the purpose of the fuzz test is to see if SP depositors can indeed withdraw *when they should be able to*,
    * we first need to put the system in a state with no under-collateralized locs (which are supposed to block SP withdrawals).
    */
    while(await systemContainsLoCUnder100(price) && await locManager.checkRecoveryMode()) {
      const lowestLoC = await sortedLoCs.getLast()
      const lastLoCDebt = (await locManager.getEntireDebtAndColl(loc))[0]
      await borrowerOperations.adjustLoC(0, 0 , lastLoCDebt, true, whale, {from: whale})
      await zusdToken.transfer(lowestLoC, lowestLoCDebt, {from: whale})
      await borrowerOperations.closeLoC({from: lowestLoC})
    }

    while (await systemContainsLoCUnder110(price)) {
      const debtLowest50LoCs = await getTotalDebtFromUndercollateralizedLoCs(50, price)
      
      if (debtLowest50LoCs.gt(ZERO)) {
        await borrowerOperations.adjustLoC(0, 0 , debtLowest50LoCs, true, whale, {from: whale})
        await stabilityPool.provideToSP(debtLowest50LoCs, {from: whale})
      }
      
      await locManager.liquidateLoCs(50)
    }
  }

  const attemptWithdrawAllDeposits = async (currentDepositors) => {
    // First, liquidate all remaining undercollateralized locs, so that SP depositors may withdraw

    console.log("\n")
    console.log("--- Attempt to withdraw all deposits ---")
    console.log(`Depositors count: ${currentDepositors.length}`)

    for (depositor of currentDepositors) {
      const initialDeposit = (await stabilityPool.deposits(depositor))[0]
      const finalDeposit = await stabilityPool.getCompoundedZUSDDeposit(depositor)
      const BTCGain = await stabilityPool.getDepositorBTCGain(depositor)
      const BTCinSP = (await stabilityPool.getBTC()).toString()
      const ZUSDinSP = (await stabilityPool.getTotalZUSDDeposits()).toString()

      // Attempt to withdraw
      const withdrawalTx = await stabilityPool.withdrawFromSP(dec(1, 36), { from: depositor })

      const BTCinSPAfter = (await stabilityPool.getBTC()).toString()
      const ZUSDinSPAfter = (await stabilityPool.getTotalZUSDDeposits()).toString()
      const ZUSDBalanceSPAfter = (await zusdToken.balanceOf(stabilityPool.address))
      const depositAfter = await stabilityPool.getCompoundedZUSDDeposit(depositor)

      console.log(`--Before withdrawal--
                    withdrawer addr: ${th.squeezeAddr(depositor)}
                     initial deposit: ${initialDeposit}
                     BTC gain: ${BTCGain}
                     BTC in SP: ${BTCinSP}
                     compounded deposit: ${finalDeposit} 
                     ZUSD in SP: ${ZUSDinSP}
                    
                    --After withdrawal--
                     Withdrawal tx success: ${withdrawalTx.receipt.status} 
                     Deposit after: ${depositAfter}
                     BTC remaining in SP: ${BTCinSPAfter}
                     SP ZUSD deposits tracker after: ${ZUSDinSPAfter}
                     SP ZUSD balance after: ${ZUSDBalanceSPAfter}
                     `)
      // Check each deposit can be withdrawn
      assert.isTrue(withdrawalTx.receipt.status)
      assert.equal(depositAfter, '0')
    }
  }

  describe("Stability Pool Withdrawals", async () => {

    before(async () => {
      console.log(`Number of accounts: ${accounts.length}`)
    })

    beforeEach(async () => {
      contracts = await deploymentHelper.deployZeroCore()
      const ZEROContracts = await deploymentHelper.deployZEROContracts(bountyAddress)

      stabilityPool = contracts.stabilityPool
      priceFeed = contracts.priceFeedTestnet
      zusdToken = contracts.zusdToken
      stabilityPool = contracts.stabilityPool
      locManager = contracts.locManager
      borrowerOperations = contracts.borrowerOperations
      sortedLoCs = contracts.sortedLoCs

      await deploymentHelper.connectZEROContracts(ZEROContracts)
      await deploymentHelper.connectCoreContracts(contracts, ZEROContracts)
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts, owner)
    })

    // mixed deposits/liquidations

    // ranges: low-low, low-high, high-low, high-high, full-full

    // full offsets, partial offsets
    // ensure full offset with whale2 in S
    // ensure partial offset with whale 3 in L

    it("Defaulters' Collateral in range [1, 1e8]. SP Deposits in range [100, 1e10]. BTC:USD = 100", async () => {
      // whale adds coll that holds TCR > 150%
      await borrowerOperations.openLoC(0, 0, whale, whale, { from: whale, value: dec(5, 29) })

      const numberOfOps = 5
      const defaulterAccounts = accounts.slice(1, numberOfOps)
      const depositorAccounts = accounts.slice(numberOfOps + 1, numberOfOps * 2)

      const defaulterCollMin = 1
      const defaulterCollMax = 100000000
      const defaulterZUSDProportionMin = 91
      const defaulterZUSDProportionMax = 180

      const depositorCollMin = 1
      const depositorCollMax = 100000000
      const depositorZUSDProportionMin = 100
      const depositorZUSDProportionMax = 100

      const remainingDefaulters = [...defaulterAccounts]
      const currentDepositors = []
      const liquidatedAccountsDict = {}
      const currentDepositorsDict = {}

      // setup:
      // account set L all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(defaulterCollMin,
        defaulterCollMax,
        defaulterAccounts,
        contracts,
        defaulterZUSDProportionMin,
        defaulterZUSDProportionMax,
        true)

      // account set S all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(depositorCollMin,
        depositorCollMax,
        depositorAccounts,
        contracts,
        depositorZUSDProportionMin,
        depositorZUSDProportionMax,
        true)

      // price drops, all L liquidateable
      await priceFeed.setPrice(dec(1, 18));

      // Random sequence of operations: liquidations and SP deposits
      for (i = 0; i < numberOfOps; i++) {
        await randomOperation(depositorAccounts,
          remainingDefaulters,
          currentDepositors,
          liquidatedAccountsDict,
          currentDepositorsDict)
      }

      await skyrocketPriceAndCheckAllLoCsSafe()

      const totalZUSDDepositsBeforeWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsBeforeWithdrawals = await stabilityPool.getBTC()

      await attemptWithdrawAllDeposits(currentDepositors)

      const totalZUSDDepositsAfterWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsAfterWithdrawals = await stabilityPool.getBTC()

      console.log(`Total ZUSD deposits before any withdrawals: ${totalZUSDDepositsBeforeWithdrawals}`)
      console.log(`Total BTC rewards before any withdrawals: ${totalBTCRewardsBeforeWithdrawals}`)

      console.log(`Remaining ZUSD deposits after withdrawals: ${totalZUSDDepositsAfterWithdrawals}`)
      console.log(`Remaining BTC rewards after withdrawals: ${totalBTCRewardsAfterWithdrawals}`)

      console.log(`current depositors length: ${currentDepositors.length}`)
      console.log(`remaining defaulters length: ${remainingDefaulters.length}`)
    })

    it("Defaulters' Collateral in range [1, 10]. SP Deposits in range [1e8, 1e10]. BTC:USD = 100", async () => {
      // whale adds coll that holds TCR > 150%
      await borrowerOperations.openLoC(0, 0, whale, whale, { from: whale, value: dec(5, 29) })

      const numberOfOps = 5
      const defaulterAccounts = accounts.slice(1, numberOfOps)
      const depositorAccounts = accounts.slice(numberOfOps + 1, numberOfOps * 2)

      const defaulterCollMin = 1
      const defaulterCollMax = 10
      const defaulterZUSDProportionMin = 91
      const defaulterZUSDProportionMax = 180

      const depositorCollMin = 1000000
      const depositorCollMax = 100000000
      const depositorZUSDProportionMin = 100
      const depositorZUSDProportionMax = 100

      const remainingDefaulters = [...defaulterAccounts]
      const currentDepositors = []
      const liquidatedAccountsDict = {}
      const currentDepositorsDict = {}

      // setup:
      // account set L all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(defaulterCollMin,
        defaulterCollMax,
        defaulterAccounts,
        contracts,
        defaulterZUSDProportionMin,
        defaulterZUSDProportionMax)

      // account set S all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(depositorCollMin,
        depositorCollMax,
        depositorAccounts,
        contracts,
        depositorZUSDProportionMin,
        depositorZUSDProportionMax)

      // price drops, all L liquidateable
      await priceFeed.setPrice(dec(100, 18));

      // Random sequence of operations: liquidations and SP deposits
      for (i = 0; i < numberOfOps; i++) {
        await randomOperation(depositorAccounts,
          remainingDefaulters,
          currentDepositors,
          liquidatedAccountsDict,
          currentDepositorsDict)
      }

      await skyrocketPriceAndCheckAllLoCsSafe()

      const totalZUSDDepositsBeforeWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsBeforeWithdrawals = await stabilityPool.getBTC()

      await attemptWithdrawAllDeposits(currentDepositors)

      const totalZUSDDepositsAfterWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsAfterWithdrawals = await stabilityPool.getBTC()

      console.log(`Total ZUSD deposits before any withdrawals: ${totalZUSDDepositsBeforeWithdrawals}`)
      console.log(`Total BTC rewards before any withdrawals: ${totalBTCRewardsBeforeWithdrawals}`)

      console.log(`Remaining ZUSD deposits after withdrawals: ${totalZUSDDepositsAfterWithdrawals}`)
      console.log(`Remaining BTC rewards after withdrawals: ${totalBTCRewardsAfterWithdrawals}`)

      console.log(`current depositors length: ${currentDepositors.length}`)
      console.log(`remaining defaulters length: ${remainingDefaulters.length}`)
    })

    it("Defaulters' Collateral in range [1e6, 1e8]. SP Deposits in range [100, 1000]. Every liquidation empties the Pool. BTC:USD = 100", async () => {
      // whale adds coll that holds TCR > 150%
      await borrowerOperations.openLoC(0, 0, whale, whale, { from: whale, value: dec(5, 29) })

      const numberOfOps = 5
      const defaulterAccounts = accounts.slice(1, numberOfOps)
      const depositorAccounts = accounts.slice(numberOfOps + 1, numberOfOps * 2)

      const defaulterCollMin = 1000000
      const defaulterCollMax = 100000000
      const defaulterZUSDProportionMin = 91
      const defaulterZUSDProportionMax = 180

      const depositorCollMin = 1
      const depositorCollMax = 10
      const depositorZUSDProportionMin = 100
      const depositorZUSDProportionMax = 100

      const remainingDefaulters = [...defaulterAccounts]
      const currentDepositors = []
      const liquidatedAccountsDict = {}
      const currentDepositorsDict = {}

      // setup:
      // account set L all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(defaulterCollMin,
        defaulterCollMax,
        defaulterAccounts,
        contracts,
        defaulterZUSDProportionMin,
        defaulterZUSDProportionMax)

      // account set S all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(depositorCollMin,
        depositorCollMax,
        depositorAccounts,
        contracts,
        depositorZUSDProportionMin,
        depositorZUSDProportionMax)

      // price drops, all L liquidateable
      await priceFeed.setPrice(dec(100, 18));

      // Random sequence of operations: liquidations and SP deposits
      for (i = 0; i < numberOfOps; i++) {
        await randomOperation(depositorAccounts,
          remainingDefaulters,
          currentDepositors,
          liquidatedAccountsDict,
          currentDepositorsDict)
      }

      await skyrocketPriceAndCheckAllLoCsSafe()

      const totalZUSDDepositsBeforeWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsBeforeWithdrawals = await stabilityPool.getBTC()

      await attemptWithdrawAllDeposits(currentDepositors)

      const totalZUSDDepositsAfterWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsAfterWithdrawals = await stabilityPool.getBTC()

      console.log(`Total ZUSD deposits before any withdrawals: ${totalZUSDDepositsBeforeWithdrawals}`)
      console.log(`Total BTC rewards before any withdrawals: ${totalBTCRewardsBeforeWithdrawals}`)

      console.log(`Remaining ZUSD deposits after withdrawals: ${totalZUSDDepositsAfterWithdrawals}`)
      console.log(`Remaining BTC rewards after withdrawals: ${totalBTCRewardsAfterWithdrawals}`)

      console.log(`current depositors length: ${currentDepositors.length}`)
      console.log(`remaining defaulters length: ${remainingDefaulters.length}`)
    })

    it("Defaulters' Collateral in range [1e6, 1e8]. SP Deposits in range [1e8 1e10]. BTC:USD = 100", async () => {
      // whale adds coll that holds TCR > 150%
      await borrowerOperations.openLoC(0, 0, whale, whale, { from: whale, value: dec(5, 29) })

      // price drops, all L liquidateable
      const numberOfOps = 5
      const defaulterAccounts = accounts.slice(1, numberOfOps)
      const depositorAccounts = accounts.slice(numberOfOps + 1, numberOfOps * 2)

      const defaulterCollMin = 1000000
      const defaulterCollMax = 100000000
      const defaulterZUSDProportionMin = 91
      const defaulterZUSDProportionMax = 180

      const depositorCollMin = 1000000
      const depositorCollMax = 100000000
      const depositorZUSDProportionMin = 100
      const depositorZUSDProportionMax = 100

      const remainingDefaulters = [...defaulterAccounts]
      const currentDepositors = []
      const liquidatedAccountsDict = {}
      const currentDepositorsDict = {}

      // setup:
      // account set L all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(defaulterCollMin,
        defaulterCollMax,
        defaulterAccounts,
        contracts,
        defaulterZUSDProportionMin,
        defaulterZUSDProportionMax)

      // account set S all add coll and withdraw ZUSD
      await th.openLoC_allAccounts_randomBTC_randomZUSD(depositorCollMin,
        depositorCollMax,
        depositorAccounts,
        contracts,
        depositorZUSDProportionMin,
        depositorZUSDProportionMax)

      // price drops, all L liquidateable
      await priceFeed.setPrice(dec(100, 18));

      // Random sequence of operations: liquidations and SP deposits
      for (i = 0; i < numberOfOps; i++) {
        await randomOperation(depositorAccounts,
          remainingDefaulters,
          currentDepositors,
          liquidatedAccountsDict,
          currentDepositorsDict)
      }

      await skyrocketPriceAndCheckAllLoCsSafe()

      const totalZUSDDepositsBeforeWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsBeforeWithdrawals = await stabilityPool.getBTC()

      await attemptWithdrawAllDeposits(currentDepositors)

      const totalZUSDDepositsAfterWithdrawals = await stabilityPool.getTotalZUSDDeposits()
      const totalBTCRewardsAfterWithdrawals = await stabilityPool.getBTC()

      console.log(`Total ZUSD deposits before any withdrawals: ${totalZUSDDepositsBeforeWithdrawals}`)
      console.log(`Total BTC rewards before any withdrawals: ${totalBTCRewardsBeforeWithdrawals}`)

      console.log(`Remaining ZUSD deposits after withdrawals: ${totalZUSDDepositsAfterWithdrawals}`)
      console.log(`Remaining BTC rewards after withdrawals: ${totalBTCRewardsAfterWithdrawals}`)

      console.log(`current depositors length: ${currentDepositors.length}`)
      console.log(`remaining defaulters length: ${remainingDefaulters.length}`)
    })
  })
})
