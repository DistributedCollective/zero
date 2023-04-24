const deploymentHelper = require("../../utils/js/deploymentHelpers.js");
const { TestHelper: th, MoneyValues: mv } = require("../../utils/js/testHelpers.js");

const GasPool = artifacts.require("./GasPool.sol");
const BorrowerOperationsTester = artifacts.require("./BorrowerOperationsTester.sol");

contract("All Zero functions with onlyOwner modifier", async accounts => {
  const [owner, alice, bob] = accounts;

  const multisig = accounts[999];

  let contracts;
  let zusdToken;
  let sortedTroves;
  let troveManager;
  let activePool;
  let stabilityPool;
  let defaultPool;
  let borrowerOperations;
  let feeDistributor;

  let zeroStaking;
  let communityIssuance;
  let zeroToken;
  let sovToken;

  before(async () => {
    contracts = await deploymentHelper.deployLiquityCore();
    contracts.borrowerOperations = await BorrowerOperationsTester.new();
    contracts = await deploymentHelper.deployZUSDToken(contracts);
    const ZEROContracts = await deploymentHelper.deployZEROContracts(multisig);

    zusdToken = contracts.zusdToken;
    sortedTroves = contracts.sortedTroves;
    troveManager = contracts.troveManager;
    activePool = contracts.activePool;
    stabilityPool = contracts.stabilityPool;
    defaultPool = contracts.defaultPool;
    borrowerOperations = contracts.borrowerOperations;
    feeDistributor = contracts.feeDistributor;

    zeroStaking = ZEROContracts.zeroStaking;
    communityIssuance = ZEROContracts.communityIssuance;
    zeroToken = ZEROContracts.zeroToken;
    sovToken = ZEROContracts.zeroToken;
  });

  const testZeroAddress = async (contract, params, method = "setAddresses", skip = 0) => {
    await testWrongAddress(
      contract,
      params,
      th.ZERO_ADDRESS,
      method,
      skip,
      "Account cannot be zero address"
    );
  };
  const testNonContractAddress = async (contract, params, method = "setAddresses", skip = 0) => {
    await testWrongAddress(contract, params, bob, method, skip, "Account code size cannot be zero");
  };
  const testWrongAddress = async (contract, params, address, method, skip, message) => {
    for (let i = skip; i < params.length; i++) {
      const newParams = [...params];
      newParams[i] = address;
      await th.assertRevert(contract[method](...newParams, { from: owner }), message);
    }
  };

  const testSetAddresses = async (contract, numberOfAddresses) => {
    const dumbContract = await GasPool.new();
    const params = Array(numberOfAddresses).fill(dumbContract.address);

    // Attempt call from alice
    await th.assertRevert(contract.setAddresses(...params, { from: alice }));

    // Attempt to use zero address
    await testZeroAddress(contract, params);
    // Attempt to use non contract
    await testNonContractAddress(contract, params);

    // Owner can successfully set any address
    const txOwner = await contract.setAddresses(...params, { from: owner });
    assert.isTrue(txOwner.receipt.status);
  };

  describe("TroveManager", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      const dumbContract = await GasPool.new();
      const tmParamKeys = Array(
        "_feeDistributorAddress",
        "_troveManagerRedeemOps",
        "_liquityBaseParamsAddress",
        "_borrowerOperationsAddress",
        "_activePoolAddress",
        "_defaultPoolAddress",
        "_stabilityPoolAddress",
        "_gasPoolAddress",
        "_collSurplusPoolAddress",
        "_priceFeedAddress",
        "_zusdTokenAddress",
        "_sortedTrovesAddress",
        "_zeroTokenAddress",
        "_zeroStakingAddress"
      );

      const dumbAddresses = {
        _feeDistributorAddress: dumbContract.address,
        _troveManagerRedeemOps: dumbContract.address,
        _liquityBaseParamsAddress: dumbContract.address,
        _borrowerOperationsAddress: dumbContract.address,
        _activePoolAddress: dumbContract.address,
        _defaultPoolAddress: dumbContract.address,
        _stabilityPoolAddress: dumbContract.address,
        _gasPoolAddress: dumbContract.address,
        _collSurplusPoolAddress: dumbContract.address,
        _priceFeedAddress: dumbContract.address,
        _zusdTokenAddress: dumbContract.address,
        _sortedTrovesAddress: dumbContract.address,
        _zeroTokenAddress: dumbContract.address,
        _zeroStakingAddress: dumbContract.address
      };

      const localTestZeroAddress = async (contract, params, tmParamKeys, method = "setAddresses", skip = 0) => {
        await localTestWrongAddress(
          contract,
          params,
          tmParamKeys,
          th.ZERO_ADDRESS,
          method,
          skip,
          "Account cannot be zero address"
        );
      };
      const localTestNonContractAddress = async (contract, params, tmParamKeys, method = "setAddresses", skip = 0) => {
        await localTestWrongAddress(contract, params, tmParamKeys, bob, method, skip, "Account code size cannot be zero");
      };
      const localTestWrongAddress = async (contract, params, tmParamKeys, address, method, skip, message) => {
        for (let i = skip; i < params.length; i++) {
          const newParams = [...params];
          newParams[i] = address;
          const paramObj = {};
          tmParamKeys.forEach((element, index) => {
            paramObj[element] = newParams[index];
          });
          await th.assertRevert(contract[method](paramObj, { from: owner }), message);
        }
      };

      const numAddressParams = 14;
      const params = Array(numAddressParams).fill(dumbContract.address);
      await th.assertRevert(troveManager.setAddresses(
        dumbAddresses, { from: alice })
      );

      // Attempt to use zero address
      await localTestZeroAddress(troveManager, params, tmParamKeys);
      // Attempt to use non contract
      await localTestNonContractAddress(troveManager, params, tmParamKeys);

      // Owner can successfully set any address
      const txOwner = await troveManager.setAddresses(dumbAddresses, { from: owner });
      assert.isTrue(txOwner.receipt.status);

    });
  });

  describe("BorrowerOperations", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(borrowerOperations, 12);
    });
  });

  describe("FeeDistributor", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(feeDistributor, 7);
    });
  });

  describe("DefaultPool", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(defaultPool, 2);
    });
  });

  describe("StabilityPool", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(stabilityPool, 8);
    });
  });

  describe("ActivePool", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(activePool, 4);
    });
  });

  describe("SortedTroves", async accounts => {
    it("setParams(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      const dumbContract = await GasPool.new();
      const params = [10000001, dumbContract.address, dumbContract.address];

      // Attempt call from alice
      await th.assertRevert(sortedTroves.setParams(...params, { from: alice }));

      // Attempt to use zero address
      await testZeroAddress(sortedTroves, params, "setParams", 1);
      // Attempt to use non contract
      await testNonContractAddress(sortedTroves, params, "setParams", 1);

      // Owner can successfully set params
      const txOwner = await sortedTroves.setParams(...params, { from: owner });
      assert.isTrue(txOwner.receipt.status);

      // Owner can set any address more than once
      const secondTxOwner = await sortedTroves.setParams(...params, { from: owner });
      assert.isTrue(secondTxOwner.receipt.status);
    });
  });

  describe("CommunityIssuance", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      const dumbContract = await GasPool.new();
      const params = [sovToken.address, zusdToken.address, stabilityPool.address, dumbContract.address, 10000];
      await th.assertRevert(communityIssuance.initialize(...params, { from: alice }));

      // Attempt to use zero address
      await testZeroAddress(communityIssuance, params, "initialize", 5);
      // Attempt to use non contract
      await testNonContractAddress(communityIssuance, params, "initialize", 5);
    });

    it("initialize(): reverts when initiated twice", async () => {
      const dumbContract = await GasPool.new();
      const params = [sovToken.address, zusdToken.address, stabilityPool.address, dumbContract.address, 10000];
      await th.assertRevert(communityIssuance.initialize(...params, { from: alice }));

      // Attempt to use zero address
      await testZeroAddress(communityIssuance, params, "initialize", 5);
      // Attempt to use non contract
      await testNonContractAddress(communityIssuance, params, "initialize", 5);

      // Owner can successfully set any address
      const txOwner = await communityIssuance.initialize(...params, { from: owner });
      assert.isTrue(txOwner.receipt.status);

      // revert if tried to initialize twice
      await th.assertRevert(communityIssuance.initialize(...params, { from: owner }), "Contract instance has already been initialized");
    });

    it("setPriceFeed(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      const dumbContract = await GasPool.new();
      const params = [dumbContract.address];

      await th.assertRevert(communityIssuance.setPriceFeed(...params, { from: alice }));

      // Attempt to use zero address
      await testZeroAddress(communityIssuance, params, "setPriceFeed");
      // Attempt to use non contract
      await testNonContractAddress(communityIssuance, params, "setPriceFeed");
    });

    it("setRewardManager(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      const dumbContract = await GasPool.new();
      const params = [dumbContract.address];

      await th.assertRevert(communityIssuance.setRewardManager(...params, { from: alice }));

      // Attempt to use zero address
      await testZeroAddress(communityIssuance, params, "setRewardManager");
    });
  });

  describe("ZEROStaking", async accounts => {
    it("setAddresses(): reverts when called by non-owner, with wrong addresses, or twice", async () => {
      await testSetAddresses(zeroStaking, 4);
    });
  });
});
