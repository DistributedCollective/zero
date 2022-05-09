// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IExternalPriceFeed.sol";

interface IRSKOracle {
    function getPricing() external view returns (uint256, uint256);
}

contract RskOracle is IExternalPriceFeed {
  
    IRSKOracle rskOracle;

    constructor(address _address) {
        rskOracle = IRSKOracle(_address);
    }

    function latestAnswer() external view override returns (uint256, bool) {
        (uint256 price, ) = rskOracle.getPricing();
        return (price, true);
    }
}
