// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../Dependencies/Ownable.sol";
import "../Interfaces/IZEROToken.sol";
import "../Interfaces/IZUSDToken.sol";

contract ZEROStakingStorage is Ownable {
    // --- Data ---
    string constant public NAME = "ZEROStaking";

    mapping( address => uint) public stakes;
    uint256 public totalZEROStaked;

    uint256 public F_RBTC;  // Running sum of RBTC fees per-ZERO-staked
    uint256 public F_ZUSD; // Running sum of ZERO fees per-ZERO-staked

    // User snapshots of F_RBTC and F_ZUSD, taken at the point at which their latest deposit was made
    mapping (address => Snapshot) public snapshots; 

    struct Snapshot {
        uint256 F_RBTC_Snapshot;
        uint256 F_ZUSD_Snapshot;
    }
    
    IZEROToken public zeroToken;
    IZUSDToken public zusdToken;

    address public feeDistributorAddress;
    address public activePoolAddress;

}
