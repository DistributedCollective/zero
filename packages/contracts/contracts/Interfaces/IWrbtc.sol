// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../Dependencies/IERC20.sol";

interface IWrbtc is IERC20 {
	
	function deposit() external payable;

	function withdraw(uint256 wad) external;

}
