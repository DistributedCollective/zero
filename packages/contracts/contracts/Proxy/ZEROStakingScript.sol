// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IZEROStaking.sol";


contract ZEROStakingScript is CheckContract {
    IZEROStaking immutable ZEROStaking;

    constructor(address _zeroStakingAddress) public {
        checkContract(_zeroStakingAddress);
        ZEROStaking = IZEROStaking(_zeroStakingAddress);
    }

    function stake(uint _ZEROamount) external {
        ZEROStaking.stake(_ZEROamount);
    }
}
