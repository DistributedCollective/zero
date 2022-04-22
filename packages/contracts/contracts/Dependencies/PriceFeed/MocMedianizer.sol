// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./IExternalPriceFeed.sol";

interface IMoCBaseOracle {
    function peek() external view returns (bytes32, bool);
}

contract MoCMedianizer is IExternalPriceFeed {
    IMoCBaseOracle medianizer;

    constructor(address _medianizer) {
        medianizer = IMoCBaseOracle(_medianizer);
    }

    function latestAnswer() external view override returns (uint256, bool) {
        (bytes32 price, bool success) = medianizer.peek();
        return (uint256(price), success);
    }
}
