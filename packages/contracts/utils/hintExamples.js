
const { TestHelper: th } = require("../utils/testHelpers.js")
const dh = require("./deploymentHelpers.js")

// const [borrower, A, B, C] = (() => Array.from(Array(4), x => web3.eth.accounts.create().address))()

async function main() {
  const accounts = await web3.eth.getAccounts()
  const [borrower, A, B] = accounts

  const coreContracts = await dh.deployZeroCoreHardhat()
  const ARBITRARY_ADDRESS = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" 
  const ZEROContracts = await dh.deployZEROContractsHardhat(
      ARBITRARY_ADDRESS, 
      ARBITRARY_ADDRESS,
      ARBITRARY_ADDRESS
    )

 const { locManager, borrowerOperations, hintHelpers, sortedLoCs, priceFeedTestnet } = coreContracts

  await dh.connectCoreContracts(coreContracts, ZEROContracts)
  await dh.connectZEROContracts(ZEROContracts)
  await dh.connectZEROContractsToCore(ZEROContracts, coreContracts, borrower)

  // Examples of off-chain hint calculation for Open LoC

  const toWei = web3.utils.toWei
  const toBN = web3.utils.toBN

  const price = toBN(toWei('2500'))
  await priceFeedTestnet.setPrice(toBN(toWei('2500')))

  const ZUSDAmount = toBN(toWei('2500')) // borrower wants to withdraw 2500 ZUSD
  const BTCColl = toBN(toWei('5')) // borrower wants to lock 5 BTC collateral

  // Call deployed LoCManager contract to read the liquidation reserve and latest origination fee
  const liquidationReserve = await locManager.ZUSD_GAS_COMPENSATION()
  const expectedFee = await locManager.getOriginationFeeWithDecay(ZUSDAmount)
  
  // Total debt of the new loc = ZUSD amount drawn, plus fee, plus the liquidation reserve
  const expectedDebt = ZUSDAmount.add(expectedFee).add(liquidationReserve)

  // Get the nominal NICR of the new loc
  const _1e20 = toBN(toWei('100'))
  let NICR = BTCColl.mul(_1e20).div(expectedDebt)

  // Get an approximate address hint from the deployed HintHelper contract. Use (15 * number of locs) trials 
  // to get an approx. hint that is close to the right position.
  let numLoCs = await sortedLoCs.getSize()
  let numTrials = numLoCs.mul(toBN('15'))
  let { 0: approxHint } = await hintHelpers.getApproxHint(NICR, numTrials, 42)  // random seed of 42

  // Use the approximate hint to get the exact upper and lower hints from the deployed SortedLoCs contract
  let { 0: upperHint, 1: lowerHint } = await sortedLoCs.findInsertPosition(NICR, approxHint, approxHint)

  // Finally, call openLoC with the exact upperHint and lowerHint
  const maxFee = '5'.concat('0'.repeat(16)) // Slippage protection: 5%
  await borrowerOperations.openLoC(maxFee, ZUSDAmount, upperHint, lowerHint, { value: BTCColl })

  // --- adjust LoC --- 

  const collIncrease = toBN(toWei('1'))  // borrower wants to add 1 BTC
  const ZUSDRepayment = toBN(toWei('230')) // borrower wants to repay 230 ZUSD

  // Get LoC's current debt and coll
  const {0: debt, 1: coll} = await locManager.getEntireDebtAndColl(borrower)
  
  const newDebt = debt.sub(ZUSDRepayment)
  const newColl = coll.add(collIncrease)

  NICR = newColl.mul(_1e20).div(newDebt)

  // Get an approximate address hint from the deployed HintHelper contract. Use (15 * number of locs) trials 
  // to get an approx. hint that is close to the right position.
  numLoCs = await sortedLoCs.getSize()
  numTrials = numLoCs.mul(toBN('15'))
  ({0: approxHint} = await hintHelpers.getApproxHint(NICR, numTrials, 42))

  // Use the approximate hint to get the exact upper and lower hints from the deployed SortedLoCs contract
  ({ 0: upperHint, 1: lowerHint } = await sortedLoCs.findInsertPosition(NICR, approxHint, approxHint))

  // Call adjustLoC with the exact upperHint and lowerHint
  await borrowerOperations.adjustLoC(maxFee, 0, ZUSDRepayment, false, upperHint, lowerHint, {value: collIncrease})


  // --- RedeemCollateral ---

  // Get the redemptions hints from the deployed HintHelpers contract
  const redemptionhint = await hintHelpers.getRedemptionHints(ZUSDAmount, price, 50)

  const {0: firstRedemptionHint, 1: partialRedemptionNewICR, 2: truncatedZUSDAmount} = redemptionhint

  // Get the approximate partial redemption hint
  const {
    hintAddress: approxPartialRedemptionHint,
    latestRandomSeed
  } = await contracts.hintHelpers.getApproxHint(partialRedemptionNewICR, numTrials, 42)
  
  /* Use the approximate partial redemption hint to get the exact partial redemption hint from the 
  * deployed SortedLoCs contract
  */
  const exactPartialRedemptionHint = (await sortedLoCs.findInsertPosition(partialRedemptionNewICR,
    approxPartialRedemptionHint,
    approxPartialRedemptionHint))

  /* Finally, perform the on-chain redemption, passing the truncated ZUSD amount, the correct hints, and the expected
  * ICR of the final partially redeemed LoC in the sequence. 
  */
  await locManager.redeemCollateral(truncatedZUSDAmount,
    firstRedemptionHint,
    exactPartialRedemptionHint[0],
    exactPartialRedemptionHint[1],
    partialRedemptionNewICR,
    0, maxFee,
    { from: redeemer },
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

