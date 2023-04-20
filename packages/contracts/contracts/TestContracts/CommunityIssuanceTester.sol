// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ZERO/CommunityIssuance.sol";

contract CommunityIssuanceTester is CommunityIssuance {
    function obtainSOV(uint _amount) external {
      sovToken.transfer(msg.sender, _amount);
    }

    function unprotectedIssueSOV(uint256 _totalZUSDDeposits) external returns (uint) {
      // No checks on caller address
      
      return _issueSOV(_totalZUSDDeposits);
    }
}
