// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IPriceFeed.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/PriceFeed/IExternalPriceFeed.sol";
import "./Dependencies/CheckContract.sol";

contract PriceFeedStorage is Ownable, CheckContract {
    string public constant NAME = "PriceFeed";

    IExternalPriceFeed[2] priceFeeds;

    // The last good price seen from an oracle by Zero
    uint256 public lastGoodPrice;
}
