// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

/// Common interface for Fee Distributor.
interface IFeeDistributor {
    // --- Events ---

    event FeeSharingCollectorAddressChanged(address _feeSharingCollectorAddress);
    event ZeroStakingAddressChanged(address _zeroStakingAddress);
    event BorrowerOperationsAddressChanged(address _borrowerOperationsAddress);
    event TroveManagerAddressChanged(address _troveManagerAddress);
    event WrbtcAddressChanged(address _wrbtcAddress);
    event ZUSDTokenAddressChanged(address _zusdTokenAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event ZUSDDistributed(uint256 _zusdDistributedAmount);
    event RBTCistributed(uint256 _rbtcDistributedAmount);

    // --- Functions ---

    /**
     * @notice Called only once on init, to set addresses of other Zero contracts. Callable only by owner
     * @dev initializer function, checks addresses are contracts
     * @param _feeSharingCollectorAddress FeeSharingCollector address
     * @param _zeroStakingAddress ZEROStaking contract address
     * @param _borrowerOperationsAddress borrowerOperations contract address
     * @param _troveManagerAddress TroveManager contract address
     * @param _wrbtcAddress wrbtc ERC20 contract address
     * @param _zusdTokenAddress ZUSDToken contract address
     * @param _activePoolAddress ActivePool contract address
     */
    function setAddresses(
        address _feeSharingCollectorAddress,
        address _zeroStakingAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _wrbtcAddress,
        address _zusdTokenAddress,
        address _activePoolAddress
    ) external;

    function distributeFees() external;
}
