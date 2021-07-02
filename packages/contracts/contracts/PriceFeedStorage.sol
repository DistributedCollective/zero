// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IPriceFeed.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/PriceFeed/IExternalPriceFeed.sol";

contract PriceFeedStorage is Ownable {
    string public constant NAME = "PriceFeed";

    IExternalPriceFeed[2] priceFeeds;

    // The last good price seen from an oracle by Liquity
    uint256 public lastGoodPrice;

    event LastGoodPriceUpdated(uint256 _lastGoodPrice);
    event PriceFeedBroken(uint8 index);
}