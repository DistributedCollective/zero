// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../LoCManager.sol";
import "../BorrowerOperations.sol";
import "../StabilityPool.sol";
import "../ZUSDToken.sol";

contract EchidnaProxy {
    LoCManager locManager;
    BorrowerOperations borrowerOperations;
    StabilityPool stabilityPool;
    ZUSDToken zusdToken;

    constructor(
        LoCManager _locManager,
        BorrowerOperations _borrowerOperations,
        StabilityPool _stabilityPool,
        ZUSDToken _zusdToken
    ) public {
        locManager = _locManager;
        borrowerOperations = _borrowerOperations;
        stabilityPool = _stabilityPool;
        zusdToken = _zusdToken;
    }

    receive() external payable {
        // do nothing
    }

    // LoCManager

    function liquidatePrx(address _user) external {
        locManager.liquidate(_user);
    }

    function liquidateLoCsPrx(uint _n) external {
        locManager.liquidateLoCs(_n);
    }

    function batchLiquidateLoCsPrx(address[] calldata _locArray) external {
        locManager.batchLiquidateLoCs(_locArray);
    }

    function redeemCollateralPrx(
        uint _ZUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations,
        uint _maxFee
    ) external {
        locManager.redeemCollateral(_ZUSDAmount, _firstRedemptionHint, _upperPartialRedemptionHint, _lowerPartialRedemptionHint, _partialRedemptionHintNICR, _maxIterations, _maxFee);
    }

    // Borrower Operations
    function openLoCPrx(uint _BTC, uint _ZUSDAmount, address _upperHint, address _lowerHint, uint _maxFee) external payable {
        borrowerOperations.openLoC{value: _BTC}(_maxFee, _ZUSDAmount, _upperHint, _lowerHint);
    }

    function addCollPrx(uint _BTC, address _upperHint, address _lowerHint) external payable {
        borrowerOperations.addColl{value: _BTC}(_upperHint, _lowerHint);
    }

    function withdrawCollPrx(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
    }

    function withdrawZUSDPrx(uint _amount, address _upperHint, address _lowerHint, uint _maxFee) external {
        borrowerOperations.withdrawZUSD(_maxFee, _amount, _upperHint, _lowerHint);
    }

    function repayZUSDPrx(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.repayZUSD(_amount, _upperHint, _lowerHint);
    }

    function closeLoCPrx() external {
        borrowerOperations.closeLoC();
    }

    function adjustLoCPrx(uint _BTC, uint _collWithdrawal, uint _debtChange, bool _isDebtIncrease, address _upperHint, address _lowerHint, uint _maxFee) external payable {
        borrowerOperations.adjustLoC{value: _BTC}(_maxFee, _collWithdrawal, _debtChange, _isDebtIncrease, _upperHint, _lowerHint);
    }

    // Pool Manager
    function provideToSPPrx(uint _amount, address _frontEndTag) external {
        stabilityPool.provideToSP(_amount, _frontEndTag);
    }

    function withdrawFromSPPrx(uint _amount) external {
        stabilityPool.withdrawFromSP(_amount);
    }

    // ZUSD Token

    function transferPrx(address recipient, uint256 amount) external returns (bool) {
        return zusdToken.transfer(recipient, amount);
    }

    function approvePrx(address spender, uint256 amount) external returns (bool) {
        return zusdToken.approve(spender, amount);
    }

    function transferFromPrx(address sender, address recipient, uint256 amount) external returns (bool) {
        return zusdToken.transferFrom(sender, recipient, amount);
    }

    function increaseAllowancePrx(address spender, uint256 addedValue) external returns (bool) {
        return zusdToken.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowancePrx(address spender, uint256 subtractedValue) external returns (bool) {
        return zusdToken.decreaseAllowance(spender, subtractedValue);
    }
}
