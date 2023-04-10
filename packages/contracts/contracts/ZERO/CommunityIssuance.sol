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

    event SOVTokenAddressSet(address _zeroTokenAddress);
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
     * @param _stabilityPoolAddress stability pool address.
     * @param _priceFeed price feed address.
     * @param _APR apr in basis points.
     */
    function initialize(
        address _sovTokenAddress,
        address _stabilityPoolAddress,
        address _priceFeed,
        uint256 _APR
    ) external onlyOwner {
        checkContract(_sovTokenAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_priceFeed);

        _validateAPR(_APR);

        sovToken = IERC20(_sovTokenAddress);
        stabilityPoolAddress = _stabilityPoolAddress;
        priceFeed = _priceFeed;
        APR = _APR;
        deploymentTime = block.timestamp;

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

        priceFeed = _priceFeedAddress;

        emit PriceFeedAddressSet(_priceFeedAddress);
    }

    /**
     * @dev setter function to set reward manager.
     * can only be called by the owner.
     * @param _rewardManagerAddress reward manager address.
     */
    function setRewardManager(address _rewardManagerAddress) external onlyOwner {
        checkContract(_rewardManagerAddress);

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


    function issueSOV(uint256 totalZUSDDeposits) public override returns (uint256) {
        _requireCallerIsStabilityPool();

        uint256 latestTotalSOVIssued = ZEROSupplyCap.mul(_getCumulativeIssuanceFraction()).div(
            DECIMAL_PRECISION
        );
        uint256 issuance = latestTotalZEROIssued.sub(totalZEROIssued);

        totalSOVIssued = latestTotalSOVIssued;
        emit TotalSOVIssuedUpdated(latestTotalSOVIssued);

        return issuance;
    }

    /** Gets 1-f^t    where: f < 1

    f: issuance factor that determines the shape of the curve
    t:  time passed since last ZERO issuance event  */
    function _getCumulativeIssuanceFraction() internal view returns (uint256) {
        return 0;
        // // Get the time passed since deployment
        // uint256 timePassedInMinutes = block.timestamp.sub(deploymentTime).div(
        //     SECONDS_IN_ONE_MINUTE
        // );

        // // f^t
        // uint256 power = LiquityMath._decPow(ISSUANCE_FACTOR, timePassedInMinutes);

        // //  (1 - f^t)
        // uint256 cumulativeIssuanceFraction = (uint256(DECIMAL_PRECISION).sub(power));
        // assert(cumulativeIssuanceFraction <= DECIMAL_PRECISION); // must be in range [0,1]

        // return cumulativeIssuanceFraction;
    }

    function sendSOV(address _account, uint256 _SOVamount) public override {
        _requireCallerIsStabilityPool();

        bool success = sovToken.transfer(_account, _SOVamount);
        require(success, "Failed to send ZERO");
    }

    // /// @notice This function allows depositing tokens into the community pot for the community to use.
    // ///         and configures the deploymentTime if it's the first time this function is called.
    // ///         Allowance must be set before calling this function.
    // ///
    // /// @param _account The account that is depositing the ZERO.
    // /// @param _ZEROamount The amount of ZERO to deposit into the community pot.
    // /// @dev   We are relying upon the fact that ZeroToken is a safe contract and there will be no
    // ///        reentrancy risk.
    // function receiveZero(address _account, uint256 _ZEROamount) external override {
    //     require(_account == fundingWalletAddress, "Only the funding wallet can deposit ZERO");
    //     require(ZEROSupplyCap == 0, "Community pot already funded");

    //     require(zeroToken.transferFrom(_account, address(this), _ZEROamount), "Transfer failed");

    //     ZEROSupplyCap = _ZEROamount;
    //     deploymentTime = block.timestamp;
    // }

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == communityPotAddress, "CommunityIssuance: caller is not SP");
    }
}
