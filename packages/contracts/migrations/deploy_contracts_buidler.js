// Buidler-Truffle fixture for deployment to Buidler EVM

const SortedLoCs = artifacts.require("./SortedLoCs.sol")
const ActivePool = artifacts.require("./ActivePool.sol")
const DefaultPool = artifacts.require("./DefaultPool.sol")
const StabilityPool = artifacts.require("./StabilityPool.sol")
const LoCManager = artifacts.require("./LoCManager.sol")
const PriceFeed = artifacts.require("./PriceFeed.sol")
const ZUSDToken = artifacts.require("./ZUSDToken.sol")
const FunctionCaller = artifacts.require("./FunctionCaller.sol")
const BorrowerOperations = artifacts.require("./BorrowerOperations.sol")

const deploymentHelpers = require("../utils/deploymentHelpers.js")

const getAddresses = deploymentHelpers.getAddresses
const connectContracts = deploymentHelpers.connectContracts

module.exports = async () => {
  const borrowerOperations = await BorrowerOperations.new()
  const priceFeed = await PriceFeed.new()
  const sortedLoCs = await SortedLoCs.new()
  const locManager = await LoCManager.new()
  const activePool = await ActivePool.new()
  const stabilityPool = await StabilityPool.new()
  const defaultPool = await DefaultPool.new()
  const functionCaller = await FunctionCaller.new()
  const zusdToken = await ZUSDToken.new(
    locManager.address,
    stabilityPool.address,
    borrowerOperations.address
  )
  BorrowerOperations.setAsDeployed(borrowerOperations)
  PriceFeed.setAsDeployed(priceFeed)
  SortedLoCs.setAsDeployed(sortedLoCs)
  LoCManager.setAsDeployed(locManager)
  ActivePool.setAsDeployed(activePool)
  StabilityPool.setAsDeployed(stabilityPool)
  DefaultPool.setAsDeployed(defaultPool)
  FunctionCaller.setAsDeployed(functionCaller)
  ZUSDToken.setAsDeployed(zusdToken)

  const contracts = {
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
  const addresses = getAddresses(contracts)
  console.log('deploy_contracts.js - Deployhed contract addresses: \n')
  console.log(addresses)
  console.log('\n')

  // Connect contracts to each other via the NameRegistry records
  await connectContracts(contracts, addresses)
}
