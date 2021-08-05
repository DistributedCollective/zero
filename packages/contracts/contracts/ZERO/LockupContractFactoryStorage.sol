// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/Ownable.sol";

contract LockupContractFactoryStorage is Ownable {
    // --- Data ---
    string constant public NAME = "LockupContractFactory";

    uint constant public SECONDS_IN_ONE_YEAR = 31536000;

    address public zeroTokenAddress;
    
    mapping (address => address) public lockupContractToDeployer;
}
