// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IZeroBaseParams.sol";
import "./Dependencies/BaseMath.sol";
import "./Dependencies/ZeroMath.sol";

import "./Dependencies/Ownable.sol";
import "./Dependencies/Initializable.sol";

contract ZeroBaseParams is IZeroBaseParams, Ownable, Initializable, BaseMath {
    using SafeMath for uint256;

    /// Minimum collateral ratio for individual locs
    uint256 public override MCR;

    /// Critical system collateral ratio. If the system's total collateral ratio (TCR) falls below the CCR, Recovery Mode is triggered.
    uint256 public override CCR;

    uint256 public override PERCENT_DIVISOR;

    uint256 public override ORIGINATION_FEE_FLOOR;

    /**
     * Half-life of 12h. 12h = 720 min
     * (1/2) = d^720 => d = (1/2)^(1/720)
     */
    uint256 public override REDEMPTION_FEE_FLOOR;

    uint256 public override MAX_ORIGINATION_FEE;

    function initialize() public initializer onlyOwner {
        MCR = 1100000000000000000; // 110%
        CCR = 1500000000000000000; // 150%
        PERCENT_DIVISOR = 200; // dividing by 200 yields 0.5%
        ORIGINATION_FEE_FLOOR = (DECIMAL_PRECISION / 1000) * 5; // 0.5%
        REDEMPTION_FEE_FLOOR = (DECIMAL_PRECISION / 1000) * 5; // 0.5%
        MAX_ORIGINATION_FEE = (DECIMAL_PRECISION / 100) * 5; // 5%
    }

    function setMCR(uint256 MCR_) public onlyOwner {
        MCR = MCR_;
    }

    function setCCR(uint256 CCR_) public onlyOwner {
        CCR = CCR_;
    }

    function setPercentDivisor(uint256 PERCENT_DIVISOR_) public onlyOwner {
        PERCENT_DIVISOR = PERCENT_DIVISOR_;
    }

    function setOriginationFeeFloor(uint256 ORIGINATION_FEE_FLOOR_) public onlyOwner {
        ORIGINATION_FEE_FLOOR = ORIGINATION_FEE_FLOOR_;
    }

    function setRedemptionFeeFloor(uint256 REDEMPTION_FEE_FLOOR_) public onlyOwner {
        REDEMPTION_FEE_FLOOR = REDEMPTION_FEE_FLOOR_;
    }

    function setMaxOriginationFee(uint256 MAX_ORIGINATION_FEE_) public onlyOwner {
        MAX_ORIGINATION_FEE = MAX_ORIGINATION_FEE_;
    }
}
