
const SortedLoCs = artifacts.require("./SortedLoCs.sol")
const LoCManager = artifacts.require("./LoCManager.sol")
const PriceFeedTestnet = artifacts.require("./PriceFeedTestnet.sol")
const ZUSDToken = artifacts.require("./ZUSDToken.sol")
const ActivePool = artifacts.require("./ActivePool.sol");
const DefaultPool = artifacts.require("./DefaultPool.sol");
const StabilityPool = artifacts.require("./StabilityPool.sol")
const FunctionCaller = artifacts.require("./FunctionCaller.sol")
const BorrowerOperations = artifacts.require("./BorrowerOperations.sol")

const deployZero = async () => {
  const priceFeedTestnet = await PriceFeedTestnet.new()
  const sortedLoCs = await SortedLoCs.new()
  const locManager = await LoCManager.new()
  const activePool = await ActivePool.new()
  const stabilityPool = await StabilityPool.new()
  const defaultPool = await DefaultPool.new()
  const functionCaller = await FunctionCaller.new()
  const borrowerOperations = await BorrowerOperations.new()
  const zusdToken = await ZUSDToken.new()
  await zusdToken.initialize(
    locManager.address,
    stabilityPool.address,
    borrowerOperations.address
  )
  DefaultPool.setAsDeployed(defaultPool)
  PriceFeedTestnet.setAsDeployed(priceFeedTestnet)
  ZUSDToken.setAsDeployed(zusdToken)
  SortedLoCs.setAsDeployed(sortedLoCs)
  LoCManager.setAsDeployed(locManager)
  ActivePool.setAsDeployed(activePool)
  StabilityPool.setAsDeployed(stabilityPool)
  FunctionCaller.setAsDeployed(functionCaller)
  BorrowerOperations.setAsDeployed(borrowerOperations)

  const contracts = {
    priceFeedTestnet,
    zusdToken,
    sortedLoCs,
    locManager,
    activePool,
    stabilityPool,
    defaultPool,
    functionCaller,
    borrowerOperations
  }
  return contracts
}

const getAddresses = (contracts) => {
  return {
    BorrowerOperations: contracts.borrowerOperations.address,
    PriceFeedTestnet: contracts.priceFeedTestnet.address,
    ZUSDToken: contracts.zusdToken.address,
    SortedLoCs: contracts.sortedLoCs.address,
    LoCManager: contracts.locManager.address,
    StabilityPool: contracts.stabilityPool.address,
    ActivePool: contracts.activePool.address,
    DefaultPool: contracts.defaultPool.address,
    FunctionCaller: contracts.functionCaller.address
  }
}

// Connect contracts to their dependencies
const connectContracts = async (contracts, addresses) => {
  // set LoCManager addr in SortedLoCs
  await contracts.sortedLoCs.setLoCManager(addresses.LoCManager)

  // set contract addresses in the FunctionCaller 
  await contracts.functionCaller.setLoCManagerAddress(addresses.LoCManager)
  await contracts.functionCaller.setSortedLoCsAddress(addresses.SortedLoCs)

  // set LoCManager addr in PriceFeed
  await contracts.priceFeedTestnet.setLoCManagerAddress(addresses.LoCManager)

  // set contracts in the LoC Manager
  await contracts.locManager.setZUSDToken(addresses.ZUSDToken)
  await contracts.locManager.setSortedLoCs(addresses.SortedLoCs)
  await contracts.locManager.setPriceFeed(addresses.PriceFeedTestnet)
  await contracts.locManager.setActivePool(addresses.ActivePool)
  await contracts.locManager.setDefaultPool(addresses.DefaultPool)
  await contracts.locManager.setStabilityPool(addresses.StabilityPool)
  await contracts.locManager.setBorrowerOperations(addresses.BorrowerOperations)

  // set contracts in BorrowerOperations 
  await contracts.borrowerOperations.setSortedLoCs(addresses.SortedLoCs)
  await contracts.borrowerOperations.setPriceFeed(addresses.PriceFeedTestnet)
  await contracts.borrowerOperations.setActivePool(addresses.ActivePool)
  await contracts.borrowerOperations.setDefaultPool(addresses.DefaultPool)
  await contracts.borrowerOperations.setLoCManager(addresses.LoCManager)

  // set contracts in the Pools
  await contracts.stabilityPool.setActivePoolAddress(addresses.ActivePool)
  await contracts.stabilityPool.setDefaultPoolAddress(addresses.DefaultPool)

  await contracts.activePool.setStabilityPoolAddress(addresses.StabilityPool)
  await contracts.activePool.setDefaultPoolAddress(addresses.DefaultPool)

  await contracts.defaultPool.setStabilityPoolAddress(addresses.StabilityPool)
  await contracts.defaultPool.setActivePoolAddress(addresses.ActivePool)
}

const connectEchidnaProxy = async (echidnaProxy, addresses) => {
  echidnaProxy.setLoCManager(addresses.LoCManager)
  echidnaProxy.setBorrowerOperations(addresses.BorrowerOperations)
}

module.exports = {
  connectEchidnaProxy: connectEchidnaProxy,
  getAddresses: getAddresses,
  deployZero: deployZero,
  connectContracts: connectContracts
}
