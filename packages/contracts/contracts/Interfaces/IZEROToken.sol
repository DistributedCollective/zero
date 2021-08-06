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
    
    /// @notice send zero tokens to ZEROStaking contract
    /// @param _sender sender address
    /// @param _amount amount to send
    function sendToZEROStaking(address _sender, uint256 _amount) external;

    /// @return deployment start time
    function getDeploymentStartTime() external view returns (uint256);

}
