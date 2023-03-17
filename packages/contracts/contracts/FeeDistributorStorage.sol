// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IFeeSharingCollector.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ITroveManager.sol";
import "./Interfaces/IWrbtc.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Dependencies/Ownable.sol";

contract FeeDistributorStorage is Ownable {
    string public constant NAME = "FeeDistributor";

    // --- Connected contract declarations ---

    IFeeSharingCollector public feeSharingCollector;

    IZEROStaking public zeroStaking;

    IBorrowerOperations public borrowerOperations;

    ITroveManager public troveManager;

    IWrbtc public wrbtc;

    IZUSDToken public zusdToken;

    address public activePoolAddress;

    //pct of fees sent to feeSharingCollector address
    uint256 public FEE_TO_FEE_SHARING_COLLECTOR;
}
