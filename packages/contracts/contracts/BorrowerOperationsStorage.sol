// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IActivePool.sol";
import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ILoCManager.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/ISortedLoCs.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/Ownable.sol";

interface IMasset {
    function onTokensMinted(
        uint256 _orderAmount,
        address _tokenAddress,
        bytes calldata _userData
    ) external;

    function redeemByBridge(
        address _bAsset,
        uint256 _massetQuantity,
        address _recipient
    ) external returns (uint256 massetRedeemed);
}

contract BorrowerOperationsStorage is Ownable {
    string constant public NAME = "BorrowerOperations";

    // --- Connected contract declarations ---

    ILoCManager public locManager;

    address stabilityPoolAddress;

    address gasPoolAddress;

    ICollSurplusPool collSurplusPool;

    IZEROStaking public zeroStaking;
    address public zeroStakingAddress;

    IZUSDToken public zusdToken;

    // A doubly linked list of LoCs, sorted by their collateral ratios
    ISortedLoCs public sortedLoCs;

    IMasset public masset;
    IFeeDistributor public feeDistributor;

}