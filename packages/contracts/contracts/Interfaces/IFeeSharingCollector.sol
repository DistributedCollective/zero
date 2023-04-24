// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

/**
 * @title Interface for Sovryn protocol fee sharing collector.
 * @dev Interfaces are used to cast a contract address into a callable instance.
 * */
interface IFeeSharingCollector {
	function withdrawFees(address _token) external;

	function transferTokens(address _token, uint96 _amount) external;

	function withdraw(
		address _loanPoolToken,
		uint32 _maxCheckpoints,
		address _receiver
	) external;

	function transferRBTC() external payable;
}
