const ExternalPriceFeedTester = artifacts.require("./ExternalPriceFeedTester.sol");
const PriceFeed = artifacts.require("./PriceFeed.sol");
const PriceFeedTestnet = artifacts.require("./PriceFeedTestnet.sol");

const testHelpers = require("../../utils/js/testHelpers.js");
const timeMachine = require('ganache-time-traveler');
const th = testHelpers.TestHelper;

const { dec, assertRevert, getEventArgByName, getAllEventsByName } = th;

contract("PriceFeed", async accounts => {
  const [owner, alice] = accounts;
  let priceFeedTestnet;
  let priceFeed;
  let zeroAddressPriceFeed;
  let mockedMoCPriceFeed;
  let mockedRskOracle;
  let anotherOracle;

  const setAddresses = async () => {
    await priceFeed.setAddresses(mockedMoCPriceFeed.address, mockedRskOracle.address, {
      from: owner
    });
  };

  before(async () => {
    priceFeedTestnet = await PriceFeedTestnet.new();
    PriceFeedTestnet.setAsDeployed(priceFeedTestnet);

    priceFeed = await PriceFeed.new();
    PriceFeed.setAsDeployed(priceFeed);

    zeroAddressPriceFeed = await PriceFeed.new();
    PriceFeed.setAsDeployed(zeroAddressPriceFeed);

    mockedMoCPriceFeed = await ExternalPriceFeedTester.new();
    ExternalPriceFeedTester.setAsDeployed(mockedMoCPriceFeed);

    mockedRskOracle = await ExternalPriceFeedTester.new();
    ExternalPriceFeedTester.setAsDeployed(mockedRskOracle);

    anotherOracle = await ExternalPriceFeedTester.new();
    ExternalPriceFeedTester.setAsDeployed(mockedRskOracle);

    //Set current and prev prices in both oracles
    await mockedMoCPriceFeed.setLatestAnswer(dec(100, 18), true);
    await mockedRskOracle.setLatestAnswer(dec(100, 18), true);
  });

  let revertToSnapshot;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result']);
  });

  afterEach(async () => {
    await revertToSnapshot();
  });


  describe("PriceFeed internal testing contract", async accounts => {
    it("fetchPrice before setPrice should return the default price", async () => {
      const price = await priceFeedTestnet.getPrice();
      assert.equal(price, dec(200, 18));
    });
    it("should be able to fetchPrice after setPrice, output of former matching input of latter", async () => {
      await priceFeedTestnet.setPrice(dec(100, 18));
      const price = await priceFeedTestnet.getPrice();
      assert.equal(price, dec(100, 18));
    });
  });

  describe("Mainnet PriceFeed setup", async accounts => {
    it("fetchPrice should fail on contract with no main price feed address set", async () => {
      try {
        const price = await zeroAddressPriceFeed.fetchPrice();
        assert.isFalse(price.receipt.status);
      } catch (err) {
        assert.include(err.message, "function call to a non-contract account");
      }
    });

    it("fetchPrice should fail on contract with no backup oracle address set", async () => {
      try {
        const price = await zeroAddressPriceFeed.fetchPrice();
        assert.isFalse(price.receipt.status);
      } catch (err) {
        assert.include(err.message, "function call to a non-contract account");
      }
    });

    it("setAddresses should fail whe called by nonOwner", async () => {
      await assertRevert(
        priceFeed.setAddresses(mockedMoCPriceFeed.address, mockedRskOracle.address, { from: alice }),
        "Ownable: caller is not the owner"
      );
    });

    it("setAddress should fail when called by nonOwner", async () => {
      await assertRevert(
        priceFeed.setAddress(0, mockedMoCPriceFeed.address, { from: alice }),
        "Ownable: caller is not the owner"
      );
    });

    it("setAddress should fail when called on an invalid index", async () => {
      await assertRevert(
        priceFeed.setAddress(2, mockedMoCPriceFeed.address),
        "Out of bounds when setting the price feed"
      );
    });

    it("setAddress should fail whe called using an invalid contract", async () => {
      await assertRevert(
        priceFeed.setAddress(0, "0x0000000000000000000000000000000000000000"),
        "Ownable: caller is not the owner"
      );
    });

    it("should let price feeds to be changed", async () => {
      await mockedMoCPriceFeed.setLatestAnswer(dec(10, 18), true);
      await mockedRskOracle.setLatestAnswer(dec(12, 18), true);

      const txOwner = await priceFeed.setAddresses(
        mockedMoCPriceFeed.address,
        mockedRskOracle.address,
        { from: owner }
      );
      assert.isTrue(txOwner.receipt.status);

      let price = await priceFeed.lastGoodPrice();
      assert.equal(price, dec(10, 18));

      await mockedMoCPriceFeed.setLatestAnswer(dec(15, 18), true);
      // it still uses the main price feed
      await priceFeed.fetchPrice();
      price = await priceFeed.lastGoodPrice();
      assert.equal(price, dec(15, 18));

      // swap an oracle
      await anotherOracle.setLatestAnswer(dec(14, 18), true);
      await priceFeed.setAddress(0, anotherOracle.address);
      await priceFeed.fetchPrice();
      price = await priceFeed.lastGoodPrice();
      assert.equal(price, dec(14, 18));
    });


    it("should set the price when setting the main price feed oracle", async () => {
      await mockedMoCPriceFeed.setLatestAnswer(dec(10, 18), true);
      await mockedRskOracle.setLatestAnswer(dec(12, 18), true);

      const txOwner = await priceFeed.setAddresses(
        mockedMoCPriceFeed.address,
        mockedRskOracle.address,
        { from: owner }
      );
      assert.isTrue(txOwner.receipt.status);

      let price = await priceFeed.lastGoodPrice();
      assert.equal(price, dec(10, 18));
    });

    it("should revert if the main price feed fails", async () => {
      await mockedMoCPriceFeed.setLatestAnswer(dec(10, 18), false);
      await mockedRskOracle.setLatestAnswer(dec(12, 18), true);

      await assertRevert(
        priceFeed.setAddresses(mockedMoCPriceFeed.address, mockedRskOracle.address, { from: alice }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Price fetching", async () => {
    it("Should properly return the price if the main price feed works ok", async () => {
      setAddresses();
      await mockedMoCPriceFeed.setLatestAnswer(dec(20, 18), true);
      await mockedRskOracle.setLatestAnswer(dec(22, 18), true);

      await priceFeed.fetchPrice();
      let price = await priceFeed.lastGoodPrice();
      assert.equal(price, dec(20, 18));
    });

    it("Should return the backup price if the main price feed doesn't work", async () => {
      setAddresses();
      await mockedMoCPriceFeed.setLatestAnswer(dec(20, 18), false);
      await mockedRskOracle.setLatestAnswer(dec(22, 18), true);

      const fetchTx = await priceFeed.fetchPrice();
      let price = await priceFeed.lastGoodPrice();
      assert.equal(price, dec(22, 18));
      assert.equal(getEventArgByName(fetchTx, "PriceFeedBroken", "0").toString(), 0);
    });

    it("Should return the latest price if both oracles failed", async () => {
      setAddresses();
      await mockedMoCPriceFeed.setLatestAnswer(dec(20, 18), false);
      await mockedRskOracle.setLatestAnswer(dec(22, 18), false);

      const fetchTx = await priceFeed.fetchPrice();
      let price = await priceFeed.lastGoodPrice();
      assert.equal(price, dec(100, 18));
      assert.equal(getAllEventsByName(fetchTx, "PriceFeedBroken").length, 2);
    });
  });
});
