const deploymentHelper = require("../../../utils/js/deploymentHelpers.js");
const testHelpers = require("../../../utils/js/testHelpers.js");
const CommunityIssuance = artifacts.require("./CommunityIssuance.sol");


const th = testHelpers.TestHelper;
const timeValues = testHelpers.TimeValues;
const assertRevert = th.assertRevert;
const toBN = th.toBN;
const dec = th.dec;

contract('Deploying the ZERO contracts: LCF, CI, ZEROStaking, and ZEROToken ', async accounts => {
  const [liquityAG, A, B] = accounts;
  const multisig = accounts[999];

  let ZEROContracts;

  const oneMillion = toBN(1000000);
  const digits = toBN(1e18);
  const thirtyFive = toBN(35);
  const expectedCISupplyCap = thirtyFive.mul(oneMillion).mul(digits);

  beforeEach(async () => {
    // Deploy all contracts from the first account
    const coreContracts = await deploymentHelper.deployLiquityCore();
    ZEROContracts = await deploymentHelper.deployZEROContracts(multisig);
    await deploymentHelper.connectZEROContracts(ZEROContracts);
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts);

    zeroStaking = ZEROContracts.zeroStaking;
    zeroToken = ZEROContracts.zeroToken;
    sovToken = ZEROContracts.zeroToken;
    communityIssuance = ZEROContracts.communityIssuance;
    marketMaker = ZEROContracts.marketMaker;
    presale = ZEROContracts.presale;

    //ZERO Staking and CommunityIssuance have not yet had their setters called, so are not yet
    // connected to the rest of the system
  });


  describe('CommunityIssuance deployment', async accounts => {
    it("Stores the deployer's address", async () => {
      const storedDeployerAddress = await communityIssuance.getOwner();

      assert.equal(liquityAG, storedDeployerAddress);
    });
  });

  describe('ZEROStaking deployment', async accounts => {
    it("Stores the deployer's address", async () => {
      const storedDeployerAddress = await zeroStaking.getOwner();

      assert.equal(liquityAG, storedDeployerAddress);
    });
  });

  describe('ZEROToken deployment', async accounts => {

    it("Stores the market maker address", async () => {
      const storedMarketMakerAddress = await zeroToken.marketMakerAddress();

      assert.equal(marketMaker.address, storedMarketMakerAddress);
    });

    it("Stores the presale address", async () => {
      const storedPresaleAddress = await zeroToken.presale();

      assert.equal(presale.address, storedPresaleAddress);
    });
  });

  describe('Community Issuance deployment', async accounts => {
    it("Stores the deployer's address", async () => {

      const storedDeployerAddress = await communityIssuance.getOwner();

      assert.equal(storedDeployerAddress, liquityAG);
    });

    it("Liquity AG can't set addresses if CI's ZERO balance hasn't been transferred ", async () => {
      const newCI = await CommunityIssuance.new();

      const ZEROBalance = await zeroToken.balanceOf(newCI.address);
      assert.equal(ZEROBalance, '0');

      // Deploy core contracts, just to get the Stability Pool address
      const coreContracts = await deploymentHelper.deployLiquityCore();

      try {
        const tx = await newCI.initialize(
          sovToken.address,
          coreContracts.zusdToken.address,
          coreContracts.stabilityPool.address,
          coreContracts.priceFeedSovryn.address,
          10000,
          { from: liquityAG }
        );

        // Check it gives the expected error message for a failed Solidity 'assert'
      } catch (err) {
        assert.include(err.message, "invalid opcode");
      }
    });
  });

  describe('Connecting ZEROToken to LCF, CI and ZEROStaking', async accounts => {
    it('sets the correct ZEROToken address in ZEROStaking', async () => {
      // Deploy core contracts and set the ZEROToken address in the CI and ZEROStaking
      const coreContracts = await deploymentHelper.deployLiquityCore();
      const newCI = await CommunityIssuance.new();

      ZEROContracts.communityIssuance = newCI;

      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts);

      const zeroTokenAddress = zeroToken.address;

      const recordedZEROTokenAddress = await zeroStaking.zeroToken();
      assert.equal(zeroTokenAddress, recordedZEROTokenAddress);
    });

    it('sets the correct SOVToken address in CommunityIssuance', async () => {
      // Deploy core contracts and set the ZEROToken address in the CI and ZEROStaking
      const coreContracts = await deploymentHelper.deployLiquityCore();

      const newCI = await CommunityIssuance.new();

      ZEROContracts.communityIssuance = newCI;

      await deploymentHelper.connectZEROContractsToCore(ZEROContracts, coreContracts);

      const sovTokenAddress = sovToken.address;

      const recordedSOVTokenAddress = await newCI.sovToken();
      assert.equal(sovTokenAddress, recordedSOVTokenAddress);
    });
  });
});
