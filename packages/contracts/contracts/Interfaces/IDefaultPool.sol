// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IPool.sol";

interface IDefaultPool is IPool {
    // --- Events ---
    event LoCManagerAddressChanged(address _newLoCManagerAddress);
    event DefaultPoolZUSDDebtUpdated(uint256 _ZUSDDebt);
    event DefaultPoolBTCBalanceUpdated(uint256 _BTC);

    // --- Functions ---

    /// @notice Send BTC to Active Pool
    /// @param _amount BTC to send
    function sendBTCToActivePool(uint256 _amount) external;
}
