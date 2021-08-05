// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ICommunityIssuance { 
    
    // --- Events ---
    
    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event CommunityPotAddressSet(address _communityPotAddress);
    event TotalZEROIssuedUpdated(uint _totalZEROIssued);

    // --- Functions ---

    function initialize
    (
        address _zeroTokenAddress, 
        address _communityPotAddress
    ) external;

    function issueZERO() external returns (uint);

    function sendZERO(address _account, uint _ZEROamount) external;
}
