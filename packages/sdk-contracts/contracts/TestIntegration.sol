// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "./libraries/Borrower.sol";

contract TestIntegration {
    address private borrowerContractAddress;

    constructor(address _borrowerContractAddress) public {
        borrowerContractAddress = _borrowerContractAddress;
    }

    function testOpenCreditLine(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external {
        Borrower.openCreditLineInNue(
            _maxFeePercentage,
            _ZUSDAmount,
            _upperHint,
            _lowerHint,
            borrowerContractAddress
        );
    }

    //TODO: 1. research mock contracts (smock) for off chain testing
    //TODO: 2. research fixtures (for on chain testing)
    //TODO: 3. we need to have isolated folder/repo for testing the package (decide where TestIntegration.sol smart contract will reside)
}
