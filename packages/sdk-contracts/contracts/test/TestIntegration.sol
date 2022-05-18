// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../libraries/BorrowerLib.sol";

contract TestIntegration {
    address private borrowerContractAddress;

    constructor(address _borrowerContractAddress) public {
        borrowerContractAddress = _borrowerContractAddress;
    }

    function testOpenCreditLine(uint256 _maxFeePercentage, uint256 _ZUSDAmount) external {
        BorrowerLib.openCreditLineInZusd(_maxFeePercentage, _ZUSDAmount, borrowerContractAddress);
    }

    function testWithdrawZUSD(uint256 _maxFee, uint256 _amount) external {
        BorrowerLib.withdrawZUSD(_maxFee, _amount, borrowerContractAddress);
    }

    function testWithdrawCollateral(uint256 _amount) external {
        BorrowerLib.withdrawCollateral(_amount, borrowerContractAddress);
    }

    function testRepayZUSD(uint256 _amount) external {
        BorrowerLib.repayZUSD(_amount, borrowerContractAddress);
    }

    function testAddCollateral() external payable {
        BorrowerLib.addCollateral(borrowerContractAddress);
    }

    function testCloseCreditLineAndWithdrawCollateral() external {
        BorrowerLib.closeCreditLineAndWithdrawCollateral(borrowerContractAddress);
    }
}
