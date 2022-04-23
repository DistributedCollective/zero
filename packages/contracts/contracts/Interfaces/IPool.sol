// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

// Common interface for the Pools.
interface IPool {
    // --- Events ---

    event RBTCBalanceUpdated(uint _newBalance);
    event ZUSDBalanceUpdated(uint _newBalance);
    event ActivePoolAddressChanged(address _newActivePoolAddress);
    event DefaultPoolAddressChanged(address _newDefaultPoolAddress);
    event StabilityPoolAddressChanged(address _newStabilityPoolAddress);
    event RBtcerSent(address _to, uint _amount);

    // --- Functions ---

    /// @notice Not necessarily equal to the raw ether balance - ether can be forcibly sent to contracts.
    /// @return RBTC pool balance
    function getRBTC() external view returns (uint);

    /// @return ZUSD debt pool balance
    function getZUSDDebt() external view returns (uint);

    /// @notice Increases ZUSD debt of the pool.
    /// @param _amount ZUSD amount to add to the pool debt
    function increaseZUSDDebt(uint _amount) external;

    /// @notice Decreases ZUSD debt of the pool.
    /// @param _amount ZUSD amount to subtract to the pool debt
    function decreaseZUSDDebt(uint _amount) external;
}
