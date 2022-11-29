// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "./Interfaces/IActivePool.sol";
import "./Dependencies/SafeMath.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";

import "./ActivePoolStorage.sol";

/**
 * @title Active Pool
 * @notice The Active Pool holds the BTC collateral and ZUSD debt (but not ZUSD tokens) for all active locs.
 * 
 * When a LoC is liquidated, it's BTC and ZUSD debt are transferred from the Active Pool, to either the
 * Stability Pool, the Default Pool, or both, depending on the liquidation conditions.
 */
contract ActivePool is CheckContract, IActivePool, ActivePoolStorage {
    using SafeMath for uint256;
    // --- Events ---
    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event LoCManagerAddressChanged(address _newLoCManagerAddress);
    event ActivePoolZUSDDebtUpdated(uint _ZUSDDebt);
    event ActivePoolBTCBalanceUpdated(uint _BTC);

    // --- Contract setters ---
    /// @notice initializer function that sets required addresses
    /// @dev Checks addresses are contracts. Only callable by contract owner.
    /// @param _borrowerOperationsAddress BorrowerOperations contract address
    /// @param _locManagerAddress LoCManager contract address
    /// @param _stabilityPoolAddress StabilityPool contract address
    /// @param _defaultPoolAddress DefaultPool contract address
    function setAddresses(
        address _borrowerOperationsAddress,
        address _locManagerAddress,
        address _stabilityPoolAddress,
        address _defaultPoolAddress
    ) external onlyOwner {
        checkContract(_borrowerOperationsAddress);
        checkContract(_locManagerAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_defaultPoolAddress);

        borrowerOperationsAddress = _borrowerOperationsAddress;
        locManagerAddress = _locManagerAddress;
        stabilityPoolAddress = _stabilityPoolAddress;
        defaultPoolAddress = _defaultPoolAddress;

        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit LoCManagerAddressChanged(_locManagerAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);

        
    }

    // --- Getters for public variables. Required by IPool interface ---

    
    /// @notice Not necessarily equal to the the contract's raw BTC balance - bitcoin can be forcibly sent to contracts.
    /// @return the BTC state variable.
    function getBTC() external view override returns (uint) {
        return BTC;
    }

    /// @return the ZUSD debt state variable
    function getZUSDDebt() external view override returns (uint) {
        return ZUSDDebt;
    }

    // --- Pool functionality ---

    /// @notice Send BTC amount to given account. Updates ActivePool balance. Only callable by BorrowerOperations, LoCManager or StabilityPool.
    /// @param _account account to receive the BTC amount
    /// @param _amount BTC amount to send
    function sendBTC(address _account, uint _amount) external override {
        _requireCallerIsBOorLoCMorSP();
        BTC = BTC.sub(_amount);
        emit ActivePoolBTCBalanceUpdated(BTC);
        emit BTCSent(_account, _amount);

        (bool success, ) = _account.call{value: _amount}("");
        require(success, "ActivePool: sending BTC failed");
    }

    /// @notice Increases ZUSD debt of the active pool. Only callable by BorrowerOperations, LoCManager or StabilityPool.
    /// @param _amount ZUSD amount to add to the pool debt
    function increaseZUSDDebt(uint _amount) external override {
        _requireCallerIsBOorLoCM();
        ZUSDDebt = ZUSDDebt.add(_amount);
        ActivePoolZUSDDebtUpdated(ZUSDDebt);
    }

    /// @notice Decreases ZUSD debt of the active pool. Only callable by BorrowerOperations, LoCManager or StabilityPool.
    /// @param _amount ZUSD amount to sub to the pool debt
    function decreaseZUSDDebt(uint _amount) external override {
        _requireCallerIsBOorLoCMorSP();
        ZUSDDebt = ZUSDDebt.sub(_amount);
        ActivePoolZUSDDebtUpdated(ZUSDDebt);
    }

    // --- 'require' functions ---

    function _requireCallerIsBorrowerOperationsOrDefaultPool() internal view {
        require(
            msg.sender == borrowerOperationsAddress || msg.sender == defaultPoolAddress,
            "ActivePool: Caller is neither BO nor Default Pool"
        );
    }

    function _requireCallerIsBOorLoCMorSP() internal view {
        require(
            msg.sender == borrowerOperationsAddress ||
                msg.sender == locManagerAddress ||
                msg.sender == stabilityPoolAddress,
            "ActivePool: Caller is neither BorrowerOperations nor LoCManager nor StabilityPool"
        );
    }

    function _requireCallerIsBOorLoCM() internal view {
        require(
            msg.sender == borrowerOperationsAddress || msg.sender == locManagerAddress,
            "ActivePool: Caller is neither BorrowerOperations nor LoCManager"
        );
    }

    // --- Fallback function ---

    receive() external payable {
        _requireCallerIsBorrowerOperationsOrDefaultPool();
        BTC = BTC.add(msg.value);
        emit ActivePoolBTCBalanceUpdated(BTC);
    }
}
