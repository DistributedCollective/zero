// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IZUSDToken.sol";
import "../Dependencies/SafeMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/console.sol";
import "../ZUSDToken.sol";

/**
 *
 * Based upon OpenZeppelin's ERC20 contract:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
 *
 * and their EIP2612 (ERC20Permit / ERC712) functionality:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/53516bc555a454862470e7860a9b5254db4d00f5/contracts/token/ERC20/ERC20Permit.sol
 *
 *
 * --- Functionality added specific to the ZUSDToken ---
 *
 * 1) Transfer protection: blacklist of addresses that are invalid recipients (i.e. core Zero contracts) in external
 * transfer() and transferFrom() calls. The purpose is to protect users from losing tokens by mistakenly sending ZUSD directly to a Zero
 * core contract, when they should rather call the right function.
 *
 * 2) sendToPool() and returnFromPool(): functions callable only Zero core contracts, which move ZUSD tokens between Zero <-> user.
 */

/// @dev ZUSDTokenTestnet has unptotected initialize function to bypass initializer() modifier validation
/// @notice use if need to redeploy the token logic AND run initialize() again on the proxy
contract ZUSDTokenTestnet is ZUSDToken {
    function initialize(
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress
    ) public override onlyOwner {
        _initialize(_troveManagerAddress, _stabilityPoolAddress, _borrowerOperationsAddress);
    }
}
