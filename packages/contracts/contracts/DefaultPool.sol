// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import './Interfaces/IDefaultPool.sol';
import "./Dependencies/SafeMath.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./DefaultPoolStorage.sol";

/**
 * The Default Pool holds the BTC and ZUSD debt (but not ZUSD tokens) from liquidations that have been redistributed
 * to active locs but not yet "applied", i.e. not yet recorded on a recipient active LoC's struct.
 *
 * When a LoC makes an operation that applies its pending BTC and ZUSD debt, its pending BTC and ZUSD debt is moved
 * from the Default Pool to the Active Pool.
 */
contract DefaultPool is DefaultPoolStorage, CheckContract, IDefaultPool {
    using SafeMath for uint256;
    
    event LoCManagerAddressChanged(address _newLoCManagerAddress);
    event DefaultPoolZUSDDebtUpdated(uint _ZUSDDebt);
    event DefaultPoolBTCBalanceUpdated(uint _BTC);

    // --- Dependency setters ---

    function setAddresses(
        address _locManagerAddress,
        address _activePoolAddress
    )
        external
        onlyOwner
    {
        checkContract(_locManagerAddress);
        checkContract(_activePoolAddress);

        locManagerAddress = _locManagerAddress;
        activePoolAddress = _activePoolAddress;

        emit LoCManagerAddressChanged(_locManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);

        
    }

    // --- Getters for public variables. Required by IPool interface ---

    /**
    * @return the BTC state variable.
    *
    * Not necessarily equal to the the contract's raw BTC balance - bitcoin can be forcibly sent to contracts.
    */
    function getBTC() external view override returns (uint) {
        return BTC;
    }

    function getZUSDDebt() external view override returns (uint) {
        return ZUSDDebt;
    }

    // --- Pool functionality ---

    function sendBTCToActivePool(uint _amount) external override {
        _requireCallerIsLoCManager();
        address activePool = activePoolAddress; // cache to save an SLOAD
        BTC = BTC.sub(_amount);
        emit DefaultPoolBTCBalanceUpdated(BTC);
        emit BTCSent(activePool, _amount);

        (bool success, ) = activePool.call{ value: _amount }("");
        require(success, "DefaultPool: sending BTC failed");
    }

    function increaseZUSDDebt(uint _amount) external override {
        _requireCallerIsLoCManager();
        ZUSDDebt = ZUSDDebt.add(_amount);
        emit DefaultPoolZUSDDebtUpdated(ZUSDDebt);
    }

    function decreaseZUSDDebt(uint _amount) external override {
        _requireCallerIsLoCManager();
        ZUSDDebt = ZUSDDebt.sub(_amount);
        emit DefaultPoolZUSDDebtUpdated(ZUSDDebt);
    }

    // --- 'require' functions ---

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "DefaultPool: Caller is not the ActivePool");
    }

    function _requireCallerIsLoCManager() internal view {
        require(msg.sender == locManagerAddress, "DefaultPool: Caller is not the LoCManager");
    }

    // --- Fallback function ---

    receive() external payable {
        _requireCallerIsActivePool();
        BTC = BTC.add(msg.value);
        emit DefaultPoolBTCBalanceUpdated(BTC);
    }
}
