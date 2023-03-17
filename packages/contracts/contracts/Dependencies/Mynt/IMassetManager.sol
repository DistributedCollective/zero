// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface IMassetManager {
    struct PermitParams {
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function mintTo(
        address _bAsset,
        uint256 _bAssetQuantity,
        address _recipient
    ) external returns (uint256);

    function getToken() external view returns (address);

    /**
     * @dev Credits a recipient with a certain quantity of selected bAsset, in exchange for burning the
     *      relative mAsset quantity from the sender. Sender also incurs a small fee, if any.
     * @param _bAsset           Address of the bAsset to redeem.
     * @param _massetQuantity   Units of the masset to redeem.
     * @param _recipient        Address to credit with withdrawn bAssets.
     * @return massetRedeemed   Relative number of mAsset units burned to pay for the bAssets.
     */
    function redeemTo(
        address _bAsset,
        uint256 _massetQuantity,
        address _recipient
    ) external returns (uint256 massetRedeemed);
}
