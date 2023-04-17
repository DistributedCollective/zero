// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../Interfaces/ICommunityIssuance.sol";
import "../Dependencies/BaseMath.sol";
import "../Dependencies/LiquityMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";
import "./CommunityIssuanceStorage.sol";

contract CommunityIssuance is
    CommunityIssuanceStorage,
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
    ) external initializer onlyOwner {
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
    function setAPR(uint256 _APR) external onlyRewardManager {
        _validateAPR(_APR);

        APR = _APR;

        emit APRSet(_APR);
    }

    /**
     * @dev setter function to set the price feed.
     * can only be called by the owner.
     * @param _priceFeedAddress price feed address.
     */
    function setPriceFeed(address _priceFeedAddress) external onlyOwner {
        checkContract(_priceFeedAddress);

        priceFeed = IPriceFeedSovryn(_priceFeedAddress);

        emit PriceFeedAddressSet(_priceFeedAddress);
    }

    /**
     * @dev setter function to set reward manager.
     * can only be called by the owner.
     * @param _rewardManagerAddress reward manager address.
     */
    function setRewardManager(address _rewardManagerAddress) external onlyOwner {
        require(_rewardManagerAddress != address(0), "Account cannot be zero address");

        rewardManager = _rewardManagerAddress;

        emit RewardManagerAddressSet(_rewardManagerAddress);
    }

    /**
     * @dev validate the APR value.
     * the value must be >= 0 <= MAX_BPS (10000)
     */
    function _validateAPR(uint256 _APR) private {
        require(_APR <= MAX_BPS, "APR must be less than 10000");
    }


    function issueSOV(uint256 _totalZUSDDeposits) public returns (uint256) {
        _requireCallerIsStabilityPool();

        uint256 timePassedSinceLastIssuance = (block.timestamp.sub(lastIssuanceTime));
        uint256 latestTotalSOVIssued = _ZUSDToSOV(_totalZUSDDeposits.mul(APR).div(MAX_BPS).mul(timePassedSinceLastIssuance).div(365 days));
        
        uint256 issuance = latestTotalSOVIssued.sub(totalSOVIssued);

        totalSOVIssued = latestTotalSOVIssued;
        lastIssuanceTime = block.timestamp;
        emit TotalSOVIssuedUpdated(latestTotalSOVIssued);

        return issuance;
    }

    function sendSOV(address _account, uint256 _SOVamount) public {
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
    function _ZUSDToSOV(uint256 _zusdAmount) internal view returns (uint256) {
        return priceFeed.queryReturn(address(zusdToken), address(sovToken), _zusdAmount);
    }
}
