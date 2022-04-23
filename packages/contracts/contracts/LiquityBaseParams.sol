// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "./Interfaces/ILiquityBaseParams.sol";
import "./Dependencies/BaseMath.sol";
import "./Dependencies/LiquityMath.sol";

import "./Dependencies/Ownable.sol";
import "./Dependencies/Initializable.sol";

contract LiquityBaseParams is ILiquityBaseParams, Ownable, Initializable, BaseMath {
    using SafeMath for uint;

    /// Minimum collateral ratio for individual troves
    uint override public MCR;

    /// Critical system collateral ratio. If the system's total collateral ratio (TCR) falls below the CCR, Recovery Mode is triggered.
    uint override public CCR;

    uint override public PERCENT_DIVISOR;

    uint override public BORROWING_FEE_FLOOR;

    /**
     * Half-life of 12h. 12h = 720 min
     * (1/2) = d^720 => d = (1/2)^(1/720)
     */
    uint override public REDEMPTION_FEE_FLOOR;

    uint override public MAX_BORROWING_FEE;

    function initialize() public initializer {
        MCR = 1100000000000000000; // 110%
        CCR = 1500000000000000000; // 150%
        PERCENT_DIVISOR = 200; // dividing by 200 yields 0.5%
        BORROWING_FEE_FLOOR = DECIMAL_PRECISION / 1000 * 5; // 0.5%
        REDEMPTION_FEE_FLOOR = DECIMAL_PRECISION / 1000 * 5; // 0.5%
        MAX_BORROWING_FEE = DECIMAL_PRECISION / 100 * 5; // 5%
    }

    function setMCR(uint MCR_) public onlyOwner {
        MCR = MCR_;
    }

    function setCCR(uint CCR_) public onlyOwner {
        CCR = CCR_;
    }

    function setPercentDivisor(uint PERCENT_DIVISOR_) public onlyOwner {
        PERCENT_DIVISOR = PERCENT_DIVISOR_;
    }

    function setBorrowingFeeFloor(uint BORROWING_FEE_FLOOR_) public onlyOwner {
        BORROWING_FEE_FLOOR = BORROWING_FEE_FLOOR_;
    }

    function setRedemptionFeeFloor(uint REDEMPTION_FEE_FLOOR_) public onlyOwner {
        REDEMPTION_FEE_FLOOR = REDEMPTION_FEE_FLOOR_;
    }
    
    function setMaxBorrowingFee(uint MAX_BORROWING_FEE_) public onlyOwner {
        MAX_BORROWING_FEE = MAX_BORROWING_FEE_;
    }

}