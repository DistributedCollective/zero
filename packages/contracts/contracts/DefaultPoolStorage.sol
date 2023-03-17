// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";

contract DefaultPoolStorage is Ownable {
    string public constant NAME = "DefaultPool";

    address public troveManagerAddress;
    address public activePoolAddress;
    uint256 internal ETH; // deposited ETH tracker
    uint256 internal ZUSDDebt; // debt
}
