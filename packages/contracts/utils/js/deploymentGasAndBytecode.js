// Hardhat script
const SortedTroves = artifacts.require("./SortedTroves.sol");
const TroveManager = artifacts.require("./TroveManager.sol");
const PriceFeed = artifacts.require("./PriceFeed.sol");
const ZUSDToken = artifacts.require("./ZUSDToken.sol");
const ActivePool = artifacts.require("./ActivePool.sol");
const DefaultPool = artifacts.require("./DefaultPool.sol");
const StabilityPool = artifacts.require("./StabilityPool.sol");
const FunctionCaller = artifacts.require("./FunctionCaller.sol");
const BorrowerOperations = artifacts.require("./BorrowerOperations.sol");

const ZEROStaking = artifacts.require("./ZERO/ZEROStaking.sol");
const ZEROToken = artifacts.require("./ZERO/ZEROToken.sol");
const CommunityIssuance = artifacts.require("./ZERO/CommunityIssuance.sol");
const HintHelpers = artifacts.require("./HintHelpers.sol");

const CommunityIssuanceTester = artifacts.require("./ZERO/CommunityIssuanceTester.sol");
const ActivePoolTester = artifacts.require("./ActivePoolTester.sol");
const DefaultPoolTester = artifacts.require("./DefaultPoolTester.sol");
const LiquityMathTester = artifacts.require("./LiquityMathTester.sol");
const BorrowerOperationsTester = artifacts.require("./BorrowerOperationsTester.sol");
const TroveManagerTester = artifacts.require("./TroveManagerTester.sol");
const ZUSDTokenTester = artifacts.require("./ZUSDTokenTester.sol");

const { TestHelper: th } = require("./testHelpers.js");

const dh = require("./deploymentHelpers.js");
const ARBITRARY_ADDRESS = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";   // placeholder for the LPrewards bounty addresses

const coreContractABIs = [
  BorrowerOperations,
  PriceFeed,
  ZUSDToken,
  SortedTroves,
  TroveManager,
  ActivePool,
  StabilityPool,
  DefaultPool,
  FunctionCaller,
  HintHelpers,
];

const ZEROContractABIs = [
  ZEROStaking,
  ZEROToken,
  CommunityIssuance
];

const TesterContractABIs = [
  CommunityIssuanceTester,
  ActivePoolTester,
  DefaultPoolTester,
  LiquityMathTester,
  BorrowerOperationsTester,
  TroveManagerTester,
  ZUSDTokenTester,
];

const getGasFromContractDeployment = async (contractObject, name) => {
  const txHash = contractObject.transactionHash;
  // console.log(`tx hash  of ${name} deployment is is: ${txHash}`)
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  const gas = receipt.gasUsed;
  console.log(`${name}: ${gas}`);
  return gas;
};

const getBytecodeSize = (contractABI) => {
  const bytecodeLength = (contractABI.bytecode.length / 2) - 1;
  const deployedBytecodeLength = (contractABI.deployedBytecode.length / 2) - 1;
  console.log(`${contractABI.contractName}: ${bytecodeLength}`);
  // console.log(`${contractABI.contractName} deployed bytecode length: ${deployedBytecodeLength}`)
};

const getUSDCostFromGasCost = (deploymentGasTotal, gasPriceInGwei, ETHPrice) => {
  const dollarCost = (deploymentGasTotal * gasPriceInGwei * ETHPrice) / 1e9;
  console.log(`At gas price ${gasPriceInGwei} GWei, and ETH Price $${ETHPrice} per ETH, the total cost of deployment in USD is: $${dollarCost}`);
};

const logContractDeploymentCosts = async (contracts) => {
  console.log(`Gas costs for deployments: `);
  let totalGasCost = 0;
  for (contractName of Object.keys(contracts)) {
    const gasCost = await getGasFromContractDeployment(contracts[contractName], contractName);
    totalGasCost = totalGasCost + Number(gasCost);
  }
  console.log(`Total deployment gas costs: ${totalGasCost}`);
  getUSDCostFromGasCost(totalGasCost, 200, 1850);
};

const logContractObjects = async (contracts) => {
  console.log(`Contract objects addresses:`);
  let totalGasCost = 0;
  for (contractName of Object.keys(contracts)) {
    const gasCost = await getGasFromContractDeployment(contracts[contractName], contractName);
    totalGasCost = totalGasCost + Number(gasCost);
  }
};

const logContractBytecodeLengths = (contractABIs) => {
  console.log(`Contract bytecode lengths:`);
  for (abi of contractABIs) {
    getBytecodeSize(abi);
  }
};

// Run script: log deployment gas costs and bytecode lengths for all contracts
async function main() {
  const coreContracts = await dh.deployLiquityCoreHardhat();
  const ZEROContracts = await dh.deployZEROContractsHardhat(ARBITRARY_ADDRESS, ARBITRARY_ADDRESS);
  const testerContracts = await dh.deployTesterContractsHardhat();

  await dh.connectCoreContracts(coreContracts, ZEROContracts);
  await dh.connectZEROContracts(ZEROContracts);
  await dh.connectZEROContractsToCore(ZEROContracts, coreContracts);


  console.log(`\n`);
  console.log(`ZERO CONTRACTS`);
  await logContractDeploymentCosts(ZEROContracts);
  console.log(`\n`);
  logContractBytecodeLengths(ZEROContractABIs);
  console.log(`\n`);

  console.log(`CORE CONTRACTS`);
  await logContractDeploymentCosts(coreContracts);
  console.log(`\n`);
  logContractBytecodeLengths(coreContractABIs);
  console.log(`\n`);

  console.log(`TESTER CONTRACTS`);
  await logContractDeploymentCosts(testerContracts);
  console.log(`\n`);
  logContractBytecodeLengths(TesterContractABIs);
  console.log(`\n`);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
