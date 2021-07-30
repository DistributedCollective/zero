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


abstract contract CommunityIssuanceBase is CommunityIssuanceStorage, ICommunityIssuance, CheckContract, BaseMath {
    using SafeMath for uint;

    // --- Events ---

    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event CommunityPotAddressSet(address _communityPotAddress);
    event TotalZEROIssuedUpdated(uint _totalZEROIssued);

    // --- Functions ---

    function initialize
    (
        address _zeroTokenAddress, 
        address _communityPotAddress
    ) 
        external 
        onlyOwner 
        override 
    {
        checkContract(_zeroTokenAddress);
        checkContract(_communityPotAddress);

        deploymentTime = block.timestamp;
        zeroToken = IZEROToken(_zeroTokenAddress);
        communityPotAddress = _communityPotAddress;

        // When ZEROToken deployed, it should have transferred CommunityIssuance's ZERO entitlement
        ZEROSupplyCap = zeroToken.balanceOf(address(this));
        assert(ZEROSupplyCap > 0);

        emit ZEROTokenAddressSet(_zeroTokenAddress);
        emit CommunityPotAddressSet(_communityPotAddress);
    }

    function issueZERO() public override returns (uint) {
        _requireBeforeIssue();

        uint latestTotalZEROIssued = ZEROSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint issuance = latestTotalZEROIssued.sub(totalZEROIssued);

        totalZEROIssued = latestTotalZEROIssued;
        emit TotalZEROIssuedUpdated(latestTotalZEROIssued);
        
        return issuance;
    }

    /** Gets 1-f^t    where: f < 1

    f: issuance factor that determines the shape of the curve
    t:  time passed since last ZERO issuance event  */
    function _getCumulativeIssuanceFraction() internal view returns (uint) {
        // Get the time passed since deployment
        uint timePassedInMinutes = block.timestamp.sub(deploymentTime).div(SECONDS_IN_ONE_MINUTE);

        // f^t
        uint power = LiquityMath._decPow(ISSUANCE_FACTOR, timePassedInMinutes);

        //  (1 - f^t)
        uint cumulativeIssuanceFraction = (uint(DECIMAL_PRECISION).sub(power));
        assert(cumulativeIssuanceFraction <= DECIMAL_PRECISION); // must be in range [0,1]

        return cumulativeIssuanceFraction;
    }

    function sendZERO(address _account, uint _ZEROamount) public override {
        _requireBeforeSend(_account, _ZEROamount);

        bool success = zeroToken.transfer(_account, _ZEROamount);
        require(success, "Failed to send ZERO");
    }

    // --- 'require' functions ---

    /// @dev Check to be ran before issuing ZERO. This function must revert if the condition is not met.
    function _requireBeforeIssue() virtual internal view {}

    /// @dev Check to be ran before sending the ZERO. This function must revert if the condition is not met.
    /// @param _to The address of the account to send the ZERO to.
    /// @param _amount The amount of ZERO to send.
    function _requireBeforeSend(address _to, uint _amount) virtual internal view {}

}
