from brownie import *
import random
import numpy as np
from bisect import bisect_left

from helpers import *

#global variables
day = 24
month = 24 * 30
year = 24 * 365
period = year

#number of runs in simulation
#n_sim = 8640
n_sim = year

# number of liquidations for each call to `liquidateLoCs`
NUM_LIQUIDATIONS = 10

ZUSD_GAS_COMPENSATION = 200.0
MIN_NET_DEBT = 1800.0
MAX_FEE = Wei(1e18)

"""# Bitcoin price (exogenous)

Bitcoin is the collateral for ZUSD. The bitcoin price $P_t^e$ follows 
> $P_t^e = P_{t-1}^e (1+\zeta_t^e)(1+\sigma_t^e)$, 

where $\zeta_t^e \sim N(0, $ sd_BTC$)$ represents bitcoin price shock and $\sigma_t^e$ the drift of bitcoin price. At the end of the year, the expected bitcoin price is:
> $E(P_{8760}^e) = P_0^e \cdot (1 +$ drift_BTC$)^{8760}$

"""

#Bitcoin price
price_BTC_initial = 2000
price_BTC = [price_BTC_initial]
sd_BTC=0.02
#drift_BTC = 0.001
# 4 stages:
# growth
# crash
# growth
# decrease
period1 = 2 * month
drift_BTC1 = 0.001
period2 = period1 + 7 * day
drift_BTC2 = -0.02
period3 = 6 * month
drift_BTC3 = 0.0013
period4 = period
drift_BTC4 = -0.0002

"""# ZERO price
In the first month, the price of ZERO follows

> $P_t^q = P_{t-1}^q (1+\zeta_t^q)(1+\sigma_t^q)$. 

Note that $\zeta_t^q \sim N(0,$ sd_ZERO) represents ZERO price shock and $\sigma_t^q$ the drift. Here, $\sigma_t^q =$ drift_ZERO, so that the expected ZERO price increases from price_ZERO_initial to the following at the end of the first month:
> $E(P_{720}^q) = $price_ZERO_initial$ \cdot (1+$ drift_ZERO$)^{720}$

The ZERO price from the second month on is endogenously determined.
"""

#ZERO price & airdrop
price_ZERO_initial = 0.4
price_ZERO = [price_ZERO_initial]
sd_ZERO=0.005
drift_ZERO = 0.0035
supply_ZERO=[0]
ZERO_total_supply=100000000

"""**ZERO Endogenous Price**

The staked ZERO pool earning consists of the issuance fee revenue and redemption fee revenue
> $R_t^q = R_t^i + R_t^r.$

From period 721 onwards, using the data in the last 720 periods (i.e. the last 30 days), we can calculate the annualized earning

> $$E_t=\frac{365}{30}\sum_{\tau=t-720}^{t-1}R_\tau^q.$$

For example, in period 721 (the first hour of the second month), we can calculate the annualized earning

> $$E_{721}=\frac{365}{30}\sum_{\tau=1}^{720}R_\tau^q.$$

In period 722 (the second hour of the second month), we can calculate the annualized earning

> $$E_{722}=\frac{365}{30}\sum_{\tau=2}^{721}R_\tau^q.$$

The annualized earning $E_t$ takes into account the last 720 periods' earning only and then annualize it to represent the whole year's revenue.
Only the latest 720 periods matter! The earlier ones become irrelevant over time.

The P/E ratio is defined as follows

> $$r_t=r^{PE}(1 + \zeta_t^{PE}),$$

where $r^{PE} =$ PE_ratio ~and \zeta_t^{PE}\sim N(0, 0.1)~ $\zeta_t^{PE} = 0$.

> $$r_t=\frac{ZERO Market Cap}{Annualized Earning}=\frac{MC_t}{E_t}$$

> $MC_t=P_t^q \cdot$ ZERO_total_supply

Therefore, the ZERO price dynamics is determined
> $$P_t^q=discount \cdot \frac{r^{PE}}{ZERO\_total\_supply}E_t$$

Interpretation: The denominator implies that with more ZERO tokens issued, ZERO price decreases. However, the depreciation effect can be counteracted by the growth of the earning.

"""

#PE ratio
PE_ratio = 50


"""# Liquidity Pool

The demand of tokens from liquidity pool is defined by
> $$D_t^l = D_{t-1}^l (1+\zeta_t^l) (1+\sigma_t^l) (\frac{P_t^l}{P_{t-1}^l})^\delta, \\
D_0^l = liquidity\_initial$$

where $\zeta_t^l \sim N(0, sd\_liquidity)$ is the shock in the liquidity pool, $1+\sigma_t^l = drift\_liquidity$ and $\delta \leq -1$.
"""
# liquidity pool
liquidity_initial=0
sd_liquidity=0.001
#drift_liquidity=1.0003
drift_liquidity=1
delta = -20

"""# Stability Pool

The demand of tokens from stability pool is defined by 
>$$D_t^s = D_{t-1}^s (1+\zeta_t^s) (1+R_{t-1}^s-R_{t}^n)^\theta, \\
D_0^s = stability\_initial$$

where $\zeta_t^s \sim N(0, sd\_stability)$ is the shock in the liquidity pool. 

During the first month the formula above is also multiplied by a drift factor, $drift\_stability$.

$R_{t-1}^s$ is the return in the stability pool, which consists of liquidation gain and airdrop ZERO gain.


The natural rate of the stability pool follows
> $$R_{t}^n=R_{t-1}^n(1+\zeta_t^n)\geq 0,$$

where $\zeta_t^n \sim N(0, sd\_return)$ is the natural rate shock and $R_{0}^n = natural\_rate\_initial$.

The natural rate compensates the opportunity cost and risk undertaken by the stability pool providers. It resembles the risk-free government bond return in the macroeconomics model. Stability pool depositors compare the return of the stability pool with the outside investment opportunities. A positive shock $\zeta_t^n$ implies investment on other platforms, e.g. Compound, Uniswap, Aave, yield higher returns, thus making the stability pool less appealing.

"""

#stability pool
initial_return = 0.2
sd_return = 0.001
stability_initial = 1000
sd_stability = 0.001
drift_stability = 1.002
theta = 0.001

#natural rate
natural_rate_initial = 0.2
natural_rate = [natural_rate_initial]
sd_natural_rate = 0.002

"""# LoC pool

Each LoC is defined by five numbers
> (collateral in bitcoin, debt in ZUSD, collateral ratio target, rational inattention, collateral ratio)

which can be denoted by
> ($Q_t^e(i)$, $Q_t^d(i)$, $CR^*(i)$, $\tau(i)$, $CR_t(i)$).

**Open LoCs**

The amount of new locs opened in period t is denoted by $N_t^o$, which follows 


> $N_t^o = \begin{cases} 
initial\_open &\mbox{if } t = 0\\
max(0, n\_steady \cdot (1+\zeta_t^o)) &\mbox{if } P_{t-1}^l \leq 1 + f_t^i\\
max(0, n\_steady \cdot (1+\zeta_t^o)) + \alpha (P_{t-1}^l - (1 + f_t^i)) N_t &\mbox{otherwise }
\end{cases}
$

where the shock $\zeta_t^o \sim N(0,sd\_openlocs)$. 

$R_t^o$ represents the break-even natural rate of opening locs and $f_t^i$ represents the issuance fee.

$P_{t}^{l}$ is the price of ZUSD.

$N_t^o$ is rounded to an integer.

---

The amount of ZUSD tokens generated by a new LoC is
> $$Q_t^d(i) = \frac{P_t^e Q_t^e(i)}{CR^*(i)}.$$

---


The distribution of bitcoin $Q_t^e(i)$ follows
> $Q_t^e(i) \sim \Gamma(k, \theta)$

So that $E(Q_t^e) = collateral\_gamma\_k \cdot collateral\_gamma\_theta$ and $Var(Q_t^e) = \sqrt{collateral\_gamma\_k} \cdot collateral\_gamma\_theta$

---


$CR^*(i)$ follows a chi-squared distribution with $df=target\_cr\_chi\_square\_df$, i.e. $CR^*(i) \sim \chi_{df}^2$, so that $CR^*(i)\geq target\_cr\_a$:
> $CR^*(i) = target\_cr\_a + target\_cr\_b \cdot \chi_{df}^2$. 

Then:\
$E(CR^*(i)) = target\_cr\_a + target\_cr\_b * target\_cr\_chi\_square\_df$, \\
$SD(CR^*(i))=target\_cr\_b*\sqrt{2*target\_cr\_chi\_square\_df}$



---
Each LoC is associated with a rational inattention parameter $\tau(i)$.

The collateral ratio of the existing locs vary with the bitcoin price $P_t^e$
> $$CR_t(i) = \frac{P_t^e Q_t^e(i)}{Q_t^d(i)}.$$

If the collateral ratio falls in the range 
> $CR_t(i) \in [CR^*(i)-\tau(i), CR^*(i)+2\tau(i)]$,

no action taken. Otherwise, the LoC owner readjusts the collateral ratio so that
> $CR_t(i)=CR^*(i)$.

The distribution of $\tau(i)$ follows gamma distribution $\Gamma(k,\theta)$ with mean of $k\theta$ and standard error of $\sqrt{k\theta^2}$.
"""

#open locs
initial_open=10
sd_openlocs=0.5
n_steady=0.5

collateral_gamma_k = 10
collateral_gamma_theta = 500

target_cr_a = 1.1
target_cr_b = 0.03
target_cr_chi_square_df = 16

rational_inattention_gamma_k = 4
rational_inattention_gamma_theta = 0.08

#sensitivity to ZUSD price & issuance fee
alpha = 0.3

"""**Close LoCs**

The amount of locs closed in period t is denoted as $N_t^c$, which follows
> $$N_t^c = \begin{cases} 
U(0, 1) &\mbox{if } t \in [0,240] \\ 
max(0, n\_steady \cdot (1+\zeta_t^c)) &\mbox{if } P_{t-1}^l \geq 1 \\ 
max(0, n\_steady \cdot (1+\zeta_t^c)) + \beta(1 - P_{t-1}^l)N_t &\mbox{otherwise }
\end{cases} $$

where the shock $\zeta_t^c \sim N(0, sd\_closelocs)$. 
$N_t^c$ is rounded to an integer.
"""

#close locs
sd_closelocs=0.5
#sensitivity to ZUSD price
beta = 0.2

