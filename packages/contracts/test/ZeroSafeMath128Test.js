const testHelpers = require("../utils/testHelpers.js")
const th = testHelpers.TestHelper

const ZeroSafeMath128Tester = artifacts.require("ZeroSafeMath128Tester")

contract('ZeroSafeMath128Tester', async accounts => {
  let mathTester

  before(async () => {
    mathTester = await ZeroSafeMath128Tester.new()
  })

  it('add(): reverts if overflows', async () => {
    const MAX_UINT_128 = th.toBN(2).pow(th.toBN(128)).sub(th.toBN(1))
    await th.assertRevert(mathTester.add(MAX_UINT_128, 1), 'ZeroSafeMath128: addition overflow')
  })

  it('sub(): reverts if underflows', async () => {
    await th.assertRevert(mathTester.sub(1, 2), 'ZeroSafeMath128: subtraction overflow')
  })
})
