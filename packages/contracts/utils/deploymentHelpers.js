const { artifacts } = require("hardhat");
const SortedLoCs = artifacts.require("./SortedLoCs.sol");
const ZeroBaseParams = artifacts.require("./ZeroBaseParams.sol");
const LoCManagerRedeemOps = artifacts.require("./Dependencies/LoCManagerRedeemOps.sol");
const LoCManager = artifacts.require("./LoCManager.sol");
const PriceFeedTestnet = artifacts.require("./PriceFeedTestnet.sol");
const ZUSDToken = artifacts.require("./ZUSDToken.sol");
const ActivePool = artifacts.require("./ActivePool.sol");
const DefaultPool = artifacts.require("./DefaultPool.sol");
const StabilityPool = artifacts.require("./StabilityPool.sol");
const GasPool = artifacts.require("./GasPool.sol");
const CollSurplusPool = artifacts.require("./CollSurplusPool.sol");
const FunctionCaller = artifacts.require("./TestContracts/FunctionCaller.sol");
const BorrowerOperations = artifacts.require("./BorrowerOperations.sol");
const HintHelpers = artifacts.require("./HintHelpers.sol");
const FeeDistributor = artifacts.require("./FeeDistributor.sol");

const ZEROStaking = artifacts.require("./ZEROStaking.sol");
const ZEROToken = artifacts.require("./ZEROToken.sol");
const CommunityIssuance = artifacts.require("./CommunityIssuance.sol");

const ZEROTokenTester = artifacts.require("./ZEROTokenTester.sol");
const CommunityIssuanceTester = artifacts.require("./CommunityIssuanceTester.sol");
const MockFeeSharingProxy = artifacts.require("./MockFeeSharingProxy.sol");
const StabilityPoolTester = artifacts.require("./StabilityPoolTester.sol");
const ActivePoolTester = artifacts.require("./ActivePoolTester.sol");
const DefaultPoolTester = artifacts.require("./DefaultPoolTester.sol");
const ZeroMathTester = artifacts.require("./ZeroMathTester.sol");
const BorrowerOperationsTester = artifacts.require("./BorrowerOperationsTester.sol");
const LoCManagerTester = artifacts.require("./LoCManagerTester.sol");
const ZUSDTokenTester = artifacts.require("./ZUSDTokenTester.sol");
const WRBTCTokenTester = artifacts.require("./WRBTCTokenTester.sol");

const MockBalanceRedirectPresale = artifacts.require("./MockBalanceRedirectPresale.sol");

// FIXME: this one should be removed after liquidity mining is correctly deployed
const NonPayable = artifacts.require("./NonPayable.sol");

// Proxy scripts
const BorrowerOperationsScript = artifacts.require("BorrowerOperationsScript");
const BorrowerWrappersScript = artifacts.require("BorrowerWrappersScript");
const LoCManagerScript = artifacts.require("LoCManagerScript");
const StabilityPoolScript = artifacts.require("StabilityPoolScript");
const TokenScript = artifacts.require("TokenScript");
const ZEROStakingScript = artifacts.require("ZEROStakingScript");

const {
  buildUserProxies,
  BorrowerOperationsProxy,
  BorrowerWrappersProxy,
  LoCManagerProxy,
  StabilityPoolProxy,
  SortedLoCsProxy,
  TokenProxy,
  ZEROStakingProxy,
  FeeDistributorProxy
} = require("../utils/proxyHelpers.js");

/* "Zero core" consists of all contracts in the core Zero system.

ZERO contracts consist of only those contracts related to the ZERO Token:

-the ZERO token
-the ZEROStaking contract
-the CommunityIssuance contract 
*/

const ZERO_ADDRESS = "0x" + "0".repeat(40);
const maxBytes32 = "0x" + "f".repeat(64);