"""**LoC Liquidation**

At the beginning of each period, 
right after the feed of bitcoin price, 
the system checks the collateral ratio of the exisitng locs in the
LoC pool. 

If the collateral ratio falls below 110%, i.e.
> $$CR_t(i) = \frac{P_t^e Q_t^e(i)}{Q_t^d(i)}<110\%,$$

this LoC is liquidated. Namely, it is eliminated from the LoC pool.

Denote the amount of liquidated locs by $N_t^l$. The sum of the debt amounts to
> $$Q_t^d=\sum_i^{N_t^l} Q_t^d(i)$$

The amount of bitcoin is
> $$Q_t^e=\sum_i^{N_t^l} Q_t^e(i)$$

The debt $Q_t^d$ is paid by the stability pool in exchange for the collateral $Q_t^e$. Therefore, the return of the previous period's stability pool is


> $$R_{t-1}^s=\frac{R_t^l+R_t^a}{P_{t-1}^lD_{t-1}^s}$$

where:
- $R_t^l=P_t^eQ_t^e-P_{t-1}^lQ_t^d$ is the liquidation gain 
- $R_t^a=P_{t}^q\hat{Q}_t^q$ is the airdrop gain, $\hat{Q}_t^q=1000$ denotes the amount of ZERO token airdropped to the stability pool providers
- $D_{t}^{s}$ is the total amount of ZUSD deposited in the Stability Pool (see below)

# Exogenous Factors

Bitcoin Price
"""

#Bitcoin price
for i in range(1, period1):
    random.seed(2019375+10000*i)
    shock_BTC = random.normalvariate(0, sd_BTC)
    price_BTC.append(price_BTC[i-1] * (1 + shock_BTC) * (1 + drift_BTC1))
print(" - BTC period 1 -")
print(f"Min BTC price: {min(price_BTC[1:period1])}")
print(f"Max BTC price: {max(price_BTC[1:period1])}")
for i in range(period1, period2):
    random.seed(2019375+10000*i)
    shock_BTC = random.normalvariate(0, sd_BTC)
    price_BTC.append(price_BTC[i-1] * (1 + shock_BTC) * (1 + drift_BTC2))
print(" - BTC period 2 -")
print(f"Min BTC price: {min(price_BTC[period1:period2])}")
print(f"Max BTC price: {max(price_BTC[period1:period2])}")
for i in range(period2, period3):
    random.seed(2019375+10000*i)
    shock_BTC = random.normalvariate(0, sd_BTC)
    price_BTC.append(price_BTC[i-1] * (1 + shock_BTC) * (1 + drift_BTC3))
print(" - BTC period 3 -")
print(f"Min BTC price: {min(price_BTC[period2:period3])}")
print(f"Max BTC price: {max(price_BTC[period2:period3])}")
for i in range(period3, period4):
    random.seed(2019375+10000*i)
    shock_BTC = random.normalvariate(0, sd_BTC)
    price_BTC.append(price_BTC[i-1] * (1 + shock_BTC) * (1 + drift_BTC4))
print(" - BTC period 4 -")
print(f"Min BTC price: {min(price_BTC[period3:period4])}")
print(f"Max BTC price: {max(price_BTC[period3:period4])}")

"""Natural Rate"""

#natural rate
for i in range(1, period):
    random.seed(201597+10*i)
    shock_natural = random.normalvariate(0,sd_natural_rate)
    natural_rate.append(natural_rate[i-1]*(1+shock_natural))

"""ZERO Price - First Month"""

#ZERO price
for i in range(1, month):
    random.seed(2+13*i)
    shock_ZERO = random.normalvariate(0,sd_ZERO)  
    price_ZERO.append(price_ZERO[i-1]*(1+shock_ZERO)*(1+drift_ZERO))

"""# LoCs

Liquidate LoCs
"""

def is_recovery_mode(contracts, price_BTC_current):
    price = Wei(price_BTC_current * 1e18)
    return contracts.locManager.checkRecoveryMode(price)

def pending_liquidations(contracts, price_BTC_current):
    last_loc = contracts.sortedLoCs.getLast()
    last_ICR = contracts.locManager.getCurrentICR(last_loc, Wei(price_BTC_current * 1e18))

    if last_loc == ZERO_ADDRESS:
        return False
    if last_ICR >= Wei(15e17):
        return False
    if last_ICR < Wei(11e17):
        return True
    if not is_recovery_mode(contracts, price_BTC_current):
        return False

    stability_pool_balance = contracts.stabilityPool.getTotalZUSDDeposits()
    loc = last_loc
    for i in range(NUM_LIQUIDATIONS):
        debt = contracts.locManager.getEntireDebtAndColl(loc)[0]
        if stability_pool_balance >= debt:
            return True
        loc = contracts.sortedLoCs.getPrev(loc)
        ICR = contracts.locManager.getCurrentICR(loc, Wei(price_BTC_current * 1e18))
        if ICR >= Wei(15e17):
            return False

    return False

def remove_account(accounts, active_accounts, inactive_accounts, address):
    try:
        active_index = next(i for i, a in enumerate(active_accounts) if accounts[a['index']] == address)
        inactive_accounts.append(active_accounts[active_index]['index'])
        active_accounts.pop(active_index)
    except StopIteration: # TODO
        print(f"\n ***Error: {address} not found in active accounts!")

def remove_accounts_from_events(accounts, active_accounts, inactive_accounts, events, field):
    for event in events:
        remove_account(accounts, active_accounts, inactive_accounts, event[field])

# The issuance factor F determines the curvature of the issuance curve.
# Hours in one year: 24*365 = 8760
# For 50% of remaining tokens issued each year, with hours as time units, we have:
# F ** 8760 = 0.5
# Re-arranging:
# F = 0.5 ** (1/8760)
# F = 0.99992087674
def quantity_ZERO_airdrop(index):
    F = 0.99992087674
    if index <= 0:
        return 0
    return 32e6 * (F ** (index-1) - F ** index)

