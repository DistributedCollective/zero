const Decimal = require("decimal.js");
const deploymentHelper = require("../../utils/js/deploymentHelpers.js");
const { BNConverter } = require("../../utils/js/BNConverter.js");
const testHelpers = require("../../utils/js/testHelpers.js");
const timeMachine = require('ganache-time-traveler');

const ZEROStakingTester = artifacts.require('ZEROStakingTester');
const TroveManagerTester = artifacts.require("TroveManagerTester");
const NonPayable = artifacts.require("./NonPayable.sol");

const th = testHelpers.TestHelper;
const mv = testHelpers.MoneyValues;
const timeValues = testHelpers.TimeValues;
const dec = th.dec;
const assertRevert = th.assertRevert;

const toBN = th.toBN;
const ZERO = th.toBN('0');

/* NOTE: These tests do not test for specific ETH and ZUSD gain values. They only test that the 
 * gains are non-zero, occur when they should, and are in correct proportion to the user's stake. 
 *
 * Specific ETH/ZUSD gain values will depend on the final fee schedule used, and the final choices for
 * parameters BETA and MINUTE_DECAY_FACTOR in the TroveManager, which are still TBD based on economic
 * modelling.
 * 
 */

describe.skip("There are no longer fees being shared to ZeroStaking", function () {
  contract('ZEROStaking revenue share tests', async accounts => {

    const multisig = accounts[999];

    const [owner, A, B, C, D, E, F, G, whale, feeSharingCollector] = accounts;

    let priceFeed;
    let zusdToken;
    let sortedTroves;
    let troveManager;
    let activePool;
    let stabilityPool;
    let defaultPool;
    let borrowerOperations;
    let zeroStaking;
    let zeroToken;

    let contracts;

    const openTrove = async (params) => th.openTrove(contracts, params);

    before(async () => {
      contracts = await deploymentHelper.deployLiquityCore();
      contracts.troveManager = await TroveManagerTester.new();
      contracts = await deploymentHelper.deployZUSDTokenTester(contracts);
      const ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig);

      await ZEROContracts.zeroToken.unprotectedMint(multisig, toBN(dec(20, 24)));

      await deploymentHelper.connectZEROContracts(ZEROContracts);
      await deploymentHelper.connectCoreContracts(contracts, ZEROContracts);
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts);

      nonPayable = await NonPayable.new();
      priceFeed = contracts.priceFeedTestnet;
      zusdToken = contracts.zusdToken;
      sortedTroves = contracts.sortedTroves;
      troveManager = contracts.troveManager;
      activePool = contracts.activePool;
      stabilityPool = contracts.stabilityPool;
      defaultPool = contracts.defaultPool;
      borrowerOperations = contracts.borrowerOperations;
      hintHelpers = contracts.hintHelpers;

      zeroToken = ZEROContracts.zeroToken;
      zeroStaking = ZEROContracts.zeroStaking;
    });

    let revertToSnapshot;

    beforeEach(async () => {
      let snapshot = await timeMachine.takeSnapshot();
      revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result']);
    });

    afterEach(async () => {
      await revertToSnapshot();
    });

    it('stake(): reverts if amount is zero', async () => {
      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // console.log(`A zero bal: ${await zeroToken.balanceOf(A)}`)

      // A makes stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await assertRevert(zeroStaking.stake(0, { from: A }), "ZEROStaking: Amount must be non-zero");
    });

    it("ETH fee per ZERO staked increases when a redemption fee is triggered and totalStakes > 0", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // console.log(`A zero bal: ${await zeroToken.balanceOf(A)}`)

      // A makes stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await zeroStaking.stake(dec(100, 18), { from: A });

      // Check ETH fee per unit staked is zero
      const F_ETH_Before = await zeroStaking.F_ETH();
      assert.equal(F_ETH_Before, '0');

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // check ETH fee emitted in event is non-zero
      const emittedETHFee = toBN((await th.getEmittedRedemptionValues(redemptionTx))[3]);
      assert.isTrue(emittedETHFee.gt(toBN('0')));

      // Check ETH fee per unit staked has increased by correct amount
      const F_ETH_After = await zeroStaking.F_ETH();

      // Expect fee per unit staked = fee/100, since there is 100 ZUSD totalStaked
      // 20% sent to feeSharingCollector address
      const ethFeeToFeeSharingCollector = emittedETHFee.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking = emittedETHFee.sub(ethFeeToFeeSharingCollector);
      const expected_F_ETH_After = ethFeeToZeroStalking.div(toBN('100'));

      assert.isTrue(expected_F_ETH_After.eq(F_ETH_After));
    });

    it("ETH fee per ZERO staked doesn't change when a redemption fee is triggered and totalStakes == 0", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // Check ETH fee per unit staked is zero
      const F_ETH_Before = await zeroStaking.F_ETH();
      assert.equal(F_ETH_Before, '0');

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // check ETH fee emitted in event is non-zero
      const emittedETHFee = toBN((await th.getEmittedRedemptionValues(redemptionTx))[3]);
      assert.isTrue(emittedETHFee.gt(toBN('0')));

      // Check ETH fee per unit staked has not increased 
      const F_ETH_After = await zeroStaking.F_ETH();
      assert.equal(F_ETH_After, '0');
    });

    it("ZUSD fee per ZERO staked increases when a redemption fee is triggered and totalStakes > 0", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // A makes stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await zeroStaking.stake(dec(100, 18), { from: A });

      // Check ZUSD fee per unit staked is zero
      const F_ZUSD_Before = await zeroStaking.F_ETH();
      assert.equal(F_ZUSD_Before, '0');

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // Check base rate is now non-zero
      const baseRate = await troveManager.baseRate();
      assert.isTrue(baseRate.gt(toBN('0')));

      // D draws debt
      const tx = await borrowerOperations.withdrawZUSD(th._100pct, dec(27, 18), D, D, { from: D });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(tx));
      assert.isTrue(emittedZUSDFee.gt(toBN('0')));

      // Check ZUSD fee per unit staked has increased by correct amount
      const F_ZUSD_After = await zeroStaking.F_ZUSD();

      // Expect fee per unit staked = fee/100, since there is 100 ZUSD totalStaked
      // 20% sent to feeSharingCollector address
      const zusdFeeToFeeSharingCollector = emittedZUSDFee.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking = emittedZUSDFee.sub(zusdFeeToFeeSharingCollector);
      const expected_F_ZUSD_After = zusdFeeToZeroStalking.div(toBN('100'));

      assert.isTrue(expected_F_ZUSD_After.eq(F_ZUSD_After));
    });

    it("ZUSD fee per ZERO staked doesn't change when a redemption fee is triggered and totalStakes == 0", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // Check ZUSD fee per unit staked is zero
      const F_ZUSD_Before = await zeroStaking.F_ETH();
      assert.equal(F_ZUSD_Before, '0');

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // Check base rate is now non-zero
      const baseRate = await troveManager.baseRate();
      assert.isTrue(baseRate.gt(toBN('0')));

      // D draws debt
      const tx = await borrowerOperations.withdrawZUSD(th._100pct, dec(27, 18), D, D, { from: D });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(tx));
      assert.isTrue(emittedZUSDFee.gt(toBN('0')));

      // Check ZUSD fee per unit staked did not increase, is still zero
      const F_ZUSD_After = await zeroStaking.F_ZUSD();
      assert.equal(F_ZUSD_After, '0');
    });

    it("ZERO Staking: A single staker earns all ETH and ZERO fees that occur", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // A makes stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await zeroStaking.stake(dec(100, 18), { from: A });

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // check ETH fee 1 emitted in event is non-zero
      const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3]);
      assert.isTrue(emittedETHFee_1.gt(toBN('0')));

      const C_BalBeforeREdemption = await zusdToken.balanceOf(C);
      // C redeems
      const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18));

      const C_BalAfterRedemption = await zusdToken.balanceOf(C);
      assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption));

      // check ETH fee 2 emitted in event is non-zero
      const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3]);
      assert.isTrue(emittedETHFee_2.gt(toBN('0')));

      // D draws debt
      const borrowingTx_1 = await borrowerOperations.withdrawZUSD(th._100pct, dec(104, 18), D, D, { from: D });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee_1 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_1));
      assert.isTrue(emittedZUSDFee_1.gt(toBN('0')));

      // B draws debt
      const borrowingTx_2 = await borrowerOperations.withdrawZUSD(th._100pct, dec(17, 18), B, B, { from: B });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee_2 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_2));
      assert.isTrue(emittedZUSDFee_2.gt(toBN('0')));

      // 20% sent to feeSharingCollector address
      const ethFeeToFeeSharingCollector_1 = emittedETHFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_1 = emittedETHFee_1.sub(ethFeeToFeeSharingCollector_1);
      const ethFeeToFeeSharingCollector_2 = emittedETHFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const rethFeeToZeroStalking_2 = emittedETHFee_2.sub(ethFeeToFeeSharingCollector_2);
      const expectedTotalETHGain = ethFeeToZeroStalking_1.add(rethFeeToZeroStalking_2);

      // 20% sent to feeSharingCollector address
      const zusdFeeToFeeSharingCollector_1 = emittedZUSDFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_1 = emittedZUSDFee_1.sub(zusdFeeToFeeSharingCollector_1);
      const zusdFeeToFeeSharingCollector_2 = emittedZUSDFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_2 = emittedZUSDFee_2.sub(zusdFeeToFeeSharingCollector_2);
      const expectedTotalZUSDGain = zusdFeeToZeroStalking_1.add(zusdFeeToZeroStalking_2);

      const A_ETHBalance_Before = toBN(await web3.eth.getBalance(A));
      const A_ZUSDBalance_Before = toBN(await zusdToken.balanceOf(A));

      // A un-stakes
      await zeroStaking.unstake(dec(100, 18), { from: A, gasPrice: 0 });

      const A_ETHBalance_After = toBN(await web3.eth.getBalance(A));
      const A_ZUSDBalance_After = toBN(await zusdToken.balanceOf(A));


      const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before);
      const A_ZUSDGain = A_ZUSDBalance_After.sub(A_ZUSDBalance_Before);

      assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000);
      assert.isAtMost(th.getDifference(expectedTotalZUSDGain, A_ZUSDGain), 1000);
    });

    it("stake(): Top-up sends out all accumulated ETH and ZUSD gains to the staker", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // A makes stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await zeroStaking.stake(dec(50, 18), { from: A });

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // check ETH fee 1 emitted in event is non-zero
      const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3]);
      assert.isTrue(emittedETHFee_1.gt(toBN('0')));

      const C_BalBeforeREdemption = await zusdToken.balanceOf(C);
      // C redeems
      const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18));

      const C_BalAfterRedemption = await zusdToken.balanceOf(C);
      assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption));

      // check ETH fee 2 emitted in event is non-zero
      const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3]);
      assert.isTrue(emittedETHFee_2.gt(toBN('0')));

      // D draws debt
      const borrowingTx_1 = await borrowerOperations.withdrawZUSD(th._100pct, dec(104, 18), D, D, { from: D });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee_1 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_1));
      assert.isTrue(emittedZUSDFee_1.gt(toBN('0')));

      // B draws debt
      const borrowingTx_2 = await borrowerOperations.withdrawZUSD(th._100pct, dec(17, 18), B, B, { from: B });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee_2 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_2));
      assert.isTrue(emittedZUSDFee_2.gt(toBN('0')));


      // 20% sent to feeSharingCollector address
      const ethFeeToFeeSharingCollector_1 = emittedETHFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_1 = emittedETHFee_1.sub(ethFeeToFeeSharingCollector_1);
      const ethFeeToFeeSharingCollector_2 = emittedETHFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_2 = emittedETHFee_2.sub(ethFeeToFeeSharingCollector_2);
      const expectedTotalETHGain = ethFeeToZeroStalking_1.add(ethFeeToZeroStalking_2);

      // 20% sent to feeSharingCollector address
      const zusdFeeToFeeSharingCollector_1 = emittedZUSDFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_1 = emittedZUSDFee_1.sub(zusdFeeToFeeSharingCollector_1);
      const zusdDFeeToFeeSharingCollector_2 = emittedZUSDFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_2 = emittedZUSDFee_2.sub(zusdDFeeToFeeSharingCollector_2);
      const expectedTotalZUSDGain = zusdFeeToZeroStalking_1.add(zusdFeeToZeroStalking_2);

      const A_ETHBalance_Before = toBN(await web3.eth.getBalance(A));
      const A_ZUSDBalance_Before = toBN(await zusdToken.balanceOf(A));

      // A tops up
      await zeroStaking.stake(dec(50, 18), { from: A, gasPrice: 0 });

      const A_ETHBalance_After = toBN(await web3.eth.getBalance(A));
      const A_ZUSDBalance_After = toBN(await zusdToken.balanceOf(A));

      const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before);
      const A_ZUSDGain = A_ZUSDBalance_After.sub(A_ZUSDBalance_Before);

      assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000);
      assert.isAtMost(th.getDifference(expectedTotalZUSDGain, A_ZUSDGain), 1000);
    });

    it("getPendingETHGain(): Returns the staker's correct pending ETH gain", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // A makes stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await zeroStaking.stake(dec(50, 18), { from: A });

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // check ETH fee 1 emitted in event is non-zero
      const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3]);
      assert.isTrue(emittedETHFee_1.gt(toBN('0')));

      const C_BalBeforeREdemption = await zusdToken.balanceOf(C);
      // C redeems
      const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18));

      const C_BalAfterRedemption = await zusdToken.balanceOf(C);
      assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption));

      // check ETH fee 2 emitted in event is non-zero
      const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3]);
      assert.isTrue(emittedETHFee_2.gt(toBN('0')));

      // 20% sent to feeSharingCollector address
      const ethFeeToFeeSharingCollector_1 = emittedETHFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_1 = emittedETHFee_1.sub(ethFeeToFeeSharingCollector_1);
      const ethFeeToFeeSharingCollector_2 = emittedETHFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_2 = emittedETHFee_2.sub(ethFeeToFeeSharingCollector_2);
      const expectedTotalETHGain = ethFeeToZeroStalking_1.add(ethFeeToZeroStalking_2);

      const A_ETHGain = await zeroStaking.getPendingETHGain(A);

      assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000);
    });

    it("getPendingZUSDGain(): Returns the staker's correct pending ZUSD gain", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });

      // A makes stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await zeroStaking.stake(dec(50, 18), { from: A });

      const B_BalBeforeREdemption = await zusdToken.balanceOf(B);
      // B redeems
      const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18));

      const B_BalAfterRedemption = await zusdToken.balanceOf(B);
      assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption));

      // check ETH fee 1 emitted in event is non-zero
      const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3]);
      assert.isTrue(emittedETHFee_1.gt(toBN('0')));

      const C_BalBeforeREdemption = await zusdToken.balanceOf(C);
      // C redeems
      const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18));

      const C_BalAfterRedemption = await zusdToken.balanceOf(C);
      assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption));

      // check ETH fee 2 emitted in event is non-zero
      const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3]);
      assert.isTrue(emittedETHFee_2.gt(toBN('0')));

      // D draws debt
      const borrowingTx_1 = await borrowerOperations.withdrawZUSD(th._100pct, dec(104, 18), D, D, { from: D });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee_1 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_1));
      assert.isTrue(emittedZUSDFee_1.gt(toBN('0')));

      // B draws debt
      const borrowingTx_2 = await borrowerOperations.withdrawZUSD(th._100pct, dec(17, 18), B, B, { from: B });

      // Check ZUSD fee value in event is non-zero
      const emittedZUSDFee_2 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_2));
      assert.isTrue(emittedZUSDFee_2.gt(toBN('0')));

      // 20% sent to feeSharingCollector address
      const zusdFeeToFeeSharingCollector_1 = emittedZUSDFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_1 = emittedZUSDFee_1.sub(zusdFeeToFeeSharingCollector_1);
      const zusdDFeeToFeeSharingCollector_2 = emittedZUSDFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_2 = emittedZUSDFee_2.sub(zusdDFeeToFeeSharingCollector_2);
      const expectedTotalZUSDGain = zusdFeeToZeroStalking_1.add(zusdFeeToZeroStalking_2);
      const A_ZUSDGain = await zeroStaking.getPendingZUSDGain(A);

      assert.isAtMost(th.getDifference(expectedTotalZUSDGain, A_ZUSDGain), 1000);
    });

    // - multi depositors, several rewards
    it("ZERO Staking: Multiple stakers earn the correct share of all ETH and ZERO fees, based on their stake size", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: E } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: F } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: G } });

      // FF time one year so owner can transfer ZERO
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A, B, C
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });
      await zeroToken.transfer(B, dec(200, 18), { from: multisig });
      await zeroToken.transfer(C, dec(300, 18), { from: multisig });

      // A, B, C make stake
      await zeroToken.approve(zeroStaking.address, dec(100, 18), { from: A });
      await zeroToken.approve(zeroStaking.address, dec(200, 18), { from: B });
      await zeroToken.approve(zeroStaking.address, dec(300, 18), { from: C });
      await zeroStaking.stake(dec(100, 18), { from: A });
      await zeroStaking.stake(dec(200, 18), { from: B });
      await zeroStaking.stake(dec(300, 18), { from: C });

      // Confirm staking contract holds 600 ZERO
      // console.log(`zero staking ZERO bal: ${await zeroToken.balanceOf(zeroStaking.address)}`)
      assert.equal(await zeroToken.balanceOf(zeroStaking.address), dec(600, 18));
      assert.equal(await zeroStaking.totalZEROStaked(), dec(600, 18));

      // F redeems
      const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(F, contracts, dec(45, 18));
      const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3]);
      assert.isTrue(emittedETHFee_1.gt(toBN('0')));

      // G redeems
      const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(G, contracts, dec(197, 18));
      const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3]);
      assert.isTrue(emittedETHFee_2.gt(toBN('0')));

      // F draws debt
      const borrowingTx_1 = await borrowerOperations.withdrawZUSD(th._100pct, dec(104, 18), F, F, { from: F });
      const emittedZUSDFee_1 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_1));
      assert.isTrue(emittedZUSDFee_1.gt(toBN('0')));

      // G draws debt
      const borrowingTx_2 = await borrowerOperations.withdrawZUSD(th._100pct, dec(17, 18), G, G, { from: G });
      const emittedZUSDFee_2 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_2));
      assert.isTrue(emittedZUSDFee_2.gt(toBN('0')));

      // D obtains ZERO from owner and makes a stake
      await zeroToken.transfer(D, dec(50, 18), { from: multisig });
      await zeroToken.approve(zeroStaking.address, dec(50, 18), { from: D });
      await zeroStaking.stake(dec(50, 18), { from: D });

      // Confirm staking contract holds 650 ZERO
      assert.equal(await zeroToken.balanceOf(zeroStaking.address), dec(650, 18));
      assert.equal(await zeroStaking.totalZEROStaked(), dec(650, 18));

      // G redeems
      const redemptionTx_3 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(197, 18));
      const emittedETHFee_3 = toBN((await th.getEmittedRedemptionValues(redemptionTx_3))[3]);
      assert.isTrue(emittedETHFee_3.gt(toBN('0')));

      // G draws debt
      const borrowingTx_3 = await borrowerOperations.withdrawZUSD(th._100pct, dec(17, 18), G, G, { from: G });
      const emittedZUSDFee_3 = toBN(th.getZUSDFeeFromZUSDBorrowingEvent(borrowingTx_3));
      assert.isTrue(emittedZUSDFee_3.gt(toBN('0')));

      /*  
      Expected rewards:
  
      A_ETH: (100* ETHFee_1)/600 + (100* ETHFee_2)/600 + (100*ETH_Fee_3)/650
      B_ETH: (200* ETHFee_1)/600 + (200* ETHFee_2)/600 + (200*ETH_Fee_3)/650
      C_ETH: (300* ETHFee_1)/600 + (300* ETHFee_2)/600 + (300*ETH_Fee_3)/650
      D_ETH:                                             (100*ETH_Fee_3)/650
  
      A_ZUSD: (100*ZUSDFee_1 )/600 + (100* ZUSDFee_2)/600 + (100*ZUSDFee_3)/650
      B_ZUSD: (200* ZUSDFee_1)/600 + (200* ZUSDFee_2)/600 + (200*ZUSDFee_3)/650
      C_ZUSD: (300* ZUSDFee_1)/600 + (300* ZUSDFee_2)/600 + (300*ZUSDFee_3)/650
      D_ZUSD:                                               (100*ZUSDFee_3)/650
      */

      // Expected ETH gains

      // 20% sent to feeSharingCollector address
      const ethFeeToFeeSharingCollector_1 = emittedETHFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_1 = emittedETHFee_1.sub(ethFeeToFeeSharingCollector_1);
      const ethFeeToFeeSharingCollector_2 = emittedETHFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_2 = emittedETHFee_2.sub(ethFeeToFeeSharingCollector_2);
      const ethFeeToFeeSharingCollector_3 = emittedETHFee_3.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const ethFeeToZeroStalking_3 = emittedETHFee_3.sub(ethFeeToFeeSharingCollector_3);
      const expectedETHGain_A = toBN('100').mul(ethFeeToZeroStalking_1).div(toBN('600'))
        .add(toBN('100').mul(ethFeeToZeroStalking_2).div(toBN('600')))
        .add(toBN('100').mul(ethFeeToZeroStalking_3).div(toBN('650')));

      const expectedETHGain_B = toBN('200').mul(ethFeeToZeroStalking_1).div(toBN('600'))
        .add(toBN('200').mul(ethFeeToZeroStalking_2).div(toBN('600')))
        .add(toBN('200').mul(ethFeeToZeroStalking_3).div(toBN('650')));

      const expectedETHGain_C = toBN('300').mul(ethFeeToZeroStalking_1).div(toBN('600'))
        .add(toBN('300').mul(ethFeeToZeroStalking_2).div(toBN('600')))
        .add(toBN('300').mul(ethFeeToZeroStalking_3).div(toBN('650')));

      const expectedETHGain_D = toBN('50').mul(ethFeeToZeroStalking_3).div(toBN('650'));

      // Expected ZUSD gains:

      // 20% sent to feeSharingCollector address
      const zusdFeeToFeeSharingCollector_1 = emittedZUSDFee_1.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_1 = emittedZUSDFee_1.sub(zusdFeeToFeeSharingCollector_1);
      const zusdFeeToFeeSharingCollector_2 = emittedZUSDFee_2.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_2 = emittedZUSDFee_2.sub(zusdFeeToFeeSharingCollector_2);
      const zusdFeeToFeeSharingCollector_3 = emittedZUSDFee_3.mul(toBN(dec(20, 16))).div(mv._1e18BN);
      const zusdFeeToZeroStalking_3 = emittedZUSDFee_3.sub(zusdFeeToFeeSharingCollector_3);
      const expectedZUSDGain_A = toBN('100').mul(zusdFeeToZeroStalking_1).div(toBN('600'))
        .add(toBN('100').mul(zusdFeeToZeroStalking_2).div(toBN('600')))
        .add(toBN('100').mul(zusdFeeToZeroStalking_3).div(toBN('650')));

      const expectedZUSDGain_B = toBN('200').mul(zusdFeeToZeroStalking_1).div(toBN('600'))
        .add(toBN('200').mul(zusdFeeToZeroStalking_2).div(toBN('600')))
        .add(toBN('200').mul(zusdFeeToZeroStalking_3).div(toBN('650')));

      const expectedZUSDGain_C = toBN('300').mul(zusdFeeToZeroStalking_1).div(toBN('600'))
        .add(toBN('300').mul(zusdFeeToZeroStalking_2).div(toBN('600')))
        .add(toBN('300').mul(zusdFeeToZeroStalking_3).div(toBN('650')));

      const expectedZUSDGain_D = toBN('50').mul(zusdFeeToZeroStalking_3).div(toBN('650'));


      const A_ETHBalance_Before = toBN(await web3.eth.getBalance(A));
      const A_ZUSDBalance_Before = toBN(await zusdToken.balanceOf(A));
      const B_ETHBalance_Before = toBN(await web3.eth.getBalance(B));
      const B_ZUSDBalance_Before = toBN(await zusdToken.balanceOf(B));
      const C_ETHBalance_Before = toBN(await web3.eth.getBalance(C));
      const C_ZUSDBalance_Before = toBN(await zusdToken.balanceOf(C));
      const D_ETHBalance_Before = toBN(await web3.eth.getBalance(D));
      const D_ZUSDBalance_Before = toBN(await zusdToken.balanceOf(D));

      // A-D un-stake
      const unstake_A = await zeroStaking.unstake(dec(100, 18), { from: A, gasPrice: 0 });
      const unstake_B = await zeroStaking.unstake(dec(200, 18), { from: B, gasPrice: 0 });
      const unstake_C = await zeroStaking.unstake(dec(400, 18), { from: C, gasPrice: 0 });
      const unstake_D = await zeroStaking.unstake(dec(50, 18), { from: D, gasPrice: 0 });

      // Confirm all depositors could withdraw

      //Confirm pool Size is now 0
      assert.equal((await zeroToken.balanceOf(zeroStaking.address)), '0');
      assert.equal((await zeroStaking.totalZEROStaked()), '0');

      // Get A-D ETH and ZUSD balances
      const A_ETHBalance_After = toBN(await web3.eth.getBalance(A));
      const A_ZUSDBalance_After = toBN(await zusdToken.balanceOf(A));
      const B_ETHBalance_After = toBN(await web3.eth.getBalance(B));
      const B_ZUSDBalance_After = toBN(await zusdToken.balanceOf(B));
      const C_ETHBalance_After = toBN(await web3.eth.getBalance(C));
      const C_ZUSDBalance_After = toBN(await zusdToken.balanceOf(C));
      const D_ETHBalance_After = toBN(await web3.eth.getBalance(D));
      const D_ZUSDBalance_After = toBN(await zusdToken.balanceOf(D));

      // Get ETH and ZUSD gains
      const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before);
      const A_ZUSDGain = A_ZUSDBalance_After.sub(A_ZUSDBalance_Before);
      const B_ETHGain = B_ETHBalance_After.sub(B_ETHBalance_Before);
      const B_ZUSDGain = B_ZUSDBalance_After.sub(B_ZUSDBalance_Before);
      const C_ETHGain = C_ETHBalance_After.sub(C_ETHBalance_Before);
      const C_ZUSDGain = C_ZUSDBalance_After.sub(C_ZUSDBalance_Before);
      const D_ETHGain = D_ETHBalance_After.sub(D_ETHBalance_Before);
      const D_ZUSDGain = D_ZUSDBalance_After.sub(D_ZUSDBalance_Before);

      // Check gains match expected amounts
      assert.isAtMost(th.getDifference(expectedETHGain_A, A_ETHGain), 1000);
      assert.isAtMost(th.getDifference(expectedZUSDGain_A, A_ZUSDGain), 1000);
      assert.isAtMost(th.getDifference(expectedETHGain_B, B_ETHGain), 1000);
      assert.isAtMost(th.getDifference(expectedZUSDGain_B, B_ZUSDGain), 1000);
      assert.isAtMost(th.getDifference(expectedETHGain_C, C_ETHGain), 1000);
      assert.isAtMost(th.getDifference(expectedZUSDGain_C, C_ZUSDGain), 1000);
      assert.isAtMost(th.getDifference(expectedETHGain_D, D_ETHGain), 1000);
      assert.isAtMost(th.getDifference(expectedZUSDGain_D, D_ZUSDGain), 1000);
    });

    it("unstake(): reverts if caller has ETH gains and can't receive ETH", async () => {
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } });
      await openTrove({ extraZUSDAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } });
      await openTrove({ extraZUSDAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } });
      await openTrove({ extraZUSDAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } });
      await openTrove({ extraZUSDAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } });

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

      // multisig transfers ZERO to staker A and the non-payable proxy
      await zeroToken.transfer(A, dec(100, 18), { from: multisig });
      await zeroToken.transfer(nonPayable.address, dec(100, 18), { from: multisig });

      //  A makes stake
      const A_stakeTx = await zeroStaking.stake(dec(100, 18), { from: A });
      assert.isTrue(A_stakeTx.receipt.status);

      //  A tells proxy to make a stake
      const proxystakeTxData = await th.getTransactionData('stake(uint256)', ['0x56bc75e2d63100000']);  // proxy stakes 100 ZERO
      await nonPayable.forward(zeroStaking.address, proxystakeTxData, { from: A });


      // B makes a redemption, creating ETH gain for proxy
      const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(45, 18));

      const proxy_ETHGain = await zeroStaking.getPendingETHGain(nonPayable.address);
      assert.isTrue(proxy_ETHGain.gt(toBN('0')));

      // Expect this tx to revert: stake() tries to send nonPayable proxy's accumulated ETH gain (albeit 0),
      //  A tells proxy to unstake
      const proxyUnStakeTxData = await th.getTransactionData('unstake(uint256)', ['0x56bc75e2d63100000']);  // proxy stakes 100 ZERO
      const proxyUnstakeTxPromise = nonPayable.forward(zeroStaking.address, proxyUnStakeTxData, { from: A });

      // but nonPayable proxy can not accept ETH - therefore stake() reverts.
      await assertRevert(proxyUnstakeTxPromise);
    });

    it("receive(): reverts when it receives ETH from an address that is not the Active Pool", async () => {
      const ethSendTxPromise1 = web3.eth.sendTransaction({ to: zeroStaking.address, from: A, value: dec(1, 'ether') });
      const ethSendTxPromise2 = web3.eth.sendTransaction({ to: zeroStaking.address, from: owner, value: dec(1, 'ether') });

      await assertRevert(ethSendTxPromise1);
      await assertRevert(ethSendTxPromise2);
    });

    it("unstake(): reverts if user has no stake", async () => {
      const unstakeTxPromise1 = zeroStaking.unstake(1, { from: A });
      const unstakeTxPromise2 = zeroStaking.unstake(1, { from: owner });

      await assertRevert(unstakeTxPromise1);
      await assertRevert(unstakeTxPromise2);
    });

    it('Test requireCallerIsTroveManager', async () => {
      const zeroStakingTester = await ZEROStakingTester.new();
      await assertRevert(zeroStakingTester.requireCallerIsFeeDistributor(), 'ZEROStaking: caller is not FeeDistributor');
    });
  });
})

