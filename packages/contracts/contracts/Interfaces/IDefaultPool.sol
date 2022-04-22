// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./IPool.sol";

interface IDefaultPool is IPool {
    // --- Events ---
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event DefaultPoolZUSDDebtUpdated(uint256 _ZUSDDebt);
    event DefaultPoolRBTCBalanceUpdated(uint256 _RBTC);

    // --- Functions ---

    /// @notice Send RBTC to Active Pool
    /// @param _amount RBTC to send
    function sendRBTCToActivePool(uint256 _amount) external;
}
