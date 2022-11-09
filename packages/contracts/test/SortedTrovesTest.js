const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const timeMachine = require('ganache-time-traveler');

const SortedLoCs = artifacts.require("SortedLoCs")
const SortedLoCsTester = artifacts.require("SortedLoCsTester")
const LoCManagerTester = artifacts.require("LoCManagerTester")
const ZUSDToken = artifacts.require("ZUSDToken")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const mv = testHelpers.MoneyValues

contract('SortedLoCs', async accounts => {
  
  const assertSortedListIsOrdered = async (contracts) => {
    const price = await contracts.priceFeedTestnet.getPrice()

    let loc = await contracts.sortedLoCs.getLast()
    while (loc !== (await contracts.sortedLoCs.getFirst())) {
      
      // Get the adjacent upper LoC ("prev" moves up the list, from lower ICR -> higher ICR)
      const prevLoC = await contracts.sortedLoCs.getPrev(loc)
     
      const locICR = await contracts.locManager.getCurrentICR(loc, price)
      const prevLoCICR = await contracts.locManager.getCurrentICR(prevLoC, price)
      
      assert.isTrue(prevLoCICR.gte(locICR))

      const locNICR = await contracts.locManager.getNominalICR(loc)
      const prevLoCNICR = await contracts.locManager.getNominalICR(prevLoC)
      
      assert.isTrue(prevLoCNICR.gte(locNICR))

      // climb the list
      loc = prevLoC
    }
  }

  const [
    owner,
    alice, bob, carol, dennis, erin, flyn, graham, harriet, ida,
    defaulter_1, defaulter_2, defaulter_3, defaulter_4,
    A, B, C, D, E, F, G, H, I, J, whale, sovFeeCollector] = accounts;

  let priceFeed
  let sortedLoCs
  let locManager
  let borrowerOperations
  let zusdToken

  const multisig = accounts[999];

  let contracts

  const getOpenLoCZUSDAmount = async (totalDebt) => th.getOpenLoCZUSDAmount(contracts, totalDebt)
  const openLoC = async (params) => th.openLoC(contracts, params)

  describe('SortedLoCs', () => {
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
      sortedLoCs = contracts.sortedLoCs
      locManager = contracts.locManager
      borrowerOperations = contracts.borrowerOperations
      zusdToken = contracts.zusdToken

      await deploymentHelper.connectZEROContracts(ZEROContracts)
      await deploymentHelper.connectCoreContracts(contracts, ZEROContracts)
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

    it('contains(): returns true for addresses that have opened locs', async () => {
      await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
      await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: bob } })
      await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: carol } })

      // Confirm LoC statuses became active
      assert.equal((await locManager.LoCs(alice))[3], '1')
      assert.equal((await locManager.LoCs(bob))[3], '1')
      assert.equal((await locManager.LoCs(carol))[3], '1')

      // Check sorted list contains locs
      assert.isTrue(await sortedLoCs.contains(alice))
      assert.isTrue(await sortedLoCs.contains(bob))
      assert.isTrue(await sortedLoCs.contains(carol))
    })

    it('contains(): returns false for addresses that have not opened locs', async () => {
      await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
      await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: bob } })
      await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: carol } })

      // Confirm locs have non-existent status
      assert.equal((await locManager.LoCs(dennis))[3], '0')
      assert.equal((await locManager.LoCs(erin))[3], '0')

      // Check sorted list do not contain locs
      assert.isFalse(await sortedLoCs.contains(dennis))
      assert.isFalse(await sortedLoCs.contains(erin))
    })

    it('contains(): returns false for addresses that opened and then closed a loc', async () => {
      await openLoC({ ICR: toBN(dec(1000, 18)), extraZUSDAmount: toBN(dec(3000, 18)), extraParams: { from: whale } })

      await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
      await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: bob } })
      await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: carol } })

      // to compensate borrowing fees
      await zusdToken.transfer(alice, dec(1000, 18), { from: whale })
      await zusdToken.transfer(bob, dec(1000, 18), { from: whale })
      await zusdToken.transfer(carol, dec(1000, 18), { from: whale })

      // A, B, C close locs
      await borrowerOperations.closeLoC({ from: alice })
      await borrowerOperations.closeLoC({ from:bob })
      await borrowerOperations.closeLoC({ from:carol })

      // Confirm LoC statuses became closed
      assert.equal((await locManager.LoCs(alice))[3], '2')
      assert.equal((await locManager.LoCs(bob))[3], '2')
      assert.equal((await locManager.LoCs(carol))[3], '2')

      // Check sorted list does not contain locs
      assert.isFalse(await sortedLoCs.contains(alice))
      assert.isFalse(await sortedLoCs.contains(bob))
      assert.isFalse(await sortedLoCs.contains(carol))
    })

    // true for addresses that opened -> closed -> opened a loc
    it('contains(): returns true for addresses that opened, closed and then re-opened a loc', async () => {
      await openLoC({ ICR: toBN(dec(1000, 18)), extraZUSDAmount: toBN(dec(3000, 18)), extraParams: { from: whale } })

      await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
      await openLoC({ ICR: toBN(dec(20, 18)), extraParams: { from: bob } })
      await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: carol } })

      // to compensate borrowing fees
      await zusdToken.transfer(alice, dec(1000, 18), { from: whale })
      await zusdToken.transfer(bob, dec(1000, 18), { from: whale })
      await zusdToken.transfer(carol, dec(1000, 18), { from: whale })

      // A, B, C close locs
      await borrowerOperations.closeLoC({ from: alice })
      await borrowerOperations.closeLoC({ from:bob })
      await borrowerOperations.closeLoC({ from:carol })

      // Confirm LoC statuses became closed
      assert.equal((await locManager.LoCs(alice))[3], '2')
      assert.equal((await locManager.LoCs(bob))[3], '2')
      assert.equal((await locManager.LoCs(carol))[3], '2')

      await openLoC({ ICR: toBN(dec(1000, 16)), extraParams: { from: alice } })
      await openLoC({ ICR: toBN(dec(2000, 18)), extraParams: { from: bob } })
      await openLoC({ ICR: toBN(dec(3000, 18)), extraParams: { from: carol } })

      // Confirm LoC statuses became open again
      assert.equal((await locManager.LoCs(alice))[3], '1')
      assert.equal((await locManager.LoCs(bob))[3], '1')
      assert.equal((await locManager.LoCs(carol))[3], '1')

      // Check sorted list does  contain locs
      assert.isTrue(await sortedLoCs.contains(alice))
      assert.isTrue(await sortedLoCs.contains(bob))
      assert.isTrue(await sortedLoCs.contains(carol))
    })

    // false when list size is 0
    it('contains(): returns false when there are no locs in the system', async () => {
      assert.isFalse(await sortedLoCs.contains(alice))
      assert.isFalse(await sortedLoCs.contains(bob))
      assert.isFalse(await sortedLoCs.contains(carol))
    })

    // true when list size is 1 and the LoC the only one in system
    it('contains(): true when list size is 1 and the LoC the only one in system', async () => {
      await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })

      assert.isTrue(await sortedLoCs.contains(alice))
    })

    // false when list size is 1 and LoC is not in the system
    it('contains(): false when list size is 1 and LoC is not in the system', async () => {
      await openLoC({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })

      assert.isFalse(await sortedLoCs.contains(bob))
    })

    // --- getMaxSize ---

    it("getMaxSize(): Returns the maximum list size", async () => {
      const max = await sortedLoCs.getMaxSize()
      assert.equal(web3.utils.toHex(max), th.maxBytes32)
    })

    // --- findInsertPosition ---

    it("Finds the correct insert position given two addresses that loosely bound the correct position", async () => { 
      await priceFeed.setPrice(dec(100, 18))

      // NICR sorted in descending order
      await openLoC({ ICR: toBN(dec(500, 18)), extraParams: { from: whale } })
      await openLoC({ ICR: toBN(dec(10, 18)), extraParams: { from: A } })
      await openLoC({ ICR: toBN(dec(5, 18)), extraParams: { from: B } })
      await openLoC({ ICR: toBN(dec(250, 16)), extraParams: { from: C } })
      await openLoC({ ICR: toBN(dec(166, 16)), extraParams: { from: D } })
      await openLoC({ ICR: toBN(dec(125, 16)), extraParams: { from: E } })

      // Expect a LoC with NICR 300% to be inserted between B and C
      const targetNICR = dec(3, 18)

      // Pass addresses that loosely bound the right postiion
      const hints = await sortedLoCs.findInsertPosition(targetNICR, A, E)

      // Expect the exact correct insert hints have been returned
      assert.equal(hints[0], B )
      assert.equal(hints[1], C )

      // The price doesn’t affect the hints
      await priceFeed.setPrice(dec(500, 18))
      const hints2 = await sortedLoCs.findInsertPosition(targetNICR, A, E)

      // Expect the exact correct insert hints have been returned
      assert.equal(hints2[0], B )
      assert.equal(hints2[1], C )
    })

    //--- Ordering --- 
    // infinte ICR (zero collateral) is not possible anymore, therefore, skipping
    it.skip("stays ordered after locs with 'infinite' ICR receive a redistribution", async () => {

      // make several locs with 0 debt and collateral, in random order
      await borrowerOperations.openLoC(th._100pct, 0, whale, whale, { from: whale, value: dec(50, 'ether') })
      await borrowerOperations.openLoC(th._100pct, 0, A, A, { from: A, value: dec(1, 'ether') })
      await borrowerOperations.openLoC(th._100pct, 0, B, B, { from: B, value: dec(37, 'ether') })
      await borrowerOperations.openLoC(th._100pct, 0, C, C, { from: C, value: dec(5, 'ether') })
      await borrowerOperations.openLoC(th._100pct, 0, D, D, { from: D, value: dec(4, 'ether') })
      await borrowerOperations.openLoC(th._100pct, 0, E, E, { from: E, value: dec(19, 'ether') })

      // Make some locs with non-zero debt, in random order
      await borrowerOperations.openLoC(th._100pct, dec(5, 19), F, F, { from: F, value: dec(1, 'ether') })
      await borrowerOperations.openLoC(th._100pct, dec(3, 18), G, G, { from: G, value: dec(37, 'ether') })
      await borrowerOperations.openLoC(th._100pct, dec(2, 20), H, H, { from: H, value: dec(5, 'ether') })
      await borrowerOperations.openLoC(th._100pct, dec(17, 18), I, I, { from: I, value: dec(4, 'ether') })
      await borrowerOperations.openLoC(th._100pct, dec(5, 21), J, J, { from: J, value: dec(1345, 'ether') })

      const price_1 = await priceFeed.getPrice()
      
      // Check locs are ordered
      await assertSortedListIsOrdered(contracts)

      await borrowerOperations.openLoC(th._100pct, dec(100, 18), defaulter_1, defaulter_1, { from: defaulter_1, value: dec(1, 'ether') })
      assert.isTrue(await sortedLoCs.contains(defaulter_1))

      // Price drops
      await priceFeed.setPrice(dec(100, 18))
      const price_2 = await priceFeed.getPrice()

      // Liquidate a loc
      await locManager.liquidate(defaulter_1)
      assert.isFalse(await sortedLoCs.contains(defaulter_1))

      // Check locs are ordered
      await assertSortedListIsOrdered(contracts)
    })
  })

  describe('SortedLoCs with mock dependencies', () => {
    let sortedLoCsTester

    before(async () => {
      sortedLoCs = await SortedLoCs.new()
      sortedLoCsTester = await SortedLoCsTester.new()

      await sortedLoCsTester.setSortedLoCs(sortedLoCs.address)
    })

    let revertToSnapshot;

    beforeEach(async() => {
      let snapshot = await timeMachine.takeSnapshot();
      revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result'])
    });
  
    afterEach(async() => {
      await revertToSnapshot();
    });

    context('when params are wrongly set', () => {
      it('setParams(): reverts if size is zero', async () => {
        await th.assertRevert(sortedLoCs.setParams(0, sortedLoCsTester.address, sortedLoCsTester.address), 'SortedLoCs: Size can’t be zero')
      })
    })

    context('when params are properly set', () => {
      beforeEach('set params', async() => {
        await sortedLoCs.setParams(2, sortedLoCsTester.address, sortedLoCsTester.address)
      })

      it('insert(): fails if list is full', async () => {
        await sortedLoCsTester.insert(alice, 1, alice, alice)
        await sortedLoCsTester.insert(bob, 1, alice, alice)
        await th.assertRevert(sortedLoCsTester.insert(carol, 1, alice, alice), 'SortedLoCs: List is full')
      })

      it('insert(): fails if list already contains the node', async () => {
        await sortedLoCsTester.insert(alice, 1, alice, alice)
        await th.assertRevert(sortedLoCsTester.insert(alice, 1, alice, alice), 'SortedLoCs: List already contains the node')
      })

      it('insert(): fails if id is zero', async () => {
        await th.assertRevert(sortedLoCsTester.insert(th.ZERO_ADDRESS, 1, alice, alice), 'SortedLoCs: Id cannot be zero')
      })

      it('insert(): fails if NICR is zero', async () => {
        await th.assertRevert(sortedLoCsTester.insert(alice, 0, alice, alice), 'SortedLoCs: NICR must be positive')
      })

      it('remove(): fails if id is not in the list', async () => {
        await th.assertRevert(sortedLoCsTester.remove(alice), 'SortedLoCs: List does not contain the id')
      })

      it('reInsert(): fails if list doesn’t contain the node', async () => {
        await th.assertRevert(sortedLoCsTester.reInsert(alice, 1, alice, alice), 'SortedLoCs: List does not contain the id')
      })

      it('reInsert(): fails if new NICR is zero', async () => {
        await sortedLoCsTester.insert(alice, 1, alice, alice)
        assert.isTrue(await sortedLoCs.contains(alice), 'list should contain element')
        await th.assertRevert(sortedLoCsTester.reInsert(alice, 0, alice, alice), 'SortedLoCs: NICR must be positive')
        assert.isTrue(await sortedLoCs.contains(alice), 'list should contain element')
      })

      it('findInsertPosition(): No prevId for hint - ascend list starting from nextId, result is after the tail', async () => {
        await sortedLoCsTester.insert(alice, 1, alice, alice)
        const pos = await sortedLoCs.findInsertPosition(1, th.ZERO_ADDRESS, alice)
        assert.equal(pos[0], alice, 'prevId result should be nextId param')
        assert.equal(pos[1], th.ZERO_ADDRESS, 'nextId result should be zero')
      })
    })
  })
})
