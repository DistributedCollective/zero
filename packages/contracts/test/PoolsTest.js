const StabilityPool = artifacts.require("./StabilityPool.sol")
const ActivePool = artifacts.require("./ActivePool.sol")
const DefaultPool = artifacts.require("./DefaultPool.sol")
const NonPayable = artifacts.require("./NonPayable.sol")

const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');

const th = testHelpers.TestHelper
const dec = th.dec

const _minus_1_Bitcoin = web3.utils.toWei('-1', 'ether')

contract('StabilityPool', async accounts => {
  /* mock* are EOA’s, temporarily used to call protected functions.
  TODO: Replace with mock contracts, and later complete transactions from EOA
  */
  let stabilityPool

  const [owner, alice] = accounts;

  before(async () => {
    stabilityPool = await StabilityPool.new()
    const mockActivePoolAddress = (await NonPayable.new()).address
    const dumbContractAddress = (await NonPayable.new()).address
    await stabilityPool.setAddresses(dumbContractAddress, dumbContractAddress, dumbContractAddress, mockActivePoolAddress, dumbContractAddress, dumbContractAddress, dumbContractAddress, dumbContractAddress)
  })

  let revertToSnapshot;

  beforeEach(async() => {
    let snapshot = await timeMachine.takeSnapshot();
    revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result'])
  });

  afterEach(async() => {
    await revertToSnapshot();
  });

  it('getETH(): gets the recorded ETH balance', async () => {
    const recordedETHBalance = await stabilityPool.getETH()
    assert.equal(recordedETHBalance, 0)
  })

  it('getTotalZUSDDeposits(): gets the recorded ZUSD balance', async () => {
    const recordedETHBalance = await stabilityPool.getTotalZUSDDeposits()
    assert.equal(recordedETHBalance, 0)
  })
})

contract('ActivePool', async accounts => {

  let activePool, mockBorrowerOperations

  const [owner, alice] = accounts;
  beforeEach(async () => {
    activePool = await ActivePool.new()
    mockBorrowerOperations = await NonPayable.new()
    const dumbContractAddress = (await NonPayable.new()).address
    await activePool.setAddresses(mockBorrowerOperations.address, dumbContractAddress, dumbContractAddress, dumbContractAddress)
  })

  it('getETH(): gets the recorded ETH balance', async () => {
    const recordedETHBalance = await activePool.getETH()
    assert.equal(recordedETHBalance, 0)
  })

  it('getZUSDDebt(): gets the recorded ZUSD balance', async () => {
    const recordedETHBalance = await activePool.getZUSDDebt()
    assert.equal(recordedETHBalance, 0)
  })
 
  it('increaseZUSD(): increases the recorded ZUSD balance by the correct amount', async () => {
    const recordedZUSD_balanceBefore = await activePool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceBefore, 0)

    // await activePool.increaseZUSDDebt(100, { from: mockBorrowerOperationsAddress })
    const increaseZUSDDebtData = th.getTransactionData('increaseZUSDDebt(uint256)', ['0x64'])
    const tx = await mockBorrowerOperations.forward(activePool.address, increaseZUSDDebtData)
    assert.isTrue(tx.receipt.status)
    const recordedZUSD_balanceAfter = await activePool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceAfter, 100)
  })
  // Decrease
  it('decreaseZUSD(): decreases the recorded ZUSD balance by the correct amount', async () => {
    // start the pool on 100 wei
    //await activePool.increaseZUSDDebt(100, { from: mockBorrowerOperationsAddress })
    const increaseZUSDDebtData = th.getTransactionData('increaseZUSDDebt(uint256)', ['0x64'])
    const tx1 = await mockBorrowerOperations.forward(activePool.address, increaseZUSDDebtData)
    assert.isTrue(tx1.receipt.status)

    const recordedZUSD_balanceBefore = await activePool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceBefore, 100)

    //await activePool.decreaseZUSDDebt(100, { from: mockBorrowerOperationsAddress })
    const decreaseZUSDDebtData = th.getTransactionData('decreaseZUSDDebt(uint256)', ['0x64'])
    const tx2 = await mockBorrowerOperations.forward(activePool.address, decreaseZUSDDebtData)
    assert.isTrue(tx2.receipt.status)
    const recordedZUSD_balanceAfter = await activePool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceAfter, 0)
  })

  // send raw bitcoin
  it('sendETH(): decreases the recorded ETH balance by the correct amount', async () => {
    // setup: give pool 2 bitcoin
    const activePool_initialBalance = web3.utils.toBN(await web3.eth.getBalance(activePool.address))
    assert.equal(activePool_initialBalance, 0)
    // start pool with 2 bitcoin
    //await web3.eth.sendTransaction({ from: mockBorrowerOperationsAddress, to: activePool.address, value: dec(2, 'ether') })
    const tx1 = await mockBorrowerOperations.forward(activePool.address, '0x', { from: owner, value: dec(2, 'ether') })
    assert.isTrue(tx1.receipt.status)

    const activePool_BalanceBeforeTx = web3.utils.toBN(await web3.eth.getBalance(activePool.address))
    const alice_Balance_BeforeTx = web3.utils.toBN(await web3.eth.getBalance(alice))

    assert.equal(activePool_BalanceBeforeTx, dec(2, 'ether'))

    // send bitcoin from pool to alice
    //await activePool.sendETH(alice, dec(1, 'ether'), { from: mockBorrowerOperationsAddress })
    const sendETHData = th.getTransactionData('sendETH(address,uint256)', [alice, web3.utils.toHex(dec(1, 'ether'))])
    const tx2 = await mockBorrowerOperations.forward(activePool.address, sendETHData, { from: owner })
    assert.isTrue(tx2.receipt.status)

    const activePool_BalanceAfterTx = web3.utils.toBN(await web3.eth.getBalance(activePool.address))
    const alice_Balance_AfterTx = web3.utils.toBN(await web3.eth.getBalance(alice))

    const alice_BalanceChange = alice_Balance_AfterTx.sub(alice_Balance_BeforeTx)
    const pool_BalanceChange = activePool_BalanceAfterTx.sub(activePool_BalanceBeforeTx)
    assert.equal(alice_BalanceChange, dec(1, 'ether'))
    assert.equal(pool_BalanceChange, _minus_1_Bitcoin)
  })
})

