const deploymentHelper = require("../../utils/deploymentHelpers.js")
const testHelpers = require("../../utils/testHelpers.js")

const th = testHelpers.TestHelper
const timeValues = testHelpers.TimeValues
const { dec, toBN, assertRevert } = th

contract('After the initial lockup period has passed', async accounts => {
  const [
    liquityAG,
    teamMember_1,
    teamMember_2,
    teamMember_3,
    investor_1,
    investor_2,
    investor_3,
    A, B, C, D, E, F, G, H, I, J, K] = accounts;

  const multisig = accounts[999];

  const SECONDS_IN_ONE_DAY = timeValues.SECONDS_IN_ONE_DAY
  const SECONDS_IN_ONE_MONTH = timeValues.SECONDS_IN_ONE_MONTH
  const SECONDS_IN_ONE_YEAR = timeValues.SECONDS_IN_ONE_YEAR
  const maxBytes32 = th.maxBytes32

  let ZEROContracts
  let coreContracts

  // LCs for team members on vesting schedules
  let LC_T1
  let LC_T2
  let LC_T3

  // LCs for investors
  let LC_I1
  let LC_I2
  let LC_I3

  // 1e24 = 1 million tokens with 18 decimal digits
  const teamMemberInitialEntitlement_1 = dec(1, 23)
  const teamMemberInitialEntitlement_2 = dec(2, 23)
  const teamMemberInitialEntitlement_3 = dec(3, 23)

  const investorInitialEntitlement_1 = dec(4, 23)
  const investorInitialEntitlement_2 = dec(5, 23)
  const investorInitialEntitlement_3 = dec(6, 23)

  const teamMemberMonthlyVesting_1 = dec(1, 22)
  const teamMemberMonthlyVesting_2 = dec(2, 22)
  const teamMemberMonthlyVesting_3 = dec(3, 22)

  const ZEROEntitlement_A = dec(1, 24)
  const ZEROEntitlement_B = dec(2, 24)
  const ZEROEntitlement_C = dec(3, 24)
  const ZEROEntitlement_D = dec(4, 24)
  const ZEROEntitlement_E = dec(5, 24)

  let oneYearFromSystemDeployment
  let twoYearsFromSystemDeployment
  let justOverOneYearFromSystemDeployment
  let _18monthsFromSystemDeployment

  beforeEach(async () => {
    // Deploy all contracts from the first account
    ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig)
    coreContracts = await deploymentHelper.deployLiquityCore()

    zeroStaking = ZEROContracts.zeroStaking
    zeroToken = ZEROContracts.zeroToken
    communityIssuance = ZEROContracts.communityIssuance
    lockupContractFactory = ZEROContracts.lockupContractFactory

    await deploymentHelper.connectZEROContracts(ZEROContracts)
    await deploymentHelper.connectCoreContracts(coreContracts, ZEROContracts)
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts)

    oneYearFromSystemDeployment = await th.getTimeFromSystemDeployment(zeroToken, web3, timeValues.SECONDS_IN_ONE_YEAR)
    justOverOneYearFromSystemDeployment = oneYearFromSystemDeployment.add(toBN('1'))

    const secondsInTwoYears = toBN(timeValues.SECONDS_IN_ONE_YEAR).mul(toBN('2'))
    const secondsIn18Months = toBN(timeValues.SECONDS_IN_ONE_MONTH).mul(toBN('18'))
    twoYearsFromSystemDeployment = await th.getTimeFromSystemDeployment(zeroToken, web3, secondsInTwoYears)
    _18monthsFromSystemDeployment = await th.getTimeFromSystemDeployment(zeroToken, web3, secondsIn18Months)

    // Deploy 3 LCs for team members on vesting schedules
    const deployedLCtx_T1 = await lockupContractFactory.deployLockupContract(teamMember_1, oneYearFromSystemDeployment, { from: liquityAG })
    const deployedLCtx_T2 = await lockupContractFactory.deployLockupContract(teamMember_2, oneYearFromSystemDeployment, { from: liquityAG })
    const deployedLCtx_T3 = await lockupContractFactory.deployLockupContract(teamMember_3, oneYearFromSystemDeployment, { from: liquityAG })

    const deployedLCtx_I1 = await lockupContractFactory.deployLockupContract(investor_1, oneYearFromSystemDeployment, { from: liquityAG })
    const deployedLCtx_I2 = await lockupContractFactory.deployLockupContract(investor_2, oneYearFromSystemDeployment, { from: liquityAG })
    const deployedLCtx_I3 = await lockupContractFactory.deployLockupContract(investor_3, oneYearFromSystemDeployment, { from: liquityAG })

    // LCs for team members on vesting schedules
    LC_T1 = await th.getLCFromDeploymentTx(deployedLCtx_T1)
    LC_T2 = await th.getLCFromDeploymentTx(deployedLCtx_T2)
    LC_T3 = await th.getLCFromDeploymentTx(deployedLCtx_T3)

    // LCs for investors
    LC_I1 = await th.getLCFromDeploymentTx(deployedLCtx_I1)
    LC_I2 = await th.getLCFromDeploymentTx(deployedLCtx_I2)
    LC_I3 = await th.getLCFromDeploymentTx(deployedLCtx_I3)

    // Multisig transfers initial ZERO entitlements to LCs
    await zeroToken.transfer(LC_T1.address, teamMemberInitialEntitlement_1, { from: multisig })
    await zeroToken.transfer(LC_T2.address, teamMemberInitialEntitlement_2, { from: multisig })
    await zeroToken.transfer(LC_T3.address, teamMemberInitialEntitlement_3, { from: multisig })

    await zeroToken.transfer(LC_I1.address, investorInitialEntitlement_1, { from: multisig })
    await zeroToken.transfer(LC_I2.address, investorInitialEntitlement_2, { from: multisig })
    await zeroToken.transfer(LC_I3.address, investorInitialEntitlement_3, { from: multisig })

    const systemDeploymentTime = await zeroToken.getDeploymentStartTime()

    // Every thirty days, mutlsig transfers vesting amounts to team members
    for (i = 0; i < 12; i++) {
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      await zeroToken.transfer(LC_T1.address, teamMemberMonthlyVesting_1, { from: multisig })
      await zeroToken.transfer(LC_T2.address, teamMemberMonthlyVesting_2, { from: multisig })
      await zeroToken.transfer(LC_T3.address, teamMemberMonthlyVesting_3, { from: multisig })
    }

    // After Since only 360 days have passed, fast forward 5 more days, until LCs unlock
    await th.fastForwardTime((SECONDS_IN_ONE_DAY * 5), web3.currentProvider)

    const endTime = toBN(await th.getLatestBlockTimestamp(web3))

    const timePassed = endTime.sub(systemDeploymentTime)
    // Confirm that just over one year has passed -  not more than 1000 seconds 
    assert.isTrue(timePassed.sub(toBN(SECONDS_IN_ONE_YEAR)).lt(toBN('1000')))
    assert.isTrue(timePassed.sub(toBN(SECONDS_IN_ONE_YEAR)).gt(toBN('0')))
  })

  describe('Deploying new LCs', async accounts => {
    it("ZERO Deployer can deploy new LCs", async () => {
      // ZERO deployer deploys LCs
      const LCDeploymentTx_A = await lockupContractFactory.deployLockupContract(A, justOverOneYearFromSystemDeployment, { from: liquityAG })
      const LCDeploymentTx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: liquityAG })
      const LCDeploymentTx_C = await lockupContractFactory.deployLockupContract(C, '9595995999999900000023423234', { from: liquityAG })

      assert.isTrue(LCDeploymentTx_A.receipt.status)
      assert.isTrue(LCDeploymentTx_B.receipt.status)
      assert.isTrue(LCDeploymentTx_C.receipt.status)
    })

    it("Anyone can deploy new LCs", async () => {
      // Various EOAs deploy LCs
      const LCDeploymentTx_1 = await lockupContractFactory.deployLockupContract(A, justOverOneYearFromSystemDeployment, { from: teamMember_1 })
      const LCDeploymentTx_2 = await lockupContractFactory.deployLockupContract(C, oneYearFromSystemDeployment, { from: investor_2 })
      const LCDeploymentTx_3 = await lockupContractFactory.deployLockupContract(liquityAG, '9595995999999900000023423234', { from: A })

      assert.isTrue(LCDeploymentTx_1.receipt.status)
      assert.isTrue(LCDeploymentTx_2.receipt.status)
      assert.isTrue(LCDeploymentTx_3.receipt.status)
    })

    it("Anyone can deploy new LCs with unlockTime in the past", async () => {
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider )
      // Various EOAs deploy LCs
      const LCDeploymentTx_1 = await lockupContractFactory.deployLockupContract(A, justOverOneYearFromSystemDeployment, { from: teamMember_1 })
      const LCDeploymentTx_2 = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: E })
      const LCDeploymentTx_3 = await lockupContractFactory.deployLockupContract(C, _18monthsFromSystemDeployment, { from: multisig })
      
      const LC_1 = await th.getLCFromDeploymentTx(LCDeploymentTx_1)
      const LC_2 = await th.getLCFromDeploymentTx(LCDeploymentTx_2)
      const LC_3 = await th.getLCFromDeploymentTx(LCDeploymentTx_3)

      // Check deployments succeeded
      assert.isTrue(LCDeploymentTx_1.receipt.status)
      assert.isTrue(LCDeploymentTx_2.receipt.status)
      assert.isTrue(LCDeploymentTx_3.receipt.status)

      // Check LCs have unlockTimes in the past
      unlockTime_1 = await LC_1.unlockTime()
      unlockTime_2 = await LC_2.unlockTime()
      unlockTime_3 = await LC_3.unlockTime()

      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      assert.isTrue(unlockTime_1.lt(currentTime))
      assert.isTrue(unlockTime_2.lt(currentTime))
      assert.isTrue(unlockTime_3.lt(currentTime))
    })

    it("Anyone can deploy new LCs with unlockTime in the future", async () => {
      // Various EOAs deploy LCs
      const LCDeploymentTx_1 = await lockupContractFactory.deployLockupContract(A, twoYearsFromSystemDeployment, { from: teamMember_1 })
      const LCDeploymentTx_2 = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: E })
    
      const LC_1 = await th.getLCFromDeploymentTx(LCDeploymentTx_1)
      const LC_2 = await th.getLCFromDeploymentTx(LCDeploymentTx_2)

      // Check deployments succeeded
      assert.isTrue(LCDeploymentTx_1.receipt.status)
      assert.isTrue(LCDeploymentTx_2.receipt.status)

      // Check LCs have unlockTimes in the future
      unlockTime_1 = await LC_1.unlockTime()
      unlockTime_2 = await LC_2.unlockTime()

      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      assert.isTrue(unlockTime_1.gt(currentTime))
      assert.isTrue(unlockTime_2.gt(currentTime))
    })
  })

  describe('Beneficiary withdrawal from initial LC', async accounts => {
    it("A beneficiary can withdraw their full entitlement from their LC", async () => {

      // Check ZERO balances of investors' LCs are equal to their initial entitlements
      assert.equal(await zeroToken.balanceOf(LC_I1.address), investorInitialEntitlement_1)
      assert.equal(await zeroToken.balanceOf(LC_I2.address), investorInitialEntitlement_2)
      assert.equal(await zeroToken.balanceOf(LC_I3.address), investorInitialEntitlement_3)

      // Check ZERO balances of investors are 0
      assert.equal(await zeroToken.balanceOf(investor_1), '0')
      assert.equal(await zeroToken.balanceOf(investor_2), '0')
      assert.equal(await zeroToken.balanceOf(investor_3), '0')

      // All investors withdraw from their respective LCs
      await LC_I1.withdrawZERO({ from: investor_1 })
      await LC_I2.withdrawZERO({ from: investor_2 })
      await LC_I3.withdrawZERO({ from: investor_3 })

      // Check ZERO balances of investors now equal their entitlements
      assert.equal(await zeroToken.balanceOf(investor_1), investorInitialEntitlement_1)
      assert.equal(await zeroToken.balanceOf(investor_2), investorInitialEntitlement_2)
      assert.equal(await zeroToken.balanceOf(investor_3), investorInitialEntitlement_3)

      // Check ZERO balances of investors' LCs are now 0
      assert.equal(await zeroToken.balanceOf(LC_I1.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_I2.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_I3.address), '0')
    })

    it("A beneficiary on a vesting schedule can withdraw their total vested amount from their LC", async () => {
      // Get ZERO balances of LCs for beneficiaries (team members) on vesting schedules
      const ZEROBalanceOfLC_T1_Before = await zeroToken.balanceOf(LC_T1.address)
      const ZEROBalanceOfLC_T2_Before = await zeroToken.balanceOf(LC_T2.address)
      const ZEROBalanceOfLC_T3_Before = await zeroToken.balanceOf(LC_T3.address)

      // Check ZERO balances of vesting beneficiaries' LCs are greater than their initial entitlements
      assert.isTrue(ZEROBalanceOfLC_T1_Before.gt(th.toBN(teamMemberInitialEntitlement_1)))
      assert.isTrue(ZEROBalanceOfLC_T2_Before.gt(th.toBN(teamMemberInitialEntitlement_2)))
      assert.isTrue(ZEROBalanceOfLC_T3_Before.gt(th.toBN(teamMemberInitialEntitlement_3)))

      // Check ZERO balances of beneficiaries are 0
      assert.equal(await zeroToken.balanceOf(teamMember_1), '0')
      assert.equal(await zeroToken.balanceOf(teamMember_2), '0')
      assert.equal(await zeroToken.balanceOf(teamMember_3), '0')

      // All beneficiaries withdraw from their respective LCs
      await LC_T1.withdrawZERO({ from: teamMember_1 })
      await LC_T2.withdrawZERO({ from: teamMember_2 })
      await LC_T3.withdrawZERO({ from: teamMember_3 })

      // Check beneficiaries' ZERO balances now equal their accumulated vested entitlements
      assert.isTrue((await zeroToken.balanceOf(teamMember_1)).eq(ZEROBalanceOfLC_T1_Before))
      assert.isTrue((await zeroToken.balanceOf(teamMember_2)).eq(ZEROBalanceOfLC_T2_Before))
      assert.isTrue((await zeroToken.balanceOf(teamMember_3)).eq(ZEROBalanceOfLC_T3_Before))

      // Check ZERO balances of beneficiaries' LCs are now 0
      assert.equal(await zeroToken.balanceOf(LC_T1.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_T2.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_T3.address), '0')
    })

    it("Beneficiaries can withraw full ZERO balance of LC if it has increased since lockup period ended", async () => {
      // Check ZERO balances of investors' LCs are equal to their initial entitlements
      assert.equal(await zeroToken.balanceOf(LC_I1.address), investorInitialEntitlement_1)
      assert.equal(await zeroToken.balanceOf(LC_I2.address), investorInitialEntitlement_2)
      assert.equal(await zeroToken.balanceOf(LC_I3.address), investorInitialEntitlement_3)

      // Check ZERO balances of investors are 0
      assert.equal(await zeroToken.balanceOf(investor_1), '0')
      assert.equal(await zeroToken.balanceOf(investor_2), '0')
      assert.equal(await zeroToken.balanceOf(investor_3), '0')

      // ZERO multisig sends extra ZERO to investor LCs
      await zeroToken.transfer(LC_I1.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_I2.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_I3.address, dec(1, 24), { from: multisig })

      // 1 month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // ZERO multisig again sends extra ZERO to investor LCs
      await zeroToken.transfer(LC_I1.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_I2.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_I3.address, dec(1, 24), { from: multisig })

      // Get ZERO balances of LCs for investors 
      const ZEROBalanceOfLC_I1_Before = await zeroToken.balanceOf(LC_I1.address)
      const ZEROBalanceOfLC_I2_Before = await zeroToken.balanceOf(LC_I2.address)
      const ZEROBalanceOfLC_I3_Before = await zeroToken.balanceOf(LC_I3.address)

      // Check ZERO balances of investors' LCs are greater than their initial entitlements
      assert.isTrue(ZEROBalanceOfLC_I1_Before.gt(th.toBN(investorInitialEntitlement_1)))
      assert.isTrue(ZEROBalanceOfLC_I2_Before.gt(th.toBN(investorInitialEntitlement_2)))
      assert.isTrue(ZEROBalanceOfLC_I3_Before.gt(th.toBN(investorInitialEntitlement_3)))

      // All investors withdraw from their respective LCs
      await LC_I1.withdrawZERO({ from: investor_1 })
      await LC_I2.withdrawZERO({ from: investor_2 })
      await LC_I3.withdrawZERO({ from: investor_3 })

      // Check ZERO balances of investors now equal their LC balances prior to withdrawal
      assert.isTrue((await zeroToken.balanceOf(investor_1)).eq(ZEROBalanceOfLC_I1_Before))
      assert.isTrue((await zeroToken.balanceOf(investor_2)).eq(ZEROBalanceOfLC_I2_Before))
      assert.isTrue((await zeroToken.balanceOf(investor_3)).eq(ZEROBalanceOfLC_I3_Before))

      // Check ZERO balances of investors' LCs are now 0
      assert.equal(await zeroToken.balanceOf(LC_I1.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_I2.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_I3.address), '0')
    })
  })

  describe('Withdrawal attempts from LCs by non-beneficiaries', async accounts => {
    it("ZERO Multisig can't withdraw from a LC they deployed through the Factory", async () => {
      try {
        const withdrawalAttempt = await LC_T1.withdrawZERO({ from: multisig })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("ZERO Multisig can't withdraw from a LC that someone else deployed", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      //ZERO multisig fund the newly deployed LCs
      await zeroToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // ZERO multisig attempts withdrawal from LC
      try {
        const withdrawalAttempt_B = await LC_B.withdrawZERO({ from: multisig })
        assert.isFalse(withdrawalAttempt_B.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("Non-beneficiaries cannot withdraw from a LC", async () => {
      const variousEOAs = [
        teamMember_1,
        teamMember_3,
        liquityAG,
        investor_1,
        investor_2,
        investor_3,
        A,
        B,
        C,
        D,
        E]

      // Several EOAs attempt to withdraw from the LC that has teamMember_2 as beneficiary
      for (account of variousEOAs) {
        try {
          const withdrawalAttempt = await LC_T2.withdrawZERO({ from: account })
          assert.isFalse(withdrawalAttempt.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      }
    })
  })

  describe('Transferring ZERO', async accounts => {
    it("ZERO multisig can transfer ZERO to LCs they deployed", async () => {
      const initialZEROBalanceOfLC_T1 = await zeroToken.balanceOf(LC_T1.address)
      const initialZEROBalanceOfLC_T2 = await zeroToken.balanceOf(LC_T2.address)
      const initialZEROBalanceOfLC_T3 = await zeroToken.balanceOf(LC_T3.address)

      // One month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // ZERO multisig transfers vesting amount
      await zeroToken.transfer(LC_T1.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_T2.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_T3.address, dec(1, 24), { from: multisig })

      // Get new LC ZERO balances
      const ZEROBalanceOfLC_T1_1 = await zeroToken.balanceOf(LC_T1.address)
      const ZEROBalanceOfLC_T2_1 = await zeroToken.balanceOf(LC_T2.address)
      const ZEROBalanceOfLC_T3_1 = await zeroToken.balanceOf(LC_T3.address)

      // // Check team member LC balances have increased 
      assert.isTrue(ZEROBalanceOfLC_T1_1.eq(th.toBN(initialZEROBalanceOfLC_T1).add(th.toBN(dec(1, 24)))))
      assert.isTrue(ZEROBalanceOfLC_T2_1.eq(th.toBN(initialZEROBalanceOfLC_T2).add(th.toBN(dec(1, 24)))))
      assert.isTrue(ZEROBalanceOfLC_T3_1.eq(th.toBN(initialZEROBalanceOfLC_T3).add(th.toBN(dec(1, 24)))))

      // Another month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // ZERO multisig transfers vesting amount
      await zeroToken.transfer(LC_T1.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_T2.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_T3.address, dec(1, 24), { from: multisig })

      // Get new LC ZERO balances
      const ZEROBalanceOfLC_T1_2 = await zeroToken.balanceOf(LC_T1.address)
      const ZEROBalanceOfLC_T2_2 = await zeroToken.balanceOf(LC_T2.address)
      const ZEROBalanceOfLC_T3_2 = await zeroToken.balanceOf(LC_T3.address)

      // Check team member LC balances have increased again
      assert.isTrue(ZEROBalanceOfLC_T1_2.eq(ZEROBalanceOfLC_T1_1.add(th.toBN(dec(1, 24)))))
      assert.isTrue(ZEROBalanceOfLC_T2_2.eq(ZEROBalanceOfLC_T2_1.add(th.toBN(dec(1, 24)))))
      assert.isTrue(ZEROBalanceOfLC_T3_2.eq(ZEROBalanceOfLC_T3_1.add(th.toBN(dec(1, 24)))))
    })

    it("ZERO multisig can transfer tokens to LCs deployed by anyone", async () => {
      // A, B, C each deploy a lockup contract ith themself as beneficiary
      const deployedLCtx_A = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: A })
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, justOverOneYearFromSystemDeployment, { from: B })
      const deployedLCtx_C = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: C })

      const LC_A = await th.getLCFromDeploymentTx(deployedLCtx_A)
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)
      const LC_C = await th.getLCFromDeploymentTx(deployedLCtx_C)

      // Check balances of LCs are 0
      assert.equal(await zeroToken.balanceOf(LC_A.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_B.address), '0')
      assert.equal(await zeroToken.balanceOf(LC_C.address), '0')

      // One month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // ZERO multisig transfers ZERO to LCs deployed by other accounts
      await zeroToken.transfer(LC_A.address, dec(1, 24), { from: multisig })
      await zeroToken.transfer(LC_B.address, dec(2, 24), { from: multisig })
      await zeroToken.transfer(LC_C.address, dec(3, 24), { from: multisig })

      // Check balances of LCs have increased
      assert.equal(await zeroToken.balanceOf(LC_A.address), dec(1, 24))
      assert.equal(await zeroToken.balanceOf(LC_B.address), dec(2, 24))
      assert.equal(await zeroToken.balanceOf(LC_C.address), dec(3, 24))
    })

    it("ZERO multisig can transfer ZERO directly to any externally owned account", async () => {
      // Check ZERO balances of EOAs
      assert.equal(await zeroToken.balanceOf(A), '0')
      assert.equal(await zeroToken.balanceOf(B), '0')
      assert.equal(await zeroToken.balanceOf(C), '0')

      // ZERO multisig transfers ZERO to EOAs
      const txA = await zeroToken.transfer(A, dec(1, 24), { from: multisig })
      const txB = await zeroToken.transfer(B, dec(2, 24), { from: multisig })
      const txC = await zeroToken.transfer(C, dec(3, 24), { from: multisig })

      // Check new balances have increased by correct amount
      assert.equal(await zeroToken.balanceOf(A), dec(1, 24))
      assert.equal(await zeroToken.balanceOf(B), dec(2, 24))
      assert.equal(await zeroToken.balanceOf(C), dec(3, 24))
    })

    it("Anyone can transfer ZERO to LCs deployed by anyone", async () => {
      // Start D, E, F with some ZERO
      await zeroToken.transfer(D, dec(1, 24), { from: multisig })
      await zeroToken.transfer(E, dec(2, 24), { from: multisig })
      await zeroToken.transfer(F, dec(3, 24), { from: multisig })

      // H, I, J deploy lockup contracts with A, B, C as beneficiaries, respectively
      const deployedLCtx_A = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: H })
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, justOverOneYearFromSystemDeployment, { from: I })
      const deployedLCtx_C = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: J })

      // Grab contract addresses from deployment tx events
      const LCAddress_A = await th.getLCAddressFromDeploymentTx(deployedLCtx_A)
      const LCAddress_B = await th.getLCAddressFromDeploymentTx(deployedLCtx_B)
      const LCAddress_C = await th.getLCAddressFromDeploymentTx(deployedLCtx_C)

      // Check balances of LCs are 0
      assert.equal(await zeroToken.balanceOf(LCAddress_A), '0')
      assert.equal(await zeroToken.balanceOf(LCAddress_B), '0')
      assert.equal(await zeroToken.balanceOf(LCAddress_C), '0')

      // D, E, F transfer ZERO to LCs
      await zeroToken.transfer(LCAddress_A, dec(1, 24), { from: D })
      await zeroToken.transfer(LCAddress_B, dec(2, 24), { from: E })
      await zeroToken.transfer(LCAddress_C, dec(3, 24), { from: F })

      // Check balances of LCs has increased
      assert.equal(await zeroToken.balanceOf(LCAddress_A), dec(1, 24))
      assert.equal(await zeroToken.balanceOf(LCAddress_B), dec(2, 24))
      assert.equal(await zeroToken.balanceOf(LCAddress_C), dec(3, 24))
    })


    it("Anyone can transfer to an EOA", async () => {
      // Start D, E, liquityAG with some ZERO
      await zeroToken.unprotectedMint(D, dec(1, 24))
      await zeroToken.unprotectedMint(E, dec(2, 24))
      await zeroToken.unprotectedMint(liquityAG, dec(3, 24))
      await zeroToken.unprotectedMint(multisig, dec(4, 24))

      // ZERO holders transfer to other EOAs
      const ZEROtransferTx_1 = await zeroToken.transfer(A, dec(1, 18), { from: D })
      const ZEROtransferTx_2 = await zeroToken.transfer(liquityAG, dec(1, 18), { from: E })
      const ZEROtransferTx_3 = await zeroToken.transfer(F, dec(1, 18), { from: liquityAG })
      const ZEROtransferTx_4 = await zeroToken.transfer(G, dec(1, 18), { from: multisig })

      assert.isTrue(ZEROtransferTx_1.receipt.status)
      assert.isTrue(ZEROtransferTx_2.receipt.status)
      assert.isTrue(ZEROtransferTx_3.receipt.status)
      assert.isTrue(ZEROtransferTx_4.receipt.status)
    })

    it("Anyone can approve any EOA to spend their ZERO", async () => {
      // EOAs approve EOAs to spend ZERO
      const ZEROapproveTx_1 = await zeroToken.approve(A, dec(1, 18), { from: multisig })
      const ZEROapproveTx_2 = await zeroToken.approve(B, dec(1, 18), { from: G })
      const ZEROapproveTx_3 = await zeroToken.approve(liquityAG, dec(1, 18), { from: F })
      await assert.isTrue(ZEROapproveTx_1.receipt.status)
      await assert.isTrue(ZEROapproveTx_2.receipt.status)
      await assert.isTrue(ZEROapproveTx_3.receipt.status)
    })

    it("Anyone can increaseAllowance for any EOA or Liquity contract", async () => {
      // Anyone can increaseAllowance of EOAs to spend ZERO
      const ZEROIncreaseAllowanceTx_1 = await zeroToken.increaseAllowance(A, dec(1, 18), { from: multisig })
      const ZEROIncreaseAllowanceTx_2 = await zeroToken.increaseAllowance(B, dec(1, 18), { from: G })
      const ZEROIncreaseAllowanceTx_3 = await zeroToken.increaseAllowance(multisig, dec(1, 18), { from: F })
      await assert.isTrue(ZEROIncreaseAllowanceTx_1.receipt.status)
      await assert.isTrue(ZEROIncreaseAllowanceTx_2.receipt.status)
      await assert.isTrue(ZEROIncreaseAllowanceTx_3.receipt.status)

      // Increase allowance of Liquity contracts from F
      for (const contract of Object.keys(coreContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of Liquity contracts from multisig
      for (const contract of Object.keys(coreContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of ZERO contracts from F
      for (const contract of Object.keys(ZEROContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.increaseAllowance(ZEROContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of LQT contracts from multisig
      for (const contract of Object.keys(ZEROContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.increaseAllowance(ZEROContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }
    })

    it("Anyone can decreaseAllowance for any EOA or Liquity contract", async () => {
      //First, increase allowance of A, B LiqAG and core contracts
      const ZEROapproveTx_1 = await zeroToken.approve(A, dec(1, 18), { from: multisig })
      const ZEROapproveTx_2 = await zeroToken.approve(B, dec(1, 18), { from: G })
      const ZEROapproveTx_3 = await zeroToken.approve(multisig, dec(1, 18), { from: F })
      await assert.isTrue(ZEROapproveTx_1.receipt.status)
      await assert.isTrue(ZEROapproveTx_2.receipt.status)
      await assert.isTrue(ZEROapproveTx_3.receipt.status)

      // --- SETUP ---

      // IncreaseAllowance of core contracts, from F
      for (const contract of Object.keys(coreContracts)) {
        const ZEROtransferTx = await zeroToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(ZEROtransferTx.receipt.status)
      }

      // IncreaseAllowance of core contracts, from multisig
      for (const contract of Object.keys(coreContracts)) {
        const ZEROtransferTx = await zeroToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(ZEROtransferTx.receipt.status)
      }

      // Increase allowance of ZERO contracts from F
      for (const contract of Object.keys(ZEROContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.increaseAllowance(ZEROContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of LQTT contracts from multisig 
      for (const contract of Object.keys(ZEROContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.increaseAllowance(ZEROContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }

      // --- TEST ---

      // Decrease allowance of A, B, multisig
      const ZERODecreaseAllowanceTx_1 = await zeroToken.decreaseAllowance(A, dec(1, 18), { from: multisig })
      const ZERODecreaseAllowanceTx_2 = await zeroToken.decreaseAllowance(B, dec(1, 18), { from: G })
      const ZERODecreaseAllowanceTx_3 = await zeroToken.decreaseAllowance(multisig, dec(1, 18), { from: F })
      await assert.isTrue(ZERODecreaseAllowanceTx_1.receipt.status)
      await assert.isTrue(ZERODecreaseAllowanceTx_2.receipt.status)
      await assert.isTrue(ZERODecreaseAllowanceTx_3.receipt.status)

      // Decrease allowance of core contracts, from F
      for (const contract of Object.keys(coreContracts)) {
        const ZERODecreaseAllowanceTx = await zeroToken.decreaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(ZERODecreaseAllowanceTx.receipt.status)
      }

      // Decrease allowance of core contracts from multisig
      for (const contract of Object.keys(coreContracts)) {
        const ZERODecreaseAllowanceTx = await zeroToken.decreaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(ZERODecreaseAllowanceTx.receipt.status)
      }

      // Decrease allowance of ZERO contracts from F
      for (const contract of Object.keys(ZEROContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.decreaseAllowance(ZEROContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }

      // Decrease allowance of ZERO contracts from multisig
      for (const contract of Object.keys(ZEROContracts)) {
        const ZEROIncreaseAllowanceTx = await zeroToken.decreaseAllowance(ZEROContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(ZEROIncreaseAllowanceTx.receipt.status)
      }
    })

    it("Anyone can be the sender in a transferFrom() call", async () => {
      // Fund B, C
      await zeroToken.unprotectedMint(B, dec(1, 18))
      await zeroToken.unprotectedMint(C, dec(1, 18))

      // LiqAG, B, C approve F, G, multisig respectively
      await zeroToken.approve(F, dec(1, 18), { from: multisig })
      await zeroToken.approve(G, dec(1, 18), { from: B })
      await zeroToken.approve(multisig, dec(1, 18), { from: C })

      // Approved addresses transfer from the address they're approved for
      const ZEROtransferFromTx_1 = await zeroToken.transferFrom(multisig, F, dec(1, 18), { from: F })
      const ZEROtransferFromTx_2 = await zeroToken.transferFrom(B, multisig, dec(1, 18), { from: G })
      const ZEROtransferFromTx_3 = await zeroToken.transferFrom(C, A, dec(1, 18), { from: multisig })
      await assert.isTrue(ZEROtransferFromTx_1.receipt.status)
      await assert.isTrue(ZEROtransferFromTx_2.receipt.status)
      await assert.isTrue(ZEROtransferFromTx_3.receipt.status)
    })

    it("Anyone can stake their ZERO in the staking contract", async () => {
      // Fund F
      await zeroToken.unprotectedMint(F, dec(1, 18))

      const ZEROStakingTx_1 = await zeroStaking.stake(dec(1, 18), { from: F })
      const ZEROStakingTx_2 = await zeroStaking.stake(dec(1, 18), { from: multisig })
      await assert.isTrue(ZEROStakingTx_1.receipt.status)
      await assert.isTrue(ZEROStakingTx_2.receipt.status)
    })
  })

  describe('Withdrawal Attempts on new LCs before unlockTime has passed', async accounts => {
    it("ZERO Deployer can't withdraw from a funded LC they deployed for another beneficiary through the Factory, before the unlockTime", async () => {
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      // ZERO multisig attempts withdrawal from LC they deployed through the Factory
      try {
        const withdrawalAttempt = await LC_B.withdrawZERO({ from: multisig })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("ZERO Deployer can't withdraw from a funded LC that someone else deployed, before the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      //ZERO multisig fund the newly deployed LCs
      await zeroToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      // ZERO multisig attempts withdrawal from LCs
      try {
        const withdrawalAttempt_B = await LC_B.withdrawZERO({ from: multisig })
        assert.isFalse(withdrawalAttempt_B.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("Beneficiary can't withdraw from their funded LC, before the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // ZERO multisig funds contracts
      await zeroToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      try {
        const beneficiary = await LC_B.beneficiary()
        const withdrawalAttempt = await LC_B.withdrawZERO({ from: beneficiary })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: The lockup duration must have passed")
      }
    })

    it("No one can withdraw from a beneficiary's funded LC, before the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // ZERO multisig funds contracts
      await zeroToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      const variousEOAs = [teamMember_2, multisig, investor_1, A, C, D, E]

      // Several EOAs attempt to withdraw from LC deployed by D
      for (account of variousEOAs) {
        try {
          const withdrawalAttempt = await LC_B.withdrawZERO({ from: account })
          assert.isFalse(withdrawalAttempt.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      }
    })
  })

  describe('Withdrawals from new LCs after unlockTime has passed', async accounts => {
    it("ZERO Deployer can't withdraw from a funded LC they deployed for another beneficiary through the Factory, after the unlockTime", async () => {
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      // ZERO multisig attempts withdrawal from LC they deployed through the Factory
      try {
        const withdrawalAttempt = await LC_B.withdrawZERO({ from: multisig })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("ZERO multisig can't withdraw from a funded LC when they are not the beneficiary, after the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      //ZERO multisig fund the newly deployed LC
      await zeroToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      // ZERO multisig attempts withdrawal from LCs
      try {
        const withdrawalAttempt_B = await LC_B.withdrawZERO({ from: multisig })
        assert.isFalse(withdrawalAttempt_B.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("Beneficiary can withdraw from their funded LC, after the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // ZERO multisig funds contract
      await zeroToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      const beneficiary = await LC_B.beneficiary()
      assert.equal(beneficiary, B)

      // Get B's balance before
      const B_balanceBefore = await zeroToken.balanceOf(B)
      assert.equal(B_balanceBefore, '0')
      
      const withdrawalAttempt = await LC_B.withdrawZERO({ from: B })
      assert.isTrue(withdrawalAttempt.receipt.status)

       // Get B's balance after
       const B_balanceAfter = await zeroToken.balanceOf(B)
       assert.equal(B_balanceAfter, dec(2, 18))
    })

    it("Non-beneficiaries can't withdraw from a beneficiary's funded LC, after the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // ZERO multisig funds contracts
      await zeroToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      const variousEOAs = [teamMember_2, liquityAG, investor_1, A, C, D, E]

      // Several EOAs attempt to withdraw from LC deployed by D
      for (account of variousEOAs) {
        try {
          const withdrawalAttempt = await LC_B.withdrawZERO({ from: account })
          assert.isFalse(withdrawalAttempt.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      }
    })
  })
})
