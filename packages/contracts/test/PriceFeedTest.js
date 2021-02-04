
const PriceFeed = artifacts.require("./PriceFeedTester.sol")
const PriceFeedTestnet = artifacts.require("./PriceFeedTestnet.sol")
const MockChainlink = artifacts.require("./MockAggregator.sol")
const MockTellor = artifacts.require("./MockTellor.sol")
const TellorCaller = artifacts.require("./TellorCaller.sol")

const testHelpers = require("../utils/testHelpers.js")
const th = testHelpers.TestHelper

const { dec, assertRevert, toBN } = th

contract('PriceFeed', async accounts => {

  const [owner, alice] = accounts;
  let priceFeedTestnet
  let priceFeed
  let zeroAddressPriceFeed
  let mockChainlink

  const setAddresses = async () => {
    await priceFeed.setAddresses(mockChainlink.address, tellorCaller.address, { from: owner })
  }

  beforeEach(async () => {
    priceFeedTestnet = await PriceFeedTestnet.new()
    PriceFeedTestnet.setAsDeployed(priceFeedTestnet)

    priceFeed = await PriceFeed.new()
    PriceFeed.setAsDeployed(priceFeed)

    zeroAddressPriceFeed = await PriceFeed.new()
    PriceFeed.setAsDeployed(zeroAddressPriceFeed)

    mockChainlink = await MockChainlink.new()
    MockChainlink.setAsDeployed(mockChainlink)

    mockTellor = await MockTellor.new()
    MockTellor.setAsDeployed(mockTellor)

    tellorCaller = await TellorCaller.new(mockTellor.address)
    TellorCaller.setAsDeployed(tellorCaller)

    // Set Chainlink latest and prev round Id's to non-zero
    await mockChainlink.setLatestRoundId(3)
    await mockChainlink.setPrevRoundId(2)

    //Set current and prev prices in both oracles
    await mockChainlink.setPrice(dec(100, 18))
    await mockChainlink.setPrevPrice(dec(100, 18))
    await mockTellor.setPrice(dec(100, 18))

    // Set mock price updateTimes in both oracles to very recent
    const now = await th.getLatestBlockTimestamp(web3)
    await mockChainlink.setUpdateTime(now)
    await mockTellor.setUpdateTime(now)
  })

  describe('PriceFeed internal testing contract', async accounts => {
    it("fetchPrice before setPrice should return the default price", async () => {
      const price = await priceFeedTestnet.getPrice()
      assert.equal(price, dec(200, 18))
    })
    it("should be able to fetchPrice after setPrice, output of former matching input of latter", async () => {
      await priceFeedTestnet.setPrice(dec(100, 18))
      const price = await priceFeedTestnet.getPrice()
      assert.equal(price, dec(100, 18))
    })
  })

  describe('Mainnet PriceFeed setup', async accounts => {
    it("fetchPrice should fail on contract with no chainlink address set", async () => {
      try {
        const price = await zeroAddressPriceFeed.fetchPrice()
        assert.isFalse(price.receipt.status)
      } catch (err) {
        assert.include(err.message, "function call to a non-contract account")
      }
    })

    it("fetchPrice should fail on contract with no tellor address set", async () => {
      try {
        const price = await zeroAddressPriceFeed.fetchPrice()
        assert.isFalse(price.receipt.status)
      } catch (err) {
        assert.include(err.message, "function call to a non-contract account")
      }
    })

    it("setAddresses should fail whe called by nonOwner", async () => {
      await assertRevert(
        priceFeed.setAddresses(mockChainlink.address, mockTellor.address, { from: alice }),
        "Ownable: caller is not the owner"
      )
    })

    it("setAddresses should fail after address has already been set", async () => {
      // Owner can successfully set any address
      const txOwner = await priceFeed.setAddresses(mockChainlink.address, mockTellor.address, { from: owner })
      assert.isTrue(txOwner.receipt.status)

      await assertRevert(
        priceFeed.setAddresses(mockChainlink.address, mockTellor.address, { from: owner }),
        "Ownable: caller is not the owner"
      )

      await assertRevert(
        priceFeed.setAddresses(mockChainlink.address, mockTellor.address, { from: alice }),
        "Ownable: caller is not the owner"
      )
    })
  })

  // it("Chainlink working: fetchPrice should return the correct price, taking into account the number of decimal digits on the aggregator", async () => {
  //   await setAddresses()

  //   // Oracle price price is 10.00000000
  //   await mockChainlink.setDecimals(8)
  //   await mockChainlink.setPrevPrice(dec(1, 9))
  //   await mockChainlink.setPrice(dec(1, 9))
  //   await priceFeed.fetchPrice()
  //   let price = await priceFeed.lastGoodPrice()
  //   // Check Liquity PriceFeed gives 10, with 18 digit precision
  //   assert.equal(price, dec(10, 18))

  //   Oracle price is 1e9
  //   await mockChainlink.setDecimals(0)
  //   await mockChainlink.setPrevPrice(dec(1, 9))
  //   await mockChainlink.setPrice(dec(1, 9))
  //   await priceFeed.fetchPrice()
  //   price = await priceFeed.lastGoodPrice()
  //   Check Liquity PriceFeed gives 1e9, with 18 digit precision
  //   console.log(`price: ${price}`)
  //   console.log(`1e27: ${toBN(dec(1, 27))}`)
  //   assert.isTrue(price.eq(toBN(dec(1, 27))))

  //   // Oracle price is 0.0001
  //   await mockChainlink.setDecimals(18)
  //   const decimals = await mockChainlink.decimals()
  //   console.log(`decimals after setting: ${decimals}`)
  //   await mockChainlink.setPrevPrice(dec(1, 14))
  //   await mockChainlink.setPrice(dec(1, 14))
  //   await priceFeed.fetchPrice()
  //   price = await priceFeed.lastGoodPrice()
  //   // Check Liquity PriceFeed gives 0.0001 with 18 digit precision
  //   console.log(`price: ${price}`)
  //   console.log(`dec(1, 14): ${dec(1, 14)}`)
  //   assert.isTrue(price.eq(toBN(dec(1, 14))))

  //   // Oracle price is 1234.56789
  //   await mockChainlink.setDecimals(5)
  //   await mockChainlink.setPrevPrice(dec(123456789))
  //   await mockChainlink.setPrice(dec(123456789))
  //   await priceFeed.fetchPrice()
  //   price = await priceFeed.lastGoodPrice()
  //   // Check Liquity PriceFeed gives 0.0001 with 18 digit precision
  //   assert.equal(price, '1234567890000000000000')
  // })

  // --- Chainlink breaks ---
  it("Chainlink breaks, Tellor working: fetchPrice should return the correct Tellor price, taking into account Tellor's 6-digit granularity", async () => {
    await setAddresses()
    // --- Chainlink fails, system switches to Tellor ---
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 1: using chainlink

    // Chainlink breaks with negative price
    await mockChainlink.setPrevPrice(dec(1, 8))
    await mockChainlink.setPrice("-5000")

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setUpdateTime(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 2: using tellor

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))

    // Tellor price is 10 at 6-digit precision
    await mockTellor.setPrice(dec(10, 6))
    await priceFeed.fetchPrice()
    price = await priceFeed.lastGoodPrice()
    // Check Liquity PriceFeed gives 10, with 18 digit precision
    console.log(`${price}`)
    console.log(dec(10, 18))
    assert.equal(price, dec(10, 18))

    // Tellor price is 1e9 at 6-digit precision
    await mockTellor.setPrice(dec(1, 15))
    await priceFeed.fetchPrice()
    price = await priceFeed.lastGoodPrice()
    // Check Liquity PriceFeed gives 1e9, with 18 digit precision
    assert.equal(price, dec(1, 27))

    // Tellor price is 0.0001 at 6-digit precision
    await mockTellor.setPrice(100)
    await priceFeed.fetchPrice()
    price = await priceFeed.lastGoodPrice()
    // Check Liquity PriceFeed gives 0.0001 with 18 digit precision

    assert.equal(price, dec(1, 14))

    // Tellor price is 1234.56789 at 6-digit precision
    await mockTellor.setPrice(dec(1234567890))
    await priceFeed.fetchPrice()
    price = await priceFeed.lastGoodPrice()
    // Check Liquity PriceFeed gives 0.0001 with 18 digit precision
    assert.equal(price, '1234567890000000000000')
  })

  it("Chainlink broken by zero latest roundId, Tellor working: PriceFeed should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setLatestRoundId(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor
  })

  it("Chainlink broken by zero latest roundId, Tellor working: PriceFeed should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setLatestRoundId(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor
  })

  it("Chainlink broken by zero timestamp, Tellor working: PriceFeed should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setUpdateTime(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor
  })

  it("Chainlink broken by zero timestamp, Tellor working: PriceFeed should use the Tellor price", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setUpdateTime(0)

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  it("Chainlink broken by future timestamp, Tellor working: fetchPrice should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    const now = await th.getLatestBlockTimestamp(web3)
    const future = toBN(now).add(toBN('1000'))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setUpdateTime(future)

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor
  })

  it("Chainlink broken by future timestamp, Tellor working: fetchPrice should use the Tellor price", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    const now = await th.getLatestBlockTimestamp(web3)
    const future = toBN(now).add(toBN('1000'))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setUpdateTime(future)

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  it("Chainlink broken by negative price, Tellor working: fetchPrice should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrice("-5000")

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor 
  })

  it("Chainlink broken by negative price, Tellor working: fetchPrice should return the correct price from Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrice("-5000")

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })


  it("Chainlink broken - decimals call reverted, Tellor working: fetchPrice should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setDecimalsRevert()

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor 
  })

  it("Chainlink broken - decimals call reverted, Tellor working: fetchPrice should return the correct price from Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setDecimalsRevert()

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  it("Chainlink broken - latest round call reverted, Tellor working: fetchPrice should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setLatestRevert()

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor 
  })

  it("Chainlink broken - latest round call reverted, Tellor working: fetchPrice should return the correct price from Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setLatestRevert()

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  it("Chainlink broken - previous round call reverted, Tellor working: fetchPrice should switch to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrevRevert()

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor 
  })

  it("Chainlink broken - previous round call reverted, Tellor working: fetchPrice should return the correct price from Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrevRevert()

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  // --- Chainlink timeout --- 

  it("Chainlink times out, Tellor working: fetchPrice should switch to usingTellorChainlinkFrozen", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await th.fastForwardTime(10800, web3.currentProvider) // fast forward 3 hours
    const now = await th.getLatestBlockTimestamp(web3)

    // Tellor price is recent
    await mockTellor.setUpdateTime(now)
    await mockTellor.setPrice(dec(123, 6))

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '3') // status 3: using tellor, chainlink frozen 
  })

  it("Chainlink frozen, Tellor working: fetchPrice should return the correct price from Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    // Tellor price is recent
    await mockTellor.setUpdateTime(now)
    await mockTellor.setPrice(dec(123, 6))

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  it("Chainlink frozen, Tellor frozen: fetchPrice should switch to usingTellorChainlinkFrozen", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(10800, web3.currentProvider) // fast forward 3 hours

    // check Tellor price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '3') // status 3: using tellor, chainlink frozen 
  })

  it("Chainlink frozen, Tellor frozen: fetchPrice should return the last good price", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Tellor price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()
    console.log(`price: ${price}`)
    // Expect lastGoodPrice has not updated
    assert.equal(price, dec(999, 18))
  })

  it("Chainlink times out, Tellor broken by 0 price: fetchPrice should switch to tellorBrokenChainlinkFrozen", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // Tellor breaks by 0 price
    await mockTellor.setPrice(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '4') // status 4: tellor broken, chainlink frozen
  })

  it("Chainlink times out, Tellor broken by 0 price: fetchPrice should return the last good price", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await priceFeed.setLastGoodPrice(dec(999, 18))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    await mockTellor.setPrice(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()

    // Expect lastGoodPrice has not updated
    assert.equal(price, dec(999, 18))
  })

  it("Chainlink is out of date by <3hrs: don't switch to Tellor, keep using Chainlink", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(1234, 8))
    await mockChainlink.setPrice(dec(1234, 8))
    await th.fastForwardTime(10740, web3.currentProvider) // fast forward 2hrs 59 minutes 

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '0') // status 0: using chainlink
  })

  it("Chainlink is out of date by <3hrs: don't switch to Tellor, get correct price from Chainklink", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    const decimals = await mockChainlink.decimals()

    await mockChainlink.setPrevPrice(dec(1234, 8))
    await mockChainlink.setPrice(dec(1234, 8))
    await th.fastForwardTime(10740, web3.currentProvider) // fast forward 2hrs 59 minutes 

    const priceFetchTx = await priceFeed.fetchPrice()
    const price = await priceFeed.lastGoodPrice()
    console.log(`${price}`)
    assert.equal(price, dec(1234, 18))
  })

  // --- Chainlink price deviation ---

  it("Chainlink price drop of >50% causes PriceFeed to switch to Tellor", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor 
  })

  it("Chainlink price drop of >50%, return the Tellor price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203,4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(203, 16))
  })

  it("Chainlink price drop of 50%: Pricefeed continues using chainlink", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(dec(1, 8))  // price drops to 1

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '0') // status 0: still using chainlink 
  })

  it("Chainlink price drop of 50%: return the latest Chainlink price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(dec(1, 8))  // price drops to 1

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(1, 18))
  })

  it("Chainlink price drop of <50%: Pricefeed continues using chainlink", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(dec(100000001))   // price drops to 1.00000001:  a drop of < 50% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '0') // status 0: still using chainlink 
  })

  it("Chainlink price drop of <50%: return the latest Chainlink price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(100000001)   // price drops to 1.00000001:  a drop of < 50% from previous

    const priceFetchTx = await priceFeed.fetchPrice()

    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(100000001, 10))
  })

  // Price increase 
  it("Chainlink price increase of >100%: PriceFeed switches to Tellor", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(400000001)  // price increases to 4.000000001: an increase of > 100% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor 
  })

  it("Chainlink price increase of >100%: returns Tellor price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(400000001)  // price increases to 4.000000001: an increase of > 100% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(203, 16))
  })

  it("Chainlink price increase of 100%: Pricefeed continues using chainlink", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(dec(4, 8))  // price increases to 4: an increase of 100% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '0') // status 0: using chainlink
  })

  it("Chainlink price increase of 100%: Pricefeed returns Chainlink price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(dec(4, 8))  // price increases to 4: an increase of 100% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(4, 18))
  })

  it("Chainlink price increase of <100%: Pricefeed continues using Chainlink", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(399999999)  // price increases to 3.99999999: an increase of < 100% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '0') // status 0: using chainlink
  })

  it("Chainlink price increase of <100%: Pricefeed returns Chainlink price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(203, 4))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(399999999)  // price increases to 3.99999999: an increase of < 100% from previous

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(399999999, 10))
  })

  it("Chainlink price drop of >50% and Tellor price matches: continue using Chainlink", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous
    await mockTellor.setPrice(999999) // Tellor price drops to same value (6 ecimals)

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '0') // status 0: using chainlink 
  })

  it("Chainlink price drop of >50% and Tellor price matches: return Chainlink price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous
    await mockTellor.setPrice(999999) // Tellor price drops to same value (at 6 decimals)

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()
    console.log(`price: ${price}`)
    console.log(`dec(99999999, 10): ${dec(99999999, 10)}`)
    assert.equal(price, dec(99999999, 10))
  })

  it("Chainlink price drop of >50% and Tellor price within 3% of Chainlink: continue using Chainlink", async () => { 
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18))
   
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(10, 8))  // price = 10
    await mockChainlink.setPrice(dec(4, 8))  // price drops to 4: a drop of > 50% from previous
    await mockTellor.setPrice(3890000) // Tellor price drops to 3.89: price difference with new Chainlink price is now just under 3%

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '0') // status 0: using chainlink 
  })

  it("Chainlink price drop of >50% and Tellor price within 3% of Chainlink: return Chainlink price", async () => { 
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18))

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink
    
    await mockChainlink.setPrevPrice(dec(10, 8))  // price = 10
    await mockChainlink.setPrice(dec(4, 8))  // price drops to 4: a drop of > 50% from previous
    await mockTellor.setPrice(3890000) // Tellor price drops to 3.89: price difference  with new Chainlink price is now just under 3%

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(4, 18))
  })

  
  it("Chainlink price drop of >50% and Tellor live but not within 3% of Chainlink: switch to using Tellor", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous
    await mockTellor.setPrice(3880000) // Tellor price 3.88: price difference with new Chainlink price is now > 3%

    const priceFetchTx = await priceFeed.fetchPrice()
    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 0: using tellor 
  })

  it("Chainlink price drop of >50% and Tellor live but not within 3% of Chainlink: return the Tellor price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(2, 18)) 

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous
    await mockTellor.setPrice(3880000) // Tellor price 3.88: price difference with new Chainlink price is now > 3%

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()

    assert.equal(price, dec(388, 16)) // return Tellor price
  })

  it("Chainlink price drop of >50% and Tellor frozen: Pricefeed switches to Tellor", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous
    await mockTellor.setPrice(3880000) // Tellor price 3.88: price difference with new Chainlink price is now > 3%

    // 3 hours pass with no Tellor updates
    await th.fastForwardTime(10800, web3.currentProvider)

     // check Tellor price timestamp is out of date by > 3 hours
     const now = await th.getLatestBlockTimestamp(web3)
     const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
     assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

     await mockChainlink.setUpdateTime(now)

    const priceFetchTx = await priceFeed.fetchPrice()

    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '1') // status 1: using tellor
  })

  it("Chainlink price drop of >50% and Tellor frozen: return the last good price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(1200, 18)) // establish a "last good price" from the previous price fetch

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(1300, 6))
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    // 3 hours pass with no Tellor updates
    await th.fastForwardTime(10800, web3.currentProvider)

     // check Tellor price timestamp is out of date by > 3 hours
     const now = await th.getLatestBlockTimestamp(web3)
     const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
     assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

     await mockChainlink.setUpdateTime(now)

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()

    // Check that the returned price is the last good price
    assert.equal(price, dec(1200, 18))
  })

  // --- Chainlink fails and Tellor is broken ---

  it("Chainlink price drop of >50% and Tellor is broken by 0 price: Pricefeed switches to 'bothOracleSuspect'", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    // Make mock Tellor return 0 price
    await mockTellor.setPrice(0)

    const priceFetchTx = await priceFeed.fetchPrice()

    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '2') // status 2: both oracles suspect
  })

  it("Chainlink price drop of >50% and Tellor is broken by 0 price: fetchPrice get the last good price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(1200, 18)) // establish a "last good price" from the previous price fetch

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(1300, 6))

    // Make mock Chainlink price deviate too much
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    // Make mock Tellor return 0 price
    await mockTellor.setPrice(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()

    // Check that the returned price is in fact the previous price
    assert.equal(price, dec(1200, 18))
  })

  it("Chainlink price drop of >50% and Tellor is broken by 0 timestamp: Pricefeed switches to 'bothOracleSuspect'", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    // Make mock Chainlink price deviate too much
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    // Make mock Tellor return 0 timestamp
    await mockTellor.setUpdateTime(0)
    const priceFetchTx = await priceFeed.fetchPrice()

    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '2') // status 2: both oracles suspect
  })

  it("Chainlink price drop of >50% and  Tellor is broken by 0 timestamp: fetchPrice get the last good price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(1200, 18)) // establish a "last good price" from the previous price fetch

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(1300, 6))

    // Make mock Chainlink price deviate too much
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    // Make mock Tellor return 0 timestamp
    await mockTellor.setUpdateTime(0)

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()

    // Check that the returned price is in fact the previous price
    assert.equal(price, dec(1200, 18))
  })

  it("Chainlink price drop of >50% and Tellor is broken by future timestamp: Pricefeed switches to 'bothOracleSuspect'", async () => {
    await setAddresses()
    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    // Make mock Chainlink price deviate too much
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    // Make mock Tellor return 0 timestamp
    await mockTellor.setUpdateTime(0)

    const priceFetchTx = await priceFeed.fetchPrice()

    const statusAfter = await priceFeed.status()
    assert.equal(statusAfter, '2') // status 2: both oracles suspect
  })

  it("Chainlink price drop of >50% and Tellor is broken by future timestamp: fetchPrice get the last good price", async () => {
    await setAddresses()
    priceFeed.setLastGoodPrice(dec(1200, 18)) // establish a "last good price" from the previous price fetch

    const statusBefore = await priceFeed.status()
    assert.equal(statusBefore, '0') // status 0: using chainlink

    await mockTellor.setPrice(dec(1300, 6))

    // Make mock Chainlink price deviate too much
    await mockChainlink.setPrevPrice(dec(2, 8))  // price = 2
    await mockChainlink.setPrice(99999999)  // price drops to 0.99999999: a drop of > 50% from previous

    // Make mock Tellor return a future timestamp
    const now = await th.getLatestBlockTimestamp(web3)
    const future = toBN(now).add(toBN("10000"))
    await mockTellor.setUpdateTime(future)

    const priceFetchTx = await priceFeed.fetchPrice()
    let price = await priceFeed.lastGoodPrice()

    // Check that the returned price is in fact the previous price
    assert.equal(price, dec(1200, 18))
  })

  // --- Case 2: Using Tellor ---

  // Using Tellor, Tellor breaks
  it("Using Telor, Tellor breaks by zero price: set bothOraclesSuspect", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await priceFeed.setLastGoodPrice(dec(123, 18))

    const now = await th.getLatestBlockTimestamp(web3)
    await mockTellor.setUpdateTime(now)
    await mockTellor.setPrice(0)

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 2)  // status 2: both oracles suspect
  })

  it("Using Tellor, Tellor breaks by zero price: uses last good price", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await priceFeed.setLastGoodPrice(dec(123, 18))

    const now = await th.getLatestBlockTimestamp(web3)
    await mockTellor.setUpdateTime(now)
    await mockTellor.setPrice(0)

    await priceFeed.fetchPrice()
    const price = await priceFeed.lastGoodPrice()

    assert.equal(price, dec(123, 18))
  })

  // Using Tellor, Tellor freezes
  it("Using Tellor, Tellor freezes - remain using Tellor", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await priceFeed.setLastGoodPrice(dec(246, 18))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Tellor price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await mockChainlink.setUpdateTime(now)

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 1)  // status 1: using Tellor
  })

  it("Using Tellor, Tellor freezes - use last good price", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await priceFeed.setLastGoodPrice(dec(246, 18))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Tellor price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await mockChainlink.setUpdateTime(now)

    await priceFeed.fetchPrice()
    const price = await priceFeed.lastGoodPrice()

    assert.equal(price, dec(246, 18))
  })

  // Using Tellor, both Chainlink & Tellor go live

  it("Using Tellor, both Tellor and Chainlink are working - switch back to using Chainlink", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrice(dec(124, 8))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 0)  // status 0: using Chainlink
  })


  it("Using Tellor, both Tellor and Chainlink are working - use Chainlink price", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrice(dec(124, 8))

    await priceFeed.fetchPrice()
    const price = await priceFeed.lastGoodPrice()

    assert.equal(price, dec(124, 18))
  })


  it("Using Tellor, only Tellor is live: system remains using Tellor", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 1)  // status 1: using Tellor
  })

  it("Using Tellor, only Tellor is live: use Tellor price", async () => {
    await setAddresses()
    priceFeed.setStatus(1) // status 1: using Tellor

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()
    const price = await priceFeed.lastGoodPrice()

    assert.equal(price, dec(123, 18))
  })

  // --- Case 3: Both Oracles suspect

  it("bothOraclesSuspect - when oracles aren't in-sync, stay on bothOraclesSuspect", async () => {
    await setAddresses()
    priceFeed.setStatus(2) // status 2: both oracles suspect

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    const status = await priceFeed.status()
    assert.equal(status, 2)  // status 2: both oracles suspect
  })

  it("bothOraclesSuspect - when oracles aren't in-sync, return last good price", async () => {
    await setAddresses()
    priceFeed.setStatus(2) // status 2: both oracles suspect

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()
    const price = await priceFeed.lastGoodPrice()

    console.log(`price: ${price}`)
    assert.equal(price, dec(50, 18))
  })

  it("bothOraclesSuspect - when oracles are live and in-sync, switch back to Chainlink", async () => {
    await setAddresses()
    priceFeed.setStatus(2) // status 2: both oracles suspect

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrice(dec(124, 8))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 0)  // status 0: using Chainlink
  })

  it("bothOraclesSuspect - when oracles are live and in-sync, switch back to Chainlink", async () => {
    await setAddresses()
    priceFeed.setStatus(2) // status 2: both oracles suspect

    await mockTellor.setPrice(dec(123, 6))
    await mockChainlink.setPrice(dec(124, 8))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(124, 18))
  })

  // --- Case 4 ---
  it("usingTellorChainlinkFrozen - when both Chainlink and Tellor break, switch to bothOraclesSuspect", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: usng tellor, chainlink frozen

    await mockChainlink.setPrevPrice(dec(999, 8))

    // Both Chainlink and Tellor break with 0 price
    await mockChainlink.setPrice(0)
    await mockTellor.setPrice(0)

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 2)  // status 2: both oracles suspect
  })

  it("usingTellorChainlinkFrozen - when both Chainlink and Tellor break, return the last good price", async () => { 
    await setAddresses()
    priceFeed.setStatus(2) // status 2: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))

    // Both Chainlink and Tellor break with 0 price
    await mockChainlink.setPrice(dec(0))
    await mockTellor.setPrice(dec(0))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(50, 18))
  })

  it("usingTellorChainlinkFrozen - when Chainlink breaks and Tellor freezes, switch to Tellor", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))

    // Chainlink breaks
    await mockChainlink.setPrice(dec(0))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Tellor price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 1)  // status 1: using tellor
  })

  it("usingTellorChainlinkFrozen - when Chainlink breaks and Tellor freezes and use last good price for now", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))

    // Chainlink breaks
    await mockChainlink.setPrice(dec(0))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Tellor price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(50, 18))
  })

  it("usingTellorChainlinkFrozen - when Chainlink breaks and Tellor live, switch to Tellor", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))

    // Chainlink breaks
    await mockChainlink.setPrice(dec(0))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 1)  // status 1: using tellor
  })

  it("usingTellorChainlinkFrozen - when Chainlink breaks and Tellor live and use Tellor's current price", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))

    // Chainlink breaks
    await mockChainlink.setPrice(dec(0))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  it("usingTellorChainlinkFrozen - when Chainlink is live, switch back to it", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 0)  // status 0: using chainlink
  })

  it("usingTellorChainlinkFrozen - when Chainlink is live, use Chainlink current price", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(999, 18))
  })

  it("usingTellorChainlinkFrozen - when Chainlink still frozen and Tellor broken, switch to tellorFrozenChainlinkBroken", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

    // set tellor broken
    await mockTellor.setPrice(0)

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 4)  // status 4: chainlink frozen, tellor broken
  })

  it("usingTellorChainlinkFrozen - when Chainlink still frozen and Tellor broken, use the last good price", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

    // set tellor broken
    await mockTellor.setPrice(0)

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(50, 18))
  })

  it("usingTellorChainlinkFrozen - when Chainlink still frozen and Tellor live, stay on usingTellorChainlinkFrozen", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

    // set Tellor to current time
    await mockTellor.setUpdateTime(now)

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 3)  // status 3: using tellor, chainlink frozn
  })

  it("usingTellorChainlinkFrozen - when Chainlink still frozen and Tellor live, use the current Tellor price", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

    // set Tellor to current time
    await mockTellor.setUpdateTime(now)

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(123, 18))
  })

  it("usingTellorChainlinkFrozen - when Chainlink still frozen and Tellor freezes, stay on usingTellorChainlinkFrozen", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

     // check Tellor price timestamp is out of date by > 3 hours
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 3)  // status 3: using tellor, chainlink frozn
  })

  it("usingTellorChainlinkFrozen - when Chainlink still frozen and Tellor freezes, use the last good price", async () => { 
    await setAddresses()
    priceFeed.setStatus(3) // status 3: using tellor, chainlink frozen

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

     // check Tellor price timestamp is out of date by > 3 hours
    const tellorUpdateTime = await mockTellor.getTimestampbyRequestIDandIndex(0, 0)
    assert.isTrue(tellorUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(50, 18))
  })

  // --- Case 5 ---
  it("tellorBrokenChainlinkFrozen - when Chainlink is live, switch back to Chainlink", async () => {
    await setAddresses()
    priceFeed.setStatus(4) // status 4: chainlink broken, tellor frozen

    await priceFeed.setLastGoodPrice(dec(246, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 0)  // status 0: using Chainlink
  })

  it("tellorBrokenChainlinkFrozen - when Chainlink is live, use Chainlink price", async () => {
    await setAddresses()
    priceFeed.setStatus(4) // status 4: chainlink broken, tellor frozen

    await priceFeed.setLastGoodPrice(dec(246, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(999, 18))
  })

  it("tellorBrokenChainlinkFrozen - when Chainlink breaks too, switch to bothOraclesSuspect", async () => {
    await setAddresses()
    priceFeed.setStatus(4) // status 4: chainlink broken, tellor frozen

    await priceFeed.setLastGoodPrice(dec(246, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await mockChainlink.setUpdateTime(0)  // Chainlink breaks by 0 timestamp

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 2)  // status 2: bothOraclesSuspect
  })

  it("tellorBrokenChainlinkFrozen - when Chainlink breaks too, use lastGoodPrice", async () => {
    await setAddresses()
    priceFeed.setStatus(4) // status 4: chainlink broken, tellor frozen

    await priceFeed.setLastGoodPrice(dec(246, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await mockChainlink.setUpdateTime(0)  // Chainlink breaks by 0 timestamp

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(246, 18))
  })

  // --- Case 6 - using Chainlink, Tellor broken ---

  it("usingChainlinkTellorBroken - when Chainlink breaks too, switch to bothOraclesSuspect", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await mockChainlink.setUpdateTime(0)  // Chainlink breaks by 0 timestamp

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 2)  // status 2: bothOraclesSuspect
  })

  it("usingChainlinkTellorBroken - when Chainlink breaks too, use last good price", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))
    await mockChainlink.setUpdateTime(0)  // Chainlink breaks by 0 timestamp

    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(50, 18))
  })

  it("usingChainlinkTellorBroken - when Chainlink freezes, there is no status change", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await mockTellor.setUpdateTime(now)

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 5)  // status 5: using chainlink, tellor is broken
  })

  it("usingChainlinkTellorBroken - when Chainlink freezes, use the last good price", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(999, 8))

    await mockTellor.setPrice(dec(123, 6))

    await th.fastForwardTime(11800, web3.currentProvider) // Fast forward 3 hours

    // check Chainlink price timestamp is out of date by > 3 hours
    const now = await th.getLatestBlockTimestamp(web3)
    const chainlinkUpdateTime = (await mockChainlink.latestRoundData())[3] 
    assert.isTrue(chainlinkUpdateTime.lt(toBN(now).sub(toBN(10800))))

    await mockTellor.setUpdateTime(now)

    await priceFeed.fetchPrice()

    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(50, 18))
  })

  it("usingChainlinkTellorBroken - when Chainlink and Tellor are live and similar price, switch to using Chainlink", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(124, 8))
    await mockTellor.setPrice(dec(123, 6))

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 0)  // status 0: using Chainlink
  })

  it("usingChainlinkTellorBroken - when Chainlink and Tellor are live and similar price, use Chainlink price", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(124, 8))
    await mockTellor.setPrice(dec(123, 6))
    
    await priceFeed.fetchPrice()

    // Uses latest Chainlink price
    const price = await priceFeed.lastGoodPrice()
    assert.equal(price, dec(124, 18))
  })

  it("usingChainlinkTellorBroken - when Chainlink and Tellor are live but dissimilar price, no status change", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(124, 8))
    await mockTellor.setPrice(dec(8765, 6)) // relative difference between Chainlink and Tellor price is >3%

    await priceFeed.fetchPrice()

    const status = await priceFeed.status()
    assert.equal(status, 5) 
  })

  it("usingChainlinkTellorBroken - when Chainlink and Tellor are live but dissimilar price, use Chainlink price", async () => { 
    await setAddresses()
    priceFeed.setStatus(5) // status 5: using Chainlink, Tellor is broken

    await priceFeed.setLastGoodPrice(dec(50, 18))

    await mockChainlink.setPrevPrice(dec(999, 8))
    await mockChainlink.setPrice(dec(124, 8))
    await mockTellor.setPrice(dec(8765, 6))  // relative difference between Chainlink and Tellor price is >3%
    
    await priceFeed.fetchPrice()

      // Uses latest Chainlink price
      const price = await priceFeed.lastGoodPrice()
      assert.equal(price, dec(124, 18))
  })
})

