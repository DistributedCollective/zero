// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ICommunityIssuance { 
    
    // --- Events ---
    
    event SOVTokenAddressSet(address _zeroTokenAddress);
    event StabilityPoolAddressSet(address _stabilityPoolAddress);
    event PriceFeedAddressSet(address _priceFeed);
    event RewardManagerAddressSet(address _rewardManagerAddress);
    event APRSet(uint256 _APR);

    // --- Functions ---

    /**
     * @notice Called only once on init, to set addresses of other contracts. Callable only by owner.
     * @dev initializer function, checks addresses are contracts
     * @param _zeroTokenAddress ZEROToken contract address
     * @param _communityPotAddress CommunityPot contract address
     */
    function initialize
    (
        address _zeroTokenAddress, 
        address _communityPotAddress,
        address _fundingWalletAddress
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

    /// @notice issues ZERO tokens corresponding to time in issuance curve
    /// @return ZERO tokens issuance 
    function issueZERO() external returns (uint);

    /// @notice sends ZERO tokens to given account
    /// @param _account account to receive the tokens
    /// @param _ZEROamount amount of tokens to transfer
    function sendZERO(address _account, uint _ZEROamount) external;

    /// @notice This function allows depositing tokens into the community pot for the community to use.
    ///         and configures the deploymentTime if it's the first time this function is called.
    /// @param _account The account that is depositing the ZERO.
    /// @param _ZEROamount The amount of ZERO to deposit into the community pot.
    /// @dev   Even if ZeroToken is a trusted ERC20 token contract, it is still important to ensure that
    ///        non reentrancy is possible (maybe due to an upgrade)
    function receiveZero(address _account, uint _ZEROamount) external;
}
