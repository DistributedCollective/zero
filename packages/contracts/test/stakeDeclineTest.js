const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');
const LoCManagerTester = artifacts.require("./LoCManagerTester.sol")
const ZUSDTokenTester = artifacts.require("./ZUSDTokenTester.sol")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const mv = testHelpers.MoneyValues
const timeValues = testHelpers.TimeValues


/* NOTE: Some tests involving BTC redemption fees do not test for specific fee values.
 * Some only test that the fees are non-zero when they should occur.
 *
 * Specific BTC gain values will depend on the final fee schedule used, and the final choices for
 * the parameter BETA in the LoCManager, which is still TBD based on economic modelling.
 * 
 */
contract('LoCManager', async accounts => {

  const ZERO_ADDRESS = th.ZERO_ADDRESS
  const [owner, A, B, C, D, E, F, sovFeeCollector] = accounts.slice(0, 8);

  const multisig = accounts[999];

  let priceFeed
  let zusdToken
  let sortedLoCs
  let locManager
  let activePool
  let stabilityPool
  let collSurplusPool
  let defaultPool
  let borrowerOperations
  let hintHelpers

  let contracts

  const getOpenLoCZUSDAmount = async (totalDebt) => th.getOpenLoCZUSDAmount(contracts, totalDebt)
 
  const getSnapshotsRatio = async () => {
    const ratio = (await locManager.totalStakesSnapshot())
      .mul(toBN(dec(1, 18)))
      .div((await locManager.totalCollateralSnapshot()))

    return ratio
  }

  before(async () => {
    contracts = await deploymentHelper.deployZeroCore()
    contracts.locManager = await LoCManagerTester.new()
    contracts.zusdToken = await ZUSDTokenTester.new(
      contracts.locManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    )
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)

    priceFeed = contracts.priceFeedTestnet
    zusdToken = contracts.zusdToken
    sortedLoCs = contracts.sortedLoCs
    locManager = contracts.locManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    collSurplusPool = contracts.collSurplusPool
    borrowerOperations = contracts.borrowerOperations
    hintHelpers = contracts.hintHelpers

    zeroStaking = ZEROContracts.zeroStaking
    zeroToken = ZEROContracts.zeroToken
    communityIssuance = ZEROContracts.communityIssuance

    await deploymentHelper.connectCoreContracts(contracts, ZEROContracts)
    await deploymentHelper.connectZEROContracts(ZEROContracts)
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts, owner)
  })

  let revertToSnapshot;

  beforeEach(async() => {
    let snapshot = await timeMachine.takeSnapshot();
    revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result'])
  });

  afterEach(async() => {
    await revertToSnapshot();
  });

  it("A given LoC's stake decline is negligible with adjustments and tiny liquidations", async () => {
    await priceFeed.setPrice(dec(100, 18))
  
    // Make 1 mega locs A at ~50% total collateral
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(1, 31)), ZERO_ADDRESS, ZERO_ADDRESS, { from: A, value: dec(2, 29) })
    
    // Make 5 large locs B, C, D, E, F at ~10% total collateral
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, { from: B, value: dec(4, 28) })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, { from: C, value: dec(4, 28) })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, { from: D, value: dec(4, 28) })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, { from: E, value: dec(4, 28) })
    await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(2, 30)), ZERO_ADDRESS, ZERO_ADDRESS, { from: F, value: dec(4, 28) })
  
    // Make 10 tiny locs at relatively negligible collateral (~1e-9 of total)
    const tinyLoCs = accounts.slice(10, 20)
    for (account of tinyLoCs) {
      await borrowerOperations.openLoC(th._100pct, await getOpenLoCZUSDAmount(dec(1, 22)), ZERO_ADDRESS, ZERO_ADDRESS, { from: account, value: dec(2, 20) })
    }

    // liquidate 1 LoC at ~50% total system collateral
    await priceFeed.setPrice(dec(50, 18))
    assert.isTrue(await locManager.checkRecoveryMode(await priceFeed.getPrice()))
    await locManager.liquidate(A)

    console.log(`totalStakesSnapshot after L1: ${await locManager.totalStakesSnapshot()}`)
    console.log(`totalCollateralSnapshot after L1: ${await locManager.totalCollateralSnapshot()}`)
    console.log(`Snapshots ratio after L1: ${await getSnapshotsRatio()}`)
    console.log(`B pending BTC reward after L1: ${await locManager.getPendingBTCReward(B)}`)
    console.log(`B stake after L1: ${(await locManager.LoCs(B))[2]}`)

    // adjust LoC B 1 wei: apply rewards
    await borrowerOperations.adjustLoC(th._100pct, 0, 1, false, ZERO_ADDRESS, ZERO_ADDRESS, {from: B})  // B repays 1 wei
    console.log(`B stake after A1: ${(await locManager.LoCs(B))[2]}`)
    console.log(`Snapshots ratio after A1: ${await getSnapshotsRatio()}`)

    // Loop over tiny locs, and alternately:
    // - Liquidate a tiny loc
    // - Adjust B's collateral by 1 wei
    for (let [idx, loc] of tinyLoCs.entries()) {
      await locManager.liquidate(loc)
      console.log(`B stake after L${idx + 2}: ${(await locManager.LoCs(B))[2]}`)
      console.log(`Snapshots ratio after L${idx + 2}: ${await getSnapshotsRatio()}`)
      await borrowerOperations.adjustLoC(th._100pct, 0, 1, false, ZERO_ADDRESS, ZERO_ADDRESS, {from: B})  // A repays 1 wei
      console.log(`B stake after A${idx + 2}: ${(await locManager.LoCs(B))[2]}`)
    }
  })

  // TODO: stake decline for adjustments with sizable liquidations, for comparison
})