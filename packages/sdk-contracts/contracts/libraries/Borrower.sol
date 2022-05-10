// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../interfaces/IBorrowerOperations.sol";

library Borrower {
    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    function openCreditLineInZusd(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint,
        address borrowerContract
    ) internal isContractAddress(borrowerContract) {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        //TODO: handle invalid contract address
        borrowerOperations.openTrove(_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint);
    }

    function withdrawZUSD(
        uint256 _maxFee,
        uint256 _amount,
        address _upperHint,
        address _lowerHint,
        address borrowerContract
    ) internal isContractAddress(borrowerContract) {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.withdrawZUSD(_maxFee, _amount, _upperHint, _lowerHint);
    }

    function repayZUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint,
        address borrowerContract
    ) internal isContractAddress(borrowerContract) {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.repayZUSD(_amount, _upperHint, _lowerHint);
    }

    function closeCreditLineAndWithdrawCollateral(address borrowerContract)
        internal
        isContractAddress(borrowerContract)
    {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.closeTrove();
    }
}
