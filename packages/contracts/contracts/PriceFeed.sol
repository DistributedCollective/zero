// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IPriceFeed.sol";
import "./Dependencies/CheckContract.sol";
import "./PriceFeedStorage.sol";

/// @title The system price feed adapter
/// @notice The PriceFeed relies upon a main oracle and a secondary as a fallback in case of error
contract PriceFeed is PriceFeedStorage, IPriceFeed {
    event LastGoodPriceUpdated(uint256 _lastGoodPrice);
    event PriceFeedBroken(uint8 index, address priceFeedAddress);
    event PriceFeedUpdated(uint8 index, address newPriceFeedAddress);

    // --- Dependency setters ---

    function setAddresses(address _mainPriceFeed, address _backupPriceFeed) external onlyOwner {
        uint256 latestPrice = setAddress(0, _mainPriceFeed);
        setAddress(1, _backupPriceFeed);

        _storePrice(latestPrice);
    }

    // --- Functions ---

    /// @notice Returns the latest price obtained from the Oracle. Called by Zero functions that require a current price.
    ///         It uses the main price feed and fallback to the backup one in case of an error. If both fail return the last
    ///         good price seen.
    /// @dev It's also callable by anyone externally
    /// @return The price
    function fetchPrice() external override returns (uint256) {
        for (uint8 index = 0; index < 2; index++) {
            (uint256 price, bool success) = priceFeeds[index].latestAnswer();
            if (success) {
                _storePrice(price);
                return price;
            } else {
                emit PriceFeedBroken(index, address(priceFeeds[index]));
            }
        }
        return lastGoodPrice;
    }

    /// @notice Allows users to setup the main and the backup price feeds
    /// @param _index the oracle to be configured
    /// @param _newPriceFeed address where an IExternalPriceFeed implementation is located
    /// @return price the latest price of the inserted price feed
    function setAddress(uint8 _index, address _newPriceFeed) public onlyOwner returns (uint256) {
        require(_index < priceFeeds.length, "Out of bounds when setting the price feed");
        checkContract(_newPriceFeed);
        priceFeeds[_index] = IExternalPriceFeed(_newPriceFeed);
        (uint256 price, bool success) = priceFeeds[_index].latestAnswer();
        require(success, "PriceFeed: Price feed must be working");
        emit PriceFeedUpdated(_index, _newPriceFeed);
        return price;
    }

    // --- Helper functions ---
    function _storePrice(uint256 _currentPrice) internal {
        lastGoodPrice = _currentPrice;
        emit LastGoodPriceUpdated(_currentPrice);
    }
}
