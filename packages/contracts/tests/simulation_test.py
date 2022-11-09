import pytest

import csv

from brownie import *
from accounts import *
from helpers import *
from simulation_helpers import *

class Contracts: pass


def setAddresses(contracts):
    contracts.sortedLoCs.setParams(
        MAX_BYTES_32,
        contracts.locManager.address,
        contracts.borrowerOperations.address,
        { 'from': accounts[0] }
    )

    contracts.locManager.setAddresses(
        contracts.borrowerOperations.address,
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.stabilityPool.address,
        contracts.gasPool.address,
        contracts.collSurplusPool.address,
        contracts.priceFeedTestnet.address,
        contracts.zusdToken.address,
        contracts.sortedLoCs.address,
        contracts.zeroToken.address,
        contracts.zeroStaking.address,
        { 'from': accounts[0] }
    )

    contracts.borrowerOperations.setAddresses(
        contracts.locManager.address,
        contracts.activePool.address,
        contracts.defaultPool.address,
        contracts.stabilityPool.address,
        contracts.gasPool.address,
        contracts.collSurplusPool.address,
        contracts.priceFeedTestnet.address,
        contracts.sortedLoCs.address,
        contracts.zusdToken.address,
        contracts.zeroStaking.address,
        { 'from': accounts[0] }
    )

    contracts.stabilityPool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.locManager.address,
        contracts.activePool.address,
        contracts.zusdToken.address,
        contracts.sortedLoCs.address,
        contracts.priceFeedTestnet.address,
        contracts.communityIssuance.address,
        { 'from': accounts[0] }
    )

    contracts.activePool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.locManager.address,
        contracts.stabilityPool.address,
        contracts.defaultPool.address,
        { 'from': accounts[0] }
    )

    contracts.defaultPool.setAddresses(
        contracts.locManager.address,
        contracts.activePool.address,
        { 'from': accounts[0] }
    )

    contracts.collSurplusPool.setAddresses(
        contracts.borrowerOperations.address,
        contracts.locManager.address,
        contracts.activePool.address,
        { 'from': accounts[0] }
    )

    contracts.hintHelpers.setAddresses(
        contracts.sortedLoCs.address,
        contracts.locManager.address,
        { 'from': accounts[0] }
    )

    # ZERO
    contracts.zeroStaking.setAddresses(
        contracts.zeroToken.address,
        contracts.zusdToken.address,
        contracts.locManager.address,
        contracts.borrowerOperations.address,
        contracts.activePool.address,
        { 'from': accounts[0] }
    )

    contracts.communityIssuance.setAddresses(
        contracts.zeroToken.address,
        contracts.stabilityPool.address,
        { 'from': accounts[0] }
    )

@pytest.fixture
def add_accounts():
    if network.show_active() != 'development':
        print("Importing accounts...")
        import_accounts(accounts)

@pytest.fixture
def contracts():
    contracts = Contracts()

    contracts.priceFeedTestnet = PriceFeedTestnet.deploy({ 'from': accounts[0] })
    contracts.sortedLoCs = SortedLoCs.deploy({ 'from': accounts[0] })
    contracts.locManager = LoCManager.deploy({ 'from': accounts[0] })
    contracts.activePool = ActivePool.deploy({ 'from': accounts[0] })
    contracts.stabilityPool = StabilityPool.deploy({ 'from': accounts[0] })
    contracts.gasPool = GasPool.deploy({ 'from': accounts[0] })
    contracts.defaultPool = DefaultPool.deploy({ 'from': accounts[0] })
    contracts.collSurplusPool = CollSurplusPool.deploy({ 'from': accounts[0] })
    contracts.borrowerOperations = BorrowerOperationsTester.deploy({ 'from': accounts[0] })
    contracts.hintHelpers = HintHelpers.deploy({ 'from': accounts[0] })
    contracts.zusdToken = ZUSDToken.deploy(
        contracts.locManager.address,
        contracts.stabilityPool.address,
        contracts.borrowerOperations.address,
        { 'from': accounts[0] }
    )
    # ZERO
    contracts.zeroStaking = ZEROStaking.deploy({ 'from': accounts[0] })
    contracts.communityIssuance = CommunityIssuance.deploy({ 'from': accounts[0] })
    contracts.zeroToken = ZEROToken.deploy(
        contracts.communityIssuance.address,
        contracts.zeroStaking.address,
        contracts.lockupContractFactory.address,
        accounts[0], # bountyAddress
        accounts[0],  # lpRewardsAddress
        accounts[0],  # multisigAddress
        { 'from': accounts[0] }
    )

    setAddresses(contracts)

    return contracts

@pytest.fixture
def print_expectations():
    # BTC_price_one_year = price_BTC_initial * (1 + drift_BTC)**8760
    # print("Expected bitcoin price at the end of the year: $", BTC_price_one_year)
    print("Expected ZERO price at the end of first month: $", price_ZERO_initial * (1 + drift_ZERO)**720)

    print("\n Open locs")
    print("E(Q_t^e)    = ", collateral_gamma_k * collateral_gamma_theta)
    print("SD(Q_t^e)   = ", collateral_gamma_k**(0.5) * collateral_gamma_theta)
    print("E(CR^*(i))  = ", (target_cr_a + target_cr_b * target_cr_chi_square_df) * 100, "%")
    print("SD(CR^*(i)) = ", target_cr_b * (2*target_cr_chi_square_df)**(1/2) * 100, "%")
    print("E(tau)      = ", rational_inattention_gamma_k * rational_inattention_gamma_theta * 100, "%")
    print("SD(tau)     = ", rational_inattention_gamma_k**(0.5) * rational_inattention_gamma_theta * 100, "%")
    print("\n")

def _test_test(contracts):
    print(len(accounts))
    contracts.borrowerOperations.openLoC(Wei(1e18), Wei(2000e18), ZERO_ADDRESS, ZERO_ADDRESS,
                                           { 'from': accounts[1], 'value': Wei("100 ether") })

    #assert False

"""# Simulation Program
**Sequence of events**

> In each period, the following events occur sequentially


* exogenous bitcoin price input
* LoC liquidation
* return of the previous period's stability pool determined (liquidation gain & airdropped ZERO gain)
* LoC closure
* LoC adjustment
* open locs
* issuance fee
* LoC pool formed
* ZUSD supply determined
* ZUSD stability pool demand determined
* ZUSD liquidity pool demand determined
* ZUSD price determined
* redemption & redemption fee
* ZERO pool return determined
"""
def test_run_simulation(add_accounts, contracts, print_expectations):
    ZUSD_GAS_COMPENSATION = contracts.locManager.ZUSD_GAS_COMPENSATION() / 1e18
    MIN_NET_DEBT = contracts.locManager.MIN_NET_DEBT() / 1e18

    contracts.priceFeedTestnet.setPrice(floatToWei(price_BTC[0]), { 'from': accounts[0] })
    # whale
    whale_coll = 30000.0
    contracts.borrowerOperations.openLoC(MAX_FEE, Wei(10e24), ZERO_ADDRESS, ZERO_ADDRESS,
                                           { 'from': accounts[0], 'value': floatToWei(whale_coll) })
    contracts.stabilityPool.provideToSP(floatToWei(stability_initial), ZERO_ADDRESS, { 'from': accounts[0] })

    active_accounts = []
    inactive_accounts = [*range(1, len(accounts))]

    price_ZUSD = 1
    price_ZERO_current = price_ZERO_initial

    data = {"airdrop_gain": [0] * n_sim, "liquidation_gain": [0] * n_sim, "issuance_fee": [0] * n_sim, "redemption_fee": [0] * n_sim}
    total_zusd_redempted = 0
    total_coll_added = whale_coll
    total_coll_liquidated = 0

    print(f"Accounts: {len(accounts)}")
    print(f"Network: {network.show_active()}")

    logGlobalState(contracts)

    with open('tests/simulation.csv', 'w', newline='') as csvfile:
        datawriter = csv.writer(csvfile, delimiter=',')
        datawriter.writerow(['iteration', 'BTC_price', 'price_ZUSD', 'price_ZERO', 'num_locs', 'total_coll', 'total_debt', 'TCR', 'recovery_mode', 'last_ICR', 'SP_ZUSD', 'SP_BTC', 'total_coll_added', 'total_coll_liquidated', 'total_zusd_redempted'])

        #Simulation Process
        for index in range(1, n_sim):
            print('\n  --> Iteration', index)
            print('  -------------------\n')
            #exogenous bitcoin price input
            price_BTC_current = price_BTC[index]
            contracts.priceFeedTestnet.setPrice(floatToWei(price_BTC_current), { 'from': accounts[0] })

            #LoC liquidation & return of stability pool
            result_liquidation = liquidate_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, price_ZERO_current, data, index)
            total_coll_liquidated = total_coll_liquidated + result_liquidation[0]
            return_stability = result_liquidation[1]

            #close locs
            result_close = close_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, index)

            #adjust locs
            [coll_added_adjust, issuance_ZUSD_adjust] = adjust_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, index)

            #open locs
            [coll_added_open, issuance_ZUSD_open] = open_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, index)
            total_coll_added = total_coll_added + coll_added_adjust + coll_added_open
            #active_accounts.sort(key=lambda a : a.get('CR_initial'))

            #Stability Pool
            stability_update(accounts, contracts, active_accounts, return_stability, index)

            #Calculating Price, Liquidity Pool, and Redemption
            [price_ZUSD, redemption_pool, redemption_fee, issuance_ZUSD_stabilizer] = price_stabilizer(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, index)
            total_zusd_redempted = total_zusd_redempted + redemption_pool
            print('ZUSD price', price_ZUSD)
            print('ZERO price', price_ZERO_current)

            issuance_fee = price_ZUSD * (issuance_ZUSD_adjust + issuance_ZUSD_open + issuance_ZUSD_stabilizer)
            data['issuance_fee'][index] = issuance_fee
            data['redemption_fee'][index] = redemption_fee

            #ZERO Market
            result_ZERO = ZERO_market(index, data)
            price_ZERO_current = result_ZERO[0]
            #annualized_earning = result_ZERO[1]
            #MC_ZERO_current = result_ZERO[2]

            [BTC_price, num_locs, total_coll, total_debt, TCR, recovery_mode, last_ICR, SP_ZUSD, SP_BTC] = logGlobalState(contracts)
            print('Total redempted ', total_zusd_redempted)
            print('Total BTC added ', total_coll_added)
            print('Total BTC liquid', total_coll_liquidated)
            print(f'Ratio BTC liquid {100 * total_coll_liquidated / total_coll_added}%')
            print(' ----------------------\n')

            datawriter.writerow([index, BTC_price, price_ZUSD, price_ZERO_current, num_locs, total_coll, total_debt, TCR, recovery_mode, last_ICR, SP_ZUSD, SP_BTC, total_coll_added, total_coll_liquidated, total_zusd_redempted])

            assert price_ZUSD > 0
