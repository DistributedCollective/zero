const { artifacts } = require("hardhat");
const SortedTroves = artifacts.require("./SortedTroves.sol");
const LiquityBaseParams = artifacts.require("./LiquityBaseParams.sol");
const TroveManagerRedeemOps = artifacts.require("./Dependencies/TroveManagerRedeemOps.sol");
const TroveManager = artifacts.require("./TroveManager.sol");
const PriceFeedTestnet = artifacts.require("./PriceFeedTestnet.sol");
const PriceFeedSovryn = artifacts.require("./PriceFeedSovrynTester.sol");
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
const MockFeeSharingCollector = artifacts.require("./MockFeeSharingCollector.sol");
const StabilityPoolTester = artifacts.require("./StabilityPoolTester.sol");
const ActivePoolTester = artifacts.require("./ActivePoolTester.sol");
const DefaultPoolTester = artifacts.require("./DefaultPoolTester.sol");
const LiquityMathTester = artifacts.require("./LiquityMathTester.sol");
const BorrowerOperationsTester = artifacts.require("./BorrowerOperationsTester.sol");
const TroveManagerTester = artifacts.require("./TroveManagerTester.sol");
const ZUSDTokenTester = artifacts.require("./ZUSDTokenTester.sol");
const WRBTCTokenTester = artifacts.require("./WRBTCTokenTester.sol");

const MockBalanceRedirectPresale = artifacts.require("./MockBalanceRedirectPresale.sol");

// FIXME: this one should be removed after liquidity mining is correctly deployed
const NonPayable = artifacts.require("./NonPayable.sol");

// Proxy scripts
const BorrowerOperationsScript = artifacts.require("BorrowerOperationsScript");
const BorrowerWrappersScript = artifacts.require("BorrowerWrappersScript");
const TroveManagerScript = artifacts.require("TroveManagerScript");
const StabilityPoolScript = artifacts.require("StabilityPoolScript");
const TokenScript = artifacts.require("TokenScript");
const ZEROStakingScript = artifacts.require("ZEROStakingScript");

const {
  buildUserProxies,
  BorrowerOperationsProxy,
  BorrowerWrappersProxy,
  TroveManagerProxy,
  StabilityPoolProxy,
  SortedTrovesProxy,
  TokenProxy,
  ZEROStakingProxy,
  FeeDistributorProxy
} = require("./proxyHelpers.js");

/* "Zero core" consists of all contracts in the core Zero system.

ZERO contracts consist of only those contracts related to the ZERO Token:

-the ZERO token
-the ZEROStaking contract
-the CommunityIssuance contract 
*/

const ZERO_ADDRESS = "0x" + "0".repeat(40);
const maxBytes32 = "0x" + "f".repeat(64);

const ONE_DAY_IN_SECONDS = 86400;
const ONE_MINUTE = 60;
const TWO_WEEKS = 14 * ONE_DAY_IN_SECONDS;