def liquidate_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, price_ZERO_current, data, index):
    if len(active_accounts) == 0:
        return [0, 0]

    stability_pool_previous = contracts.stabilityPool.getTotalZUSDDeposits() / 1e18
    stability_pool_btc_previous = contracts.stabilityPool.getBTC() / 1e18

    while pending_liquidations(contracts, price_BTC_current):
        try:
            tx = contracts.locManager.liquidateLoCs(NUM_LIQUIDATIONS, { 'from': accounts[0], 'gas_limit': 8000000, 'allow_revert': True })
            #print(tx.events['LoCLiquidated'])
            remove_accounts_from_events(accounts, active_accounts, inactive_accounts, tx.events['LoCLiquidated'], '_borrower')
        except:
            print(f"TM: {contracts.locManager.address}")
            stability_pool_balance = contracts.stabilityPool.getTotalZUSDDeposits()
            print(f"stability_pool_balance: {stability_pool_balance / 1e18}")
            loc = last_loc
            for i in range(NUM_LIQUIDATIONS):
                print(f"i: {i}")
                debt = contracts.locManager.getEntireDebtAndColl(loc)[0]
                print(f"debt: {debt / 1e18}")
                if stability_pool_balance >= debt:
                    print("True!")
                loc = contracts.sortedLoCs.getPrev(loc)
                ICR = contracts.locManager.getCurrentICR(loc, Wei(price_BTC_current * 1e18))
                print(f"ICR: {ICR}")
    stability_pool_current = contracts.stabilityPool.getTotalZUSDDeposits() / 1e18
    stability_pool_btc_current = contracts.stabilityPool.getBTC() / 1e18

    debt_liquidated = stability_pool_current - stability_pool_previous
    BTC_liquidated = stability_pool_btc_current - stability_pool_btc_previous
    liquidation_gain = BTC_liquidated * price_BTC_current - debt_liquidated * price_ZUSD
    airdrop_gain = price_ZERO_current * quantity_ZERO_airdrop(index)

    data['liquidation_gain'][index] = liquidation_gain
    data['airdrop_gain'][index] = airdrop_gain

    return_stability = calculate_stability_return(contracts, price_ZUSD, data, index)

    return [BTC_liquidated, return_stability]

def calculate_stability_return(contracts, price_ZUSD, data, index):
    stability_pool_previous = contracts.stabilityPool.getTotalZUSDDeposits() / 1e18
    if index == 0:
        return_stability = initial_return
    elif stability_pool_previous == 0:
        return_stability = initial_return * 2
    elif index < month:
        return_stability = (year/index) * \
            (sum(data['liquidation_gain'][0:index]) +
             sum(data['airdrop_gain'][0:index])
             ) / (price_ZUSD * stability_pool_previous)
    else:
        return_stability = (year/month) * \
            (sum(data['liquidation_gain'][index - month:index]) +
             sum(data['airdrop_gain'][index - month:index])
             ) / (price_ZUSD * stability_pool_previous)

    return return_stability

def isNewTCRAboveCCR(contracts, collChange, isCollIncrease, debtChange, isDebtIncrease, price):
    newTCR = contracts.borrowerOperations.getNewTCRFromLoCChange(collChange, isCollIncrease, debtChange, isDebtIncrease, price)
    return newTCR >= Wei(1.5 * 1e18)

"""Close LoCs"""

def close_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, index):
    if len(active_accounts) == 0:
        return [0]

    if is_recovery_mode(contracts, price_BTC_current):
        return [0]

    np.random.seed(208+index)
    shock_closelocs = np.random.normal(0,sd_closelocs)
    n_locs = contracts.sortedLoCs.getSize()

    if index <= 240:
        number_closelocs = np.random.uniform(0,1)
    elif price_ZUSD >=1:
        number_closelocs = max(0, n_steady * (1+shock_closelocs))
    else:
        number_closelocs = max(0, n_steady * (1+shock_closelocs)) + beta*(1-price_ZUSD)*n_locs

    number_closelocs = min(int(round(number_closelocs)), len(active_accounts) - 1)
    random.seed(293+100*index)
    drops = list(random.sample(range(len(active_accounts)), number_closelocs))
    for i in range(0, len(drops)):
        account_index = active_accounts[drops[i]]['index']
        account = accounts[account_index]
        amounts = contracts.locManager.getEntireDebtAndColl(account)
        coll = amounts['coll']
        debt = amounts['debt']
        pending = get_zusd_to_repay(accounts, contracts, active_accounts, inactive_accounts, account, debt)
        if pending == 0:
            if isNewTCRAboveCCR(contracts, coll, False, debt, False, floatToWei(price_BTC_current)):
                contracts.borrowerOperations.closeLoC({ 'from': account })
                inactive_accounts.append(account_index)
                active_accounts.pop(drops[i])
        if is_recovery_mode(contracts, price_BTC_current):
            break

    return [number_closelocs]

"""Adjust LoCs"""

def transfer_from_to(contracts, from_account, to_account, amount):
    balance = contracts.zusdToken.balanceOf(from_account)
    transfer_amount = min(balance, amount)
    if transfer_amount == 0:
        return amount
    if from_account == to_account:
        return amount
    contracts.zusdToken.transfer(to_account, transfer_amount, { 'from': from_account })
    pending = amount - transfer_amount

    return pending

