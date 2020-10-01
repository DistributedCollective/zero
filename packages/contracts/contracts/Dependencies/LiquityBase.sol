pragma solidity 0.5.16;

import "./Math.sol";

/* Base contract for CDPManager and BorrowerOperations. Contains global system constants and
common functions. */
contract LiquityBase {
    using SafeMath for uint;

    uint constant public _100pct = 1000000000000000000; // 1e18

    // Minimum collateral ratio for individual troves
    uint constant public MCR = 1100000000000000000; // 110%

    // Critical system collateral ratio. If the total system collateral (TCR) falls below the CCR, Recovery Mode is triggered.
    uint constant public  CCR = 1500000000000000000; // 150%

    // The minimum value of collateral allowed for a new deposit, in USD.
    uint constant public MIN_COLL_IN_USD = 20000000000000000000; // $20 with 18 decimals

    // Amount of CLV to be locked in gas pool on opening loans
    uint constant public CLV_GAS_COMPENSATION = 10e18;

    uint constant public PERCENT_DIVISOR = 200; // dividing by 200 equals to applying 0.5%

    // --- Gas compensation functions ---

    // Returns the composite debt (actual debt + gas compensation) of a trove, for the purpose of ICR calculation
    function _getCompositeDebt(uint _debt) internal pure returns (uint) {
        return _debt.add(CLV_GAS_COMPENSATION);
    }

    function _getNetDebt(uint _debt) internal pure returns (uint) {
        return _debt.sub(CLV_GAS_COMPENSATION);
    }

    /* Return the amount of ETH to be drawn from a trove's collateral and sent as gas compensation.
    Given by the dollar value of 0.5% of collateral */
    function _getCollGasCompensation(uint _entireColl) internal pure returns (uint) {
        return _entireColl / PERCENT_DIVISOR;
    }
}
