const testHelpers = require("../utils/testHelpers.js")
const DefaultPool = artifacts.require("./DefaultPool.sol")
const NonPayable = artifacts.require('NonPayable.sol')

const th = testHelpers.TestHelper
const dec = th.dec

contract('DefaultPool', async accounts => {
  let defaultPool
  let nonPayable
  let mockActivePool
  let mockLoCManager

  let [owner] = accounts

  beforeEach('Deploy contracts', async () => {
    defaultPool = await DefaultPool.new()
    nonPayable = await NonPayable.new()
    mockLoCManager = await NonPayable.new()
    mockActivePool = await NonPayable.new()
    await defaultPool.setAddresses(mockLoCManager.address, mockActivePool.address)
  })

  it('sendBTCToActivePool(): fails if receiver cannot receive BTC', async () => {
    const amount = dec(1, 'ether')

    // start pool with `amount`
    //await web3.eth.sendTransaction({ to: defaultPool.address, from: owner, value: amount })
    const tx = await mockActivePool.forward(defaultPool.address, '0x', { from: owner, value: amount })
    assert.isTrue(tx.receipt.status)

    // try to send bitcoin from pool to non-payable
    //await th.assertRevert(defaultPool.sendBTCToActivePool(amount, { from: owner }), 'DefaultPool: sending BTC failed')
    const sendBTCData = th.getTransactionData('sendBTCToActivePool(uint256)', [web3.utils.toHex(amount)])
    await th.assertRevert(mockLoCManager.forward(defaultPool.address, sendBTCData, { from: owner }), 'DefaultPool: sending BTC failed')
  })
})

contract('Reset chain state', async accounts => { })
