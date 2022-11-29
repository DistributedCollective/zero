const { TestHelper: { dec } } = require("../utils/testHelpers.js")

const EchidnaTester = artifacts.require('EchidnaTester')
const LoCManager = artifacts.require('LoCManager')
const ZUSDToken = artifacts.require('ZUSDToken')
const ActivePool = artifacts.require('ActivePool')
const DefaultPool = artifacts.require('DefaultPool')
const StabilityPool = artifacts.require('StabilityPool')

// run with:
// npx hardhat --config hardhat.config.echidna.js test fuzzTests/echidna_debug.js

contract('Echidna debugger', async accounts => {
  let echidnaTester
  let locManager
  let zusdToken
  let activePool
  let defaultPool
  let stabilityPool
  let GAS_POOL_ADDRESS

  before(async () => {
    echidnaTester = await EchidnaTester.new({ value: dec(11, 25) })
    locManager = await LoCManager.at(await echidnaTester.locManager())
    zusdToken = await ZUSDToken.at(await echidnaTester.zusdToken())
    activePool = await ActivePool.at(await echidnaTester.activePool())
    defaultPool = await DefaultPool.at(await echidnaTester.defaultPool())
    stabilityPool = await StabilityPool.at(await echidnaTester.stabilityPool())
    GAS_POOL_ADDRESS = await locManager.GAS_POOL_ADDRESS();
  })

  it('openLoC', async () => {
    await echidnaTester.openLoCExt(
      '28533397325200555203581702704626658822751905051193839801320459908900876958892',
      '52469987802830075086048985199642144541375565475567220729814021622139768827880',
      '9388634783070735775888100571650283386615011854365252563480851823632223689886'
    )
  })

  it('openLoC', async () => {
    await echidnaTester.openLoCExt('0', '0', '0')
  })

  it.skip('LoC order', async () => {
    const loc1 = await echidnaTester.echidnaProxies(0)
    console.log(loc1)
    const loc2 = await echidnaTester.echidnaProxies(1)

    const icr1_before = await locManager.getCurrentICR(loc1, '1000000000000000000')
    const icr2_before = await locManager.getCurrentICR(loc2, '1000000000000000000')
    console.log('LoC 1', icr1_before, icr1_before.toString())
    console.log('LoC 2', icr2_before, icr2_before.toString())

    await echidnaTester.openLoCExt('0', '0', '30540440604590048251848424')
    await echidnaTester.openLoCExt('1', '0', '0')
    await echidnaTester.setPriceExt('78051143795343077331468494330613608802436946862454908477491916')
    const icr1_after = await locManager.getCurrentICR(loc1, '1000000000000000000')
    const icr2_after = await locManager.getCurrentICR(loc2, '1000000000000000000')
    console.log('LoC 1', icr1_after, icr1_after.toString())
    console.log('LoC 2', icr2_after, icr2_after.toString())

    const icr1_after_price = await locManager.getCurrentICR(loc1, '78051143795343077331468494330613608802436946862454908477491916')
    const icr2_after_price = await locManager.getCurrentICR(loc2, '78051143795343077331468494330613608802436946862454908477491916')
    console.log('LoC 1', icr1_after_price, icr1_after_price.toString())
    console.log('LoC 2', icr2_after_price, icr2_after_price.toString())
  })

  it.only('ZUSD balance', async () => {
    await echidnaTester.openLoCExt('0', '0', '4210965169908805439447313562489173090')

    const totalSupply = await zusdToken.totalSupply();
    const gasPoolBalance = await zusdToken.balanceOf(GAS_POOL_ADDRESS);
    const activePoolBalance = await activePool.getZUSDDebt();
    const defaultPoolBalance = await defaultPool.getZUSDDebt();
    const stabilityPoolBalance = await stabilityPool.getTotalZUSDDeposits();
    const currentLoC = await echidnaTester.echidnaProxies(0);
    const locBalance = zusdToken.balanceOf(currentLoC);

    console.log('totalSupply', totalSupply.toString());
    console.log('gasPoolBalance', gasPoolBalance.toString());
    console.log('activePoolBalance', activePoolBalance.toString());
    console.log('defaultPoolBalance', defaultPoolBalance.toString());
    console.log('stabilityPoolBalance', stabilityPoolBalance.toString());
    console.log('locBalance', locBalance.toString());
  })
})
