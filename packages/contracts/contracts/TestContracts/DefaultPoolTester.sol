// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../DefaultPool.sol";

contract DefaultPoolTester is DefaultPool {
    
    using SafeMath for uint256;
    
    function unprotectedIncreaseZUSDDebt(uint _amount) external {
        ZUSDDebt  = ZUSDDebt.add(_amount);
    }

    function unprotectedPayable() external payable {
        RBTC = RBTC.add(msg.value);
    }
}
