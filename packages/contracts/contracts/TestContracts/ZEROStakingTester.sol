// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ZERO/ZEROStaking.sol";


contract ZEROStakingTester is ZEROStaking {
    function requireCallerIsTroveManager() external view {
        _requireCallerIsTroveManager();
    }
}
