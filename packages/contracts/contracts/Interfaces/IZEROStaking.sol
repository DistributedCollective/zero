// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

interface IZEROStaking {

    // --- Events --
    
    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event ZUSDTokenAddressSet(address _zusdTokenAddress);
    event FeeDistributorAddressAddressSet(address _feeDistributorAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event StakeChanged(address indexed staker, uint newStake);
    event StakingGainsWithdrawn(address indexed staker, uint ZUSDGain, uint RBTCGain);
    event F_RBTCUpdated(uint _F_RBTC);
    event F_ZUSDUpdated(uint _F_ZUSD);
    event TotalZEROStakedUpdated(uint _totalZEROStaked);
    event RBtcerSent(address _account, uint _amount);
    event StakerSnapshotsUpdated(address _staker, uint _F_RBTC, uint _F_ZUSD);

    // --- Functions ---
    
    /**
     * @notice Called only once on init, to set addresses of other Liquity contracts. Callable only by owner
     * @dev initializer function, checks addresses are contracts
     * @param _zeroTokenAddress ZEROToken contract address
     * @param _zusdTokenAddress ZUSDToken contract address
     * @param _feeDistributorAddress FeeDistributorAddress contract address
     * @param _activePoolAddress ActivePool contract address
     */
    function setAddresses
    (
        address _zeroTokenAddress,
        address _zusdTokenAddress,
        address _feeDistributorAddress, 
        address _activePoolAddress
    )  external;

    /// @notice If caller has a pre-existing stake, send any accumulated RBTC and ZUSD gains to them.
    /// @param _ZEROamount ZERO tokens to stake 
    function stake(uint _ZEROamount) external;

    /**
     * @notice Unstake the ZERO and send the it back to the caller, along with their accumulated ZUSD & RBTC gains. 
     * If requested amount > stake, send their entire stake.
     * @param _ZEROamount ZERO tokens to unstake
     */
    function unstake(uint _ZEROamount) external;

    /// @param _RBTCFee RBTC fee
    /// @notice increase RBTC fee
    function increaseF_RBTC(uint _RBTCFee) external; 

    /// @param _ZEROFee ZUSD fee
    /// @notice increase ZUSD fee
    function increaseF_ZUSD(uint _ZEROFee) external;  

    /// @param _user user address
    /// @return pending RBTC gain of given user
    function getPendingRBTCGain(address _user) external view returns (uint);

    /// @param _user user address
    /// @return pending ZUSD gain of given user
    function getPendingZUSDGain(address _user) external view returns (uint);
}
