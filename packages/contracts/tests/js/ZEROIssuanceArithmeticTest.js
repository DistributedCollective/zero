const Decimal = require("decimal.js");
const deploymentHelper = require("../../utils/js/deploymentHelpers.js");
const { BNConverter } = require("../../utils/js/BNConverter.js");
const testHelpers = require("../../utils/js/testHelpers.js");
const timeMachine = require('ganache-time-traveler');
const StabilityPool = artifacts.require("./StabilityPool.sol");

const th = testHelpers.TestHelper;
const timeValues = testHelpers.TimeValues;
const dec = th.dec;
const toBN = th.toBN;
const MAX_BPS = toBN(10000);
let APR;
let mockPrice;


const logZEROBalanceAndError = (ZEROBalance_A, expectedZEROBalance_A) => {
  console.log(
    `Expected final balance: ${expectedZEROBalance_A}, \n
    Actual final balance: ${ZEROBalance_A}, \n
    Abs. error: ${expectedZEROBalance_A.sub(ZEROBalance_A)}`
  );
};

const repeatedlyIssueSOV = async (stabilityPool, timeBetweenIssuances, duration) => {
  const startTimestamp = th.toBN(await th.getLatestBlockTimestamp(web3));
  let timePassed = 0;

  // while current time < 1 month from deployment, issue ZERO every minute
  while (timePassed < duration) {
    // console.log(`timePassed: ${timePassed}`)
    await th.fastForwardTime(timeBetweenIssuances, web3.currentProvider);
    await stabilityPool._unprotectedTriggerZEROIssuance();

    const currentTimestamp = th.toBN(await th.getLatestBlockTimestamp(web3));
    timePassed = currentTimestamp.sub(startTimestamp);
  }
};

const calculateSOVAccrual = (initialLastIssuanceTime, latestLastIssuanceTime, totalZUSDDeposits) => {
  const decimalNormalizer = toBN(dec(1,18));
  return totalZUSDDeposits.mul(APR).mul(latestLastIssuanceTime.sub(initialLastIssuanceTime)).div(toBN(31536000)).div(MAX_BPS).mul(mockPrice).div(decimalNormalizer) // 31536000 = 1 Year
}

