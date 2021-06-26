// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../PriceFeed.sol";

contract PriceFeedTester is PriceFeed {
    function setLastGoodPrice(uint256 _lastGoodPrice) external {
        lastGoodPrice = _lastGoodPrice;
    }
}
