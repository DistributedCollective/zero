// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface ICommunityIssuance { 
    
    // --- Events ---
    
    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event CommunityPotAddressSet(address _communityPotAddress);
    event TotalZEROIssuedUpdated(uint _totalZEROIssued);

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
