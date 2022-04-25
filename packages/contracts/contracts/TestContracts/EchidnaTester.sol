// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../LiquityBaseParams.sol";
import "../TroveManager.sol";
import "../TroveManagerStorage.sol";
import "../Dependencies/TroveManagerRedeemOps.sol";
import "../BorrowerOperations.sol";
import "../ActivePool.sol";
import "../DefaultPool.sol";
import "../StabilityPool.sol";
import "../GasPool.sol";
import "../CollSurplusPool.sol";
import "../ZUSDToken.sol";
import "./PriceFeedTestnet.sol";
import "../SortedTroves.sol";
import "./EchidnaProxy.sol";
//import "../Dependencies/console.sol";

// Run with:
// rm -f fuzzTests/corpus/* # (optional)
// ~/.local/bin/echidna-test contracts/TestContracts/EchidnaTester.sol --contract EchidnaTester --config fuzzTests/echidna_config.yaml

contract EchidnaTester {
    using SafeMath for uint;

    uint256 constant private NUMBER_OF_ACTORS = 100;
    uint256 constant private INITIAL_BALANCE = 1e24;
    uint256 private MCR;
    uint256 private CCR;
    uint256 private ZUSD_GAS_COMPENSATION;

    LiquityBaseParams public liquityBaseParams;
    TroveManagerRedeemOps public troveManagerRedeemOps;
    TroveManager public troveManager;
    BorrowerOperations public borrowerOperations;
    ActivePool public activePool;
    DefaultPool public defaultPool;
    StabilityPool public stabilityPool;
    GasPool public gasPool;
    CollSurplusPool public collSurplusPool;
    ZUSDToken public zusdToken;
    PriceFeedTestnet priceFeedTestnet;
    SortedTroves sortedTroves;

    EchidnaProxy[NUMBER_OF_ACTORS] public echidnaProxies;

    uint256 private numberOfTroves;

    constructor() payable {
        liquityBaseParams = new LiquityBaseParams();
        //troveManagerRedeemOps = new TroveManagerRedeemOps();
        troveManager = new TroveManager();
        borrowerOperations = new BorrowerOperations();
        activePool = new ActivePool();
        defaultPool = new DefaultPool();
        stabilityPool = new StabilityPool();
        gasPool = new GasPool();
        zusdToken = new ZUSDToken();
        zusdToken.initialize(
            address(troveManager),
            address(stabilityPool),
            address(borrowerOperations)
        );

        collSurplusPool = new CollSurplusPool();
        priceFeedTestnet = new PriceFeedTestnet();

        sortedTroves = new SortedTroves();

        troveManager.setAddresses(
            [
                address(0),
                address(troveManagerRedeemOps),
                address(liquityBaseParams), address(borrowerOperations), 
                address(activePool), address(defaultPool), 
                address(stabilityPool), address(gasPool), address(collSurplusPool),
                address(priceFeedTestnet), address(zusdToken), 
                address(sortedTroves), address(0), address(0)
            ]);
       
        borrowerOperations.setAddresses(
            address(0),
            address(liquityBaseParams), address(troveManager), 
            address(activePool), address(defaultPool), 
            address(stabilityPool), address(gasPool), address(collSurplusPool),
            address(priceFeedTestnet), address(sortedTroves), 
            address(zusdToken), address(0));

        activePool.setAddresses(address(borrowerOperations), 
            address(troveManager), address(stabilityPool), address(defaultPool));

        defaultPool.setAddresses(address(troveManager), address(activePool));
        
        stabilityPool.setAddresses(
            address(liquityBaseParams), address(borrowerOperations), 
            address(troveManager), address(activePool), address(zusdToken), 
            address(sortedTroves), address(priceFeedTestnet), address(0));

        collSurplusPool.setAddresses(address(borrowerOperations), 
             address(troveManager), address(activePool));
    
        sortedTroves.setParams(1e18, address(troveManager), address(borrowerOperations));

        for (uint256 i = 0; i < NUMBER_OF_ACTORS; i++) {
            echidnaProxies[i] = new EchidnaProxy(troveManager, borrowerOperations, stabilityPool, zusdToken);
            (bool success, ) = address(echidnaProxies[i]).call{value: INITIAL_BALANCE}("");
            require(success);
        }

        MCR = borrowerOperations.liquityBaseParams().MCR();
        CCR = borrowerOperations.liquityBaseParams().CCR();
        ZUSD_GAS_COMPENSATION = borrowerOperations.ZUSD_GAS_COMPENSATION();
        require(MCR > 0);
        require(CCR > 0);

        // TODO:
        priceFeedTestnet.setPrice(1e22);
    }

    // TroveManager

    function liquidateExt(uint256 _i, address _user) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].liquidatePrx(_user);
    }

    function liquidateTrovesExt(uint256 _i, uint256 _n) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].liquidateTrovesPrx(_n);
    }

    function batchLiquidateTrovesExt(uint256 _i, address[] calldata _troveArray) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].batchLiquidateTrovesPrx(_troveArray);
    }

    function redeemCollateralExt(
        uint256 _i,
        uint256 _ZUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR
    ) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].redeemCollateralPrx(_ZUSDAmount, _firstRedemptionHint, _upperPartialRedemptionHint, _lowerPartialRedemptionHint, _partialRedemptionHintNICR, 0, 0);
    }

    // Borrower Operations

    function getAdjustedRBTC(uint256 actorBalance, uint256 _RBTC, uint256 ratio) internal view returns (uint) {
        uint256 price = priceFeedTestnet.getPrice();
        require(price > 0);
        uint256 minRBTC = ratio * ZUSD_GAS_COMPENSATION / price;
        require(actorBalance > minRBTC);
        uint256 RBTC = minRBTC + _RBTC % (actorBalance - minRBTC);
        return RBTC;
    }

    function getAdjustedZUSD(uint256 RBTC, uint256 _ZUSDAmount, uint256 ratio) internal view returns (uint) {
        uint256 price = priceFeedTestnet.getPrice();
        uint256 ZUSDAmount = _ZUSDAmount;
        uint256 compositeDebt = ZUSDAmount + ZUSD_GAS_COMPENSATION;
        uint256 ICR = LiquityMath._computeCR(RBTC, compositeDebt, price);
        if (ICR < ratio) {
            compositeDebt = RBTC * price / ratio;
            ZUSDAmount = compositeDebt - ZUSD_GAS_COMPENSATION;
        }
        return ZUSDAmount;
    }

    function openTroveExt(uint256 _i, uint256 _RBTC, uint256 _ZUSDAmount) public payable {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        EchidnaProxy echidnaProxy = echidnaProxies[actor];
        uint256 actorBalance = address(echidnaProxy).balance;

        // we pass in CCR instead of MCR in case it’s the first one
        uint256 RBTC = getAdjustedRBTC(actorBalance, _RBTC, CCR);
        uint256 ZUSDAmount = getAdjustedZUSD(RBTC, _ZUSDAmount, CCR);

        //console.log('RBTC', RBTC);
        //console.log('ZUSDAmount', ZUSDAmount);

        echidnaProxy.openTrovePrx(RBTC, ZUSDAmount, address(0), address(0), 0);

        numberOfTroves = troveManager.getTroveOwnersCount();
        assert(numberOfTroves > 0);
        // canary
        //assert(numberOfTroves == 0);
    }

    function openTroveRawExt(uint256 _i, uint256 _RBTC, uint256 _ZUSDAmount, address _upperHint, address _lowerHint, uint256 _maxFee) public payable {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].openTrovePrx(_RBTC, _ZUSDAmount, _upperHint, _lowerHint, _maxFee);
    }

    function addCollExt(uint256 _i, uint256 _RBTC) external payable {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        EchidnaProxy echidnaProxy = echidnaProxies[actor];
        uint256 actorBalance = address(echidnaProxy).balance;

        uint256 RBTC = getAdjustedRBTC(actorBalance, _RBTC, MCR);

        echidnaProxy.addCollPrx(RBTC, address(0), address(0));
    }

    function addCollRawExt(uint256 _i, uint256 _RBTC, address _upperHint, address _lowerHint) external payable {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].addCollPrx(_RBTC, _upperHint, _lowerHint);
    }

    function withdrawCollExt(uint256 _i, uint256 _amount, address _upperHint, address _lowerHint) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].withdrawCollPrx(_amount, _upperHint, _lowerHint);
    }

    function withdrawZUSDExt(uint256 _i, uint256 _amount, address _upperHint, address _lowerHint, uint256 _maxFee) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].withdrawZUSDPrx(_amount, _upperHint, _lowerHint, _maxFee);
    }

    function repayZUSDExt(uint256 _i, uint256 _amount, address _upperHint, address _lowerHint) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].repayZUSDPrx(_amount, _upperHint, _lowerHint);
    }

    function closeTroveExt(uint256 _i) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].closeTrovePrx();
    }

    function adjustTroveExt(uint256 _i, uint256 _RBTC, uint256 _collWithdrawal, uint256 _debtChange, bool _isDebtIncrease) external payable {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        EchidnaProxy echidnaProxy = echidnaProxies[actor];
        uint256 actorBalance = address(echidnaProxy).balance;

        uint256 RBTC = getAdjustedRBTC(actorBalance, _RBTC, MCR);
        uint256 debtChange = _debtChange;
        if (_isDebtIncrease) {
            // TODO: add current amount already withdrawn:
            debtChange = getAdjustedZUSD(RBTC, uint(_debtChange), MCR);
        }
        // TODO: collWithdrawal, debtChange
        echidnaProxy.adjustTrovePrx(RBTC, _collWithdrawal, debtChange, _isDebtIncrease, address(0), address(0), 0);
    }

    function adjustTroveRawExt(uint256 _i, uint256 _RBTC, uint256 _collWithdrawal, uint256 _debtChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint256 _maxFee) external payable {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].adjustTrovePrx(_RBTC, _collWithdrawal, _debtChange, _isDebtIncrease, _upperHint, _lowerHint, _maxFee);
    }

    // Pool Manager

    function provideToSPExt(uint256 _i, uint256 _amount, address _frontEndTag) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].provideToSPPrx(_amount, _frontEndTag);
    }

    function withdrawFromSPExt(uint256 _i, uint256 _amount) external {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        echidnaProxies[actor].withdrawFromSPPrx(_amount);
    }

    // ZUSD Token

    function transferExt(uint256 _i, address recipient, uint256 amount) external returns (bool) {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        return echidnaProxies[actor].transferPrx(recipient, amount);
    }

    function approveExt(uint256 _i, address spender, uint256 amount) external returns (bool) {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        return echidnaProxies[actor].approvePrx(spender, amount);
    }

    function transferFromExt(uint256 _i, address sender, address recipient, uint256 amount) external returns (bool) {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        return echidnaProxies[actor].transferFromPrx(sender, recipient, amount);
    }

    function increaseAllowanceExt(uint256 _i, address spender, uint256 addedValue) external returns (bool) {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        return echidnaProxies[actor].increaseAllowancePrx(spender, addedValue);
    }

    function decreaseAllowanceExt(uint256 _i, address spender, uint256 subtractedValue) external returns (bool) {
        uint256 actor = _i % NUMBER_OF_ACTORS;
        return echidnaProxies[actor].decreaseAllowancePrx(spender, subtractedValue);
    }

    // PriceFeed

    function setPriceExt(uint256 _price) external {
        bool result = priceFeedTestnet.setPrice(_price);
        assert(result);
    }

    // --------------------------
    // Invariants and properties
    // --------------------------

    function echidna_canary_number_of_troves() public view returns(bool) {
        if (numberOfTroves > 20) {
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

    function echidna_troves_order() external view returns(bool) {
        address currentTrove = sortedTroves.getFirst();
        address nextTrove = sortedTroves.getNext(currentTrove);

        while (currentTrove != address(0) && nextTrove != address(0)) {
            if (troveManager.getNominalICR(nextTrove) > troveManager.getNominalICR(currentTrove)) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            currentTrove = nextTrove;
            nextTrove = sortedTroves.getNext(currentTrove);
        }

        return true;
    }

    /**
     * Status
     * Minimum debt (gas compensation)
     * Stake > 0
     */
    function echidna_trove_properties() public view returns(bool) {
        address currentTrove = sortedTroves.getFirst();
        while (currentTrove != address(0)) {
            // Status
            if (TroveManagerStorage.Status(troveManager.getTroveStatus(currentTrove)) != TroveManagerStorage.Status.active) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            // Minimum debt (gas compensation)
            if (troveManager.getTroveDebt(currentTrove) < ZUSD_GAS_COMPENSATION) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            // Stake > 0
            if (troveManager.getTroveStake(currentTrove) == 0) {
                return false;
            }
            // Uncomment to check that the condition is meaningful
            //else return false;

            currentTrove = sortedTroves.getNext(currentTrove);
        }
        return true;
    }

    function echidna_RBTC_balances() public view returns(bool) {
        if (address(troveManager).balance > 0) {
            return false;
        }

        if (address(borrowerOperations).balance > 0) {
            return false;
        }

        if (address(activePool).balance != activePool.getRBTC()) {
            return false;
        }

        if (address(defaultPool).balance != defaultPool.getRBTC()) {
            return false;
        }

        if (address(stabilityPool).balance != stabilityPool.getRBTC()) {
            return false;
        }

        if (address(zusdToken).balance > 0) {
            return false;
        }
    
        if (address(priceFeedTestnet).balance > 0) {
            return false;
        }
        
        if (address(sortedTroves).balance > 0) {
            return false;
        }

        return true;
    }

    // TODO: What should we do with this? Should it be allowed? Should it be a canary?
    function echidna_price() public view returns(bool) {
        uint256 price = priceFeedTestnet.getPrice();
        
        if (price == 0) {
            return false;
        }
        // Uncomment to check that the condition is meaningful
        //else return false;

        return true;
    }

    // Total ZUSD matches
    function echidna_ZUSD_global_balances() public view returns(bool) {
        uint256 totalSupply = zusdToken.totalSupply();
        uint256 gasPoolBalance = zusdToken.balanceOf(address(gasPool));

        uint256 activePoolBalance = activePool.getZUSDDebt();
        uint256 defaultPoolBalance = defaultPool.getZUSDDebt();
        if (totalSupply != activePoolBalance + defaultPoolBalance) {
            return false;
        }

        uint256 stabilityPoolBalance = stabilityPool.getTotalZUSDDeposits();
        address currentTrove = sortedTroves.getFirst();
        uint256 trovesBalance;
        while (currentTrove != address(0)) {
            trovesBalance += zusdToken.balanceOf(address(currentTrove));
            currentTrove = sortedTroves.getNext(currentTrove);
        }
        // we cannot state equality because tranfers are made to external addresses too
        if (totalSupply <= stabilityPoolBalance + trovesBalance + gasPoolBalance) {
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
