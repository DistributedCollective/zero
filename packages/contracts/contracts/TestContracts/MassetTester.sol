// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../BorrowerOperationsStorage.sol";

//TODO: rename NueToken to contract DLLRMockToken is ERC20("Sovryn Dollar", "DLLR")
contract NueToken is ERC20("Nuestro", "NUE"), Ownable {
    constructor() public {}

    function mint(address _account, uint256 _amount) public onlyOwner {
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) public onlyOwner {
        _burn(_account, _amount);
    }
}

contract MassetTester is IMasset {
    NueToken public token;

    constructor() public {
        token = new NueToken();
    }

    function mintTo(
        address _bAsset,
        uint256 _bAssetQuantity,
        address _recipient
    ) external override {
        IERC20(_bAsset).transferFrom(msg.sender, address(this), _bAssetQuantity);
        token.mint(_recipient, _bAssetQuantity);
    }

    function getToken() external view override returns (address) {
        return address(token);
    }

    function redeemTo(
        address _bAsset,
        uint256 _massetQuantity,
        address _recipient
    ) external override returns (uint256 massetRedeemed) {
        ERC20(_bAsset).transfer(_recipient, _massetQuantity);
        token.burn(_recipient, _massetQuantity);

        return _massetQuantity;
    }
}
