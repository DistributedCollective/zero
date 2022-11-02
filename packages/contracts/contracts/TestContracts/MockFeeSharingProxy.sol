// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ZERO/ZEROToken.sol";

interface MockIFeeSharingProxy {
	function transferTokens(address _token, uint96 _amount) external;
}

/// @dev Simple contract that will receive ZERO tokens issued to the SOV stakers.
///      see: https://github.com/DistributedCollective/Sovryn-smart-contracts/blob/b5bd57f9003ab95ab36e20859b662f6cd7a195b5/contracts/governance/FeeSharingProxy
contract MockFeeSharingProxy is MockIFeeSharingProxy {

	fallback() external payable {}

	function transferTokens(address _token, uint96 _amount) override external {
		/// Just a fake function to receive the tokens
		ZEROToken(_token).transferFrom(msg.sender, address(this), _amount);
	}

	function transferRBTC(address _token, uint96 _amount) external payable {}
}
