// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import './Interfaces/IDefaultPool.sol';
import "./Dependencies/SafeMath.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./DefaultPoolStorage.sol";

/**
 * The Default Pool holds the RBTC and ZUSD debt (but not ZUSD tokens) from liquidations that have been redistributed
 * to active troves but not yet "applied", i.e. not yet recorded on a recipient active trove's struct.
 *
 * When a trove makes an operation that applies its pending RBTC and ZUSD debt, its pending RBTC and ZUSD debt is moved
 * from the Default Pool to the Active Pool.
 */
contract DefaultPool is DefaultPoolStorage, CheckContract, IDefaultPool {
    using SafeMath for uint256;
    
    // --- Dependency setters ---

    function setAddresses(
        address _troveManagerAddress,
        address _activePoolAddress
    )
        external
        onlyOwner
    {
        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);

        troveManagerAddress = _troveManagerAddress;
        activePoolAddress = _activePoolAddress;

        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);

        
    }

    // --- Getters for public variables. Required by IPool interface ---

    /**
    * @return the RBTC state variable.
    *
    * Not necessarily equal to the the contract's raw RBTC balance - ether can be forcibly sent to contracts.
    */
    function getRBTC() external view override returns (uint) {
        return RBTC;
    }

    function getZUSDDebt() external view override returns (uint) {
        return ZUSDDebt;
    }

    // --- Pool functionality ---

    function sendRBTCToActivePool(uint _amount) external override {
        _requireCallerIsTroveManager();
        address activePool = activePoolAddress; // cache to save an SLOAD
        RBTC = RBTC.sub(_amount);
        emit DefaultPoolRBTCBalanceUpdated(RBTC);
        emit RBtcerSent(activePool, _amount);

        (bool success, ) = activePool.call{ value: _amount }("");
        require(success, "DefaultPool: sending RBTC failed");
    }

    function increaseZUSDDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        ZUSDDebt = ZUSDDebt.add(_amount);
        emit DefaultPoolZUSDDebtUpdated(ZUSDDebt);
    }

    function decreaseZUSDDebt(uint _amount) external override {
        _requireCallerIsTroveManager();
        ZUSDDebt = ZUSDDebt.sub(_amount);
        emit DefaultPoolZUSDDebtUpdated(ZUSDDebt);
    }

    // --- 'require' functions ---

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "DefaultPool: Caller is not the ActivePool");
    }

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == troveManagerAddress, "DefaultPool: Caller is not the TroveManager");
    }

    // --- Fallback function ---

    receive() external payable {
        _requireCallerIsActivePool();
        RBTC = RBTC.add(msg.value);
        emit DefaultPoolRBTCBalanceUpdated(RBTC);
    }
}
