// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/BaseMath.sol";
import "../Dependencies/SafeMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/console.sol";
import "../Interfaces/IZEROToken.sol";
import "../Interfaces/IZEROStaking.sol";
import "../Dependencies/LiquityMath.sol";
import "../Interfaces/IZUSDToken.sol";
import "./ZEROStakingStorage.sol";

contract ZEROStaking is ZEROStakingStorage, IZEROStaking, CheckContract, BaseMath {
    using SafeMath for uint256;

    // --- Events ---

    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event ZUSDTokenAddressSet(address _zusdTokenAddress);
    event FeeDistributorAddressSet(address _feeDistributorAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event StakeChanged(address indexed staker, uint256 newStake);
    event StakingGainsWithdrawn(address indexed staker, uint256 ZUSDGain, uint256 BTCGain);
    event F_BTCUpdated(uint256 _F_BTC);
    event F_ZUSDUpdated(uint256 _F_ZUSD);
    event TotalZEROStakedUpdated(uint256 _totalZEROStaked);
    event BTCSent(address _account, uint256 _amount);
    event StakerSnapshotsUpdated(address _staker, uint256 _F_BTC, uint256 _F_ZUSD);

    // --- Functions ---

    function setAddresses(
        address _zeroTokenAddress,
        address _zusdTokenAddress,
        address _feeDistributorAddress,
        address _activePoolAddress
    ) external override onlyOwner {
        checkContract(_zeroTokenAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_feeDistributorAddress);
        checkContract(_activePoolAddress);

        zeroToken = IZEROToken(_zeroTokenAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        feeDistributorAddress = _feeDistributorAddress;
        activePoolAddress = _activePoolAddress;

        emit ZEROTokenAddressSet(_zeroTokenAddress);
        emit ZEROTokenAddressSet(_zusdTokenAddress);
        emit FeeDistributorAddressSet(_feeDistributorAddress);
        emit ActivePoolAddressSet(_activePoolAddress);
    }

    // If caller has a pre-existing stake, send any accumulated BTC and ZUSD gains to them.
    function stake(uint256 _ZEROamount) external override {
        _requireNonZeroAmount(_ZEROamount);

        uint256 currentStake = stakes[msg.sender];

        uint256 BTCGain;
        uint256 ZUSDGain;
        // Grab any accumulated BTC and ZUSD gains from the current stake
        if (currentStake != 0) {
            BTCGain = _getPendingBTCGain(msg.sender);
            ZUSDGain = _getPendingZUSDGain(msg.sender);
        }

        _updateUserSnapshots(msg.sender);

        uint256 newStake = currentStake.add(_ZEROamount);

        // Increase user’s stake and total ZERO staked
        stakes[msg.sender] = newStake;
        totalZEROStaked = totalZEROStaked.add(_ZEROamount);
        emit TotalZEROStakedUpdated(totalZEROStaked);

        // Transfer ZERO from caller to this contract
        zeroToken.sendToZEROStaking(msg.sender, _ZEROamount);

        emit StakeChanged(msg.sender, newStake);
        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, BTCGain);

        // Send accumulated ZUSD and BTC gains to the caller
        if (currentStake != 0) {
            require(zusdToken.transfer(msg.sender, ZUSDGain), "Coudn't execute ZUSD transfer");
            _sendBTCGainToUser(BTCGain);
        }
    }

    /// Unstake the ZERO and send the it back to the caller, along with their accumulated ZUSD & BTC gains.
    /// If requested amount > stake, send their entire stake.
    function unstake(uint256 _ZEROamount) external override {
        uint256 currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated BTC and ZUSD gains from the current stake
        uint256 BTCGain = _getPendingBTCGain(msg.sender);
        uint256 ZUSDGain = _getPendingZUSDGain(msg.sender);

        _updateUserSnapshots(msg.sender);

        if (_ZEROamount > 0) {
            uint256 ZEROToWithdraw = LiquityMath._min(_ZEROamount, currentStake);

            uint256 newStake = currentStake.sub(ZEROToWithdraw);

            // Decrease user's stake and total ZERO staked
            stakes[msg.sender] = newStake;
            totalZEROStaked = totalZEROStaked.sub(ZEROToWithdraw);
            emit TotalZEROStakedUpdated(totalZEROStaked);

            // Transfer unstaked ZERO to user
            require(
                zeroToken.transfer(msg.sender, ZEROToWithdraw),
                "Couldn't execute ZUSD transfer"
            );

            emit StakeChanged(msg.sender, newStake);
        }

        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, BTCGain);

        // Send accumulated ZUSD and BTC gains to the caller
        require(zusdToken.transfer(msg.sender, ZUSDGain), "Couldn't execute ZUSD transfer");
        _sendBTCGainToUser(BTCGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by Zero core contracts ---

    function increaseF_BTC(uint256 _BTCFee) external override {
        _requireCallerIsFeeDistributor();
        uint256 BTCFeePerZEROStaked;

        if (totalZEROStaked > 0) {
            BTCFeePerZEROStaked = _BTCFee.mul(DECIMAL_PRECISION).div(totalZEROStaked);
        }

        F_BTC = F_BTC.add(BTCFeePerZEROStaked);
        emit F_BTCUpdated(F_BTC);
    }

    function increaseF_ZUSD(uint256 _ZUSDFee) external override {
        _requireCallerIsFeeDistributor();
        uint256 ZUSDFeePerZEROStaked;

        if (totalZEROStaked > 0) {
            ZUSDFeePerZEROStaked = _ZUSDFee.mul(DECIMAL_PRECISION).div(totalZEROStaked);
        }

        F_ZUSD = F_ZUSD.add(ZUSDFeePerZEROStaked);
        emit F_ZUSDUpdated(F_ZUSD);
    }

    // --- Pending reward functions ---

    function getPendingBTCGain(address _user) external view override returns (uint256) {
        return _getPendingBTCGain(_user);
    }

    function _getPendingBTCGain(address _user) internal view returns (uint256) {
        uint256 F_BTC_Snapshot = snapshots[_user].F_BTC_Snapshot;
        uint256 BTCGain = stakes[_user].mul(F_BTC.sub(F_BTC_Snapshot)).div(DECIMAL_PRECISION);
        return BTCGain;
    }

    function getPendingZUSDGain(address _user) external view override returns (uint256) {
        return _getPendingZUSDGain(_user);
    }

    function _getPendingZUSDGain(address _user) internal view returns (uint256) {
        uint256 F_ZUSD_Snapshot = snapshots[_user].F_ZUSD_Snapshot;
        uint256 ZUSDGain = stakes[_user].mul(F_ZUSD.sub(F_ZUSD_Snapshot)).div(DECIMAL_PRECISION);
        return ZUSDGain;
    }

    // --- Internal helper functions ---

    function _updateUserSnapshots(address _user) internal {
        snapshots[_user].F_BTC_Snapshot = F_BTC;
        snapshots[_user].F_ZUSD_Snapshot = F_ZUSD;
        emit StakerSnapshotsUpdated(_user, F_BTC, F_ZUSD);
    }

    function _sendBTCGainToUser(uint256 BTCGain) internal {
        emit BTCSent(msg.sender, BTCGain);
        (bool success, ) = msg.sender.call{value: BTCGain}("");
        require(success, "ZEROStaking: Failed to send accumulated BTCGain");
    }

    // --- 'require' functions ---

    function _requireCallerIsFeeDistributor() internal view {
        require(msg.sender == feeDistributorAddress, "ZEROStaking: caller is not FeeDistributor");
    }

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "ZEROStaking: caller is not ActivePool");
    }

    function _requireUserHasStake(uint256 currentStake) internal pure {
        require(currentStake > 0, "ZEROStaking: User must have a non-zero stake");
    }

    function _requireNonZeroAmount(uint256 _amount) internal pure {
        require(_amount > 0, "ZEROStaking: Amount must be non-zero");
    }

    receive() external payable {
        _requireCallerIsFeeDistributor();
    }
}
