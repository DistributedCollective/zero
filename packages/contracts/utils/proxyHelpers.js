const { TestHelper: th } = require("../utils/testHelpers.js")

const DSProxyFactory = artifacts.require('DSProxyFactory')
const DSProxy = artifacts.require('DSProxy')

const buildUserProxies = async (users) => {
  const proxies = {}
  const proxyFactory = await DSProxyFactory.new()
  for(let user of users) {
    const proxyTx = await proxyFactory.build({ from: user })
    proxies[user] = await DSProxy.at(proxyTx.logs[0].args.proxy)
  }

  return proxies
}

class Proxy {
  constructor (owner, proxies, scriptAddress, contract) {
    this.owner = owner
    this.proxies = proxies
    this.scriptAddress = scriptAddress
    this.contract = contract
    if (contract) this.address = contract.address
  }

  getFrom(params) {
    if (params.length == 0) return this.owner
    let lastParam = params[params.length - 1]
    if (lastParam.from) {
      return lastParam.from
    }

    return this.owner
  }

  getOptionalParams(params) {
    if (params.length == 0) return {}

    return params[params.length - 1]
  }

  getProxyAddressFromUser(user) {
    return this.proxies[user] ? this.proxies[user].address : user
  }

  getProxyFromUser(user) {
    return this.proxies[user]
  }

  getProxyFromParams(params) {
    const user = this.getFrom(params)
    return this.proxies[user]
  }

  getSlicedParams(params) {
    if (params.length == 0) return params
    let lastParam = params[params.length - 1]
    if (lastParam.from || lastParam.value) {
      return params.slice(0, -1)
    }

    return params
  }

  async forwardFunction(params, signature) {
    const proxy = this.getProxyFromParams(params)
    if (!proxy) {
      return this.proxyFunction(signature.slice(0, signature.indexOf('(')), params)
    }
    const optionalParams = this.getOptionalParams(params)
    const calldata = th.getTransactionData(signature, this.getSlicedParams(params))
    // console.log('proxy: ', proxy.address)
    // console.log(this.scriptAddress, calldata, optionalParams)
    return proxy.methods["execute(address,bytes)"](this.scriptAddress, calldata, optionalParams)
  }

  async proxyFunctionWithUser(functionName, user) {
    return this.contract[functionName](this.getProxyAddressFromUser(user))
  }

  async proxyFunction(functionName, params) {
    // console.log('contract: ', this.contract.address)
    // console.log('functionName: ', functionName)
    // console.log('params: ', params)
    return this.contract[functionName](...params)
  }
}

class BorrowerOperationsProxy extends Proxy {
  constructor(owner, proxies, borrowerOperationsScriptAddress, borrowerOperations) {
    super(owner, proxies, borrowerOperationsScriptAddress, borrowerOperations)
  }

  async openLoC(...params) {
    return this.forwardFunction(params, 'openLoC(uint256,uint256,address,address)')
  }

  async addColl(...params) {
    return this.forwardFunction(params, 'addColl(address,address)')
  }

  async withdrawColl(...params) {
    return this.forwardFunction(params, 'withdrawColl(uint256,address,address)')
  }

  async withdrawZUSD(...params) {
    return this.forwardFunction(params, 'withdrawZUSD(uint256,uint256,address,address)')
  }

  async repayZUSD(...params) {
    return this.forwardFunction(params, 'repayZUSD(uint256,address,address)')
  }

  async closeLoC(...params) {
    return this.forwardFunction(params, 'closeLoC()')
  }

  async adjustLoC(...params) {
    return this.forwardFunction(params, 'adjustLoC(uint256,uint256,uint256,bool,address,address)')
  }

  async claimRedeemedCollateral(...params) {
    return this.forwardFunction(params, 'claimRedeemedCollateral(address)')
  }

  async getNewTCRFromLoCChange(...params) {
    return this.proxyFunction('getNewTCRFromLoCChange', params)
  }

  async getNewICRFromLoCChange(...params) {
    return this.proxyFunction('getNewICRFromLoCChange', params)
  }

