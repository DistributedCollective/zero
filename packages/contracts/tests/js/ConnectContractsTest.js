const deploymentHelper = require("../../utils/js/deploymentHelpers.js");

contract('Deployment script - Sets correct contract addresses dependencies after deployment', async accounts => {
  const [owner, feeSharingCollector] = accounts;

  const multisig = accounts[999];

  let priceFeed;
  let zusdToken;
  let sortedTroves;
  let troveManager;
  let activePool;
  let stabilityPool;
  let defaultPool;
  let functionCaller;
  let borrowerOperations;
  let zeroStaking;
  let zeroToken;
  let sovToken;
  let communityIssuance;
  let feeDistributor;

  before(async () => {
    const coreContracts = await deploymentHelper.deployLiquityCore();
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig);

    priceFeed = coreContracts.priceFeedTestnet;
    zusdToken = coreContracts.zusdToken;
    sortedTroves = coreContracts.sortedTroves;
    troveManager = coreContracts.troveManager;
    activePool = coreContracts.activePool;
    stabilityPool = coreContracts.stabilityPool;
    defaultPool = coreContracts.defaultPool;
    functionCaller = coreContracts.functionCaller;
    borrowerOperations = coreContracts.borrowerOperations;
    feeDistributor = coreContracts.feeDistributor;

    zeroStaking = ZEROContracts.zeroStaking;
    zeroToken = ZEROContracts.zeroToken;
    sovToken = ZEROContracts.zeroToken;
    communityIssuance = ZEROContracts.communityIssuance;

    await deploymentHelper.connectZEROContracts(ZEROContracts);
    await deploymentHelper.connectCoreContracts(coreContracts, ZEROContracts);
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts);
  });

  it('Sets the correct PriceFeed address in TroveManager', async () => {
    const priceFeedAddress = priceFeed.address;

    const recordedPriceFeedAddress = await troveManager.priceFeed();

    assert.equal(priceFeedAddress, recordedPriceFeedAddress);
  });

  it('Sets the correct ZUSDToken address in TroveManager', async () => {
    const zusdTokenAddress = zusdToken.address;

    const recordedClvTokenAddress = await troveManager._zusdToken();

    assert.equal(zusdTokenAddress, recordedClvTokenAddress);
  });

  it('Sets the correct SortedTroves address in TroveManager', async () => {
    const sortedTrovesAddress = sortedTroves.address;

    const recordedSortedTrovesAddress = await troveManager.sortedTroves();

    assert.equal(sortedTrovesAddress, recordedSortedTrovesAddress);
  });

  it('Sets the correct BorrowerOperations address in TroveManager', async () => {
    const borrowerOperationsAddress = borrowerOperations.address;

    const recordedBorrowerOperationsAddress = await troveManager.borrowerOperationsAddress();

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress);
  });

  // ActivePool in TroveM
  it('Sets the correct ActivePool address in TroveManager', async () => {
    const activePoolAddress = activePool.address;

    const recordedActivePoolAddresss = await troveManager.activePool();

    assert.equal(activePoolAddress, recordedActivePoolAddresss);
  });

  // DefaultPool in TroveM
  it('Sets the correct DefaultPool address in TroveManager', async () => {
    const defaultPoolAddress = defaultPool.address;

    const recordedDefaultPoolAddresss = await troveManager.defaultPool();

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddresss);
  });

  // StabilityPool in TroveM
  it('Sets the correct StabilityPool address in TroveManager', async () => {
    const stabilityPoolAddress = stabilityPool.address;

    const recordedStabilityPoolAddresss = await troveManager._stabilityPool();

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddresss);
  });

  // ZERO Staking in TroveM
  it('Sets the correct ZEROStaking address in TroveManager', async () => {
    const zeroStakingAddress = zeroStaking.address;

    const recordedZEROStakingAddress = await troveManager._zeroStaking();
    assert.equal(zeroStakingAddress, recordedZEROStakingAddress);
  });

  // Active Pool

  it('Sets the correct StabilityPool address in ActivePool', async () => {
    const stabilityPoolAddress = stabilityPool.address;

    const recordedStabilityPoolAddress = await activePool.stabilityPoolAddress();

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress);
  });

  it('Sets the correct DefaultPool address in ActivePool', async () => {
    const defaultPoolAddress = defaultPool.address;

    const recordedDefaultPoolAddress = await activePool.defaultPoolAddress();

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress);
  });

  it('Sets the correct BorrowerOperations address in ActivePool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address;

    const recordedBorrowerOperationsAddress = await activePool.borrowerOperationsAddress();

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress);
  });

  it('Sets the correct TroveManager address in ActivePool', async () => {
    const troveManagerAddress = troveManager.address;

    const recordedTroveManagerAddress = await activePool.troveManagerAddress();
    assert.equal(troveManagerAddress, recordedTroveManagerAddress);
  });

  // Stability Pool

  it('Sets the correct ActivePool address in StabilityPool', async () => {
    const activePoolAddress = activePool.address;

    const recordedActivePoolAddress = await stabilityPool.activePool();
    assert.equal(activePoolAddress, recordedActivePoolAddress);
  });

  it('Sets the correct BorrowerOperations address in StabilityPool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address;

    const recordedBorrowerOperationsAddress = await stabilityPool.borrowerOperations();

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress);
  });

  it('Sets the correct ZUSDToken address in StabilityPool', async () => {
    const zusdTokenAddress = zusdToken.address;

    const recordedClvTokenAddress = await stabilityPool.zusdToken();

    assert.equal(zusdTokenAddress, recordedClvTokenAddress);
  });

  it('Sets the correct TroveManager address in StabilityPool', async () => {
    const troveManagerAddress = troveManager.address;

    const recordedTroveManagerAddress = await stabilityPool.troveManager();
    assert.equal(troveManagerAddress, recordedTroveManagerAddress);
  });

  // Default Pool

  it('Sets the correct TroveManager address in DefaultPool', async () => {
    const troveManagerAddress = troveManager.address;

    const recordedTroveManagerAddress = await defaultPool.troveManagerAddress();
    assert.equal(troveManagerAddress, recordedTroveManagerAddress);
  });

  it('Sets the correct ActivePool address in DefaultPool', async () => {
    const activePoolAddress = activePool.address;

    const recordedActivePoolAddress = await defaultPool.activePoolAddress();
    assert.equal(activePoolAddress, recordedActivePoolAddress);
  });

  it('Sets the correct TroveManager address in SortedTroves', async () => {
    const borrowerOperationsAddress = borrowerOperations.address;

    const recordedBorrowerOperationsAddress = await sortedTroves.borrowerOperationsAddress();
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress);
  });

  it('Sets the correct BorrowerOperations address in SortedTroves', async () => {
    const troveManagerAddress = troveManager.address;

    const recordedTroveManagerAddress = await sortedTroves.troveManager();
    assert.equal(troveManagerAddress, recordedTroveManagerAddress);
  });

  //--- BorrowerOperations ---

  // TroveManager in BO
  it('Sets the correct TroveManager address in BorrowerOperations', async () => {
    const troveManagerAddress = troveManager.address;

    const recordedTroveManagerAddress = await borrowerOperations.troveManager();
    assert.equal(troveManagerAddress, recordedTroveManagerAddress);
  });

  // setPriceFeed in BO
  it('Sets the correct PriceFeed address in BorrowerOperations', async () => {
    const priceFeedAddress = priceFeed.address;

    const recordedPriceFeedAddress = await borrowerOperations.priceFeed();
    assert.equal(priceFeedAddress, recordedPriceFeedAddress);
  });

  // setSortedTroves in BO
  it('Sets the correct SortedTroves address in BorrowerOperations', async () => {
    const sortedTrovesAddress = sortedTroves.address;

    const recordedSortedTrovesAddress = await borrowerOperations.sortedTroves();
    assert.equal(sortedTrovesAddress, recordedSortedTrovesAddress);
  });

  // setActivePool in BO
  it('Sets the correct ActivePool address in BorrowerOperations', async () => {
    const activePoolAddress = activePool.address;

    const recordedActivePoolAddress = await borrowerOperations.activePool();
    assert.equal(activePoolAddress, recordedActivePoolAddress);
  });

  // setDefaultPool in BO
  it('Sets the correct DefaultPool address in BorrowerOperations', async () => {
    const defaultPoolAddress = defaultPool.address;

    const recordedDefaultPoolAddress = await borrowerOperations.defaultPool();
    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress);
  });

  // ZERO Staking in BO
  it('Sets the correct ZEROStaking address in BorrowerOperations', async () => {
    const zeroStakingAddress = zeroStaking.address;

    const recordedZEROStakingAddress = await borrowerOperations.zeroStakingAddress();
    assert.equal(zeroStakingAddress, recordedZEROStakingAddress);
  });


  // --- ZERO Staking ---

  // Sets ZEROToken in ZEROStaking
  it('Sets the correct ZEROToken address in ZEROStaking', async () => {
    const zeroTokenAddress = zeroToken.address;

    const recordedZEROTokenAddress = await zeroStaking.zeroToken();
    assert.equal(zeroTokenAddress, recordedZEROTokenAddress);
  });

  // Sets ActivePool in ZEROStaking
  it('Sets the correct ActivePool address in ZEROStaking', async () => {
    const activePoolAddress = activePool.address;

    const recordedActivePoolAddress = await zeroStaking.activePoolAddress();
    assert.equal(activePoolAddress, recordedActivePoolAddress);
  });

  // Sets ZUSDToken in ZEROStaking
  it('Sets the correct ActivePool address in ZEROStaking', async () => {
    const zusdTokenAddress = zusdToken.address;

    const recordedZUSDTokenAddress = await zeroStaking.zusdToken();
    assert.equal(zusdTokenAddress, recordedZUSDTokenAddress);
  });

  // Sets FeeDistributor in ZEROStaking
  it('Sets the correct feeDistributor address in ZEROStaking', async () => {
    const feeDistributorAddress = feeDistributor.address;

    const recordedFeeDistributorAddress = await zeroStaking.feeDistributorAddress();
    assert.equal(feeDistributorAddress, recordedFeeDistributorAddress);
  });

  // --- FeeDistributor ---

  // Sets ZEROStaking in feeDistributor
  it('Sets the correct ZEROStaking address in feeDistributor', async () => {
    const zeroStakingAddress = zeroStaking.address;

    const recordedZeroStakingAddress = await feeDistributor.zeroStaking();
    assert.equal(zeroStakingAddress, recordedZeroStakingAddress);
  });

  // Sets BorrowerOperations in feeDistributor
  it('Sets the correct BorrowerOperations address in feeDistributor', async () => {
    const borrowerOperationsAddress = borrowerOperations.address;

    const recordedBorrowerOperationsAddress = await feeDistributor.borrowerOperations();
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress);
  });

  // Sets TroveManager in feeDistributor
  it('Sets the correct TroveManager address in feeDistributor', async () => {
    const troveManagerAddress = troveManager.address;

    const recordedTroveManagerAddress = await feeDistributor.troveManager();
    assert.equal(troveManagerAddress, recordedTroveManagerAddress);
  });

  // Sets ActivePool in feeDistributor
  it('Sets the correct ActivePool address in feeDistributor', async () => {
    const activePoolAddress = activePool.address;

    const recordedActivePoolAddress = await feeDistributor.activePoolAddress();
    assert.equal(activePoolAddress, recordedActivePoolAddress);
  });

  // Sets ZUSDToken in feeDistributor
  it('Sets the correct ZUSDToken address in feeDistributor', async () => {
    const zusdTokenAddress = zusdToken.address;

    const recordedZUSDTokenAddress = await feeDistributor.zusdToken();
    assert.equal(zusdTokenAddress, recordedZUSDTokenAddress);
  });


  // ---  ZEROToken ---

  // Sets ZEROStaking in ZEROToken
  it('Sets the correct ZEROStaking address in ZEROToken', async () => {
    const zeroStakingAddress = zeroStaking.address;

    const recordedZEROStakingAddress = await zeroToken.zeroStakingAddress();
    assert.equal(zeroStakingAddress, recordedZEROStakingAddress);
  });

  // --- CI ---

  // Sets SOVToken in CommunityIssuance
  it('Sets the correct SOVToken address in CommunityIssuance', async () => {
    const sovTokenAddress = zeroToken.address;

    const recordedSOVTokenAddress = await communityIssuance.sovToken();
    assert.equal(sovTokenAddress, recordedSOVTokenAddress);
  });

  it('Sets the correct SOVToken address in CommunityIssuance', async () => {
    const sovTokenAddress = sovToken.address;

    const recordedSOVTokenAddress = await communityIssuance.sovToken();
    assert.equal(sovTokenAddress, recordedSOVTokenAddress);
  });

  it('Sets the correct ZUSDToken address in CommunityIssuance', async () => {
    const zusdTokenAddress = zusdToken.address;

    const recordedZUSDTokenAddress = await communityIssuance.zusdToken();
    assert.equal(zusdTokenAddress, recordedZUSDTokenAddress);
  });

  it('Sets the correct StabilityPool address in CommunityIssuance', async () => {
    const stabilityPoolAddress = stabilityPool.address;

    const recordedStabilityPoolAddress = await communityIssuance.stabilityPoolAddress();
    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress);
  });
});
