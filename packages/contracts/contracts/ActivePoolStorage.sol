// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "./Dependencies/Ownable.sol";
contract ActivePoolStorage is Ownable {
    string public constant NAME = "ActivePool";

    address public borrowerOperationsAddress;
    address public troveManagerAddress;
    address public stabilityPoolAddress;
    address public defaultPoolAddress;
    uint256 internal ETH; // deposited ether tracker
    uint256 internal LUSDDebt;
}