class DeploymentHelper {
  static async deployZeroCore() {
    const cmdLineArgs = process.argv;
    const frameworkPath = cmdLineArgs[1];
    // console.log(`Framework used:  ${frameworkPath}`)

    if (frameworkPath.includes("hardhat")) {
      return this.deployZeroCoreHardhat();
    } else if (frameworkPath.includes("truffle")) {
      return this.deployZeroCoreTruffle();
    }
  }

  static async deployZEROContracts(multisigAddress) {
    const cmdLineArgs = process.argv;
    const frameworkPath = cmdLineArgs[1];
    // console.log(`Framework used:  ${frameworkPath}`)

    if (frameworkPath.includes("hardhat")) {
      return this.deployZEROContractsHardhat(multisigAddress);
    } else if (frameworkPath.includes("truffle")) {
      return this.deployZEROContractsTruffle(multisigAddress);
    }
  }

  static async deployZeroCoreHardhat() {
    const priceFeedTestnet = await PriceFeedTestnet.new();
    const sortedLoCs = await SortedLoCs.new();
    const zeroBaseParams = await ZeroBaseParams.new();
    const locManagerRedeemOps = await LoCManagerRedeemOps.new();
    const locManager = await LoCManager.new();
    const activePool = await ActivePool.new();
    const stabilityPool = await StabilityPool.new();
    const gasPool = await GasPool.new();
    const defaultPool = await DefaultPool.new();
    const collSurplusPool = await CollSurplusPool.new();
    const functionCaller = await FunctionCaller.new();
    const borrowerOperations = await BorrowerOperations.new();
    const hintHelpers = await HintHelpers.new();
    const zusdToken = await ZUSDToken.new();
    const feeDistributor = await FeeDistributor.new();
    const wrbtcTokenTester = await WRBTCTokenTester.new();
    await zusdToken.initialize(
      locManager.address,
      stabilityPool.address,
      borrowerOperations.address
    );
    await zeroBaseParams.initialize();
    ZUSDToken.setAsDeployed(zusdToken);
    DefaultPool.setAsDeployed(defaultPool);
    PriceFeedTestnet.setAsDeployed(priceFeedTestnet);
    SortedLoCs.setAsDeployed(sortedLoCs);
    ZeroBaseParams.setAsDeployed(zeroBaseParams);
    LoCManagerRedeemOps.setAsDeployed(locManagerRedeemOps);
    LoCManager.setAsDeployed(locManager);
    ActivePool.setAsDeployed(activePool);
    StabilityPool.setAsDeployed(stabilityPool);
    GasPool.setAsDeployed(gasPool);
    CollSurplusPool.setAsDeployed(collSurplusPool);
    FunctionCaller.setAsDeployed(functionCaller);
    BorrowerOperations.setAsDeployed(borrowerOperations);
    HintHelpers.setAsDeployed(hintHelpers);
    FeeDistributor.setAsDeployed(feeDistributor);
    WRBTCTokenTester.setAsDeployed(wrbtcTokenTester);

    const coreContracts = {
      priceFeedTestnet,
      zusdToken,
      sortedLoCs,
      zeroBaseParams,
      locManagerRedeemOps,
      locManager,
      activePool,
      stabilityPool,
      gasPool,
      defaultPool,
      collSurplusPool,
      functionCaller,
      borrowerOperations,
      hintHelpers,
      feeDistributor,
      wrbtcTokenTester
    };
    return coreContracts;
  }

