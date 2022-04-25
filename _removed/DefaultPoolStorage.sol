// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";

contract DefaultPoolStorage is Ownable {
    string constant public NAME = "DefaultPool";

    address public troveManagerAddress;
    address public activePoolAddress;
    uint256 internal RBTC;  // deposited RBTC tracker
    uint256 internal ZUSDDebt;  // debt
}
