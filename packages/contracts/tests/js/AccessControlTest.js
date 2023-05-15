const deploymentHelper = require("../../utils/js/deploymentHelpers.js");
const testHelpers = require("../../utils/js/testHelpers.js");
const TroveManagerTester = artifacts.require("TroveManagerTester");
const PriceFeedSovryn = artifacts.require("PriceFeedSovrynTester");

const th = testHelpers.TestHelper;
const timeValues = testHelpers.TimeValues;

const dec = th.dec;
const toBN = th.toBN;
const assertRevert = th.assertRevert;

/* The majority of access control tests are contained in this file. However, tests for restrictions 
on the Zero admin address's capabilities during the first year are found in:

test/launchSequenceTest/DuringLockupPeriodTest.js */

contract(
  "Access Control: Zero functions with the caller restricted to Zero contract(s)",
  async accounts => {
    const [owner, alice, bob, carol, feeSharingCollector] = accounts;
    const multisig = accounts[999];

    let coreContracts;

    let priceFeed;
    let zusdToken;
    let sortedTroves;
    let troveManager;
    let nameRegistry;
    let activePool;
    let stabilityPool;
    let defaultPool;
    let functionCaller;
    let borrowerOperations;

    let zeroStaking;
    let zeroToken;
    let communityIssuance;

    before(async () => {
      coreContracts = await deploymentHelper.deployLiquityCore();
      coreContracts.troveManager = await TroveManagerTester.new();
      coreContracts = await deploymentHelper.deployZUSDTokenTester(coreContracts);
      const ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig);

      priceFeed = coreContracts.priceFeedSovryn;
      zusdToken = coreContracts.zusdToken;
      sortedTroves = coreContracts.sortedTroves;
      troveManager = coreContracts.troveManager;
      nameRegistry = coreContracts.nameRegistry;
      activePool = coreContracts.activePool;
      stabilityPool = coreContracts.stabilityPool;
      defaultPool = coreContracts.defaultPool;
      functionCaller = coreContracts.functionCaller;
      borrowerOperations = coreContracts.borrowerOperations;

      zeroStaking = ZEROContracts.zeroStaking;
      zeroToken = ZEROContracts.zeroToken;
      communityIssuance = ZEROContracts.communityIssuance;

      await deploymentHelper.deployZEROTesterContractsHardhat(ZEROContracts);

      await zeroToken.unprotectedMint(multisig, toBN(dec(20, 24)));

      await deploymentHelper.connectZEROContracts(ZEROContracts);
      await deploymentHelper.connectCoreContracts(coreContracts, ZEROContracts);
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts);

      for (let account of accounts.slice(0, 10)) {
        await th.openTrove(coreContracts, {
          extraZUSDAmount: toBN(dec(20000, 18)),
          ICR: toBN(dec(2, 18)),
          extraParams: { from: account }
        });
      }
    });

    describe("BorrowerOperations", async accounts => {
      it("moveETHGainToTrove(): reverts when called by an account that is not StabilityPool", async () => {
        // Attempt call from alice
        try {
          const tx1 = await borrowerOperations.moveETHGainToTrove(bob, bob, bob, { from: bob });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "BorrowerOps: Caller is not Stability Pool")
        }
      });
    });

    describe("TroveManager", async accounts => {
      // applyPendingRewards
      it("applyPendingRewards(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.applyPendingRewards(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // updateRewardSnapshots
      it("updateRewardSnapshots(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.updateTroveRewardSnapshots(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // removeStake
      it("removeStake(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.removeStake(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // updateStakeAndTotalStakes
      it("updateStakeAndTotalStakes(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.updateStakeAndTotalStakes(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // closeTrove
      it("closeTrove(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.closeTrove(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // addTroveOwnerToArray
      it("addTroveOwnerToArray(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.addTroveOwnerToArray(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // setTroveStatus
      it("setTroveStatus(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.setTroveStatus(bob, 1, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // increaseTroveColl
      it("increaseTroveColl(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.increaseTroveColl(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // decreaseTroveColl
      it("decreaseTroveColl(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.decreaseTroveColl(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // increaseTroveDebt
      it("increaseTroveDebt(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.increaseTroveDebt(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // decreaseTroveDebt
      it("decreaseTroveDebt(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await troveManager.decreaseTroveDebt(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });
    });

    describe("ActivePool", async accounts => {
      // sendETH
      it("sendETH(): reverts when called by an account that is not BO nor TroveM nor SP", async () => {
        // Attempt call from alice
        try {
          const txAlice = await activePool.sendETH(alice, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(
            err.message,
            "Caller is neither BorrowerOperations nor TroveManager nor StabilityPool"
          );
        }
      });

      // increaseZUSD
      it("increaseZUSDDebt(): reverts when called by an account that is not BO nor TroveM", async () => {
        // Attempt call from alice
        try {
          const txAlice = await activePool.increaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is neither BorrowerOperations nor TroveManager");
        }
      });

      // decreaseZUSD
      it("decreaseZUSDDebt(): reverts when called by an account that is not BO nor TroveM nor SP", async () => {
        // Attempt call from alice
        try {
          const txAlice = await activePool.decreaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(
            err.message,
            "Caller is neither BorrowerOperations nor TroveManager nor StabilityPool"
          );
        }
      });

      // fallback (payment)
      it("fallback(): reverts when called by an account that is not Borrower Operations nor Default Pool", async () => {
        // Attempt call from alice
        try {
          const txAlice = await web3.eth.sendTransaction({
            from: alice,
            to: activePool.address,
            value: 100
          });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "ActivePool: Caller is neither BO nor Default Pool");
        }
      });
    });

    describe("DefaultPool", async accounts => {
      // sendETHToActivePool
      it("sendETHToActivePool(): reverts when called by an account that is not TroveManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await defaultPool.sendETHToActivePool(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not the TroveManager");
        }
      });

      // increaseZUSD
      it("increaseZUSDDebt(): reverts when called by an account that is not TroveManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await defaultPool.increaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not the TroveManager");
        }
      });

      // decreaseZUSD
      it("decreaseZUSD(): reverts when called by an account that is not TroveManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await defaultPool.decreaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not the TroveManager");
        }
      });

      // fallback (payment)
      it("fallback(): reverts when called by an account that is not the Active Pool", async () => {
        // Attempt call from alice
        try {
          const txAlice = await web3.eth.sendTransaction({
            from: alice,
            to: defaultPool.address,
            value: 100
          });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "DefaultPool: Caller is not the ActivePool");
        }
      });
    });

    describe("StabilityPool", async accounts => {
      // --- onlyTroveManager ---

      // offset
      it("offset(): reverts when called by an account that is not TroveManager", async () => {
        // Attempt call from alice
        try {
          txAlice = await stabilityPool.offset(100, 10, { from: alice });
          assert.fail(txAlice);
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not TroveManager");
        }
      });

      // --- onlyActivePool ---

      // fallback (payment)
      it("fallback(): reverts when called by an account that is not the Active Pool", async () => {
        // Attempt call from alice
        try {
          const txAlice = await web3.eth.sendTransaction({
            from: alice,
            to: stabilityPool.address,
            value: 100
          });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "StabilityPool: Caller is not ActivePool");
        }
      });
    });

    describe("ZUSDToken", async accounts => {
      //    mint
      it("mint(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        const txAlice = zusdToken.mint(bob, 100, { from: alice });
        await th.assertRevert(txAlice, "Caller is not BorrowerOperations");
      });

      // burn
      it("burn(): reverts when called by an account that is not BO nor TroveM nor SP", async () => {
        // Attempt call from alice
        try {
          const txAlice = await zusdToken.burn(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is neither BorrowerOperations nor TroveManager nor StabilityPool")
        }
      });

      // sendToPool
      it("sendToPool(): reverts when called by an account that is not StabilityPool", async () => {
        // Attempt call from alice
        try {
          const txAlice = await zusdToken.sendToPool(bob, activePool.address, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not the StabilityPool");
        }
      });

      // returnFromPool
      it("returnFromPool(): reverts when called by an account that is not TroveManager nor StabilityPool", async () => {
        // Attempt call from alice
        try {
          const txAlice = await zusdToken.returnFromPool(activePool.address, bob, 100, {
            from: alice
          });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is neither TroveManager nor StabilityPool")
        }
      });
    });

    describe("SortedTroves", async accounts => {
      // --- onlyBorrowerOperations ---
      //     insert
      it("insert(): reverts when called by an account that is not BorrowerOps or TroveM", async () => {
        // Attempt call from alice
        try {
          const txAlice = await sortedTroves.insert(bob, "150000000000000000000", bob, bob, {
            from: alice
          });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, " Caller is neither BO nor TroveM")
        }
      });

      // --- onlyTroveManager ---
      // remove
      it("remove(): reverts when called by an account that is not TroveManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await sortedTroves.remove(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, " Caller is not the TroveManager")
        }
      });

      // --- onlyTroveMorBM ---
      // reinsert
      it("reinsert(): reverts when called by an account that is neither BorrowerOps nor TroveManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await sortedTroves.reInsert(bob, "150000000000000000000", bob, bob, {
            from: alice
          });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is neither BO nor TroveM")
        }
      });
    });

    describe("ZEROStaking", async accounts => {
      it("increaseF_ZUSD(): reverts when caller is not TroveManager", async () => {
        try {
          const txAlice = await zeroStaking.increaseF_ZUSD(dec(1, 18), { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
        }
      });
    });

    describe("ZEROToken", async accounts => {
      /* disabled as zero token is not used in beta 
      it("sendToZEROStaking(): reverts when caller is not the ZEROSstaking", async () => {
        // Check multisig has some ZERO
        assert.isTrue((await zeroToken.balanceOf(multisig)).gt(toBN("0")));

        // multisig tries to call it
        try {
          const tx = await zeroToken.sendToZEROStaking(multisig, 1, { from: multisig });
        } catch (err) {
          assert.include(err.message, "revert");
        }

        // FF >> time one year
        await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);

        // Owner transfers 1 ZERO to bob
        await zeroToken.transfer(bob, dec(1, 18), { from: multisig });
        assert.equal(await zeroToken.balanceOf(bob), dec(1, 18));

        // Bob tries to call it
        try {
          const tx = await zeroToken.sendToZEROStaking(bob, dec(1, 18), { from: bob });
        } catch (err) {
          assert.include(err.message, "revert");
        }
      }); */
    });

    describe("CommunityIssuance", async accounts => {
      it("sendZERO(): reverts when caller is not the StabilityPool", async () => {
        const tx1 = communityIssuance.sendSOV(alice, dec(100, 18), { from: alice });
        const tx2 = communityIssuance.sendSOV(bob, dec(100, 18), { from: alice });
        const tx3 = communityIssuance.sendSOV(stabilityPool.address, dec(100, 18), { from: alice });

        await assertRevert(tx1);
        await assertRevert(tx2);
        await assertRevert(tx3);
      });

      it("issueZERO(): reverts when caller is not the StabilityPool", async () => {
        const tx1 = communityIssuance.issueSOV(100, { from: alice });

        await assertRevert(tx1);
      });

      it("setPriceFeed(): reverts when caller is not the owner", async () => {
        const initialPriceFeed = await communityIssuance.priceFeed();
        const tx1 = communityIssuance.setPriceFeed(priceFeed.address, { from: alice });

        await assertRevert(tx1);

        let recordedPriceFeed = await communityIssuance.priceFeed();
        assert.equal(recordedPriceFeed, initialPriceFeed);

        const newPriceFeed = await PriceFeedSovryn.new();
        await communityIssuance.setPriceFeed(newPriceFeed.address, { from: owner });

        recordedPriceFeed = await communityIssuance.priceFeed();
        assert.equal(recordedPriceFeed, newPriceFeed.address);
      });

      it("setRewardManager(): reverts when caller is not the owner", async () => {
        const tx1 = communityIssuance.setRewardManager(alice, { from: alice });

        await assertRevert(tx1);

        const recordedRewardManager = await communityIssuance.rewardManager();
        assert.equal(recordedRewardManager, th.ZERO_ADDRESS);
      });

      it("setAPR(): reverts when caller is not the rewardManager", async () => {
        const newAPR = 5000;
        await communityIssuance.setRewardManager(alice, { from: owner });

        const recordedRewardManager = await communityIssuance.rewardManager();
        assert.equal(recordedRewardManager, alice);

        const tx1 = communityIssuance.setAPR(newAPR, {from: owner});
        await assertRevert(tx1);

        await communityIssuance.setAPR(newAPR, {from: alice});
        
        const recordedAPR = await communityIssuance.APR()
        assert.equal(recordedAPR.toString(), newAPR);
      });
    });
  }
);
