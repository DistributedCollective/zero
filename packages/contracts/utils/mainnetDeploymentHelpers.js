const fs = require('fs')

const ZERO_ADDRESS = '0x' + '0'.repeat(40)
const maxBytes32 = '0x' + 'f'.repeat(64)

class MainnetDeploymentHelper {
  constructor(configParams, deployerWallet) {
    this.configParams = configParams
    this.deployerWallet = deployerWallet
    this.hre = require("hardhat")
  }

  loadPreviousDeployment() {
    let previousDeployment = {}
    if (fs.existsSync(this.configParams.OUTPUT_FILE)) {
      console.log(`Loading previous deployment...`)
      previousDeployment = require('../' + this.configParams.OUTPUT_FILE)
    }

    return previousDeployment
  }

  saveDeployment(deploymentState) {
    const deploymentStateJSON = JSON.stringify(deploymentState, null, 2)
    fs.writeFileSync(this.configParams.OUTPUT_FILE, deploymentStateJSON)

  }
  // --- Deployer methods ---

  async getFactory(name) {
    const factory = await ethers.getContractFactory(name, this.deployerWallet)
    return factory
  }

  async sendAndWaitForTransaction(txPromise) {
    const tx = await txPromise
    const minedTx = await ethers.provider.waitForTransaction(tx.hash, this.configParams.TX_CONFIRMATIONS)

    return minedTx
  }

  async loadOrDeploy(factory, name, deploymentState, params=[]) {
    if (deploymentState[name] && deploymentState[name].address) {
      console.log(`Using previously deployed ${name} contract at address ${deploymentState[name].address}`)
      return new ethers.Contract(
        deploymentState[name].address,
        factory.interface,
        this.deployerWallet
      );
    }

    const contract = await factory.deploy(...params, {gasPrice: this.configParams.GAS_PRICE})
    await this.deployerWallet.provider.waitForTransaction(contract.deployTransaction.hash, this.configParams.TX_CONFIRMATIONS)

    deploymentState[name] = {
      address: contract.address,
      txHash: contract.deployTransaction.hash
    }

    this.saveDeployment(deploymentState)

    return contract
  }

  async deployZeroCoreMainnet(tellorMasterAddr, deploymentState) {
    // Get contract factories
    const priceFeedFactory = await this.getFactory("PriceFeed")
    const sortedLoCsFactory = await this.getFactory("SortedLoCs")
    const locManagerFactory = await this.getFactory("LoCManager")
    const activePoolFactory = await this.getFactory("ActivePool")
    const stabilityPoolFactory = await this.getFactory("StabilityPool")
    const gasPoolFactory = await this.getFactory("GasPool")
    const defaultPoolFactory = await this.getFactory("DefaultPool")
    const collSurplusPoolFactory = await this.getFactory("CollSurplusPool")
    const borrowerOperationsFactory = await this.getFactory("BorrowerOperations")
    const hintHelpersFactory = await this.getFactory("HintHelpers")
    const zusdTokenFactory = await this.getFactory("ZUSDToken")

    // Deploy txs
    const priceFeed = await this.loadOrDeploy(priceFeedFactory, 'priceFeed', deploymentState)
    const sortedLoCs = await this.loadOrDeploy(sortedLoCsFactory, 'sortedLoCs', deploymentState)
    const locManager = await this.loadOrDeploy(locManagerFactory, 'locManager', deploymentState)
    const activePool = await this.loadOrDeploy(activePoolFactory, 'activePool', deploymentState)
    const stabilityPool = await this.loadOrDeploy(stabilityPoolFactory, 'stabilityPool', deploymentState)
    const gasPool = await this.loadOrDeploy(gasPoolFactory, 'gasPool', deploymentState)
    const defaultPool = await this.loadOrDeploy(defaultPoolFactory, 'defaultPool', deploymentState)
    const collSurplusPool = await this.loadOrDeploy(collSurplusPoolFactory, 'collSurplusPool', deploymentState)
    const borrowerOperations = await this.loadOrDeploy(borrowerOperationsFactory, 'borrowerOperations', deploymentState)
    const hintHelpers = await this.loadOrDeploy(hintHelpersFactory, 'hintHelpers', deploymentState)

    const zusdTokenParams = [
      locManager.address,
      stabilityPool.address,
      borrowerOperations.address
    ]
    const zusdToken = await this.loadOrDeploy(
      zusdTokenFactory,
      'zusdToken',
      deploymentState,
      zusdTokenParams
    )

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log('No Etherscan Url defined, skipping verification')
    } else {
      await this.verifyContract('priceFeed', deploymentState)
      await this.verifyContract('sortedLoCs', deploymentState)
      await this.verifyContract('locManager', deploymentState)
      await this.verifyContract('activePool', deploymentState)
      await this.verifyContract('stabilityPool', deploymentState)
      await this.verifyContract('gasPool', deploymentState)
      await this.verifyContract('defaultPool', deploymentState)
      await this.verifyContract('collSurplusPool', deploymentState)
      await this.verifyContract('borrowerOperations', deploymentState)
      await this.verifyContract('hintHelpers', deploymentState)
      await this.verifyContract('zusdToken', deploymentState, zusdTokenParams)
    }

