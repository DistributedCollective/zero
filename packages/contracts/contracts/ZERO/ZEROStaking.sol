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
    event StakingGainsWithdrawn(address indexed staker, uint256 ZUSDGain, uint256 ETHGain);
    event F_ETHUpdated(uint256 _F_ETH);
    event F_ZUSDUpdated(uint256 _F_ZUSD);
    event TotalZEROStakedUpdated(uint256 _totalZEROStaked);
    event EtherSent(address _account, uint256 _amount);
    event StakerSnapshotsUpdated(address _staker, uint256 _F_ETH, uint256 _F_ZUSD);

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

    // If caller has a pre-existing stake, send any accumulated ETH and ZUSD gains to them.
    function stake(uint256 _ZEROamount) external override {
        _requireNonZeroAmount(_ZEROamount);

        uint256 currentStake = stakes[msg.sender];

        uint256 ETHGain;
        uint256 ZUSDGain;
        // Grab any accumulated ETH and ZUSD gains from the current stake
        if (currentStake != 0) {
            ETHGain = _getPendingETHGain(msg.sender);
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
        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, ETHGain);

        // Send accumulated ZUSD and ETH gains to the caller
        if (currentStake != 0) {
            require(zusdToken.transfer(msg.sender, ZUSDGain), "Coudn't execute ZUSD transfer");
            _sendETHGainToUser(ETHGain);
        }
    }

    /// Unstake the ZERO and send the it back to the caller, along with their accumulated ZUSD & ETH gains.
    /// If requested amount > stake, send their entire stake.
    function unstake(uint256 _ZEROamount) external override {
        uint256 currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated ETH and ZUSD gains from the current stake
        uint256 ETHGain = _getPendingETHGain(msg.sender);
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

        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, ETHGain);

        // Send accumulated ZUSD and ETH gains to the caller
        require(zusdToken.transfer(msg.sender, ZUSDGain), "Couldn't execute ZUSD transfer");
        _sendETHGainToUser(ETHGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by Zero core contracts ---

    function increaseF_ETH(uint256 _ETHFee) external override {
        _requireCallerIsFeeDistributor();
        uint256 ETHFeePerZEROStaked;

        if (totalZEROStaked > 0) {
            ETHFeePerZEROStaked = _ETHFee.mul(DECIMAL_PRECISION).div(totalZEROStaked);
        }

        F_ETH = F_ETH.add(ETHFeePerZEROStaked);
        emit F_ETHUpdated(F_ETH);
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

    function getPendingETHGain(address _user) external view override returns (uint256) {
        return _getPendingETHGain(_user);
    }

    function _getPendingETHGain(address _user) internal view returns (uint256) {
        uint256 F_ETH_Snapshot = snapshots[_user].F_ETH_Snapshot;
        uint256 ETHGain = stakes[_user].mul(F_ETH.sub(F_ETH_Snapshot)).div(DECIMAL_PRECISION);
        return ETHGain;
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
        snapshots[_user].F_ETH_Snapshot = F_ETH;
        snapshots[_user].F_ZUSD_Snapshot = F_ZUSD;
        emit StakerSnapshotsUpdated(_user, F_ETH, F_ZUSD);
    }

    function _sendETHGainToUser(uint256 ETHGain) internal {
        emit EtherSent(msg.sender, ETHGain);
        (bool success, ) = msg.sender.call{value: ETHGain}("");
        require(success, "ZEROStaking: Failed to send accumulated ETHGain");
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
