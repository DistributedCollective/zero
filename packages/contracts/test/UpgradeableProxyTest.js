const ActivePool = artifacts.require('ActivePool');
const ActivePoolProxy = artifacts.require('ActivePoolProxy');
const NonPayable = artifacts.require('./NonPayable.sol');
const testHelpers = require('../utils/testHelpers.js');
const th = testHelpers.TestHelper;

contract('ActivePoolProxy', async (accounts) => {
  let activePoolControl;
  let activePoolProxy;
  let mockBorrowerOperations;
  const [owner, alice] = accounts;

  before(async () => {
    mockBorrowerOperations = await NonPayable.new();
    let activePool = await ActivePool.new();
    activePoolProxy = await ActivePoolProxy.new();
    await activePoolProxy.setProxyOwner(owner);
    await activePoolProxy.setImplementation(activePool.address);
    activePoolControl = await ActivePool.at(activePoolProxy.address);

    const dumbContractAddress = (await NonPayable.new()).address;
    await activePoolControl.setAddresses(
      mockBorrowerOperations.address,
      dumbContractAddress,
      dumbContractAddress,
      dumbContractAddress
    );
  });

  describe('Upgradability', () => {
    it('setImplementation(): only owner can change implementation address', async () => {
      const newActivePool = await ActivePool.new();
      const tx = await activePoolProxy.setImplementation(
        newActivePool.address,
        { from: owner }
      );
      const newImplementationAddress = th
        .getEventArgByName(tx, 'ImplementationChanged', '_newImplementation')
        .toString();
      assert.equal(newActivePool.address, newImplementationAddress);

      const txAlice = activePoolProxy.setImplementation(newActivePool.address, {
        from: alice,
      });
      await th.assertRevert(txAlice, 'Proxy:: access denied');
    });

    it('setProxyOwner(): only owner can change proxy owner', async () => {
      const tx = await activePoolProxy.setProxyOwner(alice, {
        from: owner,
      });
      const newOwnerAddress = th
        .getEventArgByName(tx, 'OwnershipTransferred', 'newOwner')
        .toString();
      assert.equal(alice, newOwnerAddress);

      const oldOwner = owner;
      const txOldOwner = activePoolProxy.setProxyOwner(oldOwner, {
        from: oldOwner,
      });
      await th.assertRevert(txOldOwner, 'Proxy:: access denied');
      await activePoolProxy.setProxyOwner(owner, {
        from: alice,
      });
    });
    it('state is preserved after changing implementation address', async () => {
      // send some ETH to active pool
      const initialBalance = web3.utils.toBN(await activePoolControl.getETH());
      assert.equal(initialBalance, 0);

      const tx1 = await mockBorrowerOperations.forward(
        activePoolControl.address,
        '0x',
        { from: owner, value: th.dec(2, 'ether') }
      );
      assert.isTrue(tx1.receipt.status);

      const beforeTxBalance = web3.utils.toBN(await activePoolControl.getETH());
      assert.equal(beforeTxBalance, th.dec(2, 'ether'));

      // upgrade active pool implementation address
      const newActivePoolContract = await ActivePool.new();
      await activePoolProxy.setImplementation(newActivePoolContract.address);

      // check no changes and same ETH balance in active pool
      const activePoolETH = await activePoolControl.getETH();
      assert.equal(activePoolETH, th.dec(2, 'ether'));
    });
  });
});
