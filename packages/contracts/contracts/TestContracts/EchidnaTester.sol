// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ZeroBaseParams.sol";
import "../LoCManager.sol";
import "../LoCManagerStorage.sol";
import "../Dependencies/LoCManagerRedeemOps.sol";
import "../BorrowerOperations.sol";
import "../ActivePool.sol";
import "../DefaultPool.sol";
import "../StabilityPool.sol";
import "../GasPool.sol";
import "../CollSurplusPool.sol";
import "../ZUSDToken.sol";
import "./PriceFeedTestnet.sol";
import "../SortedLoCs.sol";
import "./EchidnaProxy.sol";
//import "../Dependencies/console.sol";

// Run with:
// rm -f fuzzTests/corpus/* # (optional)
// ~/.local/bin/echidna-test contracts/TestContracts/EchidnaTester.sol --contract EchidnaTester --config fuzzTests/echidna_config.yaml

contract EchidnaTester {
    using SafeMath for uint;

    uint constant private NUMBER_OF_ACTORS = 100;
    uint constant private INITIAL_BALANCE = 1e24;
    uint private MCR;
    uint private CCR;
    uint private ZUSD_GAS_COMPENSATION;

    ZeroBaseParams public zeroBaseParams;
    LoCManagerRedeemOps public locManagerRedeemOps;
    LoCManager public locManager;
    BorrowerOperations public borrowerOperations;
    ActivePool public activePool;
    DefaultPool public defaultPool;
    StabilityPool public stabilityPool;
    GasPool public gasPool;
    CollSurplusPool public collSurplusPool;
    ZUSDToken public zusdToken;
    PriceFeedTestnet priceFeedTestnet;
    SortedLoCs sortedLoCs;

    EchidnaProxy[NUMBER_OF_ACTORS] public echidnaProxies;

    uint private numberOfLoCs;

    constructor() public payable {
        zeroBaseParams = new ZeroBaseParams();
        locManagerRedeemOps = new LoCManagerRedeemOps();
        locManager = new LoCManager();
        borrowerOperations = new BorrowerOperations();
        activePool = new ActivePool();
        defaultPool = new DefaultPool();
        stabilityPool = new StabilityPool();
        gasPool = new GasPool();
        zusdToken = new ZUSDToken();
        zusdToken.initialize(
            address(locManager),
            address(stabilityPool),
            address(borrowerOperations)
        );

        collSurplusPool = new CollSurplusPool();
        priceFeedTestnet = new PriceFeedTestnet();

        sortedLoCs = new SortedLoCs();

        locManager.setAddresses(
            address(0),
            address(locManagerRedeemOps),
            address(zeroBaseParams), address(borrowerOperations), 
            address(activePool), address(defaultPool), 
            address(stabilityPool), address(gasPool), address(collSurplusPool),
            address(priceFeedTestnet), address(zusdToken), 
            address(sortedLoCs), address(0), address(0));
       
        borrowerOperations.setAddresses(
            address(0),
            address(zeroBaseParams), address(locManager), 
            address(activePool), address(defaultPool), 
            address(stabilityPool), address(gasPool), address(collSurplusPool),
            address(priceFeedTestnet), address(sortedLoCs), 
            address(zusdToken), address(0));

        activePool.setAddresses(address(borrowerOperations), 
            address(locManager), address(stabilityPool), address(defaultPool));

        defaultPool.setAddresses(address(locManager), address(activePool));
        
        stabilityPool.setAddresses(
            address(zeroBaseParams), address(borrowerOperations), 
            address(locManager), address(activePool), address(zusdToken), 
            address(sortedLoCs), address(priceFeedTestnet), address(0));

        collSurplusPool.setAddresses(address(borrowerOperations), 
             address(locManager), address(activePool));
    
        sortedLoCs.setParams(1e18, address(locManager), address(borrowerOperations));

        for (uint i = 0; i < NUMBER_OF_ACTORS; i++) {
            echidnaProxies[i] = new EchidnaProxy(locManager, borrowerOperations, stabilityPool, zusdToken);
            (bool success, ) = address(echidnaProxies[i]).call{value: INITIAL_BALANCE}("");
            require(success);
        }

        MCR = borrowerOperations.zeroBaseParams().MCR();
        CCR = borrowerOperations.zeroBaseParams().CCR();
        ZUSD_GAS_COMPENSATION = borrowerOperations.ZUSD_GAS_COMPENSATION();
        require(MCR > 0);
        require(CCR > 0);

        // TODO:
        priceFeedTestnet.setPrice(1e22);
    }

    // LoCManager

    function liquidateExt(uint _i, address _user) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].liquidatePrx(_user);
    }

    function liquidateLoCsExt(uint _i, uint _n) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].liquidateLoCsPrx(_n);
    }

    function batchLiquidateLoCsExt(uint _i, address[] calldata _locArray) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].batchLiquidateLoCsPrx(_locArray);
    }

    function redeemCollateralExt(
        uint _i,
        uint _ZUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR
    ) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].redeemCollateralPrx(_ZUSDAmount, _firstRedemptionHint, _upperPartialRedemptionHint, _lowerPartialRedemptionHint, _partialRedemptionHintNICR, 0, 0);
    }

    // Borrower Operations

    function getAdjustedBTC(uint actorBalance, uint _BTC, uint ratio) internal view returns (uint) {
        uint price = priceFeedTestnet.getPrice();
        require(price > 0);
        uint minBTC = ratio.mul(ZUSD_GAS_COMPENSATION).div(price);
        require(actorBalance > minBTC);
        uint BTC = minBTC + _BTC % (actorBalance - minBTC);
        return BTC;
    }

    function getAdjustedZUSD(uint BTC, uint _ZUSDAmount, uint ratio) internal view returns (uint) {
        uint price = priceFeedTestnet.getPrice();
        uint ZUSDAmount = _ZUSDAmount;
        uint compositeDebt = ZUSDAmount.add(ZUSD_GAS_COMPENSATION);
        uint ICR = ZeroMath._computeCR(BTC, compositeDebt, price);
        if (ICR < ratio) {
            compositeDebt = BTC.mul(price).div(ratio);
            ZUSDAmount = compositeDebt.sub(ZUSD_GAS_COMPENSATION);
        }
        return ZUSDAmount;
    }

    function openLoCExt(uint _i, uint _BTC, uint _ZUSDAmount) public payable {
        uint actor = _i % NUMBER_OF_ACTORS;
        EchidnaProxy echidnaProxy = echidnaProxies[actor];
        uint actorBalance = address(echidnaProxy).balance;

        // we pass in CCR instead of MCR in case it’s the first one
        uint BTC = getAdjustedBTC(actorBalance, _BTC, CCR);
        uint ZUSDAmount = getAdjustedZUSD(BTC, _ZUSDAmount, CCR);

        //console.log('BTC', BTC);
        //console.log('ZUSDAmount', ZUSDAmount);

        echidnaProxy.openLoCPrx(BTC, ZUSDAmount, address(0), address(0), 0);

        numberOfLoCs = locManager.getLoCOwnersCount();
        assert(numberOfLoCs > 0);
        // canary
        //assert(numberOfLoCs == 0);
    }

    function openLoCRawExt(uint _i, uint _BTC, uint _ZUSDAmount, address _upperHint, address _lowerHint, uint _maxFee) public payable {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].openLoCPrx(_BTC, _ZUSDAmount, _upperHint, _lowerHint, _maxFee);
    }

    function addCollExt(uint _i, uint _BTC) external payable {
        uint actor = _i % NUMBER_OF_ACTORS;
        EchidnaProxy echidnaProxy = echidnaProxies[actor];
        uint actorBalance = address(echidnaProxy).balance;

        uint BTC = getAdjustedBTC(actorBalance, _BTC, MCR);

        echidnaProxy.addCollPrx(BTC, address(0), address(0));
    }

    function addCollRawExt(uint _i, uint _BTC, address _upperHint, address _lowerHint) external payable {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].addCollPrx(_BTC, _upperHint, _lowerHint);
    }

    function withdrawCollExt(uint _i, uint _amount, address _upperHint, address _lowerHint) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].withdrawCollPrx(_amount, _upperHint, _lowerHint);
    }

    function withdrawZUSDExt(uint _i, uint _amount, address _upperHint, address _lowerHint, uint _maxFee) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].withdrawZUSDPrx(_amount, _upperHint, _lowerHint, _maxFee);
    }

    function repayZUSDExt(uint _i, uint _amount, address _upperHint, address _lowerHint) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].repayZUSDPrx(_amount, _upperHint, _lowerHint);
    }

    function closeLoCExt(uint _i) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].closeLoCPrx();
    }

    function adjustLoCExt(uint _i, uint _BTC, uint _collWithdrawal, uint _debtChange, bool _isDebtIncrease) external payable {
        uint actor = _i % NUMBER_OF_ACTORS;
        EchidnaProxy echidnaProxy = echidnaProxies[actor];
        uint actorBalance = address(echidnaProxy).balance;

        uint BTC = getAdjustedBTC(actorBalance, _BTC, MCR);
        uint debtChange = _debtChange;
        if (_isDebtIncrease) {
            // TODO: add current amount already withdrawn:
            debtChange = getAdjustedZUSD(BTC, uint(_debtChange), MCR);
        }
        // TODO: collWithdrawal, debtChange
        echidnaProxy.adjustLoCPrx(BTC, _collWithdrawal, debtChange, _isDebtIncrease, address(0), address(0), 0);
    }

    function adjustLoCRawExt(uint _i, uint _BTC, uint _collWithdrawal, uint _debtChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint _maxFee) external payable {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].adjustLoCPrx(_BTC, _collWithdrawal, _debtChange, _isDebtIncrease, _upperHint, _lowerHint, _maxFee);
    }

    // Pool Manager

    function provideToSPExt(uint _i, uint _amount, address _frontEndTag) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].provideToSPPrx(_amount, _frontEndTag);
    }

    function withdrawFromSPExt(uint _i, uint _amount) external {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].withdrawFromSPPrx(_amount);
    }

    // ZUSD Token

    function transferExt(uint _i, address recipient, uint256 amount) external returns (bool) {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].transferPrx(recipient, amount);
    }

    function approveExt(uint _i, address spender, uint256 amount) external returns (bool) {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].approvePrx(spender, amount);
    }

    function transferFromExt(uint _i, address sender, address recipient, uint256 amount) external returns (bool) {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].transferFromPrx(sender, recipient, amount);
    }

    function increaseAllowanceExt(uint _i, address spender, uint256 addedValue) external returns (bool) {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].increaseAllowancePrx(spender, addedValue);
    }

    function decreaseAllowanceExt(uint _i, address spender, uint256 subtractedValue) external returns (bool) {
        uint actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].decreaseAllowancePrx(spender, subtractedValue);
    }

    // PriceFeed

    function setPriceExt(uint256 _price) external {
        bool result = priceFeedTestnet.setPrice(_price);
        assert(result);
    }

    // --------------------------
    // Invariants and properties
    // --------------------------

    function echidna_canary_number_of_locs() public view returns(bool) {
        if (numberOfLoCs > 20) {
            return false;
        }

        return true;
    }

    function echidna_canary_active_pool_balance() public view returns(bool) {
        if (address(activePool).balance > 0) {
            return false;
        }
        return true;
    }

    function echidna_locs_order() external view returns(bool) {
        address currentLoC = sortedLoCs.getFirst();
        address nextLoC = sortedLoCs.getNext(currentLoC);

        while (currentLoC != address(0) && nextLoC != address(0)) {
            if (locManager.getNominalICR(nextLoC) > locManager.getNominalICR(currentLoC)) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            currentLoC = nextLoC;
            nextLoC = sortedLoCs.getNext(currentLoC);
        }

        return true;
    }

    /**
     * Status
     * Minimum debt (gas compensation)
     * Stake > 0
     */
    function echidna_loc_properties() public view returns(bool) {
        address currentLoC = sortedLoCs.getFirst();
        while (currentLoC != address(0)) {
            // Status
            if (LoCManagerStorage.Status(locManager.getLoCStatus(currentLoC)) != LoCManagerStorage.Status.active) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            // Minimum debt (gas compensation)
            if (locManager.getLoCDebt(currentLoC) < ZUSD_GAS_COMPENSATION) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            // Stake > 0
            if (locManager.getLoCStake(currentLoC) == 0) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            currentLoC = sortedLoCs.getNext(currentLoC);
        }
        return true;
    }

    function echidna_BTC_balances() public view returns(bool) {
        if (address(locManager).balance > 0) {
            return false;
        }

        if (address(borrowerOperations).balance > 0) {
            return false;
        }

        if (address(activePool).balance != activePool.getBTC()) {
            return false;
        }

        if (address(defaultPool).balance != defaultPool.getBTC()) {
            return false;
        }

        if (address(stabilityPool).balance != stabilityPool.getBTC()) {
            return false;
        }

        if (address(zusdToken).balance > 0) {
            return false;
        }
    
        if (address(priceFeedTestnet).balance > 0) {
            return false;
        }
        
        if (address(sortedLoCs).balance > 0) {
            return false;
        }

        return true;
    }

    // TODO: What should we do with this? Should it be allowed? Should it be a canary?
    function echidna_price() public view returns(bool) {
        uint price = priceFeedTestnet.getPrice();
        
        if (price == 0) {
            return false;
        }
        // Uncomment to check that the condition is meaningful
        //else return false;

        return true;
    }

    // Total ZUSD matches
    function echidna_ZUSD_global_balances() public view returns(bool) {
        uint totalSupply = zusdToken.totalSupply();
        uint gasPoolBalance = zusdToken.balanceOf(address(gasPool));

        uint activePoolBalance = activePool.getZUSDDebt();
        uint defaultPoolBalance = defaultPool.getZUSDDebt();
        if (totalSupply != activePoolBalance + defaultPoolBalance) {
            return false;
        }

        uint stabilityPoolBalance = stabilityPool.getTotalZUSDDeposits();
        address currentLoC = sortedLoCs.getFirst();
        uint locsBalance;
        while (currentLoC != address(0)) {
            locsBalance += zusdToken.balanceOf(address(currentLoC));
            currentLoC = sortedLoCs.getNext(currentLoC);
        }
        // we cannot state equality because tranfers are made to external addresses too
        if (totalSupply <= stabilityPoolBalance + locsBalance + gasPoolBalance) {
            return false;
        }

        return true;
    }

    /*
    function echidna_test() public view returns(bool) {
        return true;
    }
    */
}
