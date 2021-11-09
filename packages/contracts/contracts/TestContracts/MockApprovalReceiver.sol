// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "../Interfaces/IApproveAndCall.sol";

/**
 * @title Interface for contract governance/ApprovalReceiver.sol
 * @dev Interfaces are used to cast a contract address into a callable instance.
 */
contract MockApprovalReceiver is IApproveAndCall {

    address public sender;
    uint256 public amount;
    address public token;
    bytes public data;

    function receiveApproval(
        address _sender,
        uint256 _amount,
        address _token,
        bytes calldata _data
    ) external override {
        sender = _sender;
        amount = _amount;
        token = _token;
        data = _data;
    }
}