// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "./Dependencies/Initializable.sol";

contract ZUSDTokenStorage is Initializable {
    uint256 internal _totalSupply;
    string internal constant _NAME = "ZUSD Stablecoin";
    string internal constant _SYMBOL = "ZUSD";
    string internal constant _VERSION = "1";
    uint8 internal constant _DECIMALS = 18;

    // --- Data for EIP2612 ---

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 internal constant _PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 internal constant _TYPE_HASH =
        0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    // Cache the domain separator, but also store the chain id that it corresponds to, in order to
    // invalidate the cached domain separator if the chain id changes.
    bytes32 internal _CACHED_DOMAIN_SEPARATOR;
    uint256 internal _CACHED_CHAIN_ID;

    bytes32 internal _HASHED_NAME;
    bytes32 internal _HASHED_VERSION;

    mapping(address => uint256) internal _nonces;

    // User data for ZUSD token
    mapping(address => uint256) internal _balances;
    mapping(address => mapping(address => uint256)) internal _allowances;

    // --- Addresses ---
    address internal troveManagerAddress;
    address internal stabilityPoolAddress;
    address internal borrowerOperationsAddress;
}