  static async deployTesterContractsHardhat() {
    const testerContracts = {};

    // Contract without testers (yet)
    testerContracts.zeroBaseParams = await ZeroBaseParams.new();
    testerContracts.priceFeedTestnet = await PriceFeedTestnet.new();
    testerContracts.sortedLoCs = await SortedLoCs.new();
    // Actual tester contracts
    testerContracts.communityIssuance = await CommunityIssuanceTester.new();
    testerContracts.activePool = await ActivePoolTester.new();
    testerContracts.defaultPool = await DefaultPoolTester.new();
    testerContracts.stabilityPool = await StabilityPoolTester.new();
    testerContracts.gasPool = await GasPool.new();
    testerContracts.collSurplusPool = await CollSurplusPool.new();
    testerContracts.math = await ZeroMathTester.new();
    testerContracts.borrowerOperations = await BorrowerOperationsTester.new();
    testerContracts.locManagerRedeemOps = await LoCManagerRedeemOps.new();
    testerContracts.locManager = await LoCManagerTester.new();
    testerContracts.functionCaller = await FunctionCaller.new();
    testerContracts.hintHelpers = await HintHelpers.new();
    testerContracts.zusdToken = await ZUSDTokenTester.new(
      testerContracts.locManager.address,
      testerContracts.stabilityPool.address,
      testerContracts.borrowerOperations.address
    );
    testerContracts.feeDistributor = await FeeDistributor.new();
    testerContracts.wrbtcTokenTester = await WRBTCTokenTester.new();
    await testerContracts.zeroBaseParams.initialize();
    return testerContracts;
  }

  static async deployZEROContractsHardhat(multisigAddress) {
    const zeroStaking = await ZEROStaking.new();
    const communityIssuance = await CommunityIssuance.new();
    const mockFeeSharingProxy = await MockFeeSharingProxy.new();
    const presale = await MockBalanceRedirectPresale.new();
    // FIXME: replace with market maker contract address
    const marketMaker = await NonPayable.new();

    ZEROStaking.setAsDeployed(zeroStaking);
    CommunityIssuance.setAsDeployed(communityIssuance);
    MockBalanceRedirectPresale.setAsDeployed(presale);
    MockFeeSharingProxy.setAsDeployed(mockFeeSharingProxy);

    await presale.closePresale();

    // Deploy ZERO Token, passing market maker and presale addresses to the constructor
    const zeroToken = await ZEROToken.new();
    await zeroToken.initialize(zeroStaking.address, marketMaker.address, presale.address);
    ZEROToken.setAsDeployed(zeroToken);

    const ZEROContracts = {
      zeroStaking,
      communityIssuance,
      mockFeeSharingProxy,
      zeroToken,
      marketMaker,
      presale
    };
    return ZEROContracts;
  }

  static async deployZEROTesterContractsHardhat(multisigAddress) {
    const zeroStaking = await ZEROStaking.new();
    const communityIssuance = await CommunityIssuanceTester.new();
    const mockFeeSharingProxy = await MockFeeSharingProxy.new();
    const presale = await MockBalanceRedirectPresale.new();
    // FIXME: replace with market maker contract address
    const marketMaker = await NonPayable.new();

    ZEROStaking.setAsDeployed(zeroStaking);
    CommunityIssuanceTester.setAsDeployed(communityIssuance);
    MockFeeSharingProxy.setAsDeployed(mockFeeSharingProxy);
    MockBalanceRedirectPresale.setAsDeployed(presale);

    await presale.closePresale();

    // Deploy ZERO Token, passing marketMaker and presale addresses to the constructor
    const zeroToken = await ZEROTokenTester.new(
      zeroStaking.address,
      marketMaker.address,
      presale.address
    );
    ZEROTokenTester.setAsDeployed(zeroToken);

    const ZEROContracts = {
      zeroStaking,
      communityIssuance,
      mockFeeSharingProxy,
      zeroToken,
      marketMaker,
      presale
    };
    return ZEROContracts;
  }

  static async deployZeroCoreTruffle() {
    const priceFeedTestnet = await PriceFeedTestnet.new();
    const sortedLoCs = await SortedLoCs.new();
    const zeroBaseParams = await ZeroBaseParams.new();
    const locManagerRedeemOps = await LoCManagerRedeemOps.new();
    const locManager = await LoCManager.new();
    const activePool = await ActivePool.new();
    const stabilityPool = await StabilityPool.new();
    const gasPool = await GasPool.new();
    const defaultPool = await DefaultPool.new();
    const collSurplusPool = await CollSurplusPool.new();
    const functionCaller = await FunctionCaller.new();
    const borrowerOperations = await BorrowerOperations.new();
    const hintHelpers = await HintHelpers.new();
    const zusdToken = await ZUSDToken.new();
    const feeDistributor = await FeeDistributor.new();
    await zusdToken.initialize(
      locManager.address,
      stabilityPool.address,
      borrowerOperations.address
    );
    await zeroBaseParams.initialize();
    const coreContracts = {
      priceFeedTestnet,
      zusdToken,
      sortedLoCs,
      zeroBaseParams,
      locManagerRedeemOps,
      locManager,
      activePool,
      stabilityPool,
      gasPool,
      defaultPool,
      collSurplusPool,
      functionCaller,
      borrowerOperations,
      hintHelpers,
      feeDistributor
    };
    return coreContracts;
  }

