const deploymentHelper = require("../../utils/deploymentHelpers.js")
const testHelpers = require("../../utils/testHelpers.js")
const CommunityIssuance = artifacts.require("./CommunityIssuance.sol")


const th = testHelpers.TestHelper
const timeValues = testHelpers.TimeValues
const assertRevert = th.assertRevert
const toBN = th.toBN
const dec = th.dec

contract('Deploying the ZERO contracts: LCF, CI, ZEROStaking, and ZEROToken ', async accounts => {
  const [liquityAG, A, B] = accounts;
  const multisig = accounts[999];

  let ZEROContracts

  const oneMillion = toBN(1000000)
  const digits = toBN(1e18)
  const thirtyFive = toBN(35)
  const expectedCISupplyCap = thirtyFive.mul(oneMillion).mul(digits)

  beforeEach(async () => {
    // Deploy all contracts from the first account
    const coreContracts = await deploymentHelper.deployLiquityCore()
    ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)
    await deploymentHelper.connectZEROContracts(ZEROContracts)
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts)

    zeroStaking = ZEROContracts.zeroStaking
    zeroToken = ZEROContracts.zeroToken
    communityIssuance = ZEROContracts.communityIssuance
    sovStakersIssuance = ZEROContracts.sovStakersIssuance
    lockupContractFactory = ZEROContracts.lockupContractFactory

    //ZERO Staking and CommunityIssuance have not yet had their setters called, so are not yet
    // connected to the rest of the system
  })


  describe('CommunityIssuance deployment', async accounts => {
    it("Stores the deployer's address", async () => {
      const storedDeployerAddress = await communityIssuance.getOwner()

      assert.equal(liquityAG, storedDeployerAddress)
    })
  })

  describe('ZEROStaking deployment', async accounts => {
    it("Stores the deployer's address", async () => {
      const storedDeployerAddress = await zeroStaking.getOwner()

      assert.equal(liquityAG, storedDeployerAddress)
    })
  })

  describe('ZEROToken deployment', async accounts => {
    it("Stores the multisig's address", async () => {
      const storedMultisigAddress = await zeroToken.multisigAddress()

      assert.equal(multisig, storedMultisigAddress)
    })

    it("Stores the CommunityIssuance address", async () => {
      const storedCIAddress = await zeroToken.communityIssuanceAddress()

      assert.equal(communityIssuance.address, storedCIAddress)
    })

    it("Stores the LockupContractFactory address", async () => {
      const storedLCFAddress = await zeroToken.lockupContractFactory()

      assert.equal(lockupContractFactory.address, storedLCFAddress)
    })

    it("Mints the correct ZERO amount to the multisig's address: (20 million)", async () => {
      const multisigZEROEntitlement = await zeroToken.balanceOf(multisig)

      const _20Million = dec(20, 24)
      assert.equal(multisigZEROEntitlement, _20Million)
    })

    it("Mints the correct ZERO amount to the CommunityIssuance contract address: 30 million", async () => {
      const communityZEROEntitlement = await zeroToken.balanceOf(communityIssuance.address)
      // 30 million as 18-digit decimal
      const _30Million = dec(30, 24)

      assert.equal(communityZEROEntitlement, _30Million)
    })

    // FIXME: remove skip after adding LiquidityMining contract
    it.skip("Mints the correct ZERO amount to the LiquidityMining contract address: 5 million", async () => {
      const liquidityMiningZEROEntitlement = await zeroToken.balanceOf(liquidityMining.address)
      // 5 million as 18-digit decimal
      const _5Million = dec(5, 24)

      assert.equal(liquidityMiningZEROEntitlement, _5Million)
    })

    it("Mints the correct ZERO amount to the SOVStakersIssuance contract address: 45 million", async () => {
      const sovStakersZEROEntitlement = await zeroToken.balanceOf(sovStakersIssuance.address)
      // 50 million as 18-digit decimal
      const _45Million = dec(45, 24)

      assert.equal(sovStakersZEROEntitlement, _45Million)
    })
  })

  describe('Community Issuance deployment', async accounts => {
    it("Stores the deployer's address", async () => {

      const storedDeployerAddress = await communityIssuance.getOwner()

      assert.equal(storedDeployerAddress, liquityAG)
    })

    it("ZEROSupplyCap is properly set", async () => {
      const balance = await zeroToken.balanceOf(communityIssuance.address);
      const supplyCap = await communityIssuance.ZEROSupplyCap()

      assert.isTrue(balance.eq(supplyCap))
    })

    it("Liquity AG can't set addresses if CI's ZERO balance hasn't been transferred ", async () => {
      const newCI = await CommunityIssuance.new()

      const ZEROBalance = await zeroToken.balanceOf(newCI.address)
      assert.equal(ZEROBalance, '0')

      // Deploy core contracts, just to get the Stability Pool address
      const coreContracts = await deploymentHelper.deployLiquityCore()

      try {
        const tx = await newCI.initialize(
          zeroToken.address,
          coreContracts.stabilityPool.address,
          { from: liquityAG }
        );
      
        // Check it gives the expected error message for a failed Solidity 'assert'
      } catch (err) {
        assert.include(err.message, "invalid opcode")
      }
    })
  })

  describe('Connecting ZEROToken to LCF, CI and ZEROStaking', async accounts => {
    it('sets the correct ZEROToken address in ZEROStaking', async () => {
      // Deploy core contracts and set the ZEROToken address in the CI and ZEROStaking
      const coreContracts = await deploymentHelper.deployLiquityCore()
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts)

      const zeroTokenAddress = zeroToken.address

      const recordedZEROTokenAddress = await zeroStaking.zeroToken()
      assert.equal(zeroTokenAddress, recordedZEROTokenAddress)
    })

    it('sets the correct ZEROToken address in LockupContractFactory', async () => {
      const zeroTokenAddress = zeroToken.address

      const recordedZEROTokenAddress = await lockupContractFactory.zeroTokenAddress()
      assert.equal(zeroTokenAddress, recordedZEROTokenAddress)
    })

    it('sets the correct ZEROToken address in CommunityIssuance', async () => {
      // Deploy core contracts and set the ZEROToken address in the CI and ZEROStaking
      const coreContracts = await deploymentHelper.deployLiquityCore()
      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts)

      const zeroTokenAddress = zeroToken.address

      const recordedZEROTokenAddress = await communityIssuance.zeroToken()
      assert.equal(zeroTokenAddress, recordedZEROTokenAddress)
    })
  })
})
