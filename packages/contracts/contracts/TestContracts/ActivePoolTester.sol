// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../ActivePool.sol";

contract ActivePoolTester is ActivePool {

    
    function unprotectedIncreaseZUSDDebt(uint256 _amount) external {
        ZUSDDebt += _amount;
    }

    function unprotectedPayable() external payable {
        RBTC += msg.value;
    }
}