    const coreContracts = {
      priceFeed,
      zusdToken,
      sortedLoCs,
      locManager,
      activePool,
      stabilityPool,
      gasPool,
      defaultPool,
      collSurplusPool,
      borrowerOperations,
      hintHelpers,
    }
    return coreContracts
  }

  // FIXME: This needs to be changes
  async deployZEROContractsMainnet(bountyAddress, lpRewardsAddress, multisigAddress, deploymentState) {
    const zeroStakingFactory = await this.getFactory("ZEROStaking")
    const communityIssuanceFactory = await this.getFactory("CommunityIssuance")
    const zeroTokenFactory = await this.getFactory("ZEROToken")

    const zeroStaking = await this.loadOrDeploy(zeroStakingFactory, 'zeroStaking', deploymentState)
    const communityIssuance = await this.loadOrDeploy(communityIssuanceFactory, 'communityIssuance', deploymentState)

    // Deploy ZERO Token, passing Community Issuance and Factory addresses to the constructor
    const zeroTokenParams = [
      zeroStaking.address,
      bountyAddress,
      lpRewardsAddress,
      multisigAddress
    ]
    const zeroToken = await this.loadOrDeploy(
      zeroTokenFactory,
      'zeroToken',
      deploymentState,
      zeroTokenParams
    )

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log('No Etherscan Url defined, skipping verification')
    } else {
      await this.verifyContract('zeroStaking', deploymentState)
      await this.verifyContract('communityIssuance', deploymentState)
      await this.verifyContract('zeroToken', deploymentState, zeroTokenParams)
    }

    const ZEROContracts = {
      zeroStaking,
      communityIssuance,
      zeroToken
    }
    return ZEROContracts
  }

  async deployMultiLoCGetterMainnet(zeroCore, deploymentState) {
    const multiLoCGetterFactory = await this.getFactory("MultiLoCGetter")
    const multiLoCGetterParams = [
      zeroCore.locManager.address,
      zeroCore.sortedLoCs.address
    ]
    const multiLoCGetter = await this.loadOrDeploy(
      multiLoCGetterFactory,
      'multiLoCGetter',
      deploymentState,
      multiLoCGetterParams
    )

    if (!this.configParams.ETHERSCAN_BASE_URL) {
      console.log('No Etherscan Url defined, skipping verification')
    } else {
      await this.verifyContract('multiLoCGetter', deploymentState, multiLoCGetterParams)
    }

    return multiLoCGetter
  }
  // --- Connector methods ---

  async isOwnershipRenounced(contract) {
    const owner = await contract.getOwner()
    return owner == ZERO_ADDRESS
  }
  // Connect contracts to their dependencies
  async connectCoreContractsMainnet(contracts, ZEROContracts, chainlinkProxyAddress) {
    const gasPrice = this.configParams.GAS_PRICE
    // Set ChainlinkAggregatorProxy and TellorCaller in the PriceFeed
    await this.isOwnershipRenounced(contracts.priceFeed) ||
      await this.sendAndWaitForTransaction(contracts.priceFeed.setAddresses(chainlinkProxyAddress, contracts.tellorCaller.address, {gasPrice}))

    // set LoCManager addr in SortedLoCs
    await this.isOwnershipRenounced(contracts.sortedLoCs) ||
      await this.sendAndWaitForTransaction(contracts.sortedLoCs.setParams(
        maxBytes32,
        contracts.locManager.address,
        contracts.borrowerOperations.address, 
	{gasPrice}
      ))

    // set contracts in the LoC Manager
    await this.isOwnershipRenounced(contracts.locManager) ||
      await this.sendAndWaitForTransaction(contracts.locManager.setAddresses(
        contracts.borrowerOperations.address,
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.stabilityPool.address,
        contracts.gasPool.address,
        contracts.collSurplusPool.address,
        contracts.priceFeed.address,
        contracts.zusdToken.address,
        contracts.sortedLoCs.address,
        ZEROContracts.zeroToken.address,
        ZEROContracts.zeroStaking.address,
	{gasPrice}
      ))

    // set contracts in BorrowerOperations 
    await this.isOwnershipRenounced(contracts.borrowerOperations) ||
      await this.sendAndWaitForTransaction(contracts.borrowerOperations.setAddresses(
        contracts.locManager.address,
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.stabilityPool.address,
        contracts.gasPool.address,
        contracts.collSurplusPool.address,
        contracts.priceFeed.address,
        contracts.sortedLoCs.address,
        contracts.zusdToken.address,
        ZEROContracts.zeroStaking.address,
	{gasPrice}
      ))

    // set contracts in the Pools
    await this.isOwnershipRenounced(contracts.stabilityPool) ||
      await this.sendAndWaitForTransaction(contracts.stabilityPool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.locManager.address,
        contracts.activePool.address,
        contracts.zusdToken.address,
        contracts.sortedLoCs.address,
        contracts.priceFeed.address,
        ZEROContracts.communityIssuance.address,
	{gasPrice}
      ))

    await this.isOwnershipRenounced(contracts.activePool) ||
      await this.sendAndWaitForTransaction(contracts.activePool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.locManager.address,
        contracts.stabilityPool.address,
        contracts.defaultPool.address,
	{gasPrice}
      ))

    await this.isOwnershipRenounced(contracts.defaultPool) ||
      await this.sendAndWaitForTransaction(contracts.defaultPool.setAddresses(
        contracts.locManager.address,
        contracts.activePool.address,
	{gasPrice}
      ))

    await this.isOwnershipRenounced(contracts.collSurplusPool) ||
      await this.sendAndWaitForTransaction(contracts.collSurplusPool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.locManager.address,
        contracts.activePool.address,
	{gasPrice}
      ))

    // set contracts in HintHelpers
    await this.isOwnershipRenounced(contracts.hintHelpers) ||
      await this.sendAndWaitForTransaction(contracts.hintHelpers.setAddresses(
        contracts.sortedLoCs.address,
        contracts.locManager.address,
	{gasPrice}
      ))
  }

  async connectZEROContractsMainnet(ZEROContracts) {
    const gasPrice = this.configParams.GAS_PRICE
    // Set ZEROToken address in LCF
    await this.isOwnershipRenounced(ZEROContracts.zeroStaking) ||
      await this.sendAndWaitForTransaction(ZEROContracts.lockupContractFactory.setZEROTokenAddress(ZEROContracts.zeroToken.address, {gasPrice}))
  }

  async connectZEROContractsToCoreMainnet(ZEROContracts, coreContracts) {
    const gasPrice = this.configParams.GAS_PRICE
    await this.isOwnershipRenounced(ZEROContracts.zeroStaking) ||
      await this.sendAndWaitForTransaction(ZEROContracts.zeroStaking.setAddresses(
        ZEROContracts.zeroToken.address,
        coreContracts.zusdToken.address,
        coreContracts.locManager.address, 
        coreContracts.borrowerOperations.address,
        coreContracts.activePool.address,
	{gasPrice}
      ))

    await this.isOwnershipRenounced(ZEROContracts.communityIssuance) ||
      await this.sendAndWaitForTransaction(ZEROContracts.communityIssuance.setAddresses(
        ZEROContracts.zeroToken.address,
        coreContracts.stabilityPool.address,
	{gasPrice}
      ))
  }

  // --- Verify on BTCrescan ---
  async verifyContract(name, deploymentState, constructorArguments=[]) {
    if (!deploymentState[name] || !deploymentState[name].address) {
      console.error(`  --> No deployment state for contract ${name}!!`)
      return
    }
    if (deploymentState[name].verification) {
      console.log(`Contract ${name} already verified`)
      return
    }

    try {
      await this.hre.run("verify:verify", {
        address: deploymentState[name].address,
        constructorArguments,
      })
    } catch (error) {
      // if it was already verified, it’s like a success, so let’s move forward and save it
      if (error.name != 'NomicLabsHardhatPluginError') {
        console.error(`Error verifying: ${error.name}`)
        console.error(error)
        return
      }
    }

    deploymentState[name].verification = `${this.configParams.ETHERSCAN_BASE_URL}/${deploymentState[name].address}#code`

    this.saveDeployment(deploymentState)
  }

  // --- Helpers ---

  async logContractObjects (contracts) {
    console.log(`Contract objects addresses:`)
    for ( const contractName of Object.keys(contracts)) {
      console.log(`${contractName}: ${contracts[contractName].address}`);
    }
  }
}

module.exports = MainnetDeploymentHelper