  static async deployZEROContractsTruffle(multisigAddress) {
    const zeroStaking = await zeroStaking.new();
    const communityIssuance = await CommunityIssuance.new();
    const presale = await MockBalanceRedirectPresale.new();
    // FIXME: replace with market maker contract address
    const marketMaker = await NonPayable.new();

    /* Deploy ZERO Token, passing market maker and presale addresses 
    to the constructor  */
    const zeroToken = await ZEROToken.new();
    await zeroToken.initialize(zeroStaking.address, marketMakeraddress, presale.address);

    const ZEROContracts = {
      zeroStaking,
      communityIssuance,
      zeroToken,
      marketMaker,
      presale
    };
    return ZEROContracts;
  }

  static async deployZUSDToken(contracts) {
    contracts.zusdToken = await ZUSDToken.new();
    await contracts.zusdToken.initialize(
      contracts.locManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    );
    return contracts;
  }

  static async deployZUSDTokenTester(contracts) {
    contracts.zusdToken = await ZUSDTokenTester.new(
      contracts.locManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    );
    return contracts;
  }

  static async deployProxyScripts(contracts, ZEROContracts, owner, users) {
    const proxies = await buildUserProxies(users);

    const borrowerWrappersScript = await BorrowerWrappersScript.new(
      contracts.borrowerOperations.address,
      contracts.locManager.address,
      ZEROContracts.zeroStaking.address,
      contracts.stabilityPool.address,
      contracts.priceFeedTestnet.address,
      contracts.zusdToken.address,
      ZEROContracts.zeroToken.address
    );
    contracts.borrowerWrappers = new BorrowerWrappersProxy(
      owner,
      proxies,
      borrowerWrappersScript.address
    );

    const borrowerOperationsScript = await BorrowerOperationsScript.new(
      contracts.borrowerOperations.address
    );
    contracts.borrowerOperations = new BorrowerOperationsProxy(
      owner,
      proxies,
      borrowerOperationsScript.address,
      contracts.borrowerOperations
    );

    const locManagerScript = await LoCManagerScript.new(contracts.locManager.address);
    contracts.locManager = new LoCManagerProxy(
      owner,
      proxies,
      locManagerScript.address,
      contracts.locManager
    );

    const stabilityPoolScript = await StabilityPoolScript.new(contracts.stabilityPool.address);
    contracts.stabilityPool = new StabilityPoolProxy(
      owner,
      proxies,
      stabilityPoolScript.address,
      contracts.stabilityPool
    );

    contracts.sortedLoCs = new SortedLoCsProxy(owner, proxies, contracts.sortedLoCs);

    const zusdTokenScript = await TokenScript.new(contracts.zusdToken.address);
    contracts.zusdToken = new TokenProxy(
      owner,
      proxies,
      zusdTokenScript.address,
      contracts.zusdToken
    );

    const zeroTokenScript = await TokenScript.new(ZEROContracts.zeroToken.address);
    ZEROContracts.zeroToken = new TokenProxy(
      owner,
      proxies,
      zeroTokenScript.address,
      ZEROContracts.zeroToken
    );

    const zeroStakingScript = await ZEROStakingScript.new(ZEROContracts.zeroStaking.address);
    ZEROContracts.zeroStaking = new ZEROStakingProxy(
      owner,
      proxies,
      zeroStakingScript.address,
      ZEROContracts.zeroStaking
    );
  }

