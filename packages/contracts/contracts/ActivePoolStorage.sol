// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./Dependencies/Ownable.sol";

/**
 * @title Active Pool Storage
 * @dev Stores Active Pool required addresses and internal RBTC and ZUSD debt states
 * Extends Ownable
 */
contract ActivePoolStorage is Ownable {
    string public constant NAME = "ActivePool";

    address public borrowerOperationsAddress;
    address public troveManagerAddress;
    address public stabilityPoolAddress;
    address public defaultPoolAddress;
    uint256 internal RBTC; // deposited ether tracker
    uint256 internal ZUSDDebt;
}
