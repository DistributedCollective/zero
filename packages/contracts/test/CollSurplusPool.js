const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');
const NonPayable = artifacts.require('NonPayable.sol')

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const mv = testHelpers.MoneyValues
const timeValues = testHelpers.TimeValues

const LoCManagerTester = artifacts.require("LoCManagerTester")
const ZUSDToken = artifacts.require("ZUSDToken")

contract('CollSurplusPool', async accounts => {
  const [
    owner,
    A, B, C, D, E, sovFeeCollector] = accounts;

  const multisig = accounts[999];

  let borrowerOperations
  let priceFeed
  let collSurplusPool

  let contracts

  const getOpenLoCZUSDAmount = async (totalDebt) => th.getOpenLoCZUSDAmount(contracts, totalDebt)
  const openLoC = async (params) => th.openLoC(contracts, params)

  before(async () => {
    contracts = await deploymentHelper.deployZeroCore()
    contracts.locManager = await LoCManagerTester.new()
    contracts.zusdToken = await ZUSDToken.new()
    await contracts.zusdToken.initialize(
      contracts.locManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    )
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig)

    priceFeed = contracts.priceFeedTestnet
    collSurplusPool = contracts.collSurplusPool
    borrowerOperations = contracts.borrowerOperations

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

  it("CollSurplusPool::getBTC(): Returns the BTC balance of the CollSurplusPool after redemption", async () => {
    const BTC_1 = await collSurplusPool.getBTC()
    assert.equal(BTC_1, '0')

    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price)

    const { collateral: B_coll, netDebt: B_netDebt } = await openLoC({ ICR: toBN(dec(200, 16)), extraParams: { from: B } })
    await openLoC({ extraZUSDAmount: B_netDebt, extraParams: { from: A, value: dec(3000, 'ether') } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // At BTC:USD = 100, this redemption should leave 1 bitcoin of coll surplus
    await th.redeemCollateralAndGetTxObject(A, contracts, B_netDebt)

    const BTC_2 = await collSurplusPool.getBTC()
    th.assertIsApproximatelyEqual(BTC_2, B_coll.sub(B_netDebt.mul(mv._1e18BN).div(price)))
  })

  it("CollSurplusPool: claimColl(): Reverts if caller is not Borrower Operations", async () => {
    await th.assertRevert(collSurplusPool.claimColl(A, { from: A }), 'CollSurplusPool: Caller is not Borrower Operations')
  })

  it("CollSurplusPool: claimColl(): Reverts if nothing to claim", async () => {
    await th.assertRevert(borrowerOperations.claimCollateral({ from: A }), 'CollSurplusPool: No collateral available to claim')
  })

  it("CollSurplusPool: claimColl(): Reverts if owner cannot receive BTC surplus", async () => {
    const nonPayable = await NonPayable.new()

    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price)

    // open LoC from NonPayable proxy contract
    const B_coll = toBN(dec(60, 18))
    const B_zusdAmount = toBN(dec(3000, 18))
    const B_netDebt = await th.getAmountWithBorrowingFee(contracts, B_zusdAmount)
    const openLoCData = th.getTransactionData('openLoC(uint256,uint256,address,address)', ['0xde0b6b3a7640000', web3.utils.toHex(B_zusdAmount), B, B])
    await nonPayable.forward(borrowerOperations.address, openLoCData, { value: B_coll })
    await openLoC({ extraZUSDAmount: B_netDebt, extraParams: { from: A, value: dec(3000, 'ether') } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // At BTC:USD = 100, this redemption should leave 1 bitcoin of coll surplus for B
    await th.redeemCollateralAndGetTxObject(A, contracts, B_netDebt)

    const BTC_2 = await collSurplusPool.getBTC()
    th.assertIsApproximatelyEqual(BTC_2, B_coll.sub(B_netDebt.mul(mv._1e18BN).div(price)))

    const claimCollateralData = th.getTransactionData('claimCollateral()', [])
    await th.assertRevert(nonPayable.forward(borrowerOperations.address, claimCollateralData), 'CollSurplusPool: sending BTC failed')
  })

  it('CollSurplusPool: reverts trying to send BTC to it', async () => {
    await th.assertRevert(web3.eth.sendTransaction({ from: A, to: collSurplusPool.address, value: 1 }), 'CollSurplusPool: Caller is not Active Pool')
  })

  it('CollSurplusPool: accountSurplus: reverts if caller is not LoC Manager', async () => {
    await th.assertRevert(collSurplusPool.accountSurplus(A, 1), 'CollSurplusPool: Caller is not LoCManager')
  })
})

contract('Reset chain state', async accounts => { })
