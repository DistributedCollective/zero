const deploymentHelper = require("../utils/deploymentHelpers.js")
const { TestHelper: th, MoneyValues: mv } = require("../utils/testHelpers.js")

const GasPool = artifacts.require("./GasPool.sol")
const BorrowerOperationsTester = artifacts.require("./BorrowerOperationsTester.sol")

contract('All Liquity functions with onlyOwner modifier', async accounts => {

  const [owner, alice, bob] = accounts;

  const multisig = accounts[999];
  
  let contracts
  let zusdToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let defaultPool
  let borrowerOperations

  let zeroStaking
  let communityIssuance
  let zeroToken 
  let lockupContractFactory

  before(async () => {
    contracts = await deploymentHelper.deployLiquityCore()
    contracts.borrowerOperations = await BorrowerOperationsTester.new()
    contracts = await deploymentHelper.deployZUSDToken(contracts)
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)

    zusdToken = contracts.zusdToken
    sortedTroves = contracts.sortedTroves
    troveManager = contracts.troveManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    borrowerOperations = contracts.borrowerOperations

    zeroStaking = ZEROContracts.zeroStaking
    communityIssuance = ZEROContracts.communityIssuance
    zeroToken = ZEROContracts.zeroToken
    lockupContractFactory = ZEROContracts.lockupContractFactory
  })

  const testZeroAddress = async (contract, params, method = 'setAddresses', skip = 0) => {
    await testWrongAddress(contract, params, th.ZERO_ADDRESS, method, skip, 'Account cannot be zero address')
  }
  const testNonContractAddress = async (contract, params, method = 'setAddresses', skip = 0) => {
    await testWrongAddress(contract, params, bob, method, skip, 'Account code size cannot be zero')
  }
  const testWrongAddress = async (contract, params, address, method, skip, message) => {
    for (let i = skip; i < params.length; i++) {
      const newParams = [...params]
      newParams[i] = address
      await th.assertRevert(contract[method](...newParams, { from: owner }), message)
    }
  }

  const testSetAddresses = async (contract, numberOfAddresses) => {
    const dumbContract = await GasPool.new()
    const params = Array(numberOfAddresses).fill(dumbContract.address)

    // Attempt call from alice
    await th.assertRevert(contract.setAddresses(...params, { from: alice }))

    // Attempt to use zero address
    await testZeroAddress(contract, params)
    // Attempt to use non contract
    await testNonContractAddress(contract, params)

    // Owner can successfully set any address
    const txOwner = await contract.setAddresses(...params, { from: owner })
    assert.isTrue(txOwner.receipt.status)
  }

  describe('TroveManager', async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(troveManager, 13)
    })
  })

  describe('BorrowerOperations', async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(borrowerOperations, 11)
    })
  })

  describe('DefaultPool', async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(defaultPool, 2)
    })
  })

  describe('StabilityPool', async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(stabilityPool, 8)
    })
  })

  describe('ActivePool', async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(activePool, 4)
    })
  })

  describe('SortedTroves', async accounts => {
    it("setParams(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      const dumbContract = await GasPool.new()
      const params = [10000001, dumbContract.address, dumbContract.address]

      // Attempt call from alice
      await th.assertRevert(sortedTroves.setParams(...params, { from: alice }))

      // Attempt to use zero address
      await testZeroAddress(sortedTroves, params, 'setParams', 1)
      // Attempt to use non contract
      await testNonContractAddress(sortedTroves, params, 'setParams', 1)

      // Owner can successfully set params
      const txOwner = await sortedTroves.setParams(...params, { from: owner })
      assert.isTrue(txOwner.receipt.status)

      // Owner can set any address more than once
      const secondTxOwner = await sortedTroves.setParams(...params, { from: owner })
      assert.isTrue(secondTxOwner.receipt.status)
    })
  })

  describe('CommunityIssuance', async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      const params = [zeroToken.address, stabilityPool.address]
      await th.assertRevert(communityIssuance.initialize(...params, { from: alice }))

      // Attempt to use zero address
      await testZeroAddress(communityIssuance, params, "initialize")
      // Attempt to use non contract
      await testNonContractAddress(communityIssuance, params, "initialize")

      // Owner can successfully set any address
      const txOwner = await communityIssuance.initialize(...params, { from: owner })
      assert.isTrue(txOwner.receipt.status)

      // Owner can set any address more than once
      const secondTxOwner = await communityIssuance.initialize(...params, { from: owner })
      assert.isTrue(secondTxOwner.receipt.status)
    })
  })

  describe('ZEROStaking', async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(zeroStaking, 5)
    })
  })

  describe('LockupContractFactory', async accounts => {
    it("setZEROAddress(): reverts when called by non-owner, with wrong address, or twice", async () => {
      await th.assertRevert(lockupContractFactory.setZEROTokenAddress(zeroToken.address, { from: alice }))

      const params = [zeroToken.address]

      // Attempt to use zero address
      await testZeroAddress(lockupContractFactory, params, 'setZEROTokenAddress')
      // Attempt to use non contract
      await testNonContractAddress(lockupContractFactory, params, 'setZEROTokenAddress')

      // Owner can successfully set any address
      const txOwner = await lockupContractFactory.setZEROTokenAddress(zeroToken.address, { from: owner })
      assert.isTrue(txOwner.receipt.status)

      // Owner can set any address more than once
      const secondTxOwner = await lockupContractFactory.setZEROTokenAddress(...params, { from: owner })
      assert.isTrue(secondTxOwner.receipt.status)
    })
  })
})

