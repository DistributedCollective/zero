// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../BorrowerOperationsStorage.sol";

contract DLLRMockToken is ERC20("Sovryn Dollar", "DLLR"), Ownable {
    constructor () public {}

    function mint (address _account, uint256 _amount) onlyOwner public {
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) onlyOwner public {
        _burn(_account, _amount);
    }
}

contract MassetTester is IMasset { 
    //TODO: add missing implementations
    //TODO: replace existing usages of `onTokensMinted` and `redeemByBridge` and remove them
    DLLRMockToken public token;

    constructor () public {
        token = new DLLRMockToken();
    }

    /*function onTokensMinted(
        uint256 _orderAmount,
        address _tokenAddress,
        bytes calldata _userData
    ) external override {
        token.mint(abi.decode(_userData, (address)), _orderAmount);
    }*/

    function redeemByBridge(
        address _bAsset,
        uint256 _massetQuantity,
        address _recipient
    ) external override returns (uint256 massetRedeemed) {
        ERC20(_bAsset).transfer(_recipient, _massetQuantity);
        token.burn(_recipient, _massetQuantity);
    
        return _massetQuantity;
    }

    function mintTo(
        address _bAsset,
        uint256 _bAssetQuantity,
        address _recipient
    )
    external override {
        IERC20(_bAsset).transferFrom(msg.sender, address(this), _bAssetQuantity);
        token.mint(_recipient, _bAssetQuantity);
    }

    /*function isValidBasset(address _bAsset) external override returns(bool){
        return true;
    }*/

    function getToken() external override view returns (address) {
        return address(token);
    }

    function redeemTo(
        address _bAsset,
        uint256 _massetQuantity,
        address _recipient
    ) external override returns (uint256 massetRedeemed){
        ERC20(_bAsset).transfer(_recipient, _massetQuantity);
        token.burn(_recipient, _massetQuantity);
    
        return _massetQuantity;
    }
}
