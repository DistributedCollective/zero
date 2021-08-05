// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/IERC20.sol";
import "../Dependencies/IERC2612.sol";

interface IZEROToken is IERC20, IERC2612 { 
   
    // --- Events ---
    
    event CommunityIssuanceAddressSet(address _communityIssuanceAddress);
    event SovStakersAddressSet(address _sovStakersIssuanceAddress);
    event LockupContractFactoryAddressSet(address _lockupContractFactoryAddress);

    // --- Functions ---
    
    function sendToZEROStaking(address _sender, uint256 _amount) external;

    function getDeploymentStartTime() external view returns (uint256);

}
