// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/Ownable.sol";
import "../Interfaces/IZEROToken.sol";
import "../Interfaces/IZUSDToken.sol";

contract ZEROStakingStorage is Ownable {
    // --- Data ---
    string constant public NAME = "ZEROStaking";

    mapping( address => uint) public stakes;
    uint public totalZEROStaked;

    uint public F_ETH;  // Running sum of ETH fees per-ZERO-staked
    uint public F_ZUSD; // Running sum of ZERO fees per-ZERO-staked

    // User snapshots of F_ETH and F_ZUSD, taken at the point at which their latest deposit was made
    mapping (address => Snapshot) public snapshots; 

    struct Snapshot {
        uint F_ETH_Snapshot;
        uint F_ZUSD_Snapshot;
    }
    
    IZEROToken public zeroToken;
    IZUSDToken public zusdToken;

    address public feeDistributorAddress;
    address public activePoolAddress;

}
