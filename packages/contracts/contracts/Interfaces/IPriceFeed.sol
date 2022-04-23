// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

interface IPriceFeed {
    // --- Events ---
    event LastGoodPriceUpdated(uint _lastGoodPrice);

    // --- Function ---

    /// @notice Returns the latest price obtained from the Oracle. Called by Liquity functions that require a current price.
    ///         It uses the main price feed and fallback to the backup one in case of an error. If both fail return the last
    ///         good price seen.
    /// @dev It's also callable by anyone externally
    /// @return The price
    function fetchPrice() external returns (uint);
}
