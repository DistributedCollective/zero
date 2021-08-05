// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";
import "../Interfaces/ILockupContractFactory.sol";
import "./LockupContract.sol";
import "../Dependencies/console.sol";
import "./LockupContractFactoryStorage.sol";

/*
* The LockupContractFactory deploys LockupContracts - its main purpose is to keep a registry of valid deployed 
* LockupContracts. 
* 
* This registry is checked by ZEROToken when the Liquity deployer attempts to transfer ZERO tokens. During the first year 
* since system deployment, the Liquity deployer is only allowed to transfer ZERO to valid LockupContracts that have been 
* deployed by and recorded in the LockupContractFactory. This ensures the deployer's ZERO can't be traded or staked in the
* first year, and can only be sent to a verified LockupContract which unlocks at least one year after system deployment.
*
* LockupContracts can of course be deployed directly, but only those deployed through and recorded in the LockupContractFactory 
* will be considered "valid" by ZEROToken. This is a convenient way to verify that the target address is a genuine 
* LockupContract.
*/

contract LockupContractFactory is LockupContractFactoryStorage, ILockupContractFactory, CheckContract {
    using SafeMath for uint;

    // --- Events ---

    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event LockupContractDeployedThroughFactory(address _lockupContractAddress, address _beneficiary, uint _unlockTime, address _deployer);

    // --- Functions ---

    function setZEROTokenAddress(address _zeroTokenAddress) external override onlyOwner {
        checkContract(_zeroTokenAddress);

        zeroTokenAddress = _zeroTokenAddress;
        emit ZEROTokenAddressSet(_zeroTokenAddress);

        
    }

    function deployLockupContract(address _beneficiary, uint _unlockTime) external override {
        address zeroTokenAddressCached = zeroTokenAddress;
        _requireZEROAddressIsSet(zeroTokenAddressCached);
        LockupContract lockupContract = new LockupContract(
                                                        zeroTokenAddressCached,
                                                        _beneficiary, 
                                                        _unlockTime);

        lockupContractToDeployer[address(lockupContract)] = msg.sender;
        emit LockupContractDeployedThroughFactory(address(lockupContract), _beneficiary, _unlockTime, msg.sender);
    }

    function isRegisteredLockup(address _contractAddress) public view override returns (bool) {
        return lockupContractToDeployer[_contractAddress] != address(0);
    }

    // --- 'require'  functions ---
    function _requireZEROAddressIsSet(address _zeroTokenAddress) internal pure {
        require(_zeroTokenAddress != address(0), "LCF: ZERO Address is not set");
    }
}
