// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../Dependencies/Ownable.sol";
/**
 * @title Base Proxy contract.
 * 
 * Adapted version of https://github.com/DistributedCollective/Sovryn-smart-contracts/blob/development/contracts/proxy/Proxy.sol 
 *
 * @notice The proxy performs delegated calls to the contract implementation
 * it is pointing to. This way upgradable contracts are possible on blockchain.
 *
 * Delegating proxy contracts are widely used for both upgradeability and gas
 * savings. These proxies rely on a logic contract (also known as implementation
 * contract or master copy) that is called using delegatecall. This allows
 * proxies to keep a persistent state (storage and balance) while the code is
 * delegated to the logic contract.
 *
 * Proxy contract is meant to be inherited and its internal functions
 * _setImplementation and _setOwner to be called when upgrades become
 * neccessary.
 *
 * The loan token (iToken) contract as well as the protocol contract act as
 * proxies, delegating all calls to underlying contracts. Therefore, if you
 * want to interact with them using web3, you need to use the ABIs from the
 * contracts containing the actual logic or the interface contract.
 *   ABI for LoanToken contracts: LoanTokenLogicStandard
 *   ABI for Protocol contract: ISovryn
 *
 * @dev UpgradableProxy is the contract that inherits Proxy and wraps these
 * functions.
 * */
contract Proxy is Ownable {
    bytes32 private constant KEY_IMPLEMENTATION = keccak256("key.implementation");

    event ImplementationChanged(
        address indexed _oldImplementation,
        address indexed _newImplementation
    );

    /**
     * @notice Set address of the implementation.
     * @param _implementation Address of the implementation.
     * */
    function _setImplementation(address _implementation) internal {
        require(_implementation != address(0), "Proxy::setImplementation: invalid address");
        emit ImplementationChanged(getImplementation(), _implementation);

        bytes32 key = KEY_IMPLEMENTATION;
        assembly {
            sstore(key, _implementation)
        }
    }

    /**
     * @notice Return address of the implementation.
     * @return _implementation Address of the implementation.
     * */
    function getImplementation() public view returns (address _implementation) {
        bytes32 key = KEY_IMPLEMENTATION;
        assembly {
            _implementation := sload(key)
        }
    }

    /**
     * @notice Fallback function performs a delegate call
     * to the actual implementation address is pointing this proxy.
     * Returns whatever the implementation call returns.
     * */
    fallback() external payable {
        delegate();
    }

    /**
     * @notice Fallback function performs a delegate call
     * to the actual implementation address is pointing this proxy.
     * Returns whatever the implementation call returns.
     * */
    receive() external payable {
        delegate();
    }

    function delegate() internal {
        address implementation = getImplementation();
        require(implementation != address(0), "Proxy::(): implementation not found");

        assembly {
            let pointer := mload(0x40)
            calldatacopy(pointer, 0, calldatasize())
            let result := delegatecall(gas(), implementation, pointer, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(pointer, 0, size)

            switch result
            case 0 {
                revert(pointer, size)
            }
            default {
                return(pointer, size)
            }
        }
    }
}
