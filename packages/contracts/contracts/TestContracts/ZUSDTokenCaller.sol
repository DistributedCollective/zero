// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IZUSDToken.sol";

contract ZUSDTokenCaller {
    IZUSDToken ZUSD;

    function setZUSD(IZUSDToken _ZUSD) external {
        ZUSD = _ZUSD;
    }

    function zusdMint(address _account, uint _amount) external {
        ZUSD.mint(_account, _amount);
    }

    function zusdBurn(address _account, uint _amount) external {
        ZUSD.burn(_account, _amount);
    }

    function zusdSendToPool(address _sender,  address _poolAddress, uint256 _amount) external {
        ZUSD.sendToPool(_sender, _poolAddress, _amount);
    }

    function zusdReturnFromPool(address _poolAddress, address _receiver, uint256 _amount ) external {
        ZUSD.returnFromPool(_poolAddress, _receiver, _amount);
    }
}
