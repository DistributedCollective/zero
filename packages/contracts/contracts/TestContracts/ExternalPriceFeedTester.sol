// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../Dependencies/PriceFeed/IExternalPriceFeed.sol";

interface IMoCBaseOracle {
    function peek() external view returns (bytes32, bool);
}

contract ExternalPriceFeedTester is IExternalPriceFeed {
    uint256 price;
    bool success;

    function setLatestAnswer(uint256 _price, bool _success) external {
        price = _price;
        success = _success;
    }

    function latestAnswer() external view override returns (uint256, bool) {
        return (price, success);
    }
}
