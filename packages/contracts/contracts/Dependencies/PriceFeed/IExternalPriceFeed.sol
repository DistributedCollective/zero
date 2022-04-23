// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

/// @title A generic interface for external price providers  
interface IExternalPriceFeed {
    /// @dev The returned price should be 18-decimal value
    /// @return the prive value and a boolean stating if the query was successful
    function latestAnswer() external view returns (uint256, bool);
}
