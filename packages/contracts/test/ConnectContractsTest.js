const deploymentHelper = require("../utils/deploymentHelpers.js")

contract('Deployment script - Sets correct contract addresses dependencies after deployment', async accounts => {
  const [owner, sovFeeCollector] = accounts;

  const multisig = accounts[999];
  
  let priceFeed
  let zusdToken
  let sortedLoCs
  let locManager
  let activePool
  let stabilityPool
  let defaultPool
  let functionCaller
  let borrowerOperations
  let zeroStaking
  let zeroToken
  let communityIssuance
  let feeDistributor

  before(async () => {
    const coreContracts = await deploymentHelper.deployZeroCore()
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)

    priceFeed = coreContracts.priceFeedTestnet
    zusdToken = coreContracts.zusdToken
    sortedLoCs = coreContracts.sortedLoCs
    locManager = coreContracts.locManager
    activePool = coreContracts.activePool
    stabilityPool = coreContracts.stabilityPool
    defaultPool = coreContracts.defaultPool
    functionCaller = coreContracts.functionCaller
    borrowerOperations = coreContracts.borrowerOperations
    feeDistributor = coreContracts.feeDistributor

    zeroStaking = ZEROContracts.zeroStaking
    zeroToken = ZEROContracts.zeroToken
    communityIssuance = ZEROContracts.communityIssuance

    await deploymentHelper.connectZEROContracts(ZEROContracts)
    await deploymentHelper.connectCoreContracts(coreContracts, ZEROContracts)
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts, owner)
  })

  it('Sets the correct PriceFeed address in LoCManager', async () => {
    const priceFeedAddress = priceFeed.address

    const recordedPriceFeedAddress = await locManager.priceFeed()

    assert.equal(priceFeedAddress, recordedPriceFeedAddress)
  })

  it('Sets the correct ZUSDToken address in LoCManager', async () => {
    const zusdTokenAddress = zusdToken.address

    const recordedClvTokenAddress = await locManager._zusdToken()

    assert.equal(zusdTokenAddress, recordedClvTokenAddress)
  })

  it('Sets the correct SortedLoCs address in LoCManager', async () => {
    const sortedLoCsAddress = sortedLoCs.address

    const recordedSortedLoCsAddress = await locManager.sortedLoCs()

    assert.equal(sortedLoCsAddress, recordedSortedLoCsAddress)
  })

  it('Sets the correct BorrowerOperations address in LoCManager', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await locManager.borrowerOperationsAddress()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  // ActivePool in LoCM
  it('Sets the correct ActivePool address in LoCManager', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddresss = await locManager.activePool()

    assert.equal(activePoolAddress, recordedActivePoolAddresss)
  })

  // DefaultPool in LoCM
  it('Sets the correct DefaultPool address in LoCManager', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddresss = await locManager.defaultPool()

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddresss)
  })

  // StabilityPool in LoCM
  it('Sets the correct StabilityPool address in LoCManager', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddresss = await locManager._stabilityPool()

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddresss)
  })

  // ZERO Staking in LoCM
  it('Sets the correct ZEROStaking address in LoCManager', async () => {
    const zeroStakingAddress = zeroStaking.address

    const recordedZEROStakingAddress = await locManager._zeroStaking()
    assert.equal(zeroStakingAddress, recordedZEROStakingAddress)
  })

  // Active Pool

  it('Sets the correct StabilityPool address in ActivePool', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddress = await activePool.stabilityPoolAddress()

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress)
  })

  it('Sets the correct DefaultPool address in ActivePool', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddress = await activePool.defaultPoolAddress()

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress)
  })

  it('Sets the correct BorrowerOperations address in ActivePool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await activePool.borrowerOperationsAddress()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct LoCManager address in ActivePool', async () => {
    const locManagerAddress = locManager.address

    const recordedLoCManagerAddress = await activePool.locManagerAddress()
    assert.equal(locManagerAddress, recordedLoCManagerAddress)
  })

  // Stability Pool

  it('Sets the correct ActivePool address in StabilityPool', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await stabilityPool.activePool()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  it('Sets the correct BorrowerOperations address in StabilityPool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await stabilityPool.borrowerOperations()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct ZUSDToken address in StabilityPool', async () => {
    const zusdTokenAddress = zusdToken.address

    const recordedClvTokenAddress = await stabilityPool.zusdToken()

    assert.equal(zusdTokenAddress, recordedClvTokenAddress)
  })

  it('Sets the correct LoCManager address in StabilityPool', async () => {
    const locManagerAddress = locManager.address

    const recordedLoCManagerAddress = await stabilityPool.locManager()
    assert.equal(locManagerAddress, recordedLoCManagerAddress)
  })

  // Default Pool

  it('Sets the correct LoCManager address in DefaultPool', async () => {
    const locManagerAddress = locManager.address

    const recordedLoCManagerAddress = await defaultPool.locManagerAddress()
    assert.equal(locManagerAddress, recordedLoCManagerAddress)
  })

  it('Sets the correct ActivePool address in DefaultPool', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await defaultPool.activePoolAddress()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  it('Sets the correct LoCManager address in SortedLoCs', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await sortedLoCs.borrowerOperationsAddress()
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct BorrowerOperations address in SortedLoCs', async () => {
    const locManagerAddress = locManager.address

    const recordedLoCManagerAddress = await sortedLoCs.locManager()
    assert.equal(locManagerAddress, recordedLoCManagerAddress)
  })

  //--- BorrowerOperations ---

  // LoCManager in BO
  it('Sets the correct LoCManager address in BorrowerOperations', async () => {
    const locManagerAddress = locManager.address

    const recordedLoCManagerAddress = await borrowerOperations.locManager()
    assert.equal(locManagerAddress, recordedLoCManagerAddress)
  })

  // setPriceFeed in BO
  it('Sets the correct PriceFeed address in BorrowerOperations', async () => {
    const priceFeedAddress = priceFeed.address

    const recordedPriceFeedAddress = await borrowerOperations.priceFeed()
    assert.equal(priceFeedAddress, recordedPriceFeedAddress)
  })

  // setSortedLoCs in BO
  it('Sets the correct SortedLoCs address in BorrowerOperations', async () => {
    const sortedLoCsAddress = sortedLoCs.address

    const recordedSortedLoCsAddress = await borrowerOperations.sortedLoCs()
    assert.equal(sortedLoCsAddress, recordedSortedLoCsAddress)
  })

  // setActivePool in BO
  it('Sets the correct ActivePool address in BorrowerOperations', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await borrowerOperations.activePool()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  // setDefaultPool in BO
  it('Sets the correct DefaultPool address in BorrowerOperations', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddress = await borrowerOperations.defaultPool()
    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress)
  })

  // ZERO Staking in BO
  it('Sets the correct ZEROStaking address in BorrowerOperations', async () => {
    const zeroStakingAddress = zeroStaking.address

    const recordedZEROStakingAddress = await borrowerOperations.zeroStakingAddress()
    assert.equal(zeroStakingAddress, recordedZEROStakingAddress)
  })


  // --- ZERO Staking ---

  // Sets ZEROToken in ZEROStaking
  it('Sets the correct ZEROToken address in ZEROStaking', async () => {
    const zeroTokenAddress = zeroToken.address

    const recordedZEROTokenAddress = await zeroStaking.zeroToken()
    assert.equal(zeroTokenAddress, recordedZEROTokenAddress)
  })

  // Sets ActivePool in ZEROStaking
  it('Sets the correct ActivePool address in ZEROStaking', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await zeroStaking.activePoolAddress()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  // Sets ZUSDToken in ZEROStaking
  it('Sets the correct ActivePool address in ZEROStaking', async () => {
    const zusdTokenAddress = zusdToken.address

    const recordedZUSDTokenAddress = await zeroStaking.zusdToken()
    assert.equal(zusdTokenAddress, recordedZUSDTokenAddress)
  })

  // Sets FeeDistributor in ZEROStaking
  it('Sets the correct feeDistributor address in ZEROStaking', async () => {
    const feeDistributorAddress = feeDistributor.address

    const recordedFeeDistributorAddress = await zeroStaking.feeDistributorAddress()
    assert.equal(feeDistributorAddress, recordedFeeDistributorAddress)
  })

  // --- FeeDistributor ---

   // Sets ZEROStaking in feeDistributor
   it('Sets the correct ZEROStaking address in feeDistributor', async () => {
    const zeroStakingAddress = zeroStaking.address

    const recordedZeroStakingAddress = await feeDistributor.zeroStaking()
    assert.equal(zeroStakingAddress, recordedZeroStakingAddress)
  })

  // Sets BorrowerOperations in feeDistributor
  it('Sets the correct BorrowerOperations address in feeDistributor', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await feeDistributor.borrowerOperations()
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  // Sets LoCManager in feeDistributor
  it('Sets the correct LoCManager address in feeDistributor', async () => {
    const locManagerAddress = locManager.address

    const recordedLoCManagerAddress = await feeDistributor.locManager()
    assert.equal(locManagerAddress, recordedLoCManagerAddress)
  })

  // Sets ActivePool in feeDistributor
  it('Sets the correct ActivePool address in feeDistributor', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await feeDistributor.activePoolAddress()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  // Sets ZUSDToken in feeDistributor
  it('Sets the correct ZUSDToken address in feeDistributor', async () => {
    const zusdTokenAddress = zusdToken.address

    const recordedZUSDTokenAddress = await feeDistributor.zusdToken()
    assert.equal(zusdTokenAddress, recordedZUSDTokenAddress)
  })


  // ---  ZEROToken ---

  // Sets ZEROStaking in ZEROToken
  it('Sets the correct ZEROStaking address in ZEROToken', async () => {
    const zeroStakingAddress = zeroStaking.address

    const recordedZEROStakingAddress =  await zeroToken.zeroStakingAddress()
    assert.equal(zeroStakingAddress, recordedZEROStakingAddress)
  })

  // --- CI ---

  // Sets ZEROToken in CommunityIssuance
  it('Sets the correct ZEROToken address in CommunityIssuance', async () => {
    const zeroTokenAddress = zeroToken.address

    const recordedZEROTokenAddress = await communityIssuance.zeroToken()
    assert.equal(zeroTokenAddress, recordedZEROTokenAddress)
  })

  it('Sets the correct StabilityPool address in CommunityIssuance', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddress = await communityIssuance.communityPotAddress()
    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress)
  })
})
