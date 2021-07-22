// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ICommunityIssuance { 
    
    // --- Events ---
    
    event LQTYTokenAddressSet(address _lqtyTokenAddress);
    event CommunityPotAddressSet(address _communityPotAddress);
    event TotalLQTYIssuedUpdated(uint _totalLQTYIssued);

    // --- Functions ---

    function initialize
    (
        address _lqtyTokenAddress, 
        address _communityPotAddress
    ) external;

    function issueLQTY() external returns (uint);

    function sendLQTY(address _account, uint _LQTYamount) external;
}
