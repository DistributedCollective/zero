// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IBorrowerOperations.sol";


contract BorrowerOperationsScript is CheckContract {
    IBorrowerOperations immutable borrowerOperations;

    constructor(IBorrowerOperations _borrowerOperations) public {
        checkContract(address(_borrowerOperations));
        borrowerOperations = _borrowerOperations;
    }

    function openLoC(uint _maxFee, uint _ZUSDAmount, address _upperHint, address _lowerHint) external payable {
        borrowerOperations.openLoC{ value: msg.value }(_maxFee, _ZUSDAmount, _upperHint, _lowerHint);
    }

    function addColl(address _upperHint, address _lowerHint) external payable {
        borrowerOperations.addColl{ value: msg.value }(_upperHint, _lowerHint);
    }

    function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawColl(_amount, _upperHint, _lowerHint);
    }

    function withdrawZUSD(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.withdrawZUSD(_maxFee, _amount, _upperHint, _lowerHint);
    }

    function repayZUSD(uint _amount, address _upperHint, address _lowerHint) external {
        borrowerOperations.repayZUSD(_amount, _upperHint, _lowerHint);
    }

    function closeLoC() external {
        borrowerOperations.closeLoC();
    }

    function adjustLoC(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable {
        borrowerOperations.adjustLoC{ value: msg.value }(_maxFee, _collWithdrawal, _debtChange, isDebtIncrease, _upperHint, _lowerHint);
    }

    function claimCollateral() external {
        borrowerOperations.claimCollateral();
    }
}
