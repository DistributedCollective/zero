// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./CommunityIssuanceBase.sol";


contract CommunityIssuance is CommunityIssuanceBase { 

    // --- 'require' functions ---

    function _requireBeforeIssue() override internal view {
        _requireCallerIsStabilityPool();
    }

    function _requireBeforeSend(address, uint) override internal view {
        _requireCallerIsStabilityPool();
    }

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == communityPotAddress, "CommunityIssuance: caller is not SP");
    }
}
