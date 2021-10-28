const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');

const th = testHelpers.TestHelper
const timeValues = testHelpers.TimeValues
const dec = th.dec
const toBN = th.toBN
const getDifference = th.getDifference

const TroveManagerTester = artifacts.require("TroveManagerTester")
const ZUSDToken = artifacts.require("ZUSDToken")

contract('SOV Stakers - ZERO Rewards', async accounts => {

  const [
    owner,
    whale,
    A, B, C, D, E, F, G, H,
    defaulter_1, defaulter_2, defaulter_3, defaulter_4, defaulter_5, defaulter_6,
    frontEnd_1, frontEnd_2, frontEnd_3
  ] = accounts;

  const multisig = accounts[998];

  let contracts

  let communityIssuanceTester

  let sovStakersZEROSupply
	let issuance_M1
  let issuance_Y1

  const ZERO_ADDRESS = th.ZERO_ADDRESS

  describe("ZERO Rewards", async () => {

    before(async () => {
      contracts = await deploymentHelper.deployLiquityCore()
      contracts.troveManager = await TroveManagerTester.new()
      contracts.zusdToken = await ZUSDToken.new()
      await contracts.zusdToken.initialize(
        contracts.troveManager.address,
        contracts.stabilityPool.address,
        contracts.borrowerOperations.address
      )
      const ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig)

      zeroToken = ZEROContracts.zeroToken
      sovStakersIssuance = ZEROContracts.sovStakersIssuance
      sovFeeSharingProxyAddress = ZEROContracts.mockFeeSharingProxy.address

      await zeroToken.unprotectedMint(sovStakersIssuance.address,toBN(dec(45,24)))

      await deploymentHelper.connectZEROContracts(ZEROContracts)
      await deploymentHelper.connectCoreContracts(contracts, ZEROContracts)
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts)

      // Check community issuance starts with 35 million ZERO
      sovStakersZEROSupply = toBN(await zeroToken.balanceOf(sovStakersIssuance.address))
      assert.isAtMost(getDifference(sovStakersZEROSupply, '45000000000000000000000000'), 1000)

      /* Monthly ZERO issuance
  
        Expected fraction of total supply issued per month, for a yearly halving schedule
        (issuance in each month, not cumulative):
    
        Month 1: 0.055378538087966600
        Month 2: 0.052311755607206100
        Month 3: 0.049414807056864200
        Month 4: 0.046678287282156100
        Month 5: 0.044093311972020200
        Month 6: 0.041651488815552900
        ....
        Year 1:  0.500000000000000000
      */

      issuance_M1 = toBN('55378538087966600').mul(sovStakersZEROSupply).div(toBN(dec(1, 18)))
      issuance_Y1 = toBN('500000000000000000').mul(sovStakersZEROSupply).div(toBN(dec(1, 18)))
    })

    let revertToSnapshot;

    beforeEach(async() => {
      let snapshot = await timeMachine.takeSnapshot();
      revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result'])
    });

    afterEach(async() => {
      await revertToSnapshot();
    });

    // using the result of this to advance time by the desired amount from the deployment time, whether or not some extra time has passed in the meanwhile
    const getDuration = async (expectedDuration) => {
      const deploymentTime = (await sovStakersIssuance.deploymentTime()).toNumber()
      const currentTime = await th.getLatestBlockTimestamp(web3)
      const duration = Math.max(expectedDuration - (currentTime - deploymentTime), 0)

      return duration
    }

    it("Token issuance after a month and a year", async () => {
      const initialIssuance = await sovStakersIssuance.totalZEROIssued()
      assert.equal(initialIssuance, 0)

      // Month 1 passes
      await th.fastForwardTime(await getDuration(timeValues.SECONDS_IN_ONE_MONTH), web3.currentProvider)
      await sovStakersIssuance.transferToFeeSharingProxy()
      // Check ZERO balances increase by correct amount
      assert.isAtMost(getDifference(await zeroToken.balanceOf(sovFeeSharingProxyAddress), issuance_M1), 1e15)
      // Year 1 passes
      await th.fastForwardTime(await getDuration(timeValues.SECONDS_IN_ONE_YEAR), web3.currentProvider)
      await sovStakersIssuance.transferToFeeSharingProxy()
      // Check ZERO balances increase by correct amount
      assert.isAtMost(getDifference(await zeroToken.balanceOf(sovFeeSharingProxyAddress), issuance_Y1), 1e15)
    })

    it("Should fail when trying to move ZERO tokens to an address that's not the Fees Proxy", async () => {
      const initialIssuance = await sovStakersIssuance.totalZEROIssued()
      assert.equal(initialIssuance, 0)

      // Month 1 passes
      await th.fastForwardTime(await getDuration(timeValues.SECONDS_IN_ONE_YEAR), web3.currentProvider)
      // Anyone can issue ZERO
      await sovStakersIssuance.issueZERO({ from: multisig })
      // It fails when trying to send the ZERO to the wrong address
      await th.assertRevert(sovStakersIssuance.sendZERO(multisig, toBN(1)),"SovStakersIssuance: recipient is not the communityPotAddress");
      // It works when sending to the community pot address
      const toExtract = toBN(1)
      await sovStakersIssuance.sendZERO(sovFeeSharingProxyAddress, toExtract);
      assert.isAtMost(getDifference(await zeroToken.balanceOf(sovFeeSharingProxyAddress), toExtract), 0)
    })
  })
})

contract('Reset chain state', async accounts => { })
