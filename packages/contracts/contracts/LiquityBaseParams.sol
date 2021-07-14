// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/ILiquityBaseParams.sol";
import "./Dependencies/BaseMath.sol";
import "./Dependencies/LiquityMath.sol";

contract LiquityBaseParams is ILiquityBaseParams, BaseMath {
    using SafeMath for uint;

    // Minimum collateral ratio for individual troves
    uint override public MCR = 1100000000000000000; // 110%

    // Critical system collateral ratio. If the system's total collateral ratio (TCR) falls below the CCR, Recovery Mode is triggered.
    uint override public CCR = 1500000000000000000; // 150%

    uint override public PERCENT_DIVISOR = 200; // dividing by 200 yields 0.5%

    uint override public BORROWING_FEE_FLOOR = DECIMAL_PRECISION / 1000 * 5; // 0.5%

    /*
     * Half-life of 12h. 12h = 720 min
     * (1/2) = d^720 => d = (1/2)^(1/720)
     */
    uint override public REDEMPTION_FEE_FLOOR = DECIMAL_PRECISION / 1000 * 5; // 0.5%

    uint override public MAX_BORROWING_FEE = DECIMAL_PRECISION / 100 * 5; // 5%

}