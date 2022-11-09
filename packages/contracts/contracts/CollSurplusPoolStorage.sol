// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import './Dependencies/Ownable.sol';

contract CollSurplusPoolStorage is Ownable {
    string public constant NAME = 'CollSurplusPool';

    address public borrowerOperationsAddress;
    address public troveManagerAddress;
    address public activePoolAddress;

    // deposited bitcoin tracker
    uint256 internal BTC;
    // Collateral surplus claimable by trove owners
    mapping(address => uint256) internal balances;
}
