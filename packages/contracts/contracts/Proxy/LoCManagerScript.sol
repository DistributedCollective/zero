// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/ILoCManager.sol";


contract LoCManagerScript is CheckContract {
    string constant public NAME = "LoCManagerScript";

    ILoCManager immutable locManager;

    constructor(ILoCManager _locManager) public {
        checkContract(address(_locManager));
        locManager = _locManager;
    }

    function redeemCollateral(
        uint _ZUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint _partialRedemptionHintNICR,
        uint _maxIterations,
        uint _maxFee
    ) external returns (uint) {
        locManager.redeemCollateral(
            _ZUSDAmount,
            _firstRedemptionHint,
            _upperPartialRedemptionHint,
            _lowerPartialRedemptionHint,
            _partialRedemptionHintNICR,
            _maxIterations,
            _maxFee
        );
    }
}
