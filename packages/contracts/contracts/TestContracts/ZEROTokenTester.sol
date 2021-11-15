// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../ZERO/ZEROToken.sol";

contract ZEROTokenTester is ZEROToken {
    constructor
    (
        address _zeroStakingAddress,
        address _marketMakerAddress,
        address _presaleAddress
    ) 
        public 
    {
        initialize(
            _zeroStakingAddress,
            _marketMakerAddress,
            _presaleAddress
        );
    } 

    function unprotectedMint(address account, uint256 amount) external {
        // No check for the caller here

        _mint(account, amount);
    }

    function unprotectedSendToZEROStaking(address _sender, uint256 _amount) external {
        // No check for the caller here
 
        _transfer(_sender, zeroStakingAddress, _amount);
    }

    function callInternalApprove(address owner, address spender, uint256 amount) external returns (bool) {
        _approve(owner, spender, amount);
    }

    function callInternalTransfer(address sender, address recipient, uint256 amount) external returns (bool) {
        _transfer(sender, recipient, amount);
    }

    function getChainId() external pure returns (uint256 chainID) {
        //return _chainID(); // it’s private
        assembly {
            chainID := chainid()
        }
    }
}