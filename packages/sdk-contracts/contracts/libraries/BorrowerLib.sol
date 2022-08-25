// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/contracts/contracts/Interfaces/IBorrowerOperations.sol";

/// @title ZERO-SDK Borrower Lib
/// @notice Library containing basic Borrowing Operations from ZERO protocol
library BorrowerLib {
    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    modifier isValueSent() {
        require(msg.value > 0);
        _;
    }

    /// @notice Open a credit line by depositing amount of rBTC as a collateral
    /// @param _maxFeePercentage maximum fee percentage that user is wishing to pay for opening the credit line
    /// @param _ZUSDAmount amount of ZUSD to be borrowed
    /// @param borrowerContract address of BorrowerOperations contract
    function openCreditLineInZusd(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address borrowerContract
    ) internal isValueSent isContractAddress(borrowerContract) {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.openTrove(_maxFeePercentage, _ZUSDAmount, msg.sender, msg.sender);
    }

    /// @notice Issues the specified amount of ZUSD to the caller
    /// Executes only if the Trove's collateralization ratio would remain above the minimum, and the resulting total collateralization ratio is above 150%.
    /// The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.
    /// @param _maxFeePercentage maximum fee percentage that user is wishing to pay for opening the credit line
    /// @param _amount amount of ZUSD to be withdrawn
    /// @param borrowerContract address of BorrowerOperations contract
    function withdrawZUSD(
        uint256 _maxFeePercentage,
        uint256 _amount,
        address borrowerContract
    ) internal isContractAddress(borrowerContract) {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.withdrawZUSD(_maxFeePercentage, _amount, msg.sender, msg.sender);
    }

    /// @notice withdraws `_amount` of collateral from the caller’s Trove.
    /// Executes only if the user has an active Trove, the withdrawal would not pull the user’s Trove below the minimum collateralization ratio,
    /// and the resulting total collateralization ratio of the system is above 150%.
    /// @param _amount collateral amount to withdraw
    /// @param borrowerContract address of BorrowerOperations contract
    function withdrawCollateral(uint256 _amount, address borrowerContract)
        internal
        isContractAddress(borrowerContract)
    {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.withdrawColl(_amount, msg.sender, msg.sender);
    }

    /// @notice Repays ZUSD towards the open credit line of the borrower
    /// @param _amount amount of ZUSD to be repayed
    /// @param borrowerContract address of BorrowerOperations contract
    function repayZUSD(uint256 _amount, address borrowerContract)
        internal
        isContractAddress(borrowerContract)
    {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.repayZUSD(_amount, msg.sender, msg.sender);
    }

    /// @notice adds the received rBTC to the caller's active Trove.
    /// @param borrowerContract address of BorrowerOperations contract
    function addCollateral(address borrowerContract)
        internal
        isValueSent
        isContractAddress(borrowerContract)
    {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.addColl(msg.sender, msg.sender);
    }

    /// @notice Closes the credit line and withdraws the collateral
    /// @param borrowerContract address of BorrowerOperations contract
    function closeCreditLineAndWithdrawCollateral(address borrowerContract)
        internal
        isContractAddress(borrowerContract)
    {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        borrowerOperations.closeTrove();
    }
}
