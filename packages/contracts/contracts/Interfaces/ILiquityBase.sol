// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "./IPriceFeed.sol";
import "./ILiquityBaseParams.sol";

interface ILiquityBase {
    /// @return PriceFeed contract
    function priceFeed() external view returns (IPriceFeed);

    /// @return LiquityBaseParams contract
    function liquityBaseParams() external view returns (ILiquityBaseParams);
}