def get_zusd_to_repay(accounts, contracts, active_accounts, inactive_accounts, account, debt):
    zusdBalance = contracts.zusdToken.balanceOf(account)
    if debt > zusdBalance:
        pending = debt - zusdBalance
        # first try to withdraw from SP
        initial_deposit = contracts.stabilityPool.deposits(account)[0]
        if initial_deposit > 0:
            contracts.stabilityPool.withdrawFromSP(pending, { 'from': account, 'gas_limit': 8000000, 'allow_revert': True })
            # it can only withdraw up to the deposit, so we check the balance again
            zusdBalance = contracts.zusdToken.balanceOf(account)
            pending = debt - zusdBalance
        # try with whale
        pending = transfer_from_to(contracts, accounts[0], account, pending)
        # try with active accounts, which are more likely to hold ZUSD
        for a in active_accounts:
            if pending <= 0:
                break
            a_address = accounts[a['index']]
            pending = transfer_from_to(contracts, a_address, account, pending)
        for i in inactive_accounts:
            if pending <= 0:
                break
            i_address = accounts[i]
            pending = transfer_from_to(contracts, i_address, account, pending)

        if pending > 0:
            print(f"\n ***Error: not enough ZUSD to repay! {debt / 1e18} ZUSD for {account}")

        return pending

    return 0

def get_hints(contracts, coll, debt):
    NICR = contracts.hintHelpers.computeNominalCR(floatToWei(coll), floatToWei(debt))
    approxHint = contracts.hintHelpers.getApproxHint(NICR, 100, 0)
    #print("approx hint", approxHint)
    return contracts.sortedLoCs.findInsertPosition(NICR, approxHint[0], approxHint[0])

def get_hints_from_amounts(accounts, contracts, active_accounts, coll, debt, price_BTC_current):
    ICR = coll * price_BTC_current / debt
    NICR = contracts.hintHelpers.computeNominalCR(floatToWei(coll), floatToWei(debt))
    return get_hints_from_ICR(accounts, contracts, active_accounts, ICR, NICR)

#def get_address_from_active_index(accounts, active_accounts, index):
def index2address(accounts, active_accounts, index):
    return accounts[active_accounts[index]['index']]

def get_hints_from_ICR(accounts, contracts, active_accounts, ICR, NICR):
    l = len(active_accounts)
    if l == 0:
        return [ZERO_ADDRESS, ZERO_ADDRESS, 0]
    else:
        keys = [a['CR_initial'] for a in active_accounts]
        i = bisect_left(keys, ICR)
        #return [index2address(accounts, active_accounts, min(i, l-1)), index2address(accounts, active_accounts, max(i-1, 0)), i]
        hints = contracts.sortedLoCs.findInsertPosition(
            NICR,
            index2address(accounts, active_accounts, min(i, l-1)),
            index2address(accounts, active_accounts, max(i-1, 0))
        )
        return [hints[0], hints[1], i]


def adjust_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, index):
    random.seed(57984-3*index)
    ratio = random.uniform(0,1)
    coll_added_float = 0
    issuance_ZUSD_adjust = 0

    for i, working_loc in enumerate(active_accounts):
        account = accounts[working_loc['index']]
        currentICR = contracts.locManager.getCurrentICR(account, floatToWei(price_BTC_current)) / 1e18
        amounts = contracts.locManager.getEntireDebtAndColl(account)
        coll = amounts['coll'] / 1e18
        debt = amounts['debt'] / 1e18

        random.seed(187*index + 3*i)
        p = random.uniform(0,1)
        check = (currentICR - working_loc['CR_initial']) / (working_loc['CR_initial'] * working_loc['Rational_inattention'])

        if check >= -1 and check <= 2:
            continue

        #A part of the locs are adjusted by adjusting debt
        if p >= ratio:
            debt_new = price_BTC_current * coll / working_loc['CR_initial']
            hints = get_hints_from_amounts(accounts, contracts, active_accounts, coll, debt_new, price_BTC_current)
            if debt_new < MIN_NET_DEBT:
                continue
            if check < -1:
                # pay back
                repay_amount = floatToWei(debt - debt_new)
                pending = get_zusd_to_repay(accounts, contracts, active_accounts, inactive_accounts, account, repay_amount)
                if pending == 0:
                    contracts.borrowerOperations.repayZUSD(repay_amount, hints[0], hints[1], { 'from': account })
            elif check > 2 and not is_recovery_mode(contracts, price_BTC_current):
                # withdraw ZUSD
                withdraw_amount = debt_new - debt
                withdraw_amount_wei = floatToWei(withdraw_amount)
                if isNewTCRAboveCCR(contracts, 0, False, withdraw_amount_wei, True, floatToWei(price_BTC_current)):
                    contracts.borrowerOperations.withdrawZUSD(MAX_FEE, withdraw_amount_wei, hints[0], hints[1], { 'from': account })
                    rate_issuance = contracts.locManager.getBorrowingRateWithDecay() / 1e18
                    issuance_ZUSD_adjust = issuance_ZUSD_adjust + rate_issuance * withdraw_amount
        #Another part of the locs are adjusted by adjusting collaterals
        elif p < ratio:
            coll_new = working_loc['CR_initial'] * debt / price_BTC_current
            hints = get_hints_from_amounts(accounts, contracts, active_accounts, coll_new, debt, price_BTC_current)
            if check < -1:
                # add coll
                coll_added_float = coll_new - coll
                coll_added = floatToWei(coll_added_float)
                contracts.borrowerOperations.addColl(hints[0], hints[1], { 'from': account, 'value': coll_added })
            elif check > 2 and not is_recovery_mode(contracts, price_BTC_current):
                # withdraw BTC
                coll_withdrawn = floatToWei(coll - coll_new)
                if isNewTCRAboveCCR(contracts, coll_withdrawn, False, 0, False, floatToWei(price_BTC_current)):
                    contracts.borrowerOperations.withdrawColl(coll_withdrawn, hints[0], hints[1], { 'from': account })

    return [coll_added_float, issuance_ZUSD_adjust]

"""Open LoCs"""

def open_loc(accounts, contracts, active_accounts, inactive_accounts, supply_loc, quantity_BTC, CR_ratio, rational_inattention, price_BTC_current):
    if len(inactive_accounts) == 0:
        return
    if is_recovery_mode(contracts, price_BTC_current) and CR_ratio < 1.5:
        return

    #hints = get_hints_from_ICR(accounts, active_accounts, CR_ratio)
    hints = get_hints_from_amounts(accounts, contracts, active_accounts, quantity_BTC, supply_loc, price_BTC_current)
    coll = floatToWei(quantity_BTC)
    debtChange = floatToWei(supply_loc) + ZUSD_GAS_COMPENSATION
    zusd = get_zusd_amount_from_net_debt(contracts, floatToWei(supply_loc))
    if isNewTCRAboveCCR(contracts, coll, True, debtChange, True, floatToWei(price_BTC_current)):
        contracts.borrowerOperations.openLoC(MAX_FEE, zusd, hints[0], hints[1],
                                               { 'from': accounts[inactive_accounts[0]], 'value': coll })
        new_account = {"index": inactive_accounts[0], "CR_initial": CR_ratio, "Rational_inattention": rational_inattention}
        active_accounts.insert(hints[2], new_account)
        inactive_accounts.pop(0)
        return True

    return False

def open_locs(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, index):
    random.seed(2019*index)
    shock_openlocs = random.normalvariate(0,sd_openlocs)
    n_locs = len(active_accounts)
    rate_issuance = contracts.locManager.getBorrowingRateWithDecay() / 1e18
    coll_added = 0
    issuance_ZUSD_open = 0

    if index <= 0:
        number_openlocs = initial_open
    elif price_ZUSD <= 1 + rate_issuance:
        number_openlocs = max(0, n_steady * (1+shock_openlocs))
    else:
        number_openlocs = max(0, n_steady * (1+shock_openlocs)) + \
                        alpha * (price_ZUSD - rate_issuance - 1) * n_locs

    number_openlocs = min(int(round(float(number_openlocs))), len(inactive_accounts))

    for i in range(0, number_openlocs):
        np.random.seed(2033 + index + i*i)
        CR_ratio = target_cr_a + target_cr_b * np.random.chisquare(df=target_cr_chi_square_df)

        np.random.seed(20 + 10 * i + index)
        quantity_BTC = np.random.gamma(collateral_gamma_k, scale=collateral_gamma_theta)

        np.random.seed(209870- index + i*i)
        rational_inattention = np.random.gamma(rational_inattention_gamma_k, scale=rational_inattention_gamma_theta)
        supply_loc = price_BTC_current * quantity_BTC / CR_ratio
        if supply_loc < MIN_NET_DEBT:
            supply_loc = MIN_NET_DEBT
            quantity_BTC = CR_ratio * supply_loc / price_BTC_current

        issuance_ZUSD_open = issuance_ZUSD_open + rate_issuance * supply_loc
        if open_loc(accounts, contracts, active_accounts, inactive_accounts, supply_loc, quantity_BTC, CR_ratio, rational_inattention, price_BTC_current):
            coll_added = coll_added + quantity_BTC

    return [coll_added, issuance_ZUSD_open]


"""# ZUSD Market

Stability Pool
"""

def stability_update(accounts, contracts, active_accounts, return_stability, index):
    supply = contracts.zusdToken.totalSupply() / 1e18
    stability_pool_previous = contracts.stabilityPool.getTotalZUSDDeposits() / 1e18

    np.random.seed(27+3*index)
    shock_stability = np.random.normal(0,sd_stability)
    natural_rate_current = natural_rate[index]
    if stability_pool_previous == 0:
        stability_pool = stability_initial
    elif index <= month:
        stability_pool = stability_pool_previous * drift_stability * (1+shock_stability) * (1 + return_stability - natural_rate_current)**theta
    else:
        stability_pool = stability_pool_previous * (1+shock_stability) * (1 + return_stability - natural_rate_current)**theta

    if stability_pool > supply:
        print("Warning! Stability pool supposed to be greater than supply", stability_pool, supply)
        stability_pool = supply

    if stability_pool > stability_pool_previous:
        remaining = stability_pool - stability_pool_previous
        i = 0
        while remaining > 0 and i < len(active_accounts):
          account = index2address(accounts, active_accounts, i)
          balance = contracts.zusdToken.balanceOf(account) / 1e18
          deposit = min(balance, remaining)
          if deposit > 0:
              contracts.stabilityPool.provideToSP(floatToWei(deposit), ZERO_ADDRESS, { 'from': account, 'gas_limit': 8000000, 'allow_revert': True })
              remaining = remaining - deposit
          i = i + 1
    else:
        current_deposit = contracts.stabilityPool.getCompoundedZUSDDeposit(accounts[0])
        if current_deposit > 0:
            new_withdraw = min(floatToWei(stability_pool_previous - stability_pool), current_deposit)
            contracts.stabilityPool.withdrawFromSP(new_withdraw, { 'from': accounts[0] })


