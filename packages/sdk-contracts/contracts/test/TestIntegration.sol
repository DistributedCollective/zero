// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../libraries/BorrowerLib.sol";

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
        BorrowerLib.openCreditLineInZusd(
            _maxFeePercentage,
            _ZUSDAmount,
            _upperHint,
            _lowerHint,
            borrowerContractAddress
        );
    }

    function testWithdrawZUSD(
        uint256 _maxFee,
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external {
        BorrowerLib.withdrawZUSD(
            _maxFee,
            _amount,
            _upperHint,
            _lowerHint,
            borrowerContractAddress
        );
    }

    function testRepayZUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external {
        BorrowerLib.repayZUSD(_amount, _upperHint, _lowerHint, borrowerContractAddress);
    }

    function testCloseCreditLineAndWithdrawCollateral() external {
        BorrowerLib.closeCreditLineAndWithdrawCollateral(borrowerContractAddress);
    }
}
