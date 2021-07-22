const deploymentHelper = require("../../utils/deploymentHelpers.js")
const testHelpers = require("../../utils/testHelpers.js")
const CommunityIssuance = artifacts.require("./CommunityIssuance.sol")


const th = testHelpers.TestHelper
const timeValues = testHelpers.TimeValues
const assertRevert = th.assertRevert
const toBN = th.toBN
const dec = th.dec

contract('Deploying the LQTY contracts: LCF, CI, LQTYStaking, and LQTYToken ', async accounts => {
  const [liquityAG, A, B] = accounts;
  const multisig = accounts[999];

  let LQTYContracts

  const oneMillion = toBN(1000000)
  const digits = toBN(1e18)
  const thirtyFive = toBN(35)
  const expectedCISupplyCap = thirtyFive.mul(oneMillion).mul(digits)

  beforeEach(async () => {
    // Deploy all contracts from the first account
    const coreContracts = await deploymentHelper.deployLiquityCore()
    LQTYContracts = await deploymentHelper.deployLQTYContracts(multisig)
    await deploymentHelper.connectLQTYContracts(LQTYContracts)
    await deploymentHelper.connectLQTYContractsToCore(LQTYContracts, coreContracts)

    lqtyStaking = LQTYContracts.lqtyStaking
    lqtyToken = LQTYContracts.lqtyToken
    communityIssuance = LQTYContracts.communityIssuance
    sovStakersIssuance = LQTYContracts.sovStakersIssuance
    lockupContractFactory = LQTYContracts.lockupContractFactory

    //LQTY Staking and CommunityIssuance have not yet had their setters called, so are not yet
    // connected to the rest of the system
  })


  describe('CommunityIssuance deployment', async accounts => {
    it("Stores the deployer's address", async () => {
      const storedDeployerAddress = await communityIssuance.getOwner()

      assert.equal(liquityAG, storedDeployerAddress)
    })
  })

  describe('LQTYStaking deployment', async accounts => {
    it("Stores the deployer's address", async () => {
      const storedDeployerAddress = await lqtyStaking.getOwner()

      assert.equal(liquityAG, storedDeployerAddress)
    })
  })

  describe('LQTYToken deployment', async accounts => {
    it("Stores the multisig's address", async () => {
      const storedMultisigAddress = await lqtyToken.multisigAddress()

      assert.equal(multisig, storedMultisigAddress)
    })

    it("Stores the CommunityIssuance address", async () => {
      const storedCIAddress = await lqtyToken.communityIssuanceAddress()

      assert.equal(communityIssuance.address, storedCIAddress)
    })

    it("Stores the LockupContractFactory address", async () => {
      const storedLCFAddress = await lqtyToken.lockupContractFactory()

      assert.equal(lockupContractFactory.address, storedLCFAddress)
    })

    it("Mints the correct LQTY amount to the multisig's address: (20 million)", async () => {
      const multisigLQTYEntitlement = await lqtyToken.balanceOf(multisig)

      const _20Million = dec(20, 24)
      assert.equal(multisigLQTYEntitlement, _20Million)
    })

    it("Mints the correct LQTY amount to the CommunityIssuance contract address: 35 million", async () => {
      const communityLQTYEntitlement = await lqtyToken.balanceOf(communityIssuance.address)
      // 32 million as 18-digit decimal
      const _35Million = dec(35, 24)

      assert.equal(communityLQTYEntitlement, _35Million)
    })

    it("Mints the correct LQTY amount to the SOVStakersIssuance contract address: 45 million", async () => {
      const sovStakersLQTYEntitlement = await lqtyToken.balanceOf(sovStakersIssuance.address)
      // 50 million as 18-digit decimal
      const _45Million = dec(45, 24)

      assert.equal(sovStakersLQTYEntitlement, _45Million)
    })
  })

  describe('Community Issuance deployment', async accounts => {
    it("Stores the deployer's address", async () => {

      const storedDeployerAddress = await communityIssuance.getOwner()

      assert.equal(storedDeployerAddress, liquityAG)
    })

    it("LQTYSupplyCap is properly set", async () => {
      const balance = await lqtyToken.balanceOf(communityIssuance.address);
      const supplyCap = await communityIssuance.LQTYSupplyCap()

      assert.isTrue(balance.eq(supplyCap))
    })

    it("Liquity AG can't set addresses if CI's LQTY balance hasn't been transferred ", async () => {
      const newCI = await CommunityIssuance.new()

      const LQTYBalance = await lqtyToken.balanceOf(newCI.address)
      assert.equal(LQTYBalance, '0')

      // Deploy core contracts, just to get the Stability Pool address
      const coreContracts = await deploymentHelper.deployLiquityCore()

      try {
        const tx = await newCI.initialize(
          lqtyToken.address,
          coreContracts.stabilityPool.address,
          { from: liquityAG }
        );
      
        // Check it gives the expected error message for a failed Solidity 'assert'
      } catch (err) {
        assert.include(err.message, "invalid opcode")
      }
    })
  })

  describe('Connecting LQTYToken to LCF, CI and LQTYStaking', async accounts => {
    it('sets the correct LQTYToken address in LQTYStaking', async () => {
      // Deploy core contracts and set the LQTYToken address in the CI and LQTYStaking
      const coreContracts = await deploymentHelper.deployLiquityCore()
      await deploymentHelper.connectLQTYContractsToCore(LQTYContracts, coreContracts)

      const lqtyTokenAddress = lqtyToken.address

      const recordedLQTYTokenAddress = await lqtyStaking.lqtyToken()
      assert.equal(lqtyTokenAddress, recordedLQTYTokenAddress)
    })

    it('sets the correct LQTYToken address in LockupContractFactory', async () => {
      const lqtyTokenAddress = lqtyToken.address

      const recordedLQTYTokenAddress = await lockupContractFactory.lqtyTokenAddress()
      assert.equal(lqtyTokenAddress, recordedLQTYTokenAddress)
    })

    it('sets the correct LQTYToken address in CommunityIssuance', async () => {
      // Deploy core contracts and set the LQTYToken address in the CI and LQTYStaking
      const coreContracts = await deploymentHelper.deployLiquityCore()
      await deploymentHelper.connectLQTYContractsToCore(LQTYContracts, coreContracts)

      const lqtyTokenAddress = lqtyToken.address

      const recordedLQTYTokenAddress = await communityIssuance.lqtyToken()
      assert.equal(lqtyTokenAddress, recordedLQTYTokenAddress)
    })
  })
})