"""ZUSD Price, liquidity pool, and redemption

**Price Determination**

---
With the supply and demand of ZUSD tokens defined above, the price of ZUSD at the current period is given by the following equilibrium condition:
> $$S_t = D_t^s + D_t^l = D_t^s + D_{t-1}^l (1+\zeta_t^l)(1+\sigma_t^l) (\frac{P_t^l}{P_{t-1}^l})^\delta$$

where $S$ is the total supply of ZUSD.

Solving this equation gives that:
> $$P_t^l = P_{t-1}^l (\frac{S_t-D_t^s}{D_{t-1}^l(1+\zeta_t^l)(1+\sigma_t^l)})^{1/\delta}$$
"""

def calculate_price(price_ZUSD, liquidity_pool, liquidity_pool_next):
  # liquidity_pool = supply - stability_pool
  # liquidity_pool_next = liquidity_pool_previous * drift_liquidity * (1+shock_liquidity)
  price_ZUSD_current= price_ZUSD * (liquidity_pool / liquidity_pool_next) ** (1/delta)

  return price_ZUSD_current

""" **Stabilizers**

There are two stabilizers to attenuate ZUSD price deviation from its target range.
No action if $P_t^l \in [1-f_t^r, 1.1+f_t^i]$, where $f_t^r$ represents the redemption fee, and $f_t^i$ represents the issuance fee.
For the moment, we set $f_t^r = 1\%$.


---
Stabilizer 1: ceiling arbitrageurs

If $P_t^l > 1.1+f_t^i$, open a new LoC with $CR^*=110\%$ and $\tau^*=10\%$. Its debt amounts to
> $$Q_t^d(c) = \frac{P_t^e Q_t^e(c)}{110\%}.$$

The amount of $Q_t^d(c)$ is expected to bring the ZUSD price back to $1.1+f_t^i$. This means that
> $$S_t' = D_t^s + (\frac{1.1+f_t^i}{P_{t-1}^l})^\delta D_{t-1}^l(1+\zeta_t^l)(1+\sigma_t^l)$$

The debt of th new LoC is the difference between the original supply and the supply needed to bring price to $1.1+f_t^i$, which is
> $$Q_t^d(c) = S_t' - S_t$$

**Programming logic**:

market clearing condition supply = demand ==> $P_t^l$ is determined

If $P_t^l > 1.1+f_t^i$ ==> calculate what amount of extra supply leads to
$P_t^l = 1.1+f_t^i$ ==> denote this amount by $Q_t^d(c)$ ==> open a loc
with $CR^*=110\%$ and debt = $Q_t^d(c)$

---
Stabilizer 2: floor arbitrageurs

If $P_t^l < 1-f_t^r$, a fraction $\chi_t$ of ZUSD in the liquidity pool is used for redemption
> $$D_t^r = \chi_t D_t^l,$$

where
> $$\chi_t = ...$$

The redemption eliminates locs with the lowest collateral ratio.

Note that unlike stabilizer 1, stabilizer 2 has impact of ZUSD price in
 the next period. Namely, after the determination of $P_t^l$ and if $P_t^l < 1-f_t^r$, the redemption does not affect $P_t^l$ any more. So no need to
program stabilizer 2 like what you did for stabilizer 1. The redemption kills some locs and thus affect $P_{t+1}^l$ in the next period as the number of locs shrinks.

**Programming logic**

Denote the amount of locs fully redeemed by $N_t^r$. Therefore,
> $$D_t^r = \sum_i^{N_t^r} Q_t^d(i) + \Delta$$

where $\Delta \geq 0$ represents the residual.

Note that the redemption starts from the riskest locs, i.e. those with
the lowest collateral ratios.

If any residual $\Delta > 0$ left, then the changes to the LoC $j$ with the lowest collateral ratio are
> $$Q_{t+1}^e(j) = Q_{t}^e(j) - \Delta/P_t^e$$
> $$Q_{t+1}^d(j) = Q_{t}^d(j) - \Delta$$
> $$CR_{t+1}(j) = \frac{P_t^e(Q_{t}^e(j) - \Delta)}{Q_{t}^d(j) - \Delta}$$
---


Redemption fee revenue amounts to

> $$R_t^r = D_t^r(f_t^r + \frac{D_t^r}{S_t^l})$$
"""

# redemption pool - to avoid redempting the whole liquidity pool
sd_redemption = 0.001
redemption_start = 0.8

def redeem_loc(accounts, contracts, i, price_BTC_current):
    zusd_balance = contracts.zusdToken.balanceOf(accounts[i])
    [firstRedemptionHint, partialRedemptionHintNICR, truncatedZUSDamount] = contracts.hintHelpers.getRedemptionHints(zusd_balance, price_BTC_current, 70)
    if truncatedZUSDamount == Wei(0):
        return None
    approxHint = contracts.hintHelpers.getApproxHint(partialRedemptionHintNICR, 2000, 0)
    hints = contracts.sortedLoCs.findInsertPosition(partialRedemptionHintNICR, approxHint[0], approxHint[0])
    try:
        tx = contracts.locManager.redeemCollateral(
            truncatedZUSDamount,
            firstRedemptionHint,
            hints[0],
            hints[1],
            partialRedemptionHintNICR,
            70,
            MAX_FEE,
            { 'from': accounts[i], 'gas_limit': 8000000, 'allow_revert': True }
        )
        return tx
    except:
        print(f"\n   Redemption failed! ")
        print(f"LoC Manager: {contracts.locManager.address}")
        print(f"ZUSD Token:    {contracts.zusdToken.address}")
        print(f"i: {i}")
        print(f"account: {accounts[i]}")
        print(f"ZUSD bal: {zusd_balance / 1e18}")
        print(f"truncated: {truncatedZUSDamount / 1e18}")
        print(f"Redemption rate: {contracts.locManager.getRedemptionRateWithDecay() * 100 / 1e18} %")
        print(f"approx: {approxHint[0]}")
        print(f"diff: {approxHint[1]}")
        print(f"diff: {approxHint[1] / 1e18}")
        print(f"seed: {approxHint[2]}")
        print(f"amount: {truncatedZUSDamount}")
        print(f"first: {firstRedemptionHint}")
        print(f"hint: {hints[0]}")
        print(f"hint: {hints[1]}")
        print(f"nicr: {partialRedemptionHintNICR}")
        print(f"nicr: {partialRedemptionHintNICR / 1e18}")
        print(f"70")
        print(f"{MAX_FEE}")
        #return None
        exit(1)

