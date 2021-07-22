const Decimal = require("decimal.js");
const deploymentHelper = require("../utils/deploymentHelpers.js")
const { BNConverter } = require("../utils/BNConverter.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');
const StabilityPool = artifacts.require("./StabilityPool.sol")

const th = testHelpers.TestHelper
const timeValues = testHelpers.TimeValues
const dec = th.dec


const logLQTYBalanceAndError = (LQTYBalance_A, expectedLQTYBalance_A) => {
  console.log(
    `Expected final balance: ${expectedLQTYBalance_A}, \n
    Actual final balance: ${LQTYBalance_A}, \n
    Abs. error: ${expectedLQTYBalance_A.sub(LQTYBalance_A)}`
  )
}

const repeatedlyIssueLQTY = async (stabilityPool, timeBetweenIssuances, duration) => {
  const startTimestamp = th.toBN(await th.getLatestBlockTimestamp(web3))
  let timePassed = 0

  // while current time < 1 month from deployment, issue LQTY every minute
  while (timePassed < duration) {
    // console.log(`timePassed: ${timePassed}`)
    await th.fastForwardTime(timeBetweenIssuances, web3.currentProvider)
    await stabilityPool._unprotectedTriggerLQTYIssuance()

    const currentTimestamp = th.toBN(await th.getLatestBlockTimestamp(web3))
    timePassed = currentTimestamp.sub(startTimestamp)
  }
}


contract('LQTY community issuance arithmetic tests', async accounts => {
  let contracts
  let borrowerOperations
  let communityIssuanceTester
  let lqtyToken
  let stabilityPool

  const [owner, alice, frontEnd_1] = accounts;

  const multisig = accounts[999];

  before(async () => {
    contracts = await deploymentHelper.deployLiquityCore()
    const LQTYContracts = await deploymentHelper.deployLQTYTesterContractsHardhat(multisig)
    contracts.stabilityPool = await StabilityPool.new()
    contracts = await deploymentHelper.deployLUSDToken(contracts)

    stabilityPool = contracts.stabilityPool
    borrowerOperations = contracts.borrowerOperations

    lqtyToken = LQTYContracts.lqtyToken
    communityIssuanceTester = LQTYContracts.communityIssuance

    await deploymentHelper.connectLQTYContracts(LQTYContracts)
    await deploymentHelper.connectCoreContracts(contracts, LQTYContracts)
    await deploymentHelper.connectLQTYContractsToCore(LQTYContracts, contracts)
  })

  let revertToSnapshot;

  beforeEach(async() => {
    let snapshot = await timeMachine.takeSnapshot();
    revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result'])
  });

  afterEach(async() => {
    await revertToSnapshot();
  });

  // Accuracy tests
  it("getCumulativeIssuanceFraction(): fraction doesn't increase if less than a minute has passed", async () => {
   // progress time 1 week 
    await th.fastForwardTime(timeValues.MINUTES_IN_ONE_WEEK, web3.currentProvider)

    await communityIssuanceTester.unprotectedIssueLQTY()
   
    const issuanceFractionBefore = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.isTrue(issuanceFractionBefore.gt(th.toBN('0')))
    console.log(`issuance fraction before: ${issuanceFractionBefore}`)
    const blockTimestampBefore = th.toBN(await th.getLatestBlockTimestamp(web3))

    // progress time 10 seconds
    await th.fastForwardTime(10, web3.currentProvider)

    const issuanceFractionAfter = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const blockTimestampAfter = th.toBN(await th.getLatestBlockTimestamp(web3))

    const timestampDiff = blockTimestampAfter.sub(blockTimestampBefore)
    // check blockTimestamp diff < 60s
    assert.isTrue(timestampDiff.lt(th.toBN(60)))

    console.log(`issuance fraction after: ${issuanceFractionBefore}`)
    assert.isTrue(issuanceFractionBefore.eq(issuanceFractionAfter))
  })

  /*--- Issuance tests for "Yearly halving" schedule.

  Total issuance year 1: 50%, year 2: 75%, year 3:   0.875, etc   
  
  Error tolerance: 1e-9
  
  ---*/

  // using the result of this to advance time by the desired amount from the deployment time, whether or not some extra time has passed in the meanwhile
  const getDuration = async (expectedDuration) => {
    const deploymentTime = (await communityIssuanceTester.deploymentTime()).toNumber()
    const currentTime = await th.getLatestBlockTimestamp(web3)
    const duration = Math.max(expectedDuration - (currentTime - deploymentTime), 0)

    return duration
  }

  it("Cumulative issuance fraction is 0.0000013 after a minute", async () => {
    // console.log(`supply cap: ${await communityIssuanceTester.LQTYSupplyCap()}`)

    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MINUTE)

    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '1318772305025'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 100000000)
  })

  it("Cumulative issuance fraction is 0.000079 after an hour", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_HOUR)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '79123260066094'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.0019 after a day", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_DAY)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '1897231348441660'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.013 after a week", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_WEEK)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '13205268780628400'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.055 after a month", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '55378538087966600'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.16 after 3 months", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH * 3)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '157105100752037000'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.29 after 6 months", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH * 6)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = 289528188821766000

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.5 after a year", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = dec(5, 17)

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.75 after 2 years", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 2)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = dec(75, 16)

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.875 after 3 years", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 3)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = dec(875, 15)

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.9375 after 4 years", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 4)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '937500000000000000'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.999 after 10 years", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 10)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '999023437500000000'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.999999 after 20 years", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 20)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '999999046325684000'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  it("Cumulative issuance fraction is 0.999999999 after 30 years", async () => {
    const initialIssuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    assert.equal(initialIssuanceFraction, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 30)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    const issuanceFraction = await communityIssuanceTester.getCumulativeIssuanceFraction()
    const expectedIssuanceFraction = '999999999068677000'

    const absError = th.toBN(expectedIssuanceFraction).sub(issuanceFraction)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    issuanceFraction: ${issuanceFraction},  
    //    expectedIssuanceFraction: ${expectedIssuanceFraction},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(issuanceFraction, expectedIssuanceFraction), 1000000000)
  })

  // --- Token issuance for yearly halving ---

   // Error tolerance: 1e-3, i.e. 1/1000th of a token

  it("Total LQTY tokens issued is 46.15 after a minute", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MINUTE)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    // 35,000,000 * (1 – 0.5 ^ 0.00000190258) where 1 minute is 0.00000190258 years 
    const expectedTotalLQTYIssued = '46156848261800000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 2,769.31 after an hour", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)


    const duration = await getDuration(timeValues.SECONDS_IN_ONE_HOUR)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '2769314074500000000000';

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 66,403.10 after a day", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)


    const duration = await getDuration(timeValues.SECONDS_IN_ONE_DAY)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '66403097015100000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 462,184.407313 after a week", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)


    const duration = await getDuration(timeValues.SECONDS_IN_ONE_WEEK)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '462184407313000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 1,938,248.83304 after a month", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)


    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    // 35,000,000 * (1 – 0.5 ^ (30 / 365)) where 1 month is 30 days
    const expectedTotalLQTYIssued = '1938248833040000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 5,498,678.52622 after 3 months", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH * 3)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    // 35,000,000 * (1 – 0.5 ^ (90 / 365)) where 1 month is 30 days
    const expectedTotalLQTYIssued = '5498678526220000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 10,133,486.6086 after 6 months", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH * 6)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '10133486608600000000000000'
    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 17,500,000 after a year", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '17500000000000000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 26,250,000 after 2 years", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 2)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '26250000000000000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 30,625,000 after 3 years", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 3)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '30625000000000000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 32,812,500 after 4 years", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 4)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '32812500000000000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 34,965,820.3125 after 10 years", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 10)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '34965820312500000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 34,999,966.6214 after 20 years", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 20)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '34999966621400000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  it("Total LQTY tokens issued is 34,999,999.9674 after 30 years", async () => {
    const initialIssuance = await communityIssuanceTester.totalLQTYIssued()
    assert.equal(initialIssuance, 0)

    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 30)
    // Fast forward time
    await th.fastForwardTime(duration, web3.currentProvider)

    // Issue LQTY
    await communityIssuanceTester.unprotectedIssueLQTY()
    const totalLQTYIssued = await communityIssuanceTester.totalLQTYIssued()
    const expectedTotalLQTYIssued = '34999999967400000000000000'

    const absError = th.toBN(expectedTotalLQTYIssued).sub(totalLQTYIssued)
    // console.log(
    //   `time since deployment: ${duration}, 
    //    totalLQTYIssued: ${totalLQTYIssued},  
    //    expectedTotalLQTYIssued: ${expectedTotalLQTYIssued},
    //    abs. error: ${absError}`
    // )

    assert.isAtMost(th.getDifference(totalLQTYIssued, expectedTotalLQTYIssued), 1000000000000000)
  })

  /* ---  
  Accumulated issuance error: how many tokens are lost over a given period, for a given issuance frequency? 
  
  Slow tests are skipped.
  --- */

  // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every year, for 30 years", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 })

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') })
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice })

    assert.isTrue(await stabilityPool.isEligibleForLQTY(alice))

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_YEAR
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 30)

    await repeatedlyIssueLQTY(stabilityPool, timeBetweenIssuances, duration)

    // Depositor withdraws their deposit and accumulated LQTY
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice })

    const LQTYBalance_A = await lqtyToken.balanceOf(alice)
    const expectedLQTYBalance_A = th.toBN('33333333302289200000000000')
    const diff = expectedLQTYBalance_A.sub(LQTYBalance_A)

    // logLQTYBalanceAndError(LQTYBalance_A, expectedLQTYBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))))
  })
  /*  Results:
  
  Expected final balance: 33333333302289200000000000,
  Actual final balance: 33333333302289247499999999,
  Abs. error: -47499999999 */


    // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every day, for 30 years", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 })

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') })
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice })

    assert.isTrue(await stabilityPool.isEligibleForLQTY(alice))

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_DAY
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 30)

    await repeatedlyIssueLQTY(stabilityPool, timeBetweenIssuances, duration)

    // Depositor withdraws their deposit and accumulated LQTY
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice })

    const LQTYBalance_A = await lqtyToken.balanceOf(alice)
    const expectedLQTYBalance_A = th.toBN('33333333302289200000000000')
    const diff = expectedLQTYBalance_A.sub(LQTYBalance_A)

    // logLQTYBalanceAndError(LQTYBalance_A, expectedLQTYBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))))
  })
  /* Results:

  Expected final balance: 33333333302289200000000000,
  Actual final balance: 33333333302297188866666666,
  Abs. error: -7988866666666  */

  // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every minute, for 1 month", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 })

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') })
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice })

    assert.isTrue(await stabilityPool.isEligibleForLQTY(alice))

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_MINUTE
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH)

    await repeatedlyIssueLQTY(stabilityPool, timeBetweenIssuances, duration)

    // Depositor withdraws their deposit and accumulated LQTY
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice })

    const LQTYBalance_A = await lqtyToken.balanceOf(alice)
    const expectedLQTYBalance_A = th.toBN('1845951269598880000000000')
    const diff = expectedLQTYBalance_A.sub(LQTYBalance_A)

    // logLQTYBalanceAndError(LQTYBalance_A, expectedLQTYBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))))
  })
  /* Results:

  Expected final balance: 1845951269598880000000000,
  Actual final balance: 1845951269564420199999999,
  Abs. error: 34459800000001
  */

  // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every minute, for 1 year", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 })

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') })
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice })

    assert.isTrue(await stabilityPool.isEligibleForLQTY(alice))

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_MINUTE
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR)

    await repeatedlyIssueLQTY(stabilityPool, timeBetweenIssuances, duration)

    // Depositor withdraws their deposit and accumulated LQTY
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice })

    const LQTYBalance_A = await lqtyToken.balanceOf(alice)
    const expectedLQTYBalance_A = th.toBN('1845951269598880000000000')
    const diff = expectedLQTYBalance_A.sub(LQTYBalance_A)

    // logLQTYBalanceAndError(LQTYBalance_A, expectedLQTYBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))))
  })
})
