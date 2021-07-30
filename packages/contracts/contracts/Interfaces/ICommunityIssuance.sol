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
        address _communityPotAddress
    ) external;

    /// @notice issues ZERO tokens corresponding to time in issuance curve
    /// @return ZERO tokens issuance 
    function issueZERO() external returns (uint);

    /// @notice sends ZERO tokens to given account
    /// @param _account account to receive the tokens
    /// @param _ZEROamount amount of tokens to transfer
    function sendZERO(address _account, uint _ZEROamount) external;
}
