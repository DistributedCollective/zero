// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IFeeSharingProxy.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ITroveManager.sol";
import "./Interfaces/IWrbtc.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Dependencies/Ownable.sol";

contract FeeDistributorStorage is Ownable {
    string constant public NAME = "FeeDistributor";

    // --- Connected contract declarations ---

    IFeeSharingProxy public sovFeeCollector;

    IZEROStaking public zeroStaking;

    IBorrowerOperations public borrowerOperations;

    ITroveManager public troveManager;

    IWrbtc public wrbtc;

    IZUSDToken public zusdToken;

    address public activePoolAddress;

    //pct of fees sent to feeSOVCollector address
    uint public FEE_TO_SOV_COLLECTOR;
}