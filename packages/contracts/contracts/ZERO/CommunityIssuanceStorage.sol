// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/Ownable.sol";
import "../Dependencies/IERC20.sol";

contract CommunityIssuanceStorage is Ownable {
    // --- Data ---

    string constant public NAME = "CommunityIssuance";

    uint256 constant MAX_BPS = 10000;

    IERC20 public sovToken;

    address public stabilityPoolAddress;

    uint256 public totalSOVIssued;

    uint256 public deploymentTime;

    uint256 public APR; //in basis points

    address public rewardManager;

    address public priceFeed;
}
