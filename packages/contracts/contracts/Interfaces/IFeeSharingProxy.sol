pragma solidity 0.8.13;

/**
 * @title Interface for contract governance/FeeSharingProxy.sol
 * @dev Interfaces are used to cast a contract address into a callable instance.
 * */
interface IFeeSharingProxy {
	function withdrawFees(address _token) external;

	function transferTokens(address _token, uint96 _amount) external;

	function withdraw(
		address _loanPoolToken,
		uint32 _maxCheckpoints,
		address _receiver
	) external;
}
