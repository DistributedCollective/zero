// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/drafts/ERC20Permit.sol";
import "../BorrowerOperationsStorage.sol";

//TODO: rename NueToken to contract DLLRMockToken is ERC20("Sovryn Dollar", "DLLR")
contract NueToken is ERC20("Nuestro", "NUE"), ERC20Permit("Nuestro"), Ownable {
    constructor() public {}

    function mint(address _account, uint256 _amount) public onlyOwner {
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) public onlyOwner {
        _burn(_account, _amount);
    }

    function getChainId() external pure returns (uint256 chainID) {
        //return _chainID(); // it’s private
        assembly {
            chainID := chainid()
        }
    }

    function transferWithPermit(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        permit(_from, msg.sender, _amount, _deadline, _v, _r, _s);
        transferFrom(_from, _to, _amount);
    }

    //TODO: add EIP-2612 Permit functionality
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
    ) external override returns (uint256) {
        IERC20(_bAsset).transferFrom(msg.sender, address(this), _bAssetQuantity);
        uint256 balanceBefore = token.balanceOf(_recipient);
        token.mint(_recipient, _bAssetQuantity);
        return balanceBefore - token.balanceOf(_recipient);
    }

    function getToken() external view override returns (address) {
        return address(token);
    }

    /// @dev Transfer 'bAsset' to the recipient then burn the 'aggregator' token
    function redeemTo(
        address _bAsset, //ZUSD token
        uint256 _massetQuantity,
        address _recipient //user
    ) external override returns (uint256 massetRedeemed) {
        ERC20(_bAsset).transfer(_recipient, _massetQuantity);
        // token.burn(_recipient, _massetQuantity); // _recipient used to be for the previous bridge-like implementation
        token.burn(msg.sender, _massetQuantity);

        return _massetQuantity;
    }
}
