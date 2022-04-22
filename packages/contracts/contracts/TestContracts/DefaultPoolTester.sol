// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

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
