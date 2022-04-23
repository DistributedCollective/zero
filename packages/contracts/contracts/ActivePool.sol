// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Interfaces/IActivePool.sol";
import "./Dependencies/SafeMath.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";

import "./ActivePoolStorage.sol";

/**
 * @title Active Pool
 * @notice The Active Pool holds the RBTC collateral and ZUSD debt (but not ZUSD tokens) for all active troves.
 * 
 * When a trove is liquidated, it's RBTC and ZUSD debt are transferred from the Active Pool, to either the
 * Stability Pool, the Default Pool, or both, depending on the liquidation conditions.
 */
contract ActivePool is CheckContract, IActivePool, ActivePoolStorage {
    using SafeMath for uint256;
    
    // --- Contract setters ---
    /// @notice initializer function that sets required addresses
    /// @dev Checks addresses are contracts. Only callable by contract owner.
    /// @param _borrowerOperationsAddress BorrowerOperations contract address
    /// @param _troveManagerAddress TroveManager contract address
    /// @param _stabilityPoolAddress StabilityPool contract address
    /// @param _defaultPoolAddress DefaultPool contract address
    function setAddresses(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _defaultPoolAddress
    ) external onlyOwner {
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_defaultPoolAddress);

        borrowerOperationsAddress = _borrowerOperationsAddress;
        troveManagerAddress = _troveManagerAddress;
        stabilityPoolAddress = _stabilityPoolAddress;
        defaultPoolAddress = _defaultPoolAddress;

        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);

        
    }

    // --- Getters for public variables. Required by IPool interface ---

    
    /// @notice Not necessarily equal to the the contract's raw RBTC balance - ether can be forcibly sent to contracts.
    /// @return the RBTC state variable.
    function getRBTC() external view override returns (uint) {
        return RBTC;
    }

    /// @return the ZUSD debt state variable
    function getZUSDDebt() external view override returns (uint) {
        return ZUSDDebt;
    }

    // --- Pool functionality ---

    /// @notice Send RBTC amount to given account. Updates ActivePool balance. Only callable by BorrowerOperations, TroveManager or StabilityPool.
    /// @param _account account to receive the RBTC amount
    /// @param _amount RBTC amount to send
    function sendRBTC(address _account, uint _amount) external override {
        _requireCallerIsBOorTroveMorSP();
        RBTC = RBTC.sub(_amount);
        emit ActivePoolRBTCBalanceUpdated(RBTC);
        emit RBtcerSent(_account, _amount);

        (bool success, ) = _account.call{value: _amount}("");
        require(success, "ActivePool: sending RBTC failed");
    }

    /// @notice Increases ZUSD debt of the active pool. Only callable by BorrowerOperations, TroveManager or StabilityPool.
    /// @param _amount ZUSD amount to add to the pool debt
    function increaseZUSDDebt(uint _amount) external override {
        _requireCallerIsBOorTroveM();
        ZUSDDebt = ZUSDDebt.add(_amount);
        emit ActivePoolZUSDDebtUpdated(ZUSDDebt);
    }

    /// @notice Decreases ZUSD debt of the active pool. Only callable by BorrowerOperations, TroveManager or StabilityPool.
    /// @param _amount ZUSD amount to sub to the pool debt
    function decreaseZUSDDebt(uint _amount) external override {
        _requireCallerIsBOorTroveMorSP();
        ZUSDDebt = ZUSDDebt.sub(_amount);
        emit ActivePoolZUSDDebtUpdated(ZUSDDebt);
    }

    // --- 'require' functions ---

    function _requireCallerIsBorrowerOperationsOrDefaultPool() internal view {
        require(
            msg.sender == borrowerOperationsAddress || msg.sender == defaultPoolAddress,
            "ActivePool: Caller is neither BO nor Default Pool"
        );
    }

    function _requireCallerIsBOorTroveMorSP() internal view {
        require(
            msg.sender == borrowerOperationsAddress ||
                msg.sender == troveManagerAddress ||
                msg.sender == stabilityPoolAddress,
            "ActivePool: Caller is neither BorrowerOperations nor TroveManager nor StabilityPool"
        );
    }

    function _requireCallerIsBOorTroveM() internal view {
        require(
            msg.sender == borrowerOperationsAddress || msg.sender == troveManagerAddress,
            "ActivePool: Caller is neither BorrowerOperations nor TroveManager"
        );
    }

    // --- Fallback function ---

    receive() external payable {
        _requireCallerIsBorrowerOperationsOrDefaultPool();
        RBTC = RBTC.add(msg.value);
        emit ActivePoolRBTCBalanceUpdated(RBTC);
    }
}
