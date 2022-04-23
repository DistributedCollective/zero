// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IZEROStaking.sol";


contract ZEROStakingScript is CheckContract {
    IZEROStaking immutable ZEROStaking;

    constructor(address _zeroStakingAddress) {
        checkContract(_zeroStakingAddress);
        ZEROStaking = IZEROStaking(_zeroStakingAddress);
    }

    function stake(uint _ZEROamount) external {
        ZEROStaking.stake(_ZEROamount);
    }
}
