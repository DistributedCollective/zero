// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./CommunityIssuanceBase.sol";

/// @dev We need to invoke this function in order to deposit the tokens so they
///      added to the fee distribution logic (and the stake checkpointed)
interface IFeeSharingProxy {
	function transferTokens(address _token, uint96 _amount) external;
}


/// @title  This contract holds the Zero tokens to be ditributed to SOV stakers.
///         In order to do so it holds the minted ZERO tokens and only allows
///         tokens to be transfered if the target address is the SOV staking contract
///         address, the FeesSharingProxy that can be found
///         https://github.com/DistributedCollective/Sovryn-smart-contracts/blob/b5bd57f9003ab95ab36e20859b662f6cd7a195b5/contracts/governance/FeeSharingProxy.sol
contract SovStakersIssuance is CommunityIssuanceBase {

    /// @dev Tokens can only be sent to the community pot address
    function _requireBeforeSend(address _to, uint256 _amount) internal view override {
        require(communityPotAddress == _to, "SovStakersIssuance: recipient is not the communityPotAddress");
    }

    /// @notice This function calculates all the ZERO tokens that can be extracted from
    ///         the community pot based on the issuance curve and the latest extraction
    ///         time and sends them to the SOV staking contract.
    function transferToFeeSharingProxy() external {
        uint256 issued = issueZERO();
        IFeeSharingProxy feeSharingProxy = IFeeSharingProxy(communityPotAddress);
        // Approve the proxy to transfer the tokens
        zeroToken.approve(communityPotAddress, issued);
        // This function needs to be invoked in order to checkpoint user's stake
        feeSharingProxy.transferTokens(address(zeroToken), uint96(issued));
    }
}
