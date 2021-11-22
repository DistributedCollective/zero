// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../BorrowerOperationsStorage.sol";

contract NueToken is ERC20("Nuestro", "NUE"), Ownable {
    constructor () public {}

    function mint (address _account, uint256 _amount) onlyOwner public {
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) onlyOwner public {
        _burn(_account, _amount);
    }
}

contract MassetTester is IMasset {
    NueToken public token;

    constructor () public {
        token = new NueToken();
    }

    function onTokensMinted(
        uint256 _orderAmount,
        address _tokenAddress,
        bytes calldata _userData
    ) external override {
        token.mint(abi.decode(_userData, (address)), _orderAmount);
        ERC20(_tokenAddress).transferFrom(msg.sender, address(this), _orderAmount);
    }

    function redeemByBridge(
        address _bAsset,
        uint256 _massetQuantity,
        address _recipient
    ) external override returns (uint256 massetRedeemed) {
        ERC20(_bAsset).transfer(_recipient, _massetQuantity);
        token.burn(_recipient, _massetQuantity);
    
        return _massetQuantity;
    }
}
