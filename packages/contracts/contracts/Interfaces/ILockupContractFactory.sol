// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ILockupContractFactory {
    // --- Events ---

    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event LockupContractDeployedThroughFactory(
        address _lockupContractAddress,
        address _beneficiary,
        uint256 _unlockTime,
        address _deployer
    );

    // --- Functions ---

    /// @notice ZEROToken address setter. Checks address is a contract.
    /// @param _zeroTokenAddress address to set
    function setZEROTokenAddress(address _zeroTokenAddress) external;

    /// @notice deploys a LockupContract for a beneficiary and a given unlockTime, which will allow beneficiary to withdraw after time passes
    /// @param _unlockTime Unlock time is the Unix point in time at which the beneficiary can withdraw.
    /// @param _beneficiary beneficiary address which will be able to withdraw
    function deployLockupContract(address _beneficiary, uint256 _unlockTime) external;

    /// @return true if there is a LockupContract deployed for the given address
    function isRegisteredLockup(address _addr) external view returns (bool);
}