contract('ZERO community issuance arithmetic tests', async accounts => {
  let contracts;
  let borrowerOperations;
  let communityIssuanceTester;
  let zeroToken;
  let stabilityPool;

  const [owner, alice, frontEnd_1, feeSharingCollector] = accounts;

  const multisig = accounts[999];

  before(async () => {
    contracts = await deploymentHelper.deployLiquityCore();
    const ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig);
    contracts.stabilityPool = await StabilityPool.new();
    contracts = await deploymentHelper.deployZUSDToken(contracts);

    stabilityPool = contracts.stabilityPool;
    borrowerOperations = contracts.borrowerOperations;

    zeroToken = ZEROContracts.zeroToken;
    communityIssuanceTester = ZEROContracts.communityIssuance;

    APR = toBN(300);
    mockPrice = toBN(dec(105, 18));

    await deploymentHelper.connectZEROContracts(ZEROContracts);
    await deploymentHelper.connectCoreContracts(contracts, ZEROContracts);
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts);

    await zeroToken.unprotectedMint(owner, toBN(dec(30, 24)));
    await zeroToken.approve(communityIssuanceTester.address, toBN(dec(30, 24)));
    // await communityIssuanceTester.receiveZero(owner, toBN(dec(30, 24)));
    await communityIssuanceTester.setRewardManager(owner);
    await communityIssuanceTester.setAPR(APR.toString()); // 3%
    await contracts.priceFeedSovryn.setPrice(contracts.zusdToken.address, zeroToken.address, mockPrice.toString());
  });

  let revertToSnapshot;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result']);
  });

  afterEach(async () => {
    await revertToSnapshot();
  });

  // Accuracy tests
  it("correct state after a week", async () => {
    const timeAccrual = timeValues.MINUTES_IN_ONE_WEEK;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  // using the result of this to advance time by the desired amount from the deployment time, whether or not some extra time has passed in the meanwhile
  const getDuration = async (expectedDuration) => {
    const deploymentTime = (await communityIssuanceTester.lastIssuanceTime()).toNumber();
    const currentTime = await th.getLatestBlockTimestamp(web3);
    const duration = Math.max(expectedDuration - (currentTime - deploymentTime), 0);

    return duration;
  };

  it("correct state after a minute", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_MINUTE;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after an hour", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_HOUR;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after a day", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_DAY;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after a week", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_WEEK;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after a month", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_MONTH;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 3 months", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_MONTH * 3;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 6 months", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_MONTH * 6;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after a year", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();    

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 2 years", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR * 2;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();    

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 3 years", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR * 3;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 4 years", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR * 4;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 10 years", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR * 10;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 20 years", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR * 20;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  it("correct state after 30 years", async () => {
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR * 30;
    const initialLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(30, 18))

    await assert.equal(initialTotalSOVIssued, 0);

    // progress time 1 week 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();

    await assert.isTrue(latestLastIssuanceTime.gte(initialLastIssuanceTime.add(toBN(timeAccrual))));
    await assert.equal(latestTotalSOVIssued.toString(), calculateSOVAccrual(initialLastIssuanceTime, latestLastIssuanceTime, zusdDeposits).toString())
  });

  // Error tolerance: 1e-3, i.e. 1/1000th of a token
  it("should issue the expected SOV based on pre-defined params (1)", async () => {
    /**
     * Total ZUSD Deposit = 100k
     * APR 5% in 1 year
     * ZUSD <> SOV price = 1:1
     * Expect to return ~5k of SOV after a year
     */
    const APR = toBN(500);
    const mockPrice = toBN(dec(1, 18));
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR;
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(100, 21))

    await communityIssuanceTester.setAPR(APR);
    await contracts.priceFeedSovryn.setPrice(contracts.zusdToken.address, zeroToken.address, mockPrice.toString());

    await assert.equal(initialTotalSOVIssued, 0);

    // Fast forward time
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    // Issue SOV
    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    // const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();
    const expectedTotalSOVIssued = '5000000000000000000000';

    assert.isAtMost(th.getDifference(latestTotalSOVIssued, expectedTotalSOVIssued), 1000000000000000);
  });

  // Error tolerance: 1e-3, i.e. 1/1000th of a token
  it("should issue the expected SOV based on pre-defined params (2)", async () => {
    /**
     * Total ZUSD Deposit = 50k
     * APR 10% in 1 year
     * ZUSD <> SOV price = 1:2
     * Expect to return ~10k of SOV after a year
     */
    const APR = toBN(1000);
    const mockPrice = toBN(dec(2, 18));
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR;
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(50, 21))

    await communityIssuanceTester.setAPR(APR);
    await contracts.priceFeedSovryn.setPrice(contracts.zusdToken.address, zeroToken.address, mockPrice.toString());

    await assert.equal(initialTotalSOVIssued, 0);

    // Fast forward time
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    // Issue SOV
    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    // const latestLastIssuanceTime = await communityIssuanceTester.lastIssuanceTime();
    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();
    const expectedTotalSOVIssued = '10000000000000000000000';

    assert.isAtMost(th.getDifference(latestTotalSOVIssued, expectedTotalSOVIssued), 1000000000000000);
  });

  it("should issue the expected SOV based on pre-defined params (3)", async () => {
    /**
     * Total ZUSD Deposit = 100k
     * APR 5% in 1 year
     * ZUSD <> SOV price = 1:1
     * Expect to return ~2.5k of SOV after half a year
     */
    const APR = toBN(500);
    const mockPrice = toBN(dec(1, 18));
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR / 2;
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(100, 21))

    await communityIssuanceTester.setAPR(APR);
    await contracts.priceFeedSovryn.setPrice(contracts.zusdToken.address, zeroToken.address, mockPrice.toString());

    await assert.equal(initialTotalSOVIssued, 0);

    // Fast forward time
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    // Issue SOV
    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();
    const expectedTotalSOVIssued = '2500000000000000000000';

    assert.isAtMost(th.getDifference(latestTotalSOVIssued, expectedTotalSOVIssued), 1000000000000000);
  });

  it("should issue the expected SOV based on pre-defined params with APR updates", async () => {
    /**
     * Total ZUSD Deposit = 100k
     * APR 5%, after half a year, set the APR to 10%
     * ZUSD <> SOV price = 1:1
     * Expect to return ~2.5k of SOV after half a year + ~5.5k of SOV the rest half of year
     */
    let APR = toBN(500);
    const mockPrice = toBN(dec(1, 18));
    const timeAccrual = timeValues.SECONDS_IN_ONE_YEAR / 2;
    const initialTotalSOVIssued = await communityIssuanceTester.totalSOVIssued()
    const zusdDeposits = toBN(dec(100, 21))

    await communityIssuanceTester.setAPR(APR);
    await contracts.priceFeedSovryn.setPrice(contracts.zusdToken.address, zeroToken.address, mockPrice.toString());

    await assert.equal(initialTotalSOVIssued, 0);

    // Fast forward time
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    // Issue SOV
    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    // Update APR to 10%
    APR = toBN(1000);
    await communityIssuanceTester.setAPR(APR);

    await assert.isTrue(initialTotalSOVIssued.gte('0'));

    // Fast forward time 
    await th.fastForwardTime(timeAccrual, web3.currentProvider);

    // Issue SOV
    await communityIssuanceTester.unprotectedIssueSOV(zusdDeposits);

    const latestTotalSOVIssued = await communityIssuanceTester.totalSOVIssued();
    const expectedTotalSOVIssued = '7500000000000000000000';

    assert.isAtMost(th.getDifference(latestTotalSOVIssued, expectedTotalSOVIssued), 1000000000000000);
  });

  /* ---  
  Accumulated issuance error: how many tokens are lost over a given period, for a given issuance frequency? 
  
  Slow tests are skipped.
  --- */

  // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every year, for 30 years", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 });

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') });
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice });

    assert.isTrue(await stabilityPool.isEligibleForZERO(alice));

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_YEAR;
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 30);

    await repeatedlyIssueSOV(stabilityPool, timeBetweenIssuances, duration);

    // Depositor withdraws their deposit and accumulated ZERO
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice });

    const ZEROBalance_A = await zeroToken.balanceOf(alice);
    const expectedZEROBalance_A = th.toBN('33333333302289200000000000');
    const diff = expectedZEROBalance_A.sub(ZEROBalance_A);

    // logZEROBalanceAndError(ZEROBalance_A, expectedZEROBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))));
  });
  /*  Results:
  
  Expected final balance: 33333333302289200000000000,
  Actual final balance: 33333333302289247499999999,
  Abs. error: -47499999999 */


  // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every day, for 30 years", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 });

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') });
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice });

    assert.isTrue(await stabilityPool.isEligibleForZERO(alice));

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_DAY;
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR * 30);

    await repeatedlyIssueSOV(stabilityPool, timeBetweenIssuances, duration);

    // Depositor withdraws their deposit and accumulated ZERO
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice });

    const ZEROBalance_A = await zeroToken.balanceOf(alice);
    const expectedZEROBalance_A = th.toBN('33333333302289200000000000');
    const diff = expectedZEROBalance_A.sub(ZEROBalance_A);

    // logZEROBalanceAndError(ZEROBalance_A, expectedZEROBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))));
  });
  /* Results:

  Expected final balance: 33333333302289200000000000,
  Actual final balance: 33333333302297188866666666,
  Abs. error: -7988866666666  */

  // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every minute, for 1 month", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 });

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') });
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice });

    assert.isTrue(await stabilityPool.isEligibleForZERO(alice));

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_MINUTE;
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_MONTH);

    await repeatedlyIssueSOV(stabilityPool, timeBetweenIssuances, duration);

    // Depositor withdraws their deposit and accumulated ZERO
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice });

    const ZEROBalance_A = await zeroToken.balanceOf(alice);
    const expectedZEROBalance_A = th.toBN('1845951269598880000000000');
    const diff = expectedZEROBalance_A.sub(ZEROBalance_A);

    // logZEROBalanceAndError(ZEROBalance_A, expectedZEROBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))));
  });
  /* Results:

  Expected final balance: 1845951269598880000000000,
  Actual final balance: 1845951269564420199999999,
  Abs. error: 34459800000001
  */

  // TODO: Convert to 25mil issuance schedule
  it.skip("Frequent token issuance: issuance event every minute, for 1 year", async () => {
    // Register front end with kickback rate = 100%
    await stabilityPool.registerFrontEnd(dec(1, 18), { from: frontEnd_1 });

    // Alice opens trove and deposits to SP
    await borrowerOperations.openTrove(th._100pct, dec(1, 18), alice, alice, { from: alice, value: dec(1, 'ether') });
    await stabilityPool.provideToSP(dec(1, 18), frontEnd_1, { from: alice });

    assert.isTrue(await stabilityPool.isEligibleForZERO(alice));

    const timeBetweenIssuances = timeValues.SECONDS_IN_ONE_MINUTE;
    const duration = await getDuration(timeValues.SECONDS_IN_ONE_YEAR);

    await repeatedlyIssueSOV(stabilityPool, timeBetweenIssuances, duration);

    // Depositor withdraws their deposit and accumulated ZERO
    await stabilityPool.withdrawFromSP(dec(1, 18), { from: alice });

    const ZEROBalance_A = await zeroToken.balanceOf(alice);
    const expectedZEROBalance_A = th.toBN('1845951269598880000000000');
    const diff = expectedZEROBalance_A.sub(ZEROBalance_A);

    // logZEROBalanceAndError(ZEROBalance_A, expectedZEROBalance_A)

    // Check the actual balance differs by no more than 1e18 (i.e. 1 token) from the expected balance
    assert.isTrue(diff.lte(th.toBN(dec(1, 18))));
  });
});
