// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IPriceFeed.sol";
import "./IZeroBaseParams.sol";

interface IZeroBase {
    /// @return PriceFeed contract
    function priceFeed() external view returns (IPriceFeed);

    /// @return ZeroBaseParams contract
    function zeroBaseParams() external view returns (IZeroBaseParams);
}
