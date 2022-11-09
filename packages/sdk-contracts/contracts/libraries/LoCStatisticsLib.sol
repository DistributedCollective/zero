// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/contracts/contracts/Interfaces/ILoCManager.sol";

/// @title ZERO-SDK Liquidation Lib
/// @notice Library containing view functions regarding locs
library LoCStatisticsLib {
    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    /// @return collateralRatio the nominal collateral ratio (ICR) of a given LoC, without the price. Takes a LoC's pending coll and debt rewards from redistributions into account.
    /// @param locManagerContractAddress address of LoCManager contract
    function getNominalICR(address locManagerContractAddress, address _borrower)
        internal
        view
        isContractAddress(locManagerContractAddress)
        returns (uint256 collateralRatio)
    {
        ILoCManager locManager = ILoCManager(locManagerContractAddress);
        return locManager.getNominalICR(_borrower);
    }

    /// @param locManagerContractAddress address of LoCManager contract
    /// @param _borrower address of the borrower
    /// @return debt of the locs of borrower
    /// @return coll collateral of the locs of the borrower
    /// @return pendingZUSDDebtReward sum of all ZUSD pending rewards from redistributions
    /// @return pendingRBTCReward sum of all RBTC pending rewards from redistributions
    function getEntireDebtAndColl(address locManagerContractAddress, address _borrower)
        internal
        view
        isContractAddress(locManagerContractAddress)
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingRBTCReward
        )
    {
        ILoCManager locManager = ILoCManager(locManagerContractAddress);
        return locManager.getEntireDebtAndColl(_borrower);
    }

    /// @param locManagerContractAddress address of LoCManager contract
    /// @param _ZUSDDebt debt parameter for which a fee will be calculated against
    /// @return borrowingFee calculated borrowing fee for the corresponding debt
    function calculateBorrowingFee(address locManagerContractAddress, uint256 _ZUSDDebt)
        internal
        view
        isContractAddress(locManagerContractAddress)
        returns (uint256 borrowingFee)
    {
        ILoCManager locManager = ILoCManager(locManagerContractAddress);
        return locManager.getBorrowingFee(_ZUSDDebt);
    }
}