  async getCompositeDebt(...params) {
    return this.proxyFunction('getCompositeDebt', params)
  }

  async ZUSD_GAS_COMPENSATION(...params) {
    return this.proxyFunction('ZUSD_GAS_COMPENSATION', params)
  }

  async MIN_NET_DEBT(...params) {
    return this.proxyFunction('MIN_NET_DEBT', params)
  }

  async BORROWING_FEE_FLOOR(...params) {
    return this.proxyFunction('BORROWING_FEE_FLOOR', params)
  }
}

class BorrowerWrappersProxy extends Proxy {
  constructor(owner, proxies, borrowerWrappersScriptAddress) {
    super(owner, proxies, borrowerWrappersScriptAddress, null)
  }

  async claimCollateralAndOpenLoC(...params) {
    return this.forwardFunction(params, 'claimCollateralAndOpenLoC(uint256,uint256,address,address)')
  }

  async claimSPRewardsAndRecycle(...params) {
    return this.forwardFunction(params, 'claimSPRewardsAndRecycle(uint256,address,address)')
  }

  async claimStakingGainsAndRecycle(...params) {
    return this.forwardFunction(params, 'claimStakingGainsAndRecycle(uint256,address,address)')
  }

  async transferBTC(...params) {
    return this.forwardFunction(params, 'transferBTC(address,uint256)')
  }
}

class LoCManagerProxy extends Proxy {
  constructor(owner, proxies, locManagerScriptAddress, locManager) {
    super(owner, proxies, locManagerScriptAddress, locManager)
  }

  async LoCs(user) {
    return this.proxyFunctionWithUser('LoCs', user)
  }

  async getLoCStatus(user) {
    return this.proxyFunctionWithUser('getLoCStatus', user)
  }

  async getLoCDebt(user) {
    return this.proxyFunctionWithUser('getLoCDebt', user)
  }

  async getLoCColl(user) {
    return this.proxyFunctionWithUser('getLoCColl', user)
  }

  async totalStakes() {
    return this.proxyFunction('totalStakes', [])
  }

  async getPendingBTCReward(...params) {
    return this.proxyFunction('getPendingBTCReward', params)
  }

  async getPendingZUSDDebtReward(...params) {
    return this.proxyFunction('getPendingZUSDDebtReward', params)
  }

  async liquidate(user) {
    return this.proxyFunctionWithUser('liquidate', user)
  }

  async getTCR(...params) {
    return this.proxyFunction('getTCR', params)
  }

  async getCurrentICR(user, price) {
    return this.contract.getCurrentICR(this.getProxyAddressFromUser(user), price)
  }

  async checkRecoveryMode(...params) {
    return this.proxyFunction('checkRecoveryMode', params)
  }

  async getLoCOwnersCount() {
    return this.proxyFunction('getLoCOwnersCount', [])
  }

  async baseRate() {
    return this.proxyFunction('baseRate', [])
  }

  async L_BTC() {
    return this.proxyFunction('L_BTC', [])
  }

  async L_ZUSDDebt() {
    return this.proxyFunction('L_ZUSDDebt', [])
  }

  async rewardSnapshots(user) {
    return this.proxyFunctionWithUser('rewardSnapshots', user)
  }

  async lastFeeOperationTime() {
    return this.proxyFunction('lastFeeOperationTime', [])
  }

  async redeemCollateral(...params) {
    return this.forwardFunction(params, 'redeemCollateral(uint256,address,address,address,uint256,uint256,uint256)')
  }

  async getActualDebtFromComposite(...params) {
    return this.proxyFunction('getActualDebtFromComposite', params)
  }

  async getRedemptionFeeWithDecay(...params) {
    return this.proxyFunction('getRedemptionFeeWithDecay', params)
  }

  async getBorrowingRate() {
    return this.proxyFunction('getBorrowingRate', [])
  }

  async getBorrowingRateWithDecay() {
    return this.proxyFunction('getBorrowingRateWithDecay', [])
  }

  async getBorrowingFee(...params) {
    return this.proxyFunction('getBorrowingFee', params)
  }

