// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/contracts/contracts/Interfaces/ITroveManager.sol";
import "@sovryn-zero/contracts/contracts/HintHelpers.sol";
import "@sovryn-zero/contracts/contracts/PriceFeed.sol";

library LiquidationLib {
    struct RedemptionHints {
        address firstRedemptionHint;
        uint256 partialRedemptionHintNICR;
        uint256 truncatedZUSDamount;
    }

    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    /// @notice Liquidates credit line of the borrower
    /// @dev Closes the trove if its ICR is lower than the minimum collateral ratio.
    /// @param borrowerAddress address of the borrower to be liquidated
    /// @param troveManagerContractAddress address of TroveManager contract
    function liquidateBorrower(address borrowerAddress, address troveManagerContractAddress)
        internal
        isContractAddress(troveManagerContractAddress)
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        troveManager.liquidate(borrowerAddress);
    }

    /// @notice Liquidates bad credit lines in the protocol
    /// @dev Closes a maximum number of n under-collateralized Troves,
    /// starting from the one with the lowest collateral ratio in the system, and moving upwards
    /// @param maxLiquidations address of the borrower to be liquidated
    /// @param troveManagerContractAddress address of TroveManager contract
    function liquidateBadPositions(address troveManagerContractAddress, uint256 maxLiquidations)
        internal
        isContractAddress(troveManagerContractAddress)
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        troveManager.liquidateTroves(maxLiquidations);
    }

    function redeemCollateral(
        address _troveManagerContractAddress,
        address _hintHelpersAddress,
        address _priceFeedAddress,
        uint256 _ZUSDAmount,
        uint256 _maxFeePercentage
    ) internal isContractAddress(_troveManagerContractAddress) {
        RedemptionHints memory redemptionHints;
        ITroveManager troveManager = ITroveManager(_troveManagerContractAddress);
        HintHelpers hintHelpers = HintHelpers(_hintHelpersAddress);
        PriceFeed priceFeed = PriceFeed(_priceFeedAddress);
        uint256 latestPrice = priceFeed.fetchPrice();
        (
            redemptionHints.firstRedemptionHint,
            redemptionHints.partialRedemptionHintNICR,
            redemptionHints.truncatedZUSDamount
        ) = hintHelpers.getRedemptionHints(_ZUSDAmount, latestPrice, 0);

        troveManager.redeemCollateral(
            redemptionHints.truncatedZUSDamount,
            redemptionHints.firstRedemptionHint,
            msg.sender,
            msg.sender,
            redemptionHints.partialRedemptionHintNICR,
            0,
            _maxFeePercentage
        );
    }
}
