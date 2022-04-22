// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

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
    using SafeMath for uint;

    // --- Events not covered by interface ---
    event FeeDistributorAddressSet(address _feeDistributorAddress);

    // --- Functions ---

    function setAddresses
    (
        address _zeroTokenAddress,
        address _zusdTokenAddress,
        address _feeDistributorAddress, 
        address _activePoolAddress
    ) 
        external 
        onlyOwner 
        override 
    {
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

    // If caller has a pre-existing stake, send any accumulated RBTC and ZUSD gains to them. 
    function stake(uint _ZEROamount) external override {
        _requireNonZeroAmount(_ZEROamount);

        uint currentStake = stakes[msg.sender];

        uint RBTCGain;
        uint ZUSDGain;
        // Grab any accumulated RBTC and ZUSD gains from the current stake
        if (currentStake != 0) {
            RBTCGain = _getPendingRBTCGain(msg.sender);
            ZUSDGain = _getPendingZUSDGain(msg.sender);
        }
    
       _updateUserSnapshots(msg.sender);

        uint newStake = currentStake.add(_ZEROamount);

        // Increase user’s stake and total ZERO staked
        stakes[msg.sender] = newStake;
        totalZEROStaked = totalZEROStaked.add(_ZEROamount);
        emit TotalZEROStakedUpdated(totalZEROStaked);

        // Transfer ZERO from caller to this contract
        zeroToken.sendToZEROStaking(msg.sender, _ZEROamount);

        emit StakeChanged(msg.sender, newStake);
        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, RBTCGain);

         // Send accumulated ZUSD and RBTC gains to the caller
        if (currentStake != 0) {
            zusdToken.transfer(msg.sender, ZUSDGain);
            _sendRBTCGainToUser(RBTCGain);
        }
    }

    /// Unstake the ZERO and send the it back to the caller, along with their accumulated ZUSD & RBTC gains. 
    /// If requested amount > stake, send their entire stake.
    function unstake(uint _ZEROamount) external override {
        uint currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated RBTC and ZUSD gains from the current stake
        uint RBTCGain = _getPendingRBTCGain(msg.sender);
        uint ZUSDGain = _getPendingZUSDGain(msg.sender);
        
        _updateUserSnapshots(msg.sender);

        if (_ZEROamount > 0) {
            uint ZEROToWithdraw = LiquityMath._min(_ZEROamount, currentStake);

            uint newStake = currentStake.sub(ZEROToWithdraw);

            // Decrease user's stake and total ZERO staked
            stakes[msg.sender] = newStake;
            totalZEROStaked = totalZEROStaked.sub(ZEROToWithdraw);
            emit TotalZEROStakedUpdated(totalZEROStaked);

            // Transfer unstaked ZERO to user
            zeroToken.transfer(msg.sender, ZEROToWithdraw);

            emit StakeChanged(msg.sender, newStake);
        }

        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, RBTCGain);

        // Send accumulated ZUSD and RBTC gains to the caller
        zusdToken.transfer(msg.sender, ZUSDGain);
        _sendRBTCGainToUser(RBTCGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by Liquity core contracts ---

    function increaseF_RBTC(uint _RBTCFee) external override {
        _requireCallerIsFeeDistributor();
        uint RBTCFeePerZEROStaked;
     
        if (totalZEROStaked > 0) {RBTCFeePerZEROStaked = _RBTCFee.mul(DECIMAL_PRECISION).div(totalZEROStaked);}

        F_RBTC = F_RBTC.add(RBTCFeePerZEROStaked); 
        emit F_RBTCUpdated(F_RBTC);
    }

    function increaseF_ZUSD(uint _ZUSDFee) external override {
        _requireCallerIsFeeDistributor();
        uint ZUSDFeePerZEROStaked;
        
        if (totalZEROStaked > 0) {ZUSDFeePerZEROStaked = _ZUSDFee.mul(DECIMAL_PRECISION).div(totalZEROStaked);}
        
        F_ZUSD = F_ZUSD.add(ZUSDFeePerZEROStaked);
        emit F_ZUSDUpdated(F_ZUSD);
    }

    // --- Pending reward functions ---

    function getPendingRBTCGain(address _user) external view override returns (uint) {
        return _getPendingRBTCGain(_user);
    }

    function _getPendingRBTCGain(address _user) internal view returns (uint) {
        uint F_RBTC_Snapshot = snapshots[_user].F_RBTC_Snapshot;
        uint RBTCGain = stakes[_user].mul(F_RBTC.sub(F_RBTC_Snapshot)).div(DECIMAL_PRECISION);
        return RBTCGain;
    }

    function getPendingZUSDGain(address _user) external view override returns (uint) {
        return _getPendingZUSDGain(_user);
    }

    function _getPendingZUSDGain(address _user) internal view returns (uint) {
        uint F_ZUSD_Snapshot = snapshots[_user].F_ZUSD_Snapshot;
        uint ZUSDGain = stakes[_user].mul(F_ZUSD.sub(F_ZUSD_Snapshot)).div(DECIMAL_PRECISION);
        return ZUSDGain;
    }

    // --- Internal helper functions ---

    function _updateUserSnapshots(address _user) internal {
        snapshots[_user].F_RBTC_Snapshot = F_RBTC;
        snapshots[_user].F_ZUSD_Snapshot = F_ZUSD;
        emit StakerSnapshotsUpdated(_user, F_RBTC, F_ZUSD);
    }

    function _sendRBTCGainToUser(uint RBTCGain) internal {
        emit RBtcerSent(msg.sender, RBTCGain);
        (bool success, ) = msg.sender.call{value: RBTCGain}("");
        require(success, "ZEROStaking: Failed to send accumulated RBTCGain");
    }

    // --- 'require' functions ---

    function _requireCallerIsFeeDistributor() internal view {
        require(msg.sender == feeDistributorAddress, "ZEROStaking: caller is not FeeDistributor");
    }

     function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "ZEROStaking: caller is not ActivePool");
    }

    function _requireUserHasStake(uint currentStake) internal pure {  
        require(currentStake > 0, 'ZEROStaking: User must have a non-zero stake');  
    }

    function _requireNonZeroAmount(uint _amount) internal pure {
        require(_amount > 0, 'ZEROStaking: Amount must be non-zero');
    }

    receive() external payable {
        _requireCallerIsFeeDistributor();
    }
}
