from brownie import Wei

ZERO_ADDRESS = '0x' + '0'.zfill(40)
MAX_BYTES_32 = '0x' + 'F' * 64

def floatToWei(amount):
    return Wei(amount * 1e18)

# Subtracts the borrowing fee
def get_zusd_amount_from_net_debt(contracts, net_debt):
    borrowing_rate = contracts.troveManager.getBorrowingRateWithDecay()
    return Wei(net_debt * Wei(1e18) / (Wei(1e18) + borrowing_rate))

def logGlobalState(contracts):
    print('\n ---- Global state ----')
    num_troves = contracts.sortedTroves.getSize()
    print('Num troves      ', num_troves)
    activePoolColl = contracts.activePool.getRBTC()
    activePoolDebt = contracts.activePool.getZUSDDebt()
    defaultPoolColl = contracts.defaultPool.getRBTC()
    defaultPoolDebt = contracts.defaultPool.getZUSDDebt()
    total_debt = (activePoolDebt + defaultPoolDebt).to("ether")
    total_coll = (activePoolColl + defaultPoolColl).to("ether")
    print('Total Debt      ', total_debt)
    print('Total Coll      ', total_coll)
    SP_ZUSD = contracts.stabilityPool.getTotalZUSDDeposits().to("ether")
    SP_RBTC = contracts.stabilityPool.getRBTC().to("ether")
    print('SP ZUSD         ', SP_ZUSD)
    print('SP RBTC          ', SP_RBTC)
    price_ether_current = contracts.priceFeedTestnet.getPrice()
    RBTC_price = price_ether_current.to("ether")
    print('RBTC price       ', RBTC_price)
    TCR = contracts.troveManager.getTCR(price_ether_current).to("ether")
    print('TCR             ', TCR)
    recovery_mode = contracts.troveManager.checkRecoveryMode(price_ether_current)
    print('Rec. Mode       ', recovery_mode)
    stakes_snapshot = contracts.troveManager.totalStakesSnapshot()
    coll_snapshot = contracts.troveManager.totalCollateralSnapshot()
    print('Stake snapshot  ', stakes_snapshot.to("ether"))
    print('Coll snapshot   ', coll_snapshot.to("ether"))
    if stakes_snapshot > 0:
        print('Snapshot ratio  ', coll_snapshot / stakes_snapshot)
    last_trove = contracts.sortedTroves.getLast()
    last_ICR = contracts.troveManager.getCurrentICR(last_trove, price_ether_current).to("ether")
    #print('Last trove      ', last_trove)
    print('Last trove’s ICR', last_ICR)
    print(' ----------------------\n')

    return [RBTC_price, num_troves, total_coll, total_debt, TCR, recovery_mode, last_ICR, SP_ZUSD, SP_RBTC]
