// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ICommunityIssuance { 
    
    // --- Events ---
    
    event SOVTokenAddressSet(address _zeroTokenAddress);
    event ZUSDTokenAddressSet(address _zusdTokenAddress);
    event StabilityPoolAddressSet(address _stabilityPoolAddress);
    event PriceFeedAddressSet(address _priceFeed);
    event RewardManagerAddressSet(address _rewardManagerAddress);
    event APRSet(uint256 _APR);

    // --- Functions ---

    /**
     * @notice Called only once on init, to set addresses of other contracts. Callable only by owner.
     * @dev initializer function, checks addresses are contracts
     * @param _sovTokenAddress sov token address.
     * @param _zusdTokenAddress zero token address.
     * @param _stabilityPoolAddress stability pool address.
     * @param _priceFeed price feed address.
     * @param _APR apr in basis points.
     */
    function initialize(
        address _sovTokenAddress,
        address _zusdTokenAddress,
        address _stabilityPoolAddress,
        address _priceFeed,
        uint256 _APR
    ) external;

    /**
     * @dev setter function to set the APR value in basis points.
     * can only be called by reward manager.
     * @param _APR apr value in basis points.
     */
    function setAPR(uint256 _APR) external;

    /**
     * @dev setter function to set the price feed.
     * can only be called by the owner.
     * @param _priceFeedAddress price feed address.
     */
    function setPriceFeed(address _priceFeedAddress) external;

    /**
     * @dev setter function to set reward manager.
     * can only be called by the owner.
     * @param _rewardManagerAddress reward manager address.
     */
    function setRewardManager(address _rewardManagerAddress) external;

    /// @notice issues SOV tokens based on total zusd is deposited.
    /// @return SOV tokens issuance 
    function issueSOV(uint256 _totalZUSDDeposits) external returns (uint256);

    /// @notice sends ZERO tokens to given account
    /// @param _account account to receive the tokens
    /// @param _ZEROamount amount of tokens to transfer
    function sendSOV(address _account, uint _ZEROamount) external;
}
