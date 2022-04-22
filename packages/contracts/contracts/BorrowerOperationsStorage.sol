// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./Interfaces/IActivePool.sol";
import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ITroveManager.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/ISortedTroves.sol";
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

    ITroveManager public troveManager;

    address stabilityPoolAddress;

    address gasPoolAddress;

    ICollSurplusPool collSurplusPool;

    IZEROStaking public zeroStaking;
    address public zeroStakingAddress;

    IZUSDToken public zusdToken;

    // A doubly linked list of Troves, sorted by their collateral ratios
    ISortedTroves public sortedTroves;

    IMasset public masset;
    IFeeDistributor public feeDistributor;

}