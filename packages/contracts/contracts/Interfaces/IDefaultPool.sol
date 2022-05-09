// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IPool.sol";

interface IDefaultPool is IPool {
    // --- Events ---
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event DefaultPoolZUSDDebtUpdated(uint256 _ZUSDDebt);
    event DefaultPoolETHBalanceUpdated(uint256 _ETH);

    // --- Functions ---

    /// @notice Send ETH to Active Pool
    /// @param _amount ETH to send
    function sendETHToActivePool(uint256 _amount) external;
}
