// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IBorrowerOperations.sol";


contract BorrowerOperationsScript is CheckContract {
    IBorrowerOperations immutable borrowerOperations;

    constructor(IBorrowerOperations _borrowerOperations) {
        checkContract(address(_borrowerOperations));
        borrowerOperations = _borrowerOperations;
    }

    function openTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable {
        borrowerOperations.openTrove{ value: msg.value }(_maxFee, _ZUSDAmount, _upperHint, _lowerHint);
    }

    function addColl(address _upperHint, address _lowerHint) external payable {
        borrowerOperations.addColl{ value: msg.value }(_upperHint, _lowerHint);
    }

    function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
    }

    function withdrawZUSD(uint256 _maxFee, uint256 _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawZUSD(_maxFee, _amount, _upperHint, _lowerHint);
    }

    function repayZUSD(uint256 _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.repayZUSD(_amount, _upperHint, _lowerHint);
    }

    function closeTrove() external {
        borrowerOperations.closeTrove();
    }

    function adjustTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable {
        borrowerOperations.adjustTrove{ value: msg.value }(_maxFee, _collWithdrawal, _debtChange, isDebtIncrease, _upperHint, _lowerHint);
    }

    function claimCollateral() external {
        borrowerOperations.claimCollateral();
    }
}
