// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IPriceFeedSovryn.sol";
import "../Dependencies/SafeMath.sol";

/*
* PriceFeed placeholder for testnet and development. The price is simply set manually and saved in a state 
* variable. The contract does not connect to a live Chainlink price feed. 
*/
contract PriceFeedSovrynTester {
    using SafeMath for uint256;

    mapping(address => mapping(address => uint256)) public prices;

    // --- Functions ---
    // Manual external price setter.
    function setPrice(address sourceToken, address destToken, uint256 price) external {
        prices[sourceToken][destToken] = price;
    }

    function queryRate(address sourceToken, address destToken) public view returns(uint256 rate, uint256 precision) {
        return (prices[sourceToken][destToken], 1e18);
    }

    function queryReturn(
        address sourceToken,
        address destToken,
        uint256 sourceAmount
    ) public view returns (uint256 destAmount) {
        (uint256 rate, uint256 precision) = queryRate(sourceToken, destToken);
        return sourceAmount.mul(rate).div(precision);
    }
}
