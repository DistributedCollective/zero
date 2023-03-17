// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IZEROToken.sol";
import "../Interfaces/ICommunityIssuance.sol";
import "../Dependencies/BaseMath.sol";
import "../Dependencies/LiquityMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";
import "./CommunityIssuanceStorage.sol";

contract CommunityIssuance is
    CommunityIssuanceStorage,
    ICommunityIssuance,
    CheckContract,
    BaseMath
{
    using SafeMath for uint256;

    // --- Events ---

    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event CommunityPotAddressSet(address _communityPotAddress);
    event FundingWalletAddressSet(address _zeroTokenAddress);
    event TotalZEROIssuedUpdated(uint256 _fundingWalletAddress);

    // --- Functions ---

    function initialize(
        address _zeroTokenAddress,
        address _communityPotAddress,
        address _fundingWalletAddress
    ) external override onlyOwner {
        checkContract(_zeroTokenAddress);
        checkContract(_communityPotAddress);

        zeroToken = IZEROToken(_zeroTokenAddress);
        communityPotAddress = _communityPotAddress;
        fundingWalletAddress = _fundingWalletAddress;

        emit ZEROTokenAddressSet(_zeroTokenAddress);
        emit CommunityPotAddressSet(_communityPotAddress);
    }

    function issueZERO() public override returns (uint256) {
        _requireCallerIsStabilityPool();

        uint256 latestTotalZEROIssued = ZEROSupplyCap.mul(_getCumulativeIssuanceFraction()).div(
            DECIMAL_PRECISION
        );
        uint256 issuance = latestTotalZEROIssued.sub(totalZEROIssued);

        totalZEROIssued = latestTotalZEROIssued;
        emit TotalZEROIssuedUpdated(latestTotalZEROIssued);

        return issuance;
    }

    /** Gets 1-f^t    where: f < 1

    f: issuance factor that determines the shape of the curve
    t:  time passed since last ZERO issuance event  */
    function _getCumulativeIssuanceFraction() internal view returns (uint256) {
        // Get the time passed since deployment
        uint256 timePassedInMinutes = block.timestamp.sub(deploymentTime).div(
            SECONDS_IN_ONE_MINUTE
        );

        // f^t
        uint256 power = LiquityMath._decPow(ISSUANCE_FACTOR, timePassedInMinutes);

        //  (1 - f^t)
        uint256 cumulativeIssuanceFraction = (uint256(DECIMAL_PRECISION).sub(power));
        assert(cumulativeIssuanceFraction <= DECIMAL_PRECISION); // must be in range [0,1]

        return cumulativeIssuanceFraction;
    }

    function sendZERO(address _account, uint256 _ZEROamount) public override {
        _requireCallerIsStabilityPool();

        bool success = zeroToken.transfer(_account, _ZEROamount);
        require(success, "Failed to send ZERO");
    }

    /// @notice This function allows depositing tokens into the community pot for the community to use.
    ///         and configures the deploymentTime if it's the first time this function is called.
    ///         Allowance must be set before calling this function.
    ///
    /// @param _account The account that is depositing the ZERO.
    /// @param _ZEROamount The amount of ZERO to deposit into the community pot.
    /// @dev   We are relying upon the fact that ZeroToken is a safe contract and there will be no
    ///        reentrancy risk.
    function receiveZero(address _account, uint256 _ZEROamount) external override {
        require(_account == fundingWalletAddress, "Only the funding wallet can deposit ZERO");
        require(ZEROSupplyCap == 0, "Community pot already funded");

        require(zeroToken.transferFrom(_account, address(this), _ZEROamount), "Transfer failed");

        ZEROSupplyCap = _ZEROamount;
        deploymentTime = block.timestamp;
    }

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == communityPotAddress, "CommunityIssuance: caller is not SP");
    }
}
