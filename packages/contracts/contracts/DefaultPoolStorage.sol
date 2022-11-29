// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";

contract DefaultPoolStorage is Ownable {
    string constant public NAME = "DefaultPool";

    address public locManagerAddress;
    address public activePoolAddress;
    uint256 internal BTC;  // deposited BTC tracker
    uint256 internal ZUSDDebt;  // debt
}