  // Connect contracts to their dependencies
  static async connectCoreContracts(contracts, ZEROContracts) {
    // set LoCManager addr in SortedLoCs
    await contracts.sortedLoCs.setParams(
      maxBytes32,
      contracts.locManager.address,
      contracts.borrowerOperations.address
    );

    // set contract addresses in the FunctionCaller
    await contracts.functionCaller.setLoCManagerAddress(contracts.locManager.address);
    await contracts.functionCaller.setSortedLoCsAddress(contracts.sortedLoCs.address);

    // set contracts in the LoC Manager
    await contracts.locManager.setAddresses(
      contracts.feeDistributor.address,
      contracts.locManagerRedeemOps.address,
      contracts.zeroBaseParams.address,
      contracts.borrowerOperations.address,
      contracts.activePool.address,
      contracts.defaultPool.address,
      contracts.stabilityPool.address,
      contracts.gasPool.address,
      contracts.collSurplusPool.address,
      contracts.priceFeedTestnet.address,
      contracts.zusdToken.address,
      contracts.sortedLoCs.address,
      ZEROContracts.zeroToken.address,
      ZEROContracts.zeroStaking.address
    );

    // set contracts in BorrowerOperations
    await contracts.borrowerOperations.setAddresses(
      contracts.feeDistributor.address,
      contracts.zeroBaseParams.address,
      contracts.locManager.address,
      contracts.activePool.address,
      contracts.defaultPool.address,
      contracts.stabilityPool.address,
      contracts.gasPool.address,
      contracts.collSurplusPool.address,
      contracts.priceFeedTestnet.address,
      contracts.sortedLoCs.address,
      contracts.zusdToken.address,
      ZEROContracts.zeroStaking.address
    );

    // set contracts in FeeDistributor
    await contracts.feeDistributor.setAddresses(
      ZEROContracts.mockFeeSharingProxy.address,
      ZEROContracts.zeroStaking.address,
      contracts.borrowerOperations.address,
      contracts.locManager.address,
      contracts.wrbtcTokenTester.address,
      contracts.zusdToken.address,
      contracts.activePool.address
    );

    // set contracts in the Pools
    await contracts.stabilityPool.setAddresses(
      contracts.zeroBaseParams.address,
      contracts.borrowerOperations.address,
      contracts.locManager.address,
      contracts.activePool.address,
      contracts.zusdToken.address,
      contracts.sortedLoCs.address,
      contracts.priceFeedTestnet.address,
      ZEROContracts.communityIssuance.address
    );

    await contracts.activePool.setAddresses(
      contracts.borrowerOperations.address,
      contracts.locManager.address,
      contracts.stabilityPool.address,
      contracts.defaultPool.address
    );

    await contracts.defaultPool.setAddresses(
      contracts.locManager.address,
      contracts.activePool.address
    );

    await contracts.collSurplusPool.setAddresses(
      contracts.borrowerOperations.address,
      contracts.locManager.address,
      contracts.activePool.address
    );

    // set contracts in HintHelpers
    await contracts.hintHelpers.setAddresses(
      contracts.zeroBaseParams.address,
      contracts.sortedLoCs.address,
      contracts.locManager.address
    );
  }

  static async connectZEROContracts(ZEROContracts) {
    // Set ZEROToken address in LCF
    // FIXME
  }

  static async connectZEROContractsToCore(ZEROContracts, coreContracts, walletAddress) {
    await ZEROContracts.zeroStaking.setAddresses(
      ZEROContracts.zeroToken.address,
      coreContracts.zusdToken.address,
      coreContracts.feeDistributor.address,
      coreContracts.activePool.address
    );

    await ZEROContracts.communityIssuance.initialize(
      ZEROContracts.zeroToken.address,
      coreContracts.stabilityPool.address,
      walletAddress
    );
  }
}
module.exports = DeploymentHelper;
