// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IPool.sol";

/**
 * The Active Pool holds the RBTC collateral and ZUSD debt (but not ZUSD tokens) for all active troves.
 *
 * When a trove is liquidated, it's RBTC and ZUSD debt are transferred from the Active Pool, to either the
 * Stability Pool, the Default Pool, or both, depending on the liquidation conditions.
 *
 */
interface IActivePool is IPool {
    // --- Events ---
    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolZUSDDebtUpdated(uint _ZUSDDebt);
    event ActivePoolRBTCBalanceUpdated(uint _RBTC);

    // --- Functions ---

    /// @notice Send RBTC amount to given account. Updates ActivePool balance. Only callable by BorrowerOperations, TroveManager or StabilityPool.
    /// @param _account account to receive the RBTC amount
    /// @param _amount RBTC amount to send
    function sendRBTC(address _account, uint _amount) external;
}
