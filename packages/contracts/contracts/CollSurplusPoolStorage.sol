// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import './Dependencies/Ownable.sol';

contract CollSurplusPoolStorage is Ownable {
    string public constant NAME = 'CollSurplusPool';

    address public borrowerOperationsAddress;
    address public troveManagerAddress;
    address public activePoolAddress;

    // deposited ether tracker
    uint256 internal RBTC;
    // Collateral surplus claimable by trove owners
    mapping(address => uint256) internal balances;
}
