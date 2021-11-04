// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IBalanceRedirectPresale.sol";
import "../Dependencies/Initializable.sol";

contract ZEROTokenStorage is Initializable {
    // --- ERC20 Data ---

    string constant internal _NAME = "ZERO";
    string constant internal _SYMBOL = "ZERO";
    string constant internal _VERSION = "1";
    uint8 constant internal  _DECIMALS = 18;

    mapping (address => uint256) internal _balances;
    mapping (address => mapping (address => uint256)) internal _allowances;
    uint internal _totalSupply;

    // --- EIP 2612 Data ---

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 internal constant _PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 internal constant _TYPE_HASH = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    // Cache the domain separator as an immutable value, but also store the chain id that it corresponds to, in order to
    // invalidate the cached domain separator if the chain id changes.
    bytes32 internal _CACHED_DOMAIN_SEPARATOR;
    uint256 internal _CACHED_CHAIN_ID;

    bytes32 internal _HASHED_NAME;
    bytes32 internal _HASHED_VERSION;
    
    mapping (address => uint256) internal _nonces;

    // --- ZEROToken specific data ---

    uint public constant ONE_YEAR_IN_SECONDS = 31536000;  // 60 * 60 * 24 * 365

    // uint for use with SafeMath
    uint internal constant _1_MILLION = 1e24;    // 1e6 * 1e18 = 1e24

    uint internal deploymentStartTime;

    address public zeroStakingAddress;
    address public marketMakerAddress;
    IBalanceRedirectPresale public presale;

}
