// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../IERC20.sol";

/// Public interface for Sovryn Dollar DLLR (Meta Asset Token of Sovryn Mynt) exposing specific functions
interface IDLLR is IERC20 {
    /**
     * @notice Only owner can transfer the token.
     * @notice destination cannot be:
     * - zero (0x0) address.
     *
     * @param _recipient Recipient of the token.
     * @param _amount The amount of token that will be transferred.
     *
     * @return true / false.
     */
    function transfer(address _recipient, uint256 _amount) external override returns (bool);

    /**
     * @notice Only owner who can transfer the token.
     * @notice destination cannot be:
     * - zero (0x0) address.
     *
     * @param _from Sender of the token.
     * @param _to Recipient of the token.
     * @param _amount The amount of token that will be transferred.
     *
     * @return true / false.
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external override returns (bool);

    /**
     * @notice transfer utilizing EIP-2612, to reduce the additional sending transaction for doing the approval to the spender.
     *
     * @notice destination cannot be:
     * - zero (0x0) address.
     *
     * @dev By calling this function, the allowance will be overwritten by the total amount.
     *
     * @param _from Sender of the token.
     * @param _to Recipient of the token.
     * @param _amount The amount of the token that will be transferred.
     * @param _deadline Expiration time of the signature.
     * @param _v Last 1 byte of ECDSA signature.
     * @param _r First 32 bytes of ECDSA signature.
     * @param _s 32 bytes after _r in ECDSA signature.
     */
    function transferWithPermit(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external;

    /**
     * @notice Approves and then calls the receiving contract.
     * Useful to encapsulate sending tokens to a contract in one call.
     * Solidity has no native way to send tokens to contracts.
     * ERC-20 tokens require approval to be spent by third parties, such as a contract in this case.
     * @param _spender The contract address to spend the tokens.
     * @param _amount The amount of tokens to be sent.
     * @param _data Parameters for the contract call, such as endpoint signature.
     */
    function approveAndCall(address _spender, uint256 _amount, bytes calldata _data) external;
}