class DeploymentHelper {
  static async deployLiquityCore() {
    const cmdLineArgs = process.argv;
    const frameworkPath = cmdLineArgs[1];
    // console.log(`Framework used:  ${frameworkPath}`)

    if (frameworkPath.includes("hardhat")) {
      return this.deployLiquityCoreHardhat();
    } else if (frameworkPath.includes("truffle")) {
      return this.deployLiquityCoreTruffle();
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

  static async deployLiquityCoreHardhat() {
    const priceFeedTestnet = await PriceFeedTestnet.new();
    const priceFeedSovryn = await PriceFeedSovryn.new();
    const sortedTroves = await SortedTroves.new();
    const liquityBaseParams = await LiquityBaseParams.new();
    const troveManagerRedeemOps = await TroveManagerRedeemOps.new(TWO_WEEKS);
    const troveManager = await TroveManager.new(TWO_WEEKS);
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
      troveManager.address,
      stabilityPool.address,
      borrowerOperations.address
    );
    await liquityBaseParams.initialize();
    ZUSDToken.setAsDeployed(zusdToken);
    DefaultPool.setAsDeployed(defaultPool);
    PriceFeedTestnet.setAsDeployed(priceFeedTestnet);
    PriceFeedSovryn.setAsDeployed(priceFeedSovryn);
    SortedTroves.setAsDeployed(sortedTroves);
    LiquityBaseParams.setAsDeployed(liquityBaseParams);
    TroveManagerRedeemOps.setAsDeployed(troveManagerRedeemOps);
    TroveManager.setAsDeployed(troveManager);
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
      priceFeedSovryn,
      zusdToken,
      sortedTroves,
      liquityBaseParams,
      troveManagerRedeemOps,
      troveManager,
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
    testerContracts.liquityBaseParams = await LiquityBaseParams.new();
    testerContracts.priceFeedTestnet = await PriceFeedTestnet.new();
    testerContracts.priceFeedSovryn = await PriceFeedSovryn.new();
    testerContracts.sortedTroves = await SortedTroves.new();
    // Actual tester contracts
    testerContracts.communityIssuance = await CommunityIssuanceTester.new();
    testerContracts.activePool = await ActivePoolTester.new();
    testerContracts.defaultPool = await DefaultPoolTester.new();
    testerContracts.stabilityPool = await StabilityPoolTester.new();
    testerContracts.gasPool = await GasPool.new();
    testerContracts.collSurplusPool = await CollSurplusPool.new();
    testerContracts.math = await LiquityMathTester.new();
    testerContracts.borrowerOperations = await BorrowerOperationsTester.new();
    testerContracts.troveManagerRedeemOps = await TroveManagerRedeemOps.new(TWO_WEEKS);
    testerContracts.troveManager = await TroveManagerTester.new(TWO_WEEKS);
    testerContracts.functionCaller = await FunctionCaller.new();
    testerContracts.hintHelpers = await HintHelpers.new();
    testerContracts.zusdToken = await ZUSDTokenTester.new(
      testerContracts.troveManager.address,
      testerContracts.stabilityPool.address,
      testerContracts.borrowerOperations.address
    );
    testerContracts.feeDistributor = await FeeDistributor.new();
    testerContracts.wrbtcTokenTester = await WRBTCTokenTester.new();
    await testerContracts.liquityBaseParams.initialize();
    return testerContracts;
  }

  static async deployZEROContractsHardhat(multisigAddress) {
    const zeroStaking = await ZEROStaking.new();
    const communityIssuance = await CommunityIssuance.new();
    const mockFeeSharingCollector = await MockFeeSharingCollector.new();
    const presale = await MockBalanceRedirectPresale.new();
    // FIXME: replace with market maker contract address
    const marketMaker = await NonPayable.new();

    ZEROStaking.setAsDeployed(zeroStaking);
    CommunityIssuance.setAsDeployed(communityIssuance);
    MockBalanceRedirectPresale.setAsDeployed(presale);
    MockFeeSharingCollector.setAsDeployed(mockFeeSharingCollector);

    await presale.closePresale();

    // Deploy ZERO Token, passing market maker and presale addresses to the constructor
    const zeroToken = await ZEROToken.new();
    await zeroToken.initialize(zeroStaking.address, marketMaker.address, presale.address);
    ZEROToken.setAsDeployed(zeroToken);

    const ZEROContracts = {
      zeroStaking,
      communityIssuance,
      mockFeeSharingCollector,
      zeroToken,
      marketMaker,
      presale
    };
    return ZEROContracts;
  }

  static async deployZEROTesterContractsHardhat(multisigAddress) {
    const zeroStaking = await ZEROStaking.new();
    const communityIssuance = await CommunityIssuanceTester.new();
    const mockFeeSharingCollector = await MockFeeSharingCollector.new();
    const presale = await MockBalanceRedirectPresale.new();
    // FIXME: replace with market maker contract address
    const marketMaker = await NonPayable.new();

    ZEROStaking.setAsDeployed(zeroStaking);
    CommunityIssuanceTester.setAsDeployed(communityIssuance);
    MockFeeSharingCollector.setAsDeployed(mockFeeSharingCollector);
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
      mockFeeSharingCollector,
      zeroToken,
      marketMaker,
      presale
    };
    return ZEROContracts;
  }

