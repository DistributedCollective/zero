// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/contracts/contracts/Interfaces/ITroveManager.sol";
import "@sovryn-zero/contracts/contracts/Interfaces/IPriceFeed.sol";

/// @title ZERO-SDK Liquidation Lib
/// @notice Library containing view functions regarding troves
library TroveStatisticsLib {
    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    /// @return collateralRatio the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.
    /// @param troveManagerContractAddress address of TroveManager contract
    function getNominalICR(address troveManagerContractAddress, address _borrower)
        internal
        view
        isContractAddress(troveManagerContractAddress)
        returns (uint256 collateralRatio)
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        return troveManager.getNominalICR(_borrower);
    }

    /// @param troveManagerContractAddress address of TroveManager contract
    /// @param _borrower address of the borrower
    /// @return debt of the troves of borrower
    /// @return coll collateral of the troves of the borrower
    /// @return pendingZUSDDebtReward sum of all ZUSD pending rewards from redistributions
    /// @return pendingRBTCReward sum of all RBTC pending rewards from redistributions
    function getEntireDebtAndColl(address troveManagerContractAddress, address _borrower)
        internal
        view
        isContractAddress(troveManagerContractAddress)
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingRBTCReward
        )
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        return troveManager.getEntireDebtAndColl(_borrower);
    }

    /// @param troveManagerContractAddress address of TroveManager contract
    /// @param _ZUSDDebt debt parameter for which a fee will be calculated against
    /// @return borrowingFee calculated borrowing fee for the corresponding debt
    function calculateBorrowingFee(address troveManagerContractAddress, uint256 _ZUSDDebt)
        internal
        view
        isContractAddress(troveManagerContractAddress)
        returns (uint256 borrowingFee)
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        return troveManager.getBorrowingFee(_ZUSDDebt);
    }

    /// @param priceFeedAddress address of PriceFeed contract
    /// @return btcPrice the current price of BTC
    function getBtcPrice(address priceFeedAddress)
        internal
        isContractAddress(priceFeedAddress)
        returns (uint256 btcPrice)
    {
        IPriceFeed priceFeed = IPriceFeed(priceFeedAddress);
        return priceFeed.fetchPrice();
    }
}