contract('DefaultPool', async accounts => {
 
  let defaultPool, mockTroveManager, mockActivePool

  const [owner, alice] = accounts;
  beforeEach(async () => {
    defaultPool = await DefaultPool.new()
    mockTroveManager = await NonPayable.new()
    mockActivePool = await NonPayable.new()
    await defaultPool.setAddresses(mockTroveManager.address, mockActivePool.address)
  })

  it('getETH(): gets the recorded ZUSD balance', async () => {
    const recordedETHBalance = await defaultPool.getETH()
    assert.equal(recordedETHBalance, 0)
  })

  it('getZUSDDebt(): gets the recorded ZUSD balance', async () => {
    const recordedETHBalance = await defaultPool.getZUSDDebt()
    assert.equal(recordedETHBalance, 0)
  })
 
  it('increaseZUSD(): increases the recorded ZUSD balance by the correct amount', async () => {
    const recordedZUSD_balanceBefore = await defaultPool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceBefore, 0)

    // await defaultPool.increaseZUSDDebt(100, { from: mockTroveManagerAddress })
    const increaseZUSDDebtData = th.getTransactionData('increaseZUSDDebt(uint256)', ['0x64'])
    const tx = await mockTroveManager.forward(defaultPool.address, increaseZUSDDebtData)
    assert.isTrue(tx.receipt.status)

    const recordedZUSD_balanceAfter = await defaultPool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceAfter, 100)
  })
  
  it('decreaseZUSD(): decreases the recorded ZUSD balance by the correct amount', async () => {
    // start the pool on 100 wei
    //await defaultPool.increaseZUSDDebt(100, { from: mockTroveManagerAddress })
    const increaseZUSDDebtData = th.getTransactionData('increaseZUSDDebt(uint256)', ['0x64'])
    const tx1 = await mockTroveManager.forward(defaultPool.address, increaseZUSDDebtData)
    assert.isTrue(tx1.receipt.status)

    const recordedZUSD_balanceBefore = await defaultPool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceBefore, 100)

    // await defaultPool.decreaseZUSDDebt(100, { from: mockTroveManagerAddress })
    const decreaseZUSDDebtData = th.getTransactionData('decreaseZUSDDebt(uint256)', ['0x64'])
    const tx2 = await mockTroveManager.forward(defaultPool.address, decreaseZUSDDebtData)
    assert.isTrue(tx2.receipt.status)

    const recordedZUSD_balanceAfter = await defaultPool.getZUSDDebt()
    assert.equal(recordedZUSD_balanceAfter, 0)
  })

  // send raw bitcoin
  it('sendETHToActivePool(): decreases the recorded ETH balance by the correct amount', async () => {
    // setup: give pool 2 bitcoin
    const defaultPool_initialBalance = web3.utils.toBN(await web3.eth.getBalance(defaultPool.address))
    assert.equal(defaultPool_initialBalance, 0)

    // start pool with 2 bitcoin
    //await web3.eth.sendTransaction({ from: mockActivePool.address, to: defaultPool.address, value: dec(2, 'ether') })
    const tx1 = await mockActivePool.forward(defaultPool.address, '0x', { from: owner, value: dec(2, 'ether') })
    assert.isTrue(tx1.receipt.status)

    const defaultPool_BalanceBeforeTx = web3.utils.toBN(await web3.eth.getBalance(defaultPool.address))
    const activePool_Balance_BeforeTx = web3.utils.toBN(await web3.eth.getBalance(mockActivePool.address))

    assert.equal(defaultPool_BalanceBeforeTx, dec(2, 'ether'))

    // send bitcoin from pool to alice
    //await defaultPool.sendETHToActivePool(dec(1, 'ether'), { from: mockTroveManagerAddress })
    const sendETHData = th.getTransactionData('sendETHToActivePool(uint256)', [web3.utils.toHex(dec(1, 'ether'))])
    await mockActivePool.setPayable(true)
    const tx2 = await mockTroveManager.forward(defaultPool.address, sendETHData, { from: owner })
    assert.isTrue(tx2.receipt.status)

    const defaultPool_BalanceAfterTx = web3.utils.toBN(await web3.eth.getBalance(defaultPool.address))
    const activePool_Balance_AfterTx = web3.utils.toBN(await web3.eth.getBalance(mockActivePool.address))

    const activePool_BalanceChange = activePool_Balance_AfterTx.sub(activePool_Balance_BeforeTx)
    const defaultPool_BalanceChange = defaultPool_BalanceAfterTx.sub(defaultPool_BalanceBeforeTx)
    assert.equal(activePool_BalanceChange, dec(1, 'ether'))
    assert.equal(defaultPool_BalanceChange, _minus_1_Bitcoin)
  })
})

contract('Reset chain state', async accounts => {})
