   // SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./IMasset.sol";
import "./IDLLR.sol";
import "../IERC20.sol";
import "../SafeMath.sol";

library MyntLib {
    using SafeMath for uint256;

    /** 
     * @notice Convert DLLR _dllrAmount to _toToken utilizing EIP-2612 permit
     * to reduce the additional sending transaction for doing the approval to the spender.
     *    
     * @param _dllrAmount The amount of the DLLR (mAsset) token that will be burned in exchange for _toToken
     * @param _toToken bAsset token address to wothdraw from DLLR
     * @param _permitParams EIP-2612 permit params:
     *        _deadline Expiration time of the signature.
     *        _v Last 1 byte of ECDSA signature.
     *        _r First 32 bytes of ECDSA signature.
     *        _s 32 bytes after _r in ECDSA signature.
     * @return redeemed ZUSD amount
     */ 
    function redeemFromDLLR(
        IMasset _mynt,
        uint256 _dllrAmount, 
        address _toToken, 
        IMasset.PermitParams memory _permitParams
    ) internal returns (uint256) {
        IDLLR dllr = IDLLR(_mynt.getToken());
        IERC20 dllrERC20 = IERC20(address(dllr));
        uint256 balBefore = dllrERC20.balanceOf(address(this));
        dllr.transferWithPermit(msg.sender, address(this), _dllrAmount, _permitParams.deadline, _permitParams.v, _permitParams.r, _permitParams.s); 
        require(balBefore.sub(dllrERC20.balanceOf(address(this))) == _dllrAmount, "DLLR transferred amount validation failed");
        return _mynt.redeemTo(_toToken, _dllrAmount, msg.sender); 
    }
}