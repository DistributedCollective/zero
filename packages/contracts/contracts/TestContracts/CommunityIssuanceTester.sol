// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ZERO/CommunityIssuance.sol";

contract CommunityIssuanceTester is CommunityIssuance {
    function obtainSOV(uint _amount) external {
      sovToken.transfer(msg.sender, _amount);
    }

    function unprotectedIssueSOV(uint256 _totalZUSDDeposits) external returns (uint) {
      // No checks on caller address
      
      uint256 timePassedSinceLastIssuance = (block.timestamp.sub(lastIssuanceTime));
      uint256 latestTotalSOVIssued = _ZUSDToSOV(_totalZUSDDeposits.mul(APR).div(MAX_BPS).mul(timePassedSinceLastIssuance).div(365 days));
      
      uint256 issuance = latestTotalSOVIssued.sub(totalSOVIssued);

      totalSOVIssued = latestTotalSOVIssued;
      lastIssuanceTime = block.timestamp;
      emit TotalSOVIssuedUpdated(latestTotalSOVIssued);

      return issuance;
    }
}
