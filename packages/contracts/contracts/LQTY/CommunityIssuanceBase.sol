// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/ILQTYToken.sol";
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

    event LQTYTokenAddressSet(address _lqtyTokenAddress);
    event CommunityPotAddressSet(address _communityPotAddress);
    event TotalLQTYIssuedUpdated(uint _totalLQTYIssued);

    // --- Functions ---

    function initialize
    (
        address _lqtyTokenAddress, 
        address _communityPotAddress
    ) 
        external 
        onlyOwner 
        override 
    {
        checkContract(_lqtyTokenAddress);
        checkContract(_communityPotAddress);

        deploymentTime = block.timestamp;
        lqtyToken = ILQTYToken(_lqtyTokenAddress);
        communityPotAddress = _communityPotAddress;

        // When LQTYToken deployed, it should have transferred CommunityIssuance's LQTY entitlement
        LQTYSupplyCap = lqtyToken.balanceOf(address(this));
        assert(LQTYSupplyCap > 0);

        emit LQTYTokenAddressSet(_lqtyTokenAddress);
        emit CommunityPotAddressSet(_communityPotAddress);
    }

    function issueLQTY() public override returns (uint) {
        _requireBeforeIssue();

        uint latestTotalLQTYIssued = LQTYSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint issuance = latestTotalLQTYIssued.sub(totalLQTYIssued);

        totalLQTYIssued = latestTotalLQTYIssued;
        emit TotalLQTYIssuedUpdated(latestTotalLQTYIssued);
        
        return issuance;
    }

    /* Gets 1-f^t    where: f < 1

    f: issuance factor that determines the shape of the curve
    t:  time passed since last LQTY issuance event  */
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

    function sendLQTY(address _account, uint _LQTYamount) public override {
        _requireBeforeSend(_account, _LQTYamount);

        bool success = lqtyToken.transfer(_account, _LQTYamount);
        require(success, "Failed to send LQTY");
    }

    // --- 'require' functions ---

    /// @dev Check to be ran before issuing LQTY. This function must revert if the condition is not met.
    function _requireBeforeIssue() virtual internal view {}

    /// @dev Check to be ran before sending the LQTY. This function must revert if the condition is not met.
    /// @param _to The address of the account to send the LQTY to.
    /// @param _amount The amount of LQTY to send.
    function _requireBeforeSend(address _to, uint _amount) virtual internal view {}

}
