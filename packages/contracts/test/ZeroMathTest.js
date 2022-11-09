const ZeroMathTester = artifacts.require("./ZeroMathTester.sol")

contract('ZeroMath', async accounts => {
  let zeroMathTester
  beforeEach('deploy tester', async () => {
    zeroMathTester = await ZeroMathTester.new()
  })

  const checkFunction = async (func, cond, params) => {
    assert.equal(await zeroMathTester[func](...params), cond(...params))
  }

  it('max works if a > b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [2, 1])
  })

  it('max works if a = b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [2, 2])
  })

  it('max works if a < b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [1, 2])
  })
})