def price_stabilizer(accounts, contracts, active_accounts, inactive_accounts, price_BTC_current, price_ZUSD, index):

    stability_pool = contracts.stabilityPool.getTotalZUSDDeposits() / 1e18
    redemption_pool = 0
    redemption_fee = 0
    issuance_ZUSD_stabilizer = 0

    supply = contracts.zusdToken.totalSupply() / 1e18
    #Liquidity Pool
    liquidity_pool = supply - stability_pool

    # next iteration step for liquidity pool
    np.random.seed(20*index)
    shock_liquidity = np.random.normal(0,sd_liquidity)

    liquidity_pool_next = liquidity_pool * drift_liquidity * (1+shock_liquidity)

    #Calculating Price
    price_ZUSD_current = calculate_price(price_ZUSD, liquidity_pool, liquidity_pool_next)
    rate_issuance = contracts.locManager.getBorrowingRateWithDecay() / 1e18
    rate_redemption = contracts.locManager.getRedemptionRateWithDecay() / 1e18

    #Stabilizer
    #Ceiling Arbitrageurs
    if price_ZUSD_current > 1.1 + rate_issuance:
        supply_wanted = stability_pool + \
                        liquidity_pool_next * \
                        ((1.1+rate_issuance) / price_ZUSD)**delta
        supply_loc = min(supply_wanted - supply, MIN_NET_DEBT)

        CR_ratio = 1.1
        rational_inattention = 0.1
        quantity_BTC = supply_loc * CR_ratio / price_BTC_current
        issuance_ZUSD_stabilizer = rate_issuance * supply_loc
        if open_loc(accounts, contracts, active_accounts, inactive_accounts, supply_loc, quantity_BTC, CR_ratio, rational_inattention):
            price_ZUSD_current = 1.1 + rate_issuance
            liquidity_pool = supply_wanted - stability_pool


    #Floor Arbitrageurs
    if price_ZUSD_current < 1 - rate_redemption:
        np.random.seed(30*index)
        shock_redemption = np.random.normal(0, sd_redemption)
        redemption_ratio = max(1, redemption_start * (1+shock_redemption))

        supply_target = stability_pool + \
                        liquidity_pool_next * \
                        ((1-rate_redemption) / price_ZUSD)**delta
        supply_diff = supply - supply_target
        if supply_diff < redemption_ratio * liquidity_pool:
            redemption_pool = supply_diff
            #liquidity_pool = liquidity_pool - redemption_pool
            price_ZUSD_current = 1 - rate_redemption
        else:
            redemption_pool = redemption_ratio * liquidity_pool
            #liquidity_pool = (1-redemption_ratio)*liquidity_pool
            price_ZUSD_current = calculate_price(price_ZUSD, liquidity_pool, liquidity_pool_next)

        remaining = redemption_pool
        i = 0
        while remaining > 0 and i < len(active_accounts):
          account = index2address(accounts, active_accounts, i)
          balance = contracts.zusdToken.balanceOf(account) / 1e18
          redemption = min(balance, remaining)
          if redemption > 0:
              tx = redeem_loc(accounts, contracts, 0, price_BTC_current)
              if tx:
                  remove_accounts_from_events(
                    accounts,
                    active_accounts,
                    inactive_accounts,
                    filter(lambda e: e['coll'] == 0, tx.events['LoCUpdated']),
                    '_borrower'
                  )
                  remaining = remaining - redemption
          i = i + 1


    #Redemption Fee
    redemption_fee = redemption_pool * (rate_redemption + redemption_pool / supply)

    return [price_ZUSD_current, redemption_pool, redemption_fee, issuance_ZUSD_stabilizer]

"""# ZERO Market"""

def ZERO_market(index, data):
    #quantity_ZERO = (ZERO_total_supply/3)*(1-0.5**(index/period))
    np.random.seed(2+3*index)
    if index <= month:
        price_ZERO_current = price_ZERO[index-1]
        annualized_earning = (index/month)**0.5 * np.random.normal(200000000,500000)
    else:
        revenue_issuance = sum(data['issuance_fee'][index - month:index])
        revenue_redemption = sum(data['redemption_fee'][index - month:index])
        annualized_earning = 365 * (revenue_issuance+revenue_redemption) / 30
        #discounting factor to factor in the risk in early days
        discount=index/period
        price_ZERO_current = discount * PE_ratio * annualized_earning / ZERO_total_supply

    #MC_ZERO_current = price_ZERO_current * quantity_ZERO

    return [price_ZERO_current, annualized_earning]
