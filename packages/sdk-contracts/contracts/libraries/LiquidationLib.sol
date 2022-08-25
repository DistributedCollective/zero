// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/contracts/contracts/Interfaces/ITroveManager.sol";
import "@sovryn-zero/contracts/contracts/HintHelpers.sol";
import "@sovryn-zero/contracts/contracts/PriceFeed.sol";

/// @title ZERO-SDK Liquidation Lib
/// @notice Library containing basic Liquidation and redemption operations
library LiquidationLib {
    /// @dev Three hints returned from a helper contract function, aim to ease
    ///     the traversal of the troves, resulting in more eficient operaitons and less gas cost
    /// - `firstRedemptionHint` is the address of the first Trove with ICR >= MCR (i.e. the first Trove that will be redeemed).
    /// - `partialRedemptionHintNICR` is the final nominal ICR of the last Trove of the sequence after being hit
    ///      by partial redemption or zero in case of no partial redemption.
    /// - `truncatedZUSDamount` is the maximum amount that can be redeemed out of the the provided `_ZUSDamount`.
    ///     This can be lower than `_ZUSDamount` when redeeming the full amount would leave the last Trove of the redemption
    ///     sequence with less net debt than the minimum allowed value (i.e. MIN_NET_DEBT).
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

    /// @notice Redeems the corresponding ZUSD amount into rBTC
    /// @param _troveManagerContractAddress address of TroveManager contract
    /// @param _hintHelpersAddress address of the HintHelpers contract
    /// @param _priceFeedAddress address of PriceFeed contract
    /// @param _ZUSDAmount amount of ZUSD to be redeemed
    /// @param _maxFeePercentage max fee percentage of the ZUSD amount. If above this percentage, transaction will revert
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
