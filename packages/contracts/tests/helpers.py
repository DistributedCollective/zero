from brownie import Wei

ZERO_ADDRESS = '0x' + '0'.zfill(40)
MAX_BYTES_32 = '0x' + 'F' * 64

def floatToWei(amount):
    return Wei(amount * 1e18)

# Subtracts the borrowing fee
def get_zusd_amount_from_net_debt(contracts, net_debt):
    borrowing_rate = contracts.locManager.getBorrowingRateWithDecay()
    return Wei(net_debt * Wei(1e18) / (Wei(1e18) + borrowing_rate))

def logGlobalState(contracts):
    print('\n ---- Global state ----')
    num_locs = contracts.sortedLoCs.getSize()
    print('Num locs      ', num_locs)
    activePoolColl = contracts.activePool.getBTC()
    activePoolDebt = contracts.activePool.getZUSDDebt()
    defaultPoolColl = contracts.defaultPool.getBTC()
    defaultPoolDebt = contracts.defaultPool.getZUSDDebt()
    total_debt = (activePoolDebt + defaultPoolDebt).to("ether")
    total_coll = (activePoolColl + defaultPoolColl).to("ether")
    print('Total Debt      ', total_debt)
    print('Total Coll      ', total_coll)
    SP_ZUSD = contracts.stabilityPool.getTotalZUSDDeposits().to("ether")
    SP_BTC = contracts.stabilityPool.getBTC().to("ether")
    print('SP ZUSD         ', SP_ZUSD)
    print('SP BTC          ', SP_BTC)
    price_BTC_current = contracts.priceFeedTestnet.getPrice()
    BTC_price = price_BTC_current.to("ether")
    print('BTC price       ', BTC_price)
    TCR = contracts.locManager.getTCR(price_BTC_current).to("ether")
    print('TCR             ', TCR)
    recovery_mode = contracts.locManager.checkRecoveryMode(price_BTC_current)
    print('Rec. Mode       ', recovery_mode)
    stakes_snapshot = contracts.locManager.totalStakesSnapshot()
    coll_snapshot = contracts.locManager.totalCollateralSnapshot()
    print('Stake snapshot  ', stakes_snapshot.to("ether"))
    print('Coll snapshot   ', coll_snapshot.to("ether"))
    if stakes_snapshot > 0:
        print('Snapshot ratio  ', coll_snapshot / stakes_snapshot)
    last_loc = contracts.sortedLoCs.getLast()
    last_ICR = contracts.locManager.getCurrentICR(last_loc, price_BTC_current).to("ether")
    #print('Last LoC      ', last_loc)
    print('Last loc’s ICR', last_ICR)
    print(' ----------------------\n')

    return [BTC_price, num_locs, total_coll, total_debt, TCR, recovery_mode, last_ICR, SP_ZUSD, SP_BTC]
