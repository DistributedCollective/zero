const deploymentHelper = require("../../utils/js/deploymentHelpers.js");
const testHelpers = require("../../utils/js/testHelpers.js");
const timeMachine = require('ganache-time-traveler');

const TroveManagerTester = artifacts.require("TroveManagerTester");
const ZEROTokenTester = artifacts.require("ZEROTokenTester");

const th = testHelpers.TestHelper;

const dec = th.dec;
const toBN = th.toBN;
const mv = testHelpers.MoneyValues;
const timeValues = testHelpers.TimeValues;

const ZERO_ADDRESS = th.ZERO_ADDRESS;
const assertRevert = th.assertRevert;

const {
  buildUserProxies,
  BorrowerOperationsProxy,
  BorrowerWrappersProxy,
  TroveManagerProxy,
  StabilityPoolProxy,
  SortedTrovesProxy,
  TokenProxy,
  ZEROStakingProxy
} = require('../../utils/js/proxyHelpers.js');

contract('BorrowerWrappers', async accounts => {

  const [
    owner, alice, bob, carol, dennis, whale,
    A, B, C, D, E,
    defaulter_1, defaulter_2,
    // frontEnd_1, frontEnd_2, frontEnd_3
  ] = accounts;

  const multisig = accounts[999];

  let priceFeed;
  let zusdToken;
  let sortedTroves;
  let troveManagerOriginal;
  let troveManager;
  let activePool;
  let stabilityPool;
  let defaultPool;
  let collSurplusPool;
  let borrowerOperations;
  let borrowerWrappers;
  let zeroTokenOriginal;
  let zeroToken;
  let zeroStaking;
  let wrbtcToken;
  let feeSharingCollector;

  let contracts;

  let ZUSD_GAS_COMPENSATION;

  const getOpenTroveZUSDAmount = async (totalDebt) => th.getOpenTroveZUSDAmount(contracts, totalDebt);
  const getActualDebtFromComposite = async (compositeDebt) => th.getActualDebtFromComposite(compositeDebt, contracts);
  const getNetBorrowingAmount = async (debtWithFee) => th.getNetBorrowingAmount(contracts, debtWithFee);
  const openTrove = async (params) => th.openTrove(contracts, params);

  before(async () => {
    contracts = await deploymentHelper.deployLiquityCore();
    contracts.troveManager = await TroveManagerTester.new();
    contracts = await deploymentHelper.deployZUSDToken(contracts);
    const ZEROContracts = await deploymentHelper.deployZEROTesterContractsHardhat(multisig);

    await deploymentHelper.connectZEROContracts(ZEROContracts);
    await deploymentHelper.connectCoreContracts(contracts, ZEROContracts);
    await deploymentHelper.connectZEROContractsToCore(ZEROContracts, contracts);

    await ZEROContracts.zeroToken.unprotectedMint(owner, toBN(dec(30, 24)));
    await ZEROContracts.zeroToken.approve(ZEROContracts.communityIssuance.address, toBN(dec(30, 24)));

    troveManagerOriginal = contracts.troveManager;
    zeroTokenOriginal = ZEROContracts.zeroToken;

    const users = [alice, bob, carol, dennis, whale, A, B, C, D, E, defaulter_1, defaulter_2];
    await deploymentHelper.deployProxyScripts(contracts, ZEROContracts, owner, users);

    priceFeed = contracts.priceFeedTestnet;
    zusdToken = contracts.zusdToken;
    sortedTroves = contracts.sortedTroves;
    troveManager = contracts.troveManager;
    activePool = contracts.activePool;
    stabilityPool = contracts.stabilityPool;
    defaultPool = contracts.defaultPool;
    collSurplusPool = contracts.collSurplusPool;
    borrowerOperations = contracts.borrowerOperations;
    borrowerWrappers = contracts.borrowerWrappers;
    zeroStaking = ZEROContracts.zeroStaking;
    zeroToken = ZEROContracts.zeroToken;
    wrbtcToken = contracts.wrbtcTokenTester;
    feeSharingCollector = ZEROContracts.mockFeeSharingCollector.address;

    ZUSD_GAS_COMPENSATION = await borrowerOperations.ZUSD_GAS_COMPENSATION();
  });

  let revertToSnapshot;

  beforeEach(async () => {
    let snapshot = await timeMachine.takeSnapshot();
    revertToSnapshot = () => timeMachine.revertToSnapshot(snapshot['result']);
  });

  afterEach(async () => {
    await revertToSnapshot();
  });

  it('proxy owner can recover ETH', async () => {
    const amount = toBN(dec(1, 18));
    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice);

    // send some ETH to proxy
    await web3.eth.sendTransaction({ from: owner, to: proxyAddress, value: amount });
    assert.equal(await web3.eth.getBalance(proxyAddress), amount.toString());

    const balanceBefore = toBN(await web3.eth.getBalance(alice));

    // recover ETH
    await borrowerWrappers.transferETH(alice, amount, { from: alice, gasPrice: 0 });
    const balanceAfter = toBN(await web3.eth.getBalance(alice));

    assert.equal(balanceAfter.sub(balanceBefore), amount.toString());
  });

  it('non proxy owner cannot recover ETH', async () => {
    const amount = toBN(dec(1, 18));
    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice);

    // send some ETH to proxy
    await web3.eth.sendTransaction({ from: owner, to: proxyAddress, value: amount });
    assert.equal(await web3.eth.getBalance(proxyAddress), amount.toString());

    const balanceBefore = toBN(await web3.eth.getBalance(alice));

    // try to recover ETH
    const proxy = borrowerWrappers.getProxyFromUser(alice);
    const signature = 'transferETH(address,uint256)';
    const calldata = th.getTransactionData(signature, [alice, amount]);
    await assertRevert(proxy.methods["execute(address,bytes)"](borrowerWrappers.scriptAddress, calldata, { from: bob }), 'ds-auth-unauthorized');

    assert.equal(await web3.eth.getBalance(proxyAddress), amount.toString());

    const balanceAfter = toBN(await web3.eth.getBalance(alice));
    assert.equal(balanceAfter, balanceBefore.toString());
  });

  // --- claimCollateralAndOpenTrove ---

  it('claimCollateralAndOpenTrove(): reverts if nothing to claim', async () => {
    // Whale opens Trove
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: whale } });

    // alice opens Trove
    const { zusdAmount, collateral } = await openTrove({ ICR: toBN(dec(15, 17)), extraParams: { from: alice } });

    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice);
    assert.equal(await web3.eth.getBalance(proxyAddress), '0');

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // alice claims collateral and re-opens the trove
    await assertRevert(
      borrowerWrappers.claimCollateralAndOpenTrove(th._100pct, zusdAmount, alice, alice, { from: alice }),
      'CollSurplusPool: No collateral available to claim'
    );

    // check everything remain the same
    assert.equal(await web3.eth.getBalance(proxyAddress), '0');
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), '0');
    th.assertIsApproximatelyEqual(await zusdToken.balanceOf(proxyAddress), zusdAmount);
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 1);
    th.assertIsApproximatelyEqual(await troveManager.getTroveColl(proxyAddress), collateral);
  });

  it('claimCollateralAndOpenTrove(): without sending any value', async () => {
    // alice opens Trove
    const { zusdAmount, netDebt: redeemAmount, collateral } = await openTrove({ extraZUSDAmount: 0, ICR: toBN(dec(3, 18)), extraParams: { from: alice } });
    // Whale opens Trove
    await openTrove({ extraZUSDAmount: redeemAmount, ICR: toBN(dec(5, 18)), extraParams: { from: whale } });

    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice);
    assert.equal(await web3.eth.getBalance(proxyAddress), '0');

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // whale redeems 150 ZUSD
    await th.redeemCollateral(whale, contracts, redeemAmount);
    assert.equal(await web3.eth.getBalance(proxyAddress), '0');

    // surplus: 5 - 150/200
    const price = await priceFeed.getPrice();
    const expectedSurplus = collateral.sub(redeemAmount.mul(mv._1e18BN).div(price));
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), expectedSurplus);
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 4); // closed by redemption

    // alice claims collateral and re-opens the trove
    await borrowerWrappers.claimCollateralAndOpenTrove(th._100pct, zusdAmount, alice, alice, { from: alice });

    assert.equal(await web3.eth.getBalance(proxyAddress), '0');
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), '0');
    th.assertIsApproximatelyEqual(await zusdToken.balanceOf(proxyAddress), zusdAmount.mul(toBN(2)));
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 1);
    th.assertIsApproximatelyEqual(await troveManager.getTroveColl(proxyAddress), expectedSurplus);
  });

  it('claimCollateralAndOpenTrove(): sending value in the transaction', async () => {
    // alice opens Trove
    const { zusdAmount, netDebt: redeemAmount, collateral } = await openTrove({ extraParams: { from: alice } });
    // Whale opens Trove
    await openTrove({ extraZUSDAmount: redeemAmount, ICR: toBN(dec(2, 18)), extraParams: { from: whale } });

    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice);
    assert.equal(await web3.eth.getBalance(proxyAddress), '0');

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // whale redeems 150 ZUSD
    await th.redeemCollateral(whale, contracts, redeemAmount);
    assert.equal(await web3.eth.getBalance(proxyAddress), '0');

    // surplus: 5 - 150/200
    const price = await priceFeed.getPrice();
    const expectedSurplus = collateral.sub(redeemAmount.mul(mv._1e18BN).div(price));
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), expectedSurplus);
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 4); // closed by redemption

    // alice claims collateral and re-opens the trove
    await borrowerWrappers.claimCollateralAndOpenTrove(th._100pct, zusdAmount, alice, alice, { from: alice, value: collateral });

    assert.equal(await web3.eth.getBalance(proxyAddress), '0');
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), '0');
    th.assertIsApproximatelyEqual(await zusdToken.balanceOf(proxyAddress), zusdAmount.mul(toBN(2)));
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 1);
    th.assertIsApproximatelyEqual(await troveManager.getTroveColl(proxyAddress), expectedSurplus.add(collateral));
  });

  // --- claimSPRewardsAndRecycle ---

  it('claimSPRewardsAndRecycle(): only owner can call it', async () => {
    // Whale opens Trove
    await openTrove({ extraZUSDAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } });
    // Whale deposits 1850 ZUSD in StabilityPool
    await stabilityPool.provideToSP(dec(1850, 18), ZERO_ADDRESS, { from: whale });

    // alice opens trove and provides 150 ZUSD to StabilityPool
    await openTrove({ extraZUSDAmount: toBN(dec(150, 18)), extraParams: { from: alice } });
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice });

    // Defaulter Trove opened
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } });

    // price drops: defaulters' Troves fall below MCR, alice and whale Trove remain active
    const price = toBN(dec(100, 18));
    await priceFeed.setPrice(price);

    // Defaulter trove closed
    const liquidationTX_1 = await troveManager.liquidate(defaulter_1, { from: owner });
    const [liquidatedDebt_1] = await th.getEmittedLiquidationValues(liquidationTX_1);

    // Bob tries to claims SP rewards in behalf of Alice
    const proxy = borrowerWrappers.getProxyFromUser(alice);
    const signature = 'claimSPRewardsAndRecycle(uint256,address,address)';
    const calldata = th.getTransactionData(signature, [th._100pct, alice, alice]);
    await assertRevert(proxy.methods["execute(address,bytes)"](borrowerWrappers.scriptAddress, calldata, { from: bob }), 'ds-auth-unauthorized');
  });

  it('claimSPRewardsAndRecycle():', async () => {
    // Whale opens Trove
    const whaleDeposit = toBN(dec(2350, 18));
    await openTrove({ extraZUSDAmount: whaleDeposit, ICR: toBN(dec(4, 18)), extraParams: { from: whale } });
    // Whale deposits 1850 ZUSD in StabilityPool
    await stabilityPool.provideToSP(whaleDeposit, ZERO_ADDRESS, { from: whale });

    // alice opens trove and provides 150 ZUSD to StabilityPool
    const aliceDeposit = toBN(dec(150, 18));
    await openTrove({ extraZUSDAmount: aliceDeposit, ICR: toBN(dec(3, 18)), extraParams: { from: alice } });
    await stabilityPool.provideToSP(aliceDeposit, ZERO_ADDRESS, { from: alice });

    // Defaulter Trove opened
    const { zusdAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } });

    // price drops: defaulters' Troves fall below MCR, alice and whale Trove remain active
    const price = toBN(dec(100, 18));
    await priceFeed.setPrice(price);

    // Defaulter trove closed
    const liquidationTX_1 = await troveManager.liquidate(defaulter_1, { from: owner });
    const [liquidatedDebt_1] = await th.getEmittedLiquidationValues(liquidationTX_1);

    // Alice ZUSDLoss is ((150/2500) * liquidatedDebt)
    const totalDeposits = whaleDeposit.add(aliceDeposit);
    const expectedZUSDLoss_A = liquidatedDebt_1.mul(aliceDeposit).div(totalDeposits);

    const expectedCompoundedZUSDDeposit_A = toBN(dec(150, 18)).sub(expectedZUSDLoss_A);
    const compoundedZUSDDeposit_A = await stabilityPool.getCompoundedZUSDDeposit(alice);
    // collateral * 150 / 2500 * 0.995
    const expectedETHGain_A = collateral.mul(aliceDeposit).div(totalDeposits).mul(toBN(dec(995, 15))).div(mv._1e18BN);

    assert.isAtMost(th.getDifference(expectedCompoundedZUSDDeposit_A, compoundedZUSDDeposit_A), 1000);

    const ethBalanceBefore = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollBefore = await troveManager.getTroveColl(alice);
    const zusdBalanceBefore = await zusdToken.balanceOf(alice);
    const troveDebtBefore = await troveManager.getTroveDebt(alice);
    const zeroBalanceBefore = await zeroToken.balanceOf(alice);
    const ICRBefore = await troveManager.getCurrentICR(alice, price);
    const depositBefore = (await stabilityPool.deposits(alice))[0];
    const stakeBefore = await zeroStaking.stakes(alice);


    const proportionalZUSD = expectedETHGain_A.mul(price).div(ICRBefore);
    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay();
    const netDebtChange = proportionalZUSD.mul(mv._1e18BN).div(mv._1e18BN.add(borrowingRate));

    // to force ZERO issuance
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // Alice has staked 150 ZUSD and the whale 2350 therefore she gets 6% of the ZERO gains
    // 30,000,000 * (1–0.5^ (SECONDS_IN_A_WEEK * 2 / SECONDS_IN_A_YEAR) )
    // ie. 0.06 * 787,084.753044 = 47,225.0851826
    const expectedZEROGain_A = toBN('47225085182600000000000');

    await priceFeed.setPrice(price.mul(toBN(2)));

    // Alice claims SP rewards and puts them back in the system through the proxy
    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice);
    await borrowerWrappers.claimSPRewardsAndRecycle(th._100pct, alice, alice, { from: alice });

    const ethBalanceAfter = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollAfter = await troveManager.getTroveColl(alice);
    const zusdBalanceAfter = await zusdToken.balanceOf(alice);
    const troveDebtAfter = await troveManager.getTroveDebt(alice);
    const zeroBalanceAfter = await zeroToken.balanceOf(alice);
    const ICRAfter = await troveManager.getCurrentICR(alice, price);
    const depositAfter = (await stabilityPool.deposits(alice))[0];
    const stakeAfter = await zeroStaking.stakes(alice);

    // check proxy balances remain the same
    assert.equal(ethBalanceAfter.toString(), ethBalanceBefore.toString());
    assert.equal(zusdBalanceAfter.toString(), zusdBalanceBefore.toString());
    assert.equal(zeroBalanceAfter.toString(), zeroBalanceBefore.toString());
    // check trove has increased debt by the ICR proportional amount to ETH gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore.add(proportionalZUSD));
    // check trove has increased collateral by the ETH gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore.add(expectedETHGain_A));
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore);
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.sub(expectedZUSDLoss_A).add(netDebtChange));
    // check zero balance remains the same
    th.assertIsApproximatelyEqual(zeroBalanceAfter, zeroBalanceBefore);

    // ZERO staking
    // disabled as zero token is not used in beta 
    // th.assertIsApproximatelyEqual(stakeAfter, stakeBefore.add(expectedZEROGain_A), 1e13)

    // Expect Alice has withdrawn all ETH gain
    const alice_pendingETHGain = await stabilityPool.getDepositorETHGain(alice);
    assert.equal(alice_pendingETHGain, 0);
  });


  // --- claimStakingGainsAndRecycle ---

  it('claimStakingGainsAndRecycle(): only owner can call it', async () => {
    // Whale opens Trove
    await openTrove({ extraZUSDAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } });

    // alice opens trove
    await openTrove({ extraZUSDAmount: toBN(dec(150, 18)), extraParams: { from: alice } });

    // mint some ZERO
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18));
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18));

    // stake ZERO
    await zeroStaking.stake(dec(1850, 18), { from: whale });
    await zeroStaking.stake(dec(150, 18), { from: alice });

    // Defaulter Trove opened
    const { zusdAmount, netDebt, totalDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } });

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // whale redeems 100 ZUSD
    const redeemedAmount = toBN(dec(100, 18));
    await th.redeemCollateral(whale, contracts, redeemedAmount);

    // Bob tries to claims staking gains in behalf of Alice
    const proxy = borrowerWrappers.getProxyFromUser(alice);
    const signature = 'claimStakingGainsAndRecycle(uint256,address,address)';
    const calldata = th.getTransactionData(signature, [th._100pct, alice, alice]);
    await assertRevert(proxy.methods["execute(address,bytes)"](borrowerWrappers.scriptAddress, calldata, { from: bob }), 'ds-auth-unauthorized');
  });

  // There are no gains so this tests makes no sense
  it.skip('claimStakingGainsAndRecycle(): reverts if user has no trove', async () => {
    const price = toBN(dec(200, 18));

    // Whale opens Trove
    await openTrove({ extraZUSDAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } });
    // Whale deposits 1850 ZUSD in StabilityPool
    await stabilityPool.provideToSP(dec(1850, 18), ZERO_ADDRESS, { from: whale });

    // alice opens trove and provides 150 ZUSD to StabilityPool
    //await openTrove({ extraZUSDAmount: toBN(dec(150, 18)), extraParams: { from: alice } })
    //await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice })

    // mint some ZERO
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18));
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18));

    // stake ZERO
    await zeroStaking.stake(dec(1850, 18), { from: whale });
    await zeroStaking.stake(dec(150, 18), { from: alice });

    // Defaulter Trove opened
    const { zusdAmount, netDebt, totalDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } });
    const borrowingFee = netDebt.sub(zusdAmount);

    // Alice ZUSD gain is ((150/2000) * borrowingFee)
    const expectedZUSDGain_A = borrowingFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)));

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // whale redeems 100 ZUSD
    const redeemedAmount = toBN(dec(100, 18));
    await th.redeemCollateral(whale, contracts, redeemedAmount);

    const ethBalanceBefore = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollBefore = await troveManager.getTroveColl(alice);
    const zusdBalanceBefore = await zusdToken.balanceOf(alice);
    const troveDebtBefore = await troveManager.getTroveDebt(alice);
    const zeroBalanceBefore = await zeroToken.balanceOf(alice);
    const ICRBefore = await troveManager.getCurrentICR(alice, price);
    const depositBefore = (await stabilityPool.deposits(alice))[0];
    const stakeBefore = await zeroStaking.stakes(alice);

    // Alice claims staking rewards and puts them back in the system through the proxy
    await assertRevert(
      borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice }),
      'BorrowerWrappersScript: caller must have an active trove'
    );

    const ethBalanceAfter = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollAfter = await troveManager.getTroveColl(alice);
    const zusdBalanceAfter = await zusdToken.balanceOf(alice);
    const troveDebtAfter = await troveManager.getTroveDebt(alice);
    const zeroBalanceAfter = await zeroToken.balanceOf(alice);
    const ICRAfter = await troveManager.getCurrentICR(alice, price);
    const depositAfter = (await stabilityPool.deposits(alice))[0];
    const stakeAfter = await zeroStaking.stakes(alice);

    // check everything remains the same
    assert.equal(ethBalanceAfter.toString(), ethBalanceBefore.toString());
    assert.equal(zusdBalanceAfter.toString(), zusdBalanceBefore.toString());
    assert.equal(zeroBalanceAfter.toString(), zeroBalanceBefore.toString());
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore, 10000);
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore);
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore);
    th.assertIsApproximatelyEqual(depositAfter, depositBefore, 10000);
    th.assertIsApproximatelyEqual(zeroBalanceBefore, zeroBalanceAfter);
    // ZERO staking
    th.assertIsApproximatelyEqual(stakeAfter, stakeBefore);

    // Expect Alice has withdrawn all ETH gain
    const alice_pendingETHGain = await stabilityPool.getDepositorETHGain(alice);
    assert.equal(alice_pendingETHGain, 0);
  });

  it('claimStakingGainsAndRecycle(): with only ETH gain', async () => {
    const price = toBN(dec(200, 18));

    // Whale opens Trove
    await openTrove({ extraZUSDAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } });

    const feeSharingCollectorZUSDBalanceBefore = await zusdToken.balanceOf(feeSharingCollector);

    // Defaulter Trove opened
    const { zusdAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } });
    const borrowingFee = netDebt.sub(zusdAmount);
    // 100% sent to feeSharingCollector address
    const borrowingFeeToFeeSharingCollector = borrowingFee.mul(toBN(dec(100, 16))).div(mv._1e18BN);
    const feeSharingCollectorZUSDBalanceAfter = await zusdToken.balanceOf(feeSharingCollector);

    // alice opens trove and provides 150 ZUSD to StabilityPool
    await openTrove({ extraZUSDAmount: toBN(dec(150, 18)), extraParams: { from: alice } });
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice });

    // mint some ZERO
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18));
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18));

    // stake ZERO
    await zeroStaking.stake(dec(1850, 18), { from: whale });
    await zeroStaking.stake(dec(150, 18), { from: alice });

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // whale redeems 100 ZUSD
    const redeemedAmount = toBN(dec(100, 18));
    const feeSharingCollectorBalanceBefore = await wrbtcToken.balanceOf(feeSharingCollector);
    await th.redeemCollateral(whale, contracts, redeemedAmount);
    const feeSharingCollectorBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(feeSharingCollector));

    // Alice ETH gain is ((150/2000) * (redemption fee over redeemedAmount) / price)
    const redemptionFee = await troveManager.getRedemptionFeeWithDecay(redeemedAmount);
    // 20% sent to feeSharingCollector address
    const redemptionFeeToFeeSharingCollector = redemptionFee.mul(toBN(dec(100, 16))).div(mv._1e18BN);
    const expectedETHGainFeeSharingCollector = redemptionFeeToFeeSharingCollector.mul(mv._1e18BN).div(price);

    const redemptionFeeToZeroStalking = redemptionFee.sub(redemptionFeeToFeeSharingCollector);
    const expectedETHGain_A = redemptionFeeToZeroStalking.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18))).mul(mv._1e18BN).div(price);

    const ethBalanceBefore = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollBefore = await troveManager.getTroveColl(alice);
    const zusdBalanceBefore = await zusdToken.balanceOf(alice);
    const troveDebtBefore = await troveManager.getTroveDebt(alice);
    const zeroBalanceBefore = await zeroToken.balanceOf(alice);
    const ICRBefore = await troveManager.getCurrentICR(alice, price);
    const depositBefore = (await stabilityPool.deposits(alice))[0];
    const stakeBefore = await zeroStaking.stakes(alice);

    const proportionalZUSD = expectedETHGain_A.mul(price).div(ICRBefore);
    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay();
    const netDebtChange = proportionalZUSD.mul(toBN(dec(1, 18))).div(toBN(dec(1, 18)).add(borrowingRate));

    // No gains are expected
    const expectedZEROGain_A = toBN('0'); // toBN('787084753044000000000000')

    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice);
    // Alice claims staking rewards and puts them back in the system through the proxy
    await borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice });

    // Alice new ZUSD gain due to her own Trove adjustment: ((150/2000) * (borrowing fee over netDebtChange))
    const newBorrowingFee = await troveManagerOriginal.getBorrowingFeeWithDecay(netDebtChange);
    // 20% sent to feeSharingCollector address
    const newBorrowingFeeToFeeSharingCollector = newBorrowingFee.mul(toBN(dec(100, 16))).div(mv._1e18BN);
    const newBorrowingFeeToZeroStalking = newBorrowingFee.sub(newBorrowingFeeToFeeSharingCollector);
    const expectedNewZUSDGain_A = newBorrowingFeeToZeroStalking.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)));

    const ethBalanceAfter = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollAfter = await troveManager.getTroveColl(alice);
    const zusdBalanceAfter = await zusdToken.balanceOf(alice);
    const troveDebtAfter = await troveManager.getTroveDebt(alice);
    const zeroBalanceAfter = await zeroToken.balanceOf(alice);
    const ICRAfter = await troveManager.getCurrentICR(alice, price);
    const depositAfter = (await stabilityPool.deposits(alice))[0];
    const stakeAfter = await zeroStaking.stakes(alice);

    // check proxy balances remain the same
    assert.equal(ethBalanceAfter.toString(), ethBalanceBefore.toString());
    assert.equal(zeroBalanceAfter.toString(), zeroBalanceBefore.toString());
    // check proxy zusd balance has increased by own adjust trove reward
    th.assertIsApproximatelyEqual(zusdBalanceAfter, zusdBalanceBefore.add(expectedNewZUSDGain_A));
    // check trove has increased debt by the ICR proportional amount to ETH gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore.add(proportionalZUSD), 10000);
    // check trove has increased collateral by the ETH gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore.add(expectedETHGain_A));
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore);
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.add(netDebtChange), 10000);
    // check zero balance remains the same
    th.assertIsApproximatelyEqual(zeroBalanceBefore, zeroBalanceAfter);

    // ZERO staking
    th.assertIsApproximatelyEqual(stakeAfter, stakeBefore.add(expectedZEROGain_A), 1e14);

    // check feeSharingCollector has increased ZUSD balance
    th.assertIsApproximatelyEqual(feeSharingCollectorZUSDBalanceAfter, feeSharingCollectorZUSDBalanceBefore.add(borrowingFeeToFeeSharingCollector), 10000);
    // check feeSharingCollector has increased ETH balance
    th.assertIsApproximatelyEqual(feeSharingCollectorBalanceAfter, feeSharingCollectorBalanceBefore.add(expectedETHGainFeeSharingCollector), 10000);

    // Expect Alice has withdrawn all ETH gain
    const alice_pendingETHGain = await stabilityPool.getDepositorETHGain(alice);
    assert.equal(alice_pendingETHGain, 0);
  });

  it('claimStakingGainsAndRecycle(): with only ZUSD gain', async () => {
    const price = toBN(dec(200, 18));

    // Whale opens Trove
    await openTrove({ extraZUSDAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } });

    // alice opens trove and provides 150 ZUSD to StabilityPool
    await openTrove({ extraZUSDAmount: toBN(dec(150, 18)), extraParams: { from: alice } });
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice });

    // mint some ZERO
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18));
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18));

    // stake ZERO
    await zeroStaking.stake(dec(1850, 18), { from: whale });
    await zeroStaking.stake(dec(150, 18), { from: alice });

    const feeSharingCollectorZUSDBalanceBefore = await zusdToken.balanceOf(feeSharingCollector);

    // Defaulter Trove opened
    const { zusdAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } });
    const borrowingFee = netDebt.sub(zusdAmount);

    // 100% sent to feeSharingCollector address
    const borrowingFeeToFeeSharingCollector = borrowingFee.mul(toBN(dec(100, 16))).div(mv._1e18BN);
    const feeSharingCollectorZUSDBalanceAfter = await zusdToken.balanceOf(feeSharingCollector);
    const borrowingFeeToZeroStalking = borrowingFee.sub(borrowingFeeToFeeSharingCollector);

    // Alice ZUSD gain is ((150/2000) * borrowingFee)
    const expectedZUSDGain_A = borrowingFeeToZeroStalking.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)));

    const ethBalanceBefore = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollBefore = await troveManager.getTroveColl(alice);
    const zusdBalanceBefore = await zusdToken.balanceOf(alice);
    const troveDebtBefore = await troveManager.getTroveDebt(alice);
    const zeroBalanceBefore = await zeroToken.balanceOf(alice);
    const ICRBefore = await troveManager.getCurrentICR(alice, price);
    const depositBefore = (await stabilityPool.deposits(alice))[0];
    const stakeBefore = await zeroStaking.stakes(alice);

    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay();

    // Alice claims staking rewards and puts them back in the system through the proxy
    await borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice });

    const ethBalanceAfter = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollAfter = await troveManager.getTroveColl(alice);
    const zusdBalanceAfter = await zusdToken.balanceOf(alice);
    const troveDebtAfter = await troveManager.getTroveDebt(alice);
    const zeroBalanceAfter = await zeroToken.balanceOf(alice);
    const ICRAfter = await troveManager.getCurrentICR(alice, price);
    const depositAfter = (await stabilityPool.deposits(alice))[0];
    const stakeAfter = await zeroStaking.stakes(alice);

    // check proxy balances remain the same
    assert.equal(ethBalanceAfter.toString(), ethBalanceBefore.toString());
    assert.equal(zeroBalanceAfter.toString(), zeroBalanceBefore.toString());
    // check proxy zusd balance has increased by own adjust trove reward
    th.assertIsApproximatelyEqual(zusdBalanceAfter, zusdBalanceBefore);
    // check trove has increased debt by the ICR proportional amount to ETH gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore, 10000);
    // check trove has increased collateral by the ETH gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore);
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore);
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.add(expectedZUSDGain_A), 10000);
    // check zero balance remains the same
    th.assertIsApproximatelyEqual(zeroBalanceBefore, zeroBalanceAfter);
    // check feeSharingCollector has increased ZUSD balance
    th.assertIsApproximatelyEqual(feeSharingCollectorZUSDBalanceAfter, feeSharingCollectorZUSDBalanceBefore.add(borrowingFeeToFeeSharingCollector), 10000);

    // Expect Alice has withdrawn all ETH gain
    const alice_pendingETHGain = await stabilityPool.getDepositorETHGain(alice);
    assert.equal(alice_pendingETHGain, 0);
  });

  it('claimStakingGainsAndRecycle(): with both ETH and ZUSD gains', async () => {
    const price = toBN(dec(200, 18));

    // Whale opens Trove
    await openTrove({ extraZUSDAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } });

    // alice opens trove and provides 150 ZUSD to StabilityPool
    await openTrove({ extraZUSDAmount: toBN(dec(150, 18)), extraParams: { from: alice } });
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice });

    // mint some ZERO
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18));
    await zeroTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18));

    // stake ZERO
    await zeroStaking.stake(dec(1850, 18), { from: whale });
    await zeroStaking.stake(dec(150, 18), { from: alice });

    const feeSharingCollectorZUSDBalanceBefore = await zusdToken.balanceOf(feeSharingCollector);

    // Defaulter Trove opened
    const { zusdAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } });
    const borrowingFee = netDebt.sub(zusdAmount);

    // 100% sent to feeSharingCollector address
    const borrowingFeeToFeeSharingCollector = borrowingFee.mul(toBN(dec(100, 16))).div(mv._1e18BN);
    const feeSharingCollectorZUSDBalanceAfter = await zusdToken.balanceOf(feeSharingCollector);
    const borrowingFeeToZeroStalking = borrowingFee.sub(borrowingFeeToFeeSharingCollector);

    // Alice ZUSD gain is ((150/2000) * borrowingFee)
    const expectedZUSDGain_A = borrowingFeeToZeroStalking.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)));

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider);

    // whale redeems 100 ZUSD
    const redeemedAmount = toBN(dec(100, 18));
    const feeSharingCollectorBalanceBefore = await wrbtcToken.balanceOf(feeSharingCollector);
    await th.redeemCollateral(whale, contracts, redeemedAmount);
    const feeSharingCollectorBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(feeSharingCollector));

    // Alice ETH gain is ((150/2000) * (redemption fee over redeemedAmount) / price)
    const redemptionFee = await troveManager.getRedemptionFeeWithDecay(redeemedAmount);
    // 100% sent to feeSharingCollector address
    const redemptionFeeToFeeSharingCollector = redemptionFee.mul(toBN(dec(100, 16))).div(mv._1e18BN);
    const expectedETHGainFeeSharingCollector = redemptionFeeToFeeSharingCollector.mul(mv._1e18BN).div(price);

    const redemptionFeeToZeroStalking = redemptionFee.sub(redemptionFeeToFeeSharingCollector);
    const expectedETHGain_A = redemptionFeeToZeroStalking.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18))).mul(mv._1e18BN).div(price);

    const ethBalanceBefore = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollBefore = await troveManager.getTroveColl(alice);
    const zusdBalanceBefore = await zusdToken.balanceOf(alice);
    const troveDebtBefore = await troveManager.getTroveDebt(alice);
    const zeroBalanceBefore = await zeroToken.balanceOf(alice);
    const ICRBefore = await troveManager.getCurrentICR(alice, price);
    const depositBefore = (await stabilityPool.deposits(alice))[0];
    const stakeBefore = await zeroStaking.stakes(alice);

    const proportionalZUSD = expectedETHGain_A.mul(price).div(ICRBefore);
    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay();
    const netDebtChange = proportionalZUSD.mul(toBN(dec(1, 18))).div(toBN(dec(1, 18)).add(borrowingRate));
    const expectedTotalZUSD = expectedZUSDGain_A.add(netDebtChange);

    const expectedZEROGain_A = toBN('0'); //toBN('787084753044000000000000')

    // Alice claims staking rewards and puts them back in the system through the proxy
    await borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice });

    // Alice new ZUSD gain due to her own Trove adjustment: ((150/2000) * (borrowing fee over netDebtChange))
    const newBorrowingFee = await troveManagerOriginal.getBorrowingFeeWithDecay(netDebtChange);
    // 100% sent to feeSharingCollector address
    const newBorrowingFeeToFeeSharingCollector = newBorrowingFee.mul(toBN(dec(100, 16))).div(mv._1e18BN);
    const newBorrowingFeeToZeroStalking = newBorrowingFee.sub(newBorrowingFeeToFeeSharingCollector);
    const expectedNewZUSDGain_A = newBorrowingFeeToZeroStalking.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)));

    const ethBalanceAfter = await web3.eth.getBalance(borrowerOperations.getProxyAddressFromUser(alice));
    const troveCollAfter = await troveManager.getTroveColl(alice);
    const zusdBalanceAfter = await zusdToken.balanceOf(alice);
    const troveDebtAfter = await troveManager.getTroveDebt(alice);
    const zeroBalanceAfter = await zeroToken.balanceOf(alice);
    const ICRAfter = await troveManager.getCurrentICR(alice, price);
    const depositAfter = (await stabilityPool.deposits(alice))[0];
    const stakeAfter = await zeroStaking.stakes(alice);

    // check proxy balances remain the same
    assert.equal(ethBalanceAfter.toString(), ethBalanceBefore.toString());
    assert.equal(zeroBalanceAfter.toString(), zeroBalanceBefore.toString());
    // check proxy zusd balance has increased by own adjust trove reward
    th.assertIsApproximatelyEqual(zusdBalanceAfter, zusdBalanceBefore.add(expectedNewZUSDGain_A));
    // check trove has increased debt by the ICR proportional amount to ETH gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore.add(proportionalZUSD), 10000);
    // check trove has increased collateral by the ETH gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore.add(expectedETHGain_A));
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore);
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.add(expectedTotalZUSD), 10000);
    // check zero balance remains the same
    th.assertIsApproximatelyEqual(zeroBalanceBefore, zeroBalanceAfter);

    // ZERO staking
    th.assertIsApproximatelyEqual(stakeAfter, stakeBefore.add(expectedZEROGain_A), 1e14);

    // check feeSharingCollector has increased ZUSD balance
    th.assertIsApproximatelyEqual(feeSharingCollectorZUSDBalanceAfter, feeSharingCollectorZUSDBalanceBefore.add(borrowingFeeToFeeSharingCollector), 10000);
    // check feeSharingCollector has increased ETH balance
    th.assertIsApproximatelyEqual(feeSharingCollectorBalanceAfter, feeSharingCollectorBalanceBefore.add(expectedETHGainFeeSharingCollector), 10000);

    // Expect Alice has withdrawn all ETH gain
    const alice_pendingETHGain = await stabilityPool.getDepositorETHGain(alice);
    assert.equal(alice_pendingETHGain, 0);
  });

});
