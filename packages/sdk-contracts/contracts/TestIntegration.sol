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
        Borrower.openCreditLineInZusd(
            _maxFeePercentage,
            _ZUSDAmount,
            _upperHint,
            _lowerHint,
            borrowerContractAddress
        );
    }
}
