const ProxiableContract = artifacts.require('ProxiableContract');
const ProxiableContract2 = artifacts.require('ProxiableContract2');
const UpgradableProxyTester = artifacts.require('UpgradableProxyTester');
const testHelpers = require('../../utils/js/testHelpers.js');
const th = testHelpers.TestHelper;
const BN = require('bn.js');
require('chai').use(require('chai-bn')(BN)).should();

contract('UpgradableProxy', async (accounts) => {
  let proxyControl;
  let proxy;
  const [owner, alice] = accounts;

  beforeEach(async () => {
    const someProxiableContract = await ProxiableContract.new();
    proxy = await UpgradableProxyTester.new();
    await proxy.setImplementation(someProxiableContract.address);
    proxyControl = await ProxiableContract.at(proxy.address);
  });

  describe('Upgradability', () => {
    it('setImplementation(): only owner can change implementation address', async () => {
      const proxiableContract2 = await ProxiableContract2.new();
      const tx = await proxy.setImplementation(
        proxiableContract2.address,
        { from: owner }
      );
      const newImplementationAddress = th
        .getEventArgByName(tx, 'ImplementationChanged', '_newImplementation')
        .toString();
      assert.equal(proxiableContract2.address, newImplementationAddress);

      const txAlice = proxy.setImplementation(proxyControl.address, {
        from: alice,
      });
      await th.assertRevert(txAlice, 'Proxy:: access denied');
    });

    it('setOwner(): only owner can change proxy owner', async () => {
      const tx = await proxy.setOwner(alice, {
        from: owner,
      });
      const newOwnerAddress = th
        .getEventArgByName(tx, 'OwnershipTransferred', 'newOwner')
        .toString();
      assert.equal(alice, newOwnerAddress);

      const oldOwner = owner;
      const txOldOwner = proxy.setOwner(oldOwner, {
        from: oldOwner,
      });
      await th.assertRevert(txOldOwner, 'Proxy:: access denied');
      await proxy.setOwner(owner, {
        from: alice,
      });
    });
    it('state is preserved after changing implementation address', async () => {
      const initialValue = await proxyControl.getSomeVar();
      assert.equal(initialValue, 0);
      await proxyControl.setSomeVar(20);
      const someVar = await proxyControl.getSomeVar();
      assert.equal(someVar, 20);

      // simulate upgrade
      const newProxiableContractContract = await ProxiableContract2.new();
      await proxy.setImplementation(newProxiableContractContract.address);

      proxyControl = await ProxiableContract2.at(proxy.address);
      await proxyControl.setAnotherVar(30);

      // check storage is intact
      const someVarAfterUpgrade = await proxyControl.getSomeVar();
      someVar.should.be.a.bignumber.that.equals(someVarAfterUpgrade);

      const anotherVar = await proxyControl.getAnotherVar();
      const mulAfterUpgrade = await proxyControl.mulVars();
      mulAfterUpgrade.should.be.a.bignumber.that.equals(anotherVar.mul(someVarAfterUpgrade));
    });
  });
});
