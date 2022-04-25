// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../ZERO/CommunityIssuance.sol";

contract CommunityIssuanceTester is CommunityIssuance {

    using SafeMath for uint256;
    
    function obtainZERO(uint256 _amount) external {
        zeroToken.transfer(msg.sender, _amount);
    }

    function getCumulativeIssuanceFraction() external view returns (uint) {
       return _getCumulativeIssuanceFraction();
    }

    function unprotectedIssueZERO() external returns (uint) {
        // No checks on caller address
       
        uint256 latestTotalZEROIssued = ZEROSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint256 issuance = latestTotalZEROIssued.sub(totalZEROIssued);
      
        totalZEROIssued = latestTotalZEROIssued;
        return issuance;
    }
}
