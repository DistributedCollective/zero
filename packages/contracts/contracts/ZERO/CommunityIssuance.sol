// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "../Interfaces/ICommunityIssuance.sol";
import "../Dependencies/BaseMath.sol";
import "../Dependencies/LiquityMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";
import "./CommunityIssuanceStorage.sol";
import "../Interfaces/IStabilityPool.sol";

contract CommunityIssuance is
    CommunityIssuanceStorage,
    ICommunityIssuance,
    CheckContract,
    BaseMath
{
    using SafeMath for uint256;

    // --- Events ---

    event SOVTokenAddressSet(address _sovTokenAddress);
    event ZUSDTokenAddressSet(address _zusdTokenAddress);
    event StabilityPoolAddressSet(address _stabilityPoolAddress);
    event PriceFeedAddressSet(address _priceFeed);
    event RewardManagerAddressSet(address _rewardManagerAddress);
    event TotalSOVIssuedUpdated(uint256 _latestSOVIssued);
    event APRSet(uint256 _APR);

    // --- Modifier ---
    modifier onlyRewardManager() {
        require(msg.sender == rewardManager, "Permission::rewardManager: access denied");
        _;
    }

    // --- Functions ---

    /**
     * @dev initialization function to set configs.
     * can only be initialized by owner.
     * @param _sovTokenAddress sov token address.
     * @param _zusdTokenAddress zero token address.
     * @param _stabilityPoolAddress stability pool address.
     * @param _priceFeed price feed address.
     * @param _APR apr in basis points.
     */
    function initialize(
        address _sovTokenAddress,
        address _zusdTokenAddress,
        address _stabilityPoolAddress,
        address _priceFeed,
        uint256 _APR
    ) external override initializer onlyOwner {
        checkContract(_sovTokenAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_priceFeed);

        _validateAPR(_APR);

        sovToken = IERC20(_sovTokenAddress);
        zusdToken = IERC20(_zusdTokenAddress);
        stabilityPoolAddress = _stabilityPoolAddress;
        priceFeed = IPriceFeedSovryn(_priceFeed);
        APR = _APR;
        lastIssuanceTime = block.timestamp;

        emit SOVTokenAddressSet(_sovTokenAddress);
        emit StabilityPoolAddressSet(_stabilityPoolAddress);
        emit PriceFeedAddressSet(_priceFeed);
        emit APRSet(_APR);
    }

    /**
     * @dev setter function to set the APR value in basis points.
     * can only be called by reward manager.
     * @param _APR apr value in basis points.
     */
    function setAPR(uint256 _APR) external override onlyRewardManager {
        _validateAPR(_APR);

        // We need to trigger issueSOV function before set the new APR
        // because otherwise, we will change the APR retrospectively for the time passed since last issuance.
        uint256 _totalZUSDDeposits = IStabilityPool(stabilityPoolAddress).getTotalZUSDDeposits();
        _issueSOV(_totalZUSDDeposits);

        APR = _APR;

        emit APRSet(_APR);
    }

    /**
     * @dev setter function to set the price feed.
     * can only be called by the owner.
     * @param _priceFeedAddress price feed address.
     */
    function setPriceFeed(address _priceFeedAddress) external override onlyOwner {
        checkContract(_priceFeedAddress);

        priceFeed = IPriceFeedSovryn(_priceFeedAddress);

        emit PriceFeedAddressSet(_priceFeedAddress);
    }

    /**
     * @dev setter function to set reward manager.
     * can only be called by the owner.
     * @param _rewardManagerAddress reward manager address.
     */
    function setRewardManager(address _rewardManagerAddress) external override onlyOwner {
        require(_rewardManagerAddress != address(0), "Account cannot be zero address");

        rewardManager = _rewardManagerAddress;

        emit RewardManagerAddressSet(_rewardManagerAddress);
    }

    /**
     * @dev validate the APR value.
     * the value must be >= 0 <= MAX_BPS (10000)
     */
    function _validateAPR(uint256 _APR) private {
        require(_APR <= MAX_BPS, "APR must be less than MAX_BPS");
    }

    /**
     * @dev public function to record SOV issuance
     * @dev can only be called by stabilityPool contract
     *
     * @param _totalZUSDDeposits total zusd deposited to record the latest of sov issuance.
     *
     * @return total issuance of SOV.
     */
    function issueSOV(uint256 _totalZUSDDeposits) external override returns (uint256) {
        _requireCallerIsStabilityPool();

        return _issueSOV(_totalZUSDDeposits);
    }

    /**
     * @dev private function to record SOV issuance
     *
     * @param _totalZUSDDeposits total zusd deposited to record the latest of sov issuance.
     *
     * @return total issuance of SOV.
     */
    function _issueSOV(uint256 _totalZUSDDeposits) internal returns (uint256) {
        uint256 timePassedSinceLastIssuance = (block.timestamp.sub(lastIssuanceTime));
        uint256 issuance = _getZUSDToSOV(_totalZUSDDeposits.mul(APR).mul(timePassedSinceLastIssuance).div(365 days).div(MAX_BPS));

        totalSOVIssued = totalSOVIssued + issuance;
        lastIssuanceTime = block.timestamp;
        emit TotalSOVIssuedUpdated(totalSOVIssued);

        return issuance;
    }

    function sendSOV(address _account, uint256 _SOVamount) public override {
        _requireCallerIsStabilityPool();

        bool success = sovToken.transfer(_account, _SOVamount);
        require(success, "Failed to send ZERO");
    }

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "CommunityIssuance: caller is not SP");
    }

    /**
     * @dev get the ZUSD to SOV rate conversion. Mostly will be using Sovryn's PriceFeed.
     * @param _zusdAmount zusd amount to get the rate conversion
     * @return the total SOV will be returned.
     */
    function _getZUSDToSOV(uint256 _zusdAmount) internal view returns (uint256) {
        return priceFeed.queryReturn(address(zusdToken), address(sovToken), _zusdAmount);
    }
}