  static async deployLiquityCoreTruffle() {
    const priceFeedTestnet = await PriceFeedTestnet.new();
    const priceFeedSovryn = await PriceFeedSovryn.new();
    const sortedTroves = await SortedTroves.new();
    const liquityBaseParams = await LiquityBaseParams.new();
    const troveManagerRedeemOps = await TroveManagerRedeemOps.new(TWO_WEEKS);
    const troveManager = await TroveManager.new(TWO_WEEKS);
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
      troveManager.address,
      stabilityPool.address,
      borrowerOperations.address
    );
    await liquityBaseParams.initialize();
    const coreContracts = {
      priceFeedTestnet,
      priceFeedSovryn,
      zusdToken,
      sortedTroves,
      liquityBaseParams,
      troveManagerRedeemOps,
      troveManager,
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
      contracts.troveManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    );
    return contracts;
  }

  static async deployZUSDTokenTester(contracts) {
    contracts.zusdToken = await ZUSDTokenTester.new(
      contracts.troveManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    );
    return contracts;
  }

  static async deployProxyScripts(contracts, ZEROContracts, owner, users) {
    const proxies = await buildUserProxies(users);

    const borrowerWrappersScript = await BorrowerWrappersScript.new(
      contracts.borrowerOperations.address,
      contracts.troveManager.address,
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

    const troveManagerScript = await TroveManagerScript.new(contracts.troveManager.address);
    contracts.troveManager = new TroveManagerProxy(
      owner,
      proxies,
      troveManagerScript.address,
      contracts.troveManager
    );

    const stabilityPoolScript = await StabilityPoolScript.new(contracts.stabilityPool.address);
    contracts.stabilityPool = new StabilityPoolProxy(
      owner,
      proxies,
      stabilityPoolScript.address,
      contracts.stabilityPool
    );

    contracts.sortedTroves = new SortedTrovesProxy(owner, proxies, contracts.sortedTroves);

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
    // set TroveManager addr in SortedTroves
    await contracts.sortedTroves.setParams(
      maxBytes32,
      contracts.troveManager.address,
      contracts.borrowerOperations.address
    );

    // set contract addresses in the FunctionCaller
    await contracts.functionCaller.setTroveManagerAddress(contracts.troveManager.address);
    await contracts.functionCaller.setSortedTrovesAddress(contracts.sortedTroves.address);

    // set contracts in the Trove Manager
    await contracts.troveManager.setAddresses(
      {
        _feeDistributorAddress: contracts.feeDistributor.address,
        _troveManagerRedeemOps: contracts.troveManagerRedeemOps.address,
        _liquityBaseParamsAddress: contracts.liquityBaseParams.address,
        _borrowerOperationsAddress: contracts.borrowerOperations.address,
        _activePoolAddress: contracts.activePool.address,
        _defaultPoolAddress: contracts.defaultPool.address,
        _stabilityPoolAddress: contracts.stabilityPool.address,
        _gasPoolAddress: contracts.gasPool.address,
        _collSurplusPoolAddress: contracts.collSurplusPool.address,
        _priceFeedAddress: contracts.priceFeedTestnet.address,
        _zusdTokenAddress: contracts.zusdToken.address,
        _sortedTrovesAddress: contracts.sortedTroves.address,
        _zeroTokenAddress: ZEROContracts.zeroToken.address,
        _zeroStakingAddress: ZEROContracts.zeroStaking.address
      }
    );

    // set contracts in BorrowerOperations
    await contracts.borrowerOperations.setAddresses(
      contracts.feeDistributor.address,
      contracts.liquityBaseParams.address,
      contracts.troveManager.address,
      contracts.activePool.address,
      contracts.defaultPool.address,
      contracts.stabilityPool.address,
      contracts.gasPool.address,
      contracts.collSurplusPool.address,
      contracts.priceFeedTestnet.address,
      contracts.sortedTroves.address,
      contracts.zusdToken.address,
      ZEROContracts.zeroStaking.address
    );

    // set contracts in FeeDistributor
    await contracts.feeDistributor.setAddresses(
      ZEROContracts.mockFeeSharingCollector.address,
      ZEROContracts.zeroStaking.address,
      contracts.borrowerOperations.address,
      contracts.troveManager.address,
      contracts.wrbtcTokenTester.address,
      contracts.zusdToken.address,
      contracts.activePool.address
    );

    // set contracts in the Pools
    await contracts.stabilityPool.setAddresses(
      contracts.liquityBaseParams.address,
      contracts.borrowerOperations.address,
      contracts.troveManager.address,
      contracts.activePool.address,
      contracts.zusdToken.address,
      contracts.sortedTroves.address,
      contracts.priceFeedTestnet.address,
      ZEROContracts.communityIssuance.address
    );

    await contracts.activePool.setAddresses(
      contracts.borrowerOperations.address,
      contracts.troveManager.address,
      contracts.stabilityPool.address,
      contracts.defaultPool.address
    );

    await contracts.defaultPool.setAddresses(
      contracts.troveManager.address,
      contracts.activePool.address
    );

    await contracts.collSurplusPool.setAddresses(
      contracts.borrowerOperations.address,
      contracts.troveManager.address,
      contracts.activePool.address
    );

    // set contracts in HintHelpers
    await contracts.hintHelpers.setAddresses(
      contracts.liquityBaseParams.address,
      contracts.sortedTroves.address,
      contracts.troveManager.address
    );
  }

  static async connectZEROContracts(ZEROContracts) {
    // Set ZEROToken address in LCF
    // FIXME
  }

  static async connectZEROContractsToCore(ZEROContracts, coreContracts, apr = 0) {
    await ZEROContracts.zeroStaking.setAddresses(
      ZEROContracts.zeroToken.address,
      coreContracts.zusdToken.address,
      coreContracts.feeDistributor.address,
      coreContracts.activePool.address
    );

    console.log(coreContracts.priceFeedSovryn.address);

    await ZEROContracts.communityIssuance.initialize(
      ZEROContracts.zeroToken.address,
      coreContracts.zusdToken.address,
      coreContracts.stabilityPool.address,
      coreContracts.priceFeedSovryn.address,
      apr
    );
  }
}
module.exports = DeploymentHelper;
