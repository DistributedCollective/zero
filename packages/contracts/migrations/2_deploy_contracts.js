// Truffle migration script for deployment to Ganache

const SortedLoCs = artifacts.require("./SortedLoCs.sol")
const ActivePool = artifacts.require("./ActivePool.sol")
const DefaultPool = artifacts.require("./DefaultPool.sol")
const StabilityPool = artifacts.require("./StabilityPool.sol")
const LoCManager = artifacts.require("./LoCManager.sol")
const PriceFeed = artifacts.require("./PriceFeed.sol")
const ZUSDToken = artifacts.require("./ZUSDToken.sol")
const FunctionCaller = artifacts.require("./FunctionCaller.sol")
const BorrowerOperations = artifacts.require("./BorrowerOperations.sol")

const deploymentHelpers = require("../utils/truffleDeploymentHelpers.js")

const getAddresses = deploymentHelpers.getAddresses
const connectContracts = deploymentHelpers.connectContracts

module.exports = function(deployer) {
  deployer.deploy(BorrowerOperations)
  deployer.deploy(PriceFeed)
  deployer.deploy(SortedLoCs)
  deployer.deploy(LoCManager)
  deployer.deploy(ActivePool)
  deployer.deploy(StabilityPool)
  deployer.deploy(DefaultPool)
  deployer.deploy(ZUSDToken)
  deployer.deploy(FunctionCaller)

  deployer.then(async () => {
    const borrowerOperations = await BorrowerOperations.deployed()
    const priceFeed = await PriceFeed.deployed()
    const sortedLoCs = await SortedLoCs.deployed()
    const locManager = await LoCManager.deployed()
    const activePool = await ActivePool.deployed()
    const stabilityPool = await StabilityPool.deployed()
    const defaultPool = await DefaultPool.deployed()
    const zusdToken = await ZUSDToken.deployed()
    const functionCaller = await FunctionCaller.deployed()

    const zeroContracts = {
      borrowerOperations,
      priceFeed,
      zusdToken,
      sortedLoCs,
      locManager,
      activePool,
      stabilityPool,
      defaultPool,
      functionCaller
    }

    // Grab contract addresses
    const zeroAddresses = getAddresses(zeroContracts)
    console.log('deploy_contracts.js - Deployed contract addresses: \n')
    console.log(zeroAddresses)
    console.log('\n')

    // Connect contracts to each other
    await connectContracts(zeroContracts, zeroAddresses)
  })
}
