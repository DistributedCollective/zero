// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../StabilityPool.sol";

contract StabilityPoolTester is StabilityPool {
    
    function unprotectedPayable() external payable {
        BTC = BTC.add(msg.value);
    }
}
