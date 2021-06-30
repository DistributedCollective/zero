const DefaultPool = artifacts.require('DefaultPool');
const DefaultPoolProxy = artifacts.require('DefaultPoolProxy');
const NonPayable = artifacts.require('./NonPayable.sol');
const testHelpers = require('../utils/testHelpers.js');
const th = testHelpers.TestHelper;

contract('DefaultPoolProxy', async (accounts) => {
  let defaultPoolProxy, defaultPoolControl, mockTroveManager, mockActivePool
  const [owner, alice] = accounts;
  
  before(async () => {
    let defaultPool = await DefaultPool.new();
    defaultPoolProxy = await DefaultPoolProxy.new();
    await defaultPoolProxy.setProxyOwner(owner);
    await defaultPoolProxy.setImplementation(defaultPool.address);
    defaultPoolControl = await DefaultPool.at(defaultPoolProxy.address);

    mockTroveManager = await NonPayable.new()
    mockActivePool = await NonPayable.new()
    await defaultPoolControl.setAddresses(
      mockTroveManager.address,
      mockActivePool.address
    );
  });

  describe('Upgradability', () => {
    it('state is preserved after changing implementation address', async () => {
      const recordedLUSD_balanceBefore = await defaultPoolControl.getLUSDDebt();
      assert.equal(recordedLUSD_balanceBefore, 0);

      // await defaultPool.increaseLUSDDebt(100, { from: mockTroveManagerAddress })
      const increaseLUSDDebtData = th.getTransactionData(
        'increaseLUSDDebt(uint256)',
        ['0x64']
      );
      const tx = await mockTroveManager.forward(
        defaultPoolProxy.address,
        increaseLUSDDebtData
      );
      assert.isTrue(tx.receipt.status);

      const recordedLUSD_balanceAfter = await defaultPoolControl.getLUSDDebt();
      assert.equal(recordedLUSD_balanceAfter, 100);

      let defaultPool = await DefaultPool.new();
      await defaultPool.setAddresses(
        mockTroveManager.address,
        mockActivePool.address
      );

      defaultPoolProxy.setImplementation(defaultPool.address);
      const recordedLUSD_balanceAfterChange = await defaultPoolControl.getLUSDDebt();
      th.assertIsApproximatelyEqual(
        recordedLUSD_balanceAfterChange,
        recordedLUSD_balanceAfter
      );      
    });
  });
});
