// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import './Dependencies/SafeMath.sol';
import './Dependencies/Ownable.sol';

contract CollSurplusPoolStorage is Ownable {
    using SafeMath for uint256;

    string public constant NAME = 'CollSurplusPool';

    address public borrowerOperationsAddress;
    address public troveManagerAddress;
    address public activePoolAddress;

    // deposited ether tracker
    uint256 internal ETH;
    // Collateral surplus claimable by trove owners
    mapping(address => uint256) internal balances;
}
