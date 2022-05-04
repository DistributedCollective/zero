// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../../../contracts/contracts/Interfaces/IBorrowerOperations.sol";

library Borrower {
    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    modifier nonZeroCollateral(uint256 collateral) {
        require(msg.value > 0, "You must provide collateral");
        _;
    }

    function openCreditLineInZusd(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint,
        address borrowerContract
    ) external nonZeroCollateral(msg.value) isContractAddress(borrowerContract) {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        //TODO: handle invalid contract address
        borrowerOperations.openTrove(_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint);
    }

    function openCreditLineInNue(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint,
        address borrowerContract
    ) external nonZeroCollateral(msg.value) isContractAddress(borrowerContract) {
        IBorrowerOperations borrowerOperations = IBorrowerOperations(borrowerContract);
        //TODO: handle invalid contract address
        borrowerOperations.openNueTrove(_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint);
        (_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint);
    }

    //TODO: wait for response from Noah dev if to include the withdraw of trove into the openCredit method or in separate one
}
