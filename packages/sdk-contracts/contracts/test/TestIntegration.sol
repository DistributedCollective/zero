// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../libraries/BorrowerLib.sol";
import "../libraries/LiquidationLib.sol";

contract TestIntegration {
    address private libraryContractAddress;

    constructor(address _libraryContractAddress) public {
        libraryContractAddress = _libraryContractAddress;
    }

    function testOpenCreditLine(uint256 _maxFeePercentage, uint256 _ZUSDAmount) external payable {
        BorrowerLib.openCreditLineInZusd(_maxFeePercentage, _ZUSDAmount, libraryContractAddress);
    }

    function testWithdrawZUSD(uint256 _maxFee, uint256 _amount) external {
        BorrowerLib.withdrawZUSD(_maxFee, _amount, libraryContractAddress);
    }

    function testWithdrawCollateral(uint256 _amount) external {
        BorrowerLib.withdrawCollateral(_amount, libraryContractAddress);
    }

    function testRepayZUSD(uint256 _amount) external {
        BorrowerLib.repayZUSD(_amount, libraryContractAddress);
    }

    function testAddCollateral() external payable {
        BorrowerLib.addCollateral(libraryContractAddress);
    }

    function testCloseCreditLineAndWithdrawCollateral() external {
        BorrowerLib.closeCreditLineAndWithdrawCollateral(libraryContractAddress);
    }

    function testBorrowerLiquidation(address borrower) external {
        LiquidationLib.liquidateBorrower(borrower, libraryContractAddress);
    }

    function testNPositionsLiquidation(uint256 maxLiquidations) external {
        LiquidationLib.liquidateBadPositions(libraryContractAddress, maxLiquidations);
    }

    function testRedeemCollateral(
        address _hintHelpersAddress,
        address _priceFeedAddress,
        uint256 _ZUSDAmount,
        uint256 _maxFeePercentage
    ) external {
        LiquidationLib.redeemCollateral(
            libraryContractAddress,
            _hintHelpersAddress,
            _priceFeedAddress,
            _ZUSDAmount,
            _maxFeePercentage
        );
    }
}
