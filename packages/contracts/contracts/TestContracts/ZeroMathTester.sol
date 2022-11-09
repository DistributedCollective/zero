// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/ZeroMath.sol";

/* Tester contract for math functions in Math.sol library. */

contract ZeroMathTester {

    function callMax(uint _a, uint _b) external pure returns (uint) {
        return ZeroMath._max(_a, _b);
    }

    // Non-view wrapper for gas test
    function callDecPowTx(uint _base, uint _n) external returns (uint) {
        return ZeroMath._decPow(_base, _n);
    }

    // External wrapper
    function callDecPow(uint _base, uint _n) external pure returns (uint) {
        return ZeroMath._decPow(_base, _n);
    }
}
