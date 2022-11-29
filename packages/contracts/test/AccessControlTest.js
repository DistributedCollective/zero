const deploymentHelper = require("../utils/deploymentHelpers.js");
const testHelpers = require("../utils/testHelpers.js");
const LoCManagerTester = artifacts.require("LoCManagerTester");

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
    const [owner, alice, bob, carol, sovFeeCollector] = accounts;
    const multisig = accounts[999];

    let coreContracts;

    let priceFeed;
    let zusdToken;
    let sortedLoCs;
    let locManager;
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
      coreContracts = await deploymentHelper.deployZeroCore();
      coreContracts.locManager = await LoCManagerTester.new();
      coreContracts = await deploymentHelper.deployZUSDTokenTester(coreContracts);
      const ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig);

      priceFeed = coreContracts.priceFeed;
      zusdToken = coreContracts.zusdToken;
      sortedLoCs = coreContracts.sortedLoCs;
      locManager = coreContracts.locManager;
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
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts, owner);

      for (account of accounts.slice(0, 10)) {
        await th.openLoC(coreContracts, {
          extraZUSDAmount: toBN(dec(20000, 18)),
          ICR: toBN(dec(2, 18)),
          extraParams: { from: account }
        });
      }
    });

    describe("BorrowerOperations", async accounts => {
      it("moveBTCGainToLoC(): reverts when called by an account that is not StabilityPool", async () => {
        // Attempt call from alice
        try {
          const tx1 = await borrowerOperations.moveBTCGainToLoC(bob, bob, bob, { from: bob });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "BorrowerOps: Caller is not Stability Pool")
        }
      });
    });

    describe("LoCManager", async accounts => {
      // applyPendingRewards
      it("applyPendingRewards(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.applyPendingRewards(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // updateRewardSnapshots
      it("updateRewardSnapshots(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.updateLoCRewardSnapshots(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // removeStake
      it("removeStake(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.removeStake(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // updateStakeAndTotalStakes
      it("updateStakeAndTotalStakes(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.updateStakeAndTotalStakes(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // closeLoC
      it("closeLoC(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.closeLoC(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // addLoCOwnerToArray
      it("addLoCOwnerToArray(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.addLoCOwnerToArray(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // setLoCStatus
      it("setLoCStatus(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.setLoCStatus(bob, 1, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // increaseLoCColl
      it("increaseLoCColl(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.increaseLoCColl(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // decreaseLoCColl
      it("decreaseLoCColl(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.decreaseLoCColl(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // increaseLoCDebt
      it("increaseLoCDebt(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.increaseLoCDebt(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });

      // decreaseLoCDebt
      it("decreaseLoCDebt(): reverts when called by an account that is not BorrowerOperations", async () => {
        // Attempt call from alice
        try {
          const txAlice = await locManager.decreaseLoCDebt(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is not the BorrowerOperations contract")
        }
      });
    });

    describe("ActivePool", async accounts => {
      // sendBTC
      it("sendBTC(): reverts when called by an account that is not BO nor LoCM nor SP", async () => {
        // Attempt call from alice
        try {
          const txAlice = await activePool.sendBTC(alice, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(
            err.message,
            "Caller is neither BorrowerOperations nor LoCManager nor StabilityPool"
          );
        }
      });

      // increaseZUSD
      it("increaseZUSDDebt(): reverts when called by an account that is not BO nor LoCM", async () => {
        // Attempt call from alice
        try {
          const txAlice = await activePool.increaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is neither BorrowerOperations nor LoCManager");
        }
      });

      // decreaseZUSD
      it("decreaseZUSDDebt(): reverts when called by an account that is not BO nor LoCM nor SP", async () => {
        // Attempt call from alice
        try {
          const txAlice = await activePool.decreaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(
            err.message,
            "Caller is neither BorrowerOperations nor LoCManager nor StabilityPool"
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
      // sendBTCToActivePool
      it("sendBTCToActivePool(): reverts when called by an account that is not LoCManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await defaultPool.sendBTCToActivePool(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not the LoCManager");
        }
      });

      // increaseZUSD
      it("increaseZUSDDebt(): reverts when called by an account that is not LoCManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await defaultPool.increaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not the LoCManager");
        }
      });

      // decreaseZUSD
      it("decreaseZUSD(): reverts when called by an account that is not LoCManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await defaultPool.decreaseZUSDDebt(100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not the LoCManager");
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
      // --- onlyLoCManager ---

      // offset
      it("offset(): reverts when called by an account that is not LoCManager", async () => {
        // Attempt call from alice
        try {
          txAlice = await stabilityPool.offset(100, 10, { from: alice });
          assert.fail(txAlice);
        } catch (err) {
          assert.include(err.message, "revert");
          assert.include(err.message, "Caller is not LoCManager");
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
      it("burn(): reverts when called by an account that is not BO nor LoCM nor SP", async () => {
        // Attempt call from alice
        try {
          const txAlice = await zusdToken.burn(bob, 100, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is neither BorrowerOperations nor LoCManager nor StabilityPool")
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
      it("returnFromPool(): reverts when called by an account that is not LoCManager nor StabilityPool", async () => {
        // Attempt call from alice
        try {
          const txAlice = await zusdToken.returnFromPool(activePool.address, bob, 100, {
            from: alice
          });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is neither LoCManager nor StabilityPool")
        }
      });
    });

    describe("SortedLoCs", async accounts => {
      // --- onlyBorrowerOperations ---
      //     insert
      it("insert(): reverts when called by an account that is not BorrowerOps or LoCM", async () => {
        // Attempt call from alice
        try {
          const txAlice = await sortedLoCs.insert(bob, "150000000000000000000", bob, bob, {
            from: alice
          });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, " Caller is neither BO nor LoCM")
        }
      });

      // --- onlyLoCManager ---
      // remove
      it("remove(): reverts when called by an account that is not LoCManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await sortedLoCs.remove(bob, { from: alice });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, " Caller is not the LoCManager")
        }
      });

      // --- onlyLoCMorBM ---
      // reinsert
      it("reinsert(): reverts when called by an account that is neither BorrowerOps nor LoCManager", async () => {
        // Attempt call from alice
        try {
          const txAlice = await sortedLoCs.reInsert(bob, "150000000000000000000", bob, bob, {
            from: alice
          });
        } catch (err) {
          assert.include(err.message, "revert");
          // assert.include(err.message, "Caller is neither BO nor LoCM")
        }
      });
    });

    describe("ZEROStaking", async accounts => {
      it("increaseF_ZUSD(): reverts when caller is not LoCManager", async () => {
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
        const tx1 = communityIssuance.sendZERO(alice, dec(100, 18), { from: alice });
        const tx2 = communityIssuance.sendZERO(bob, dec(100, 18), { from: alice });
        const tx3 = communityIssuance.sendZERO(stabilityPool.address, dec(100, 18), { from: alice });

        assertRevert(tx1);
        assertRevert(tx2);
        assertRevert(tx3);
      });

      it("issueZERO(): reverts when caller is not the StabilityPool", async () => {
        const tx1 = communityIssuance.issueZERO({ from: alice });

        assertRevert(tx1);
      });
    });
  }
);
