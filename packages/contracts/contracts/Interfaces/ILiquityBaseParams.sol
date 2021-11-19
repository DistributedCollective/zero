// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ILiquityBaseParams {

    /// Minimum collateral ratio for individual troves
    function MCR() external view returns (uint);

    /// Critical system collateral ratio. If the system's total collateral ratio (TCR) falls below the CCR, Recovery Mode is triggered.
    function CCR() external view returns (uint);

    function PERCENT_DIVISOR() external view returns (uint);

    function BORROWING_FEE_FLOOR() external view returns (uint);

    /**
     * Half-life of 12h. 12h = 720 min
     * (1/2) = d^720 => d = (1/2)^(1/720)
     */
    function REDEMPTION_FEE_FLOOR() external view returns (uint);

    function MAX_BORROWING_FEE() external view returns (uint);

}