// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../ActivePool.sol";

contract ActivePoolTester is ActivePool {

    using SafeMath for uint256;
    
    function unprotectedIncreaseZUSDDebt(uint256 _amount) external {
        ZUSDDebt += _amount;
    }

    function unprotectedPayable() external payable {
        RBTC += msg.value;
    }
}
