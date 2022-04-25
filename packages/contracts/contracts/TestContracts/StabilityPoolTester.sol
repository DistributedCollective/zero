// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../StabilityPool.sol";

contract StabilityPoolTester is StabilityPool {
    
    function unprotectedPayable() external payable {
        RBTC += msg.value;
    }
}
