// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../libraries/BorrowerLib.sol";
import "../libraries/LiquidationLib.sol";
import "../libraries/StabilityPoolLib.sol";
import "../libraries/LoCStatisticsLib.sol";

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

    function testProvideToSP(uint256 _amount) external {
        StabilityPoolLib.provideToSP(_amount, libraryContractAddress);
    }

    function testWithdrawFromSP(uint256 _amount) external {
        StabilityPoolLib.withdrawFromSP(_amount, libraryContractAddress);
    }

    function testWithdrawRBTCGainToLoC() external {
        StabilityPoolLib.withdrawRBTCGainToLoC(libraryContractAddress);
    }

    function testGetNominalICR(address _borrower) external view returns (uint256 collateralRatio) {
        return LoCStatisticsLib.getNominalICR(libraryContractAddress, _borrower);
    }

    function testGetEntireDebtAndColl(address _borrower)
        external
        view
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingRBTCReward
        )
    {
        return LoCStatisticsLib.getEntireDebtAndColl(libraryContractAddress, _borrower);
    }

    function testCalculateBorrowingFee(uint256 _ZUSDDebt)
        external
        view
        returns (uint256 borrowingFee)
    {
        return LoCStatisticsLib.calculateBorrowingFee(libraryContractAddress, _ZUSDDebt);
    }
}
