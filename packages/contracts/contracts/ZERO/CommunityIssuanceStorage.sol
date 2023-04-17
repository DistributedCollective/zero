// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/Ownable.sol";
import "../Dependencies/IERC20.sol";
import "../Interfaces/IPriceFeedSovryn.sol";
import "../Dependencies/Initializable.sol";

contract CommunityIssuanceStorage is Ownable, Initializable {
    // --- Data ---

    string constant public NAME = "CommunityIssuance";

    uint256 constant MAX_BPS = 10000;

    IERC20 public sovToken;

    IERC20 public zusdToken;

    address public stabilityPoolAddress;

    uint256 public totalSOVIssued;

    uint256 public lastIssuanceTime;

    uint256 public APR; //in basis points

    address public rewardManager;

    IPriceFeedSovryn public priceFeed;
}
