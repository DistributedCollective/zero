// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ZERO/CommunityIssuance.sol";

contract CommunityIssuanceTester is CommunityIssuance {
    function obtainZERO(uint _amount) external {
        zeroToken.transfer(msg.sender, _amount);
    }

    function getCumulativeIssuanceFraction() external view returns (uint) {
       return _getCumulativeIssuanceFraction();
    }

    function unprotectedIssueZERO() external returns (uint) {
        // No checks on caller address
       
        uint latestTotalZEROIssued = ZEROSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint issuance = latestTotalZEROIssued.sub(totalZEROIssued);
      
        totalZEROIssued = latestTotalZEROIssued;
        return issuance;
    }
}