  async getBorrowingFeeWithDecay(...params) {
    return this.proxyFunction('getBorrowingFeeWithDecay', params)
  }

  async getEntireDebtAndColl(...params) {
    return this.proxyFunction('getEntireDebtAndColl', params)
  }
}

class StabilityPoolProxy extends Proxy {
  constructor(owner, proxies, stabilityPoolScriptAddress, stabilityPool) {
    super(owner, proxies, stabilityPoolScriptAddress, stabilityPool)
  }

  async provideToSP(...params) {
    return this.forwardFunction(params, 'provideToSP(uint256,address)')
  }

  async getCompoundedZUSDDeposit(user) {
    return this.proxyFunctionWithUser('getCompoundedZUSDDeposit', user)
  }

  async deposits(user) {
    return this.proxyFunctionWithUser('deposits', user)
  }

  async getDepositorBTCGain(user) {
    return this.proxyFunctionWithUser('getDepositorBTCGain', user)
  }
}

class SortedLoCsProxy extends Proxy {
  constructor(owner, proxies, sortedLoCs) {
    super(owner, proxies, null, sortedLoCs)
  }

  async contains(user) {
    return this.proxyFunctionWithUser('contains', user)
  }

  async isEmpty(user) {
    return this.proxyFunctionWithUser('isEmpty', user)
  }

  async findInsertPosition(...params) {
    return this.proxyFunction('findInsertPosition', params)
  }
}

class TokenProxy extends Proxy {
  constructor(owner, proxies, tokenScriptAddress, token) {
    super(owner, proxies, tokenScriptAddress, token)
  }

  async transfer(...params) {
    // switch destination to proxy if any
    params[0] = this.getProxyAddressFromUser(params[0])
    return this.forwardFunction(params, 'transfer(address,uint256)')
  }

  async transferFrom(...params) {
    // switch to proxies if any
    params[0] = this.getProxyAddressFromUser(params[0])
    params[1] = this.getProxyAddressFromUser(params[1])
    return this.forwardFunction(params, 'transferFrom(address,address,uint256)')
  }

  async approve(...params) {
    // switch destination to proxy if any
    params[0] = this.getProxyAddressFromUser(params[0])
    return this.forwardFunction(params, 'approve(address,uint256)')
  }

  async increaseAllowance(...params) {
    // switch destination to proxy if any
    params[0] = this.getProxyAddressFromUser(params[0])
    return this.forwardFunction(params, 'increaseAllowance(address,uint256)')
  }

  async decreaseAllowance(...params) {
    // switch destination to proxy if any
    params[0] = this.getProxyAddressFromUser(params[0])
    return this.forwardFunction(params, 'decreaseAllowance(address,uint256)')
  }

  async totalSupply(...params) {
    return this.proxyFunction('totalSupply', params)
  }

  async balanceOf(user) {
    return this.proxyFunctionWithUser('balanceOf', user)
  }

  async allowance(...params) {
    // switch to proxies if any
    const owner = this.getProxyAddressFromUser(params[0])
    const spender = this.getProxyAddressFromUser(params[1])

    return this.proxyFunction('allowance', [owner, spender])
  }

  async name(...params) {
    return this.proxyFunction('name', params)
  }

  async symbol(...params) {
    return this.proxyFunction('symbol', params)
  }

  async decimals(...params) {
    return this.proxyFunction('decimals', params)
  }
}

class ZEROStakingProxy extends Proxy {
  constructor(owner, proxies, tokenScriptAddress, token) {
    super(owner, proxies, tokenScriptAddress, token)
  }

  async stake(...params) {
    return this.forwardFunction(params, 'stake(uint256)')
  }

  async stakes(user) {
    return this.proxyFunctionWithUser('stakes', user)
  }

  async F_ZUSD(user) {
    return this.proxyFunctionWithUser('F_ZUSD', user)
  }
}

module.exports = {
  buildUserProxies,
  BorrowerOperationsProxy,
  BorrowerWrappersProxy,
  LoCManagerProxy,
  StabilityPoolProxy,
  SortedLoCsProxy,
  TokenProxy,
  ZEROStakingProxy
}
