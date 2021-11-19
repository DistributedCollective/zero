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
    using SafeMath for uint;

    // --- Events ---

    event ZEROTokenAddressSet(address _zeroTokenAddress);
    event ZUSDTokenAddressSet(address _zusdTokenAddress);
    event FeeDistributorAddressSet(address _feeDistributorAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event StakeChanged(address indexed staker, uint newStake);
    event StakingGainsWithdrawn(address indexed staker, uint ZUSDGain, uint ETHGain);
    event F_ETHUpdated(uint _F_ETH);
    event F_ZUSDUpdated(uint _F_ZUSD);
    event TotalZEROStakedUpdated(uint _totalZEROStaked);
    event EtherSent(address _account, uint _amount);
    event StakerSnapshotsUpdated(address _staker, uint _F_ETH, uint _F_ZUSD);

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

    // If caller has a pre-existing stake, send any accumulated ETH and ZUSD gains to them. 
    function stake(uint _ZEROamount) external override {
        _requireNonZeroAmount(_ZEROamount);

        uint currentStake = stakes[msg.sender];

        uint ETHGain;
        uint ZUSDGain;
        // Grab any accumulated ETH and ZUSD gains from the current stake
        if (currentStake != 0) {
            ETHGain = _getPendingETHGain(msg.sender);
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
        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, ETHGain);

         // Send accumulated ZUSD and ETH gains to the caller
        if (currentStake != 0) {
            zusdToken.transfer(msg.sender, ZUSDGain);
            _sendETHGainToUser(ETHGain);
        }
    }

    /// Unstake the ZERO and send the it back to the caller, along with their accumulated ZUSD & ETH gains. 
    /// If requested amount > stake, send their entire stake.
    function unstake(uint _ZEROamount) external override {
        uint currentStake = stakes[msg.sender];
        _requireUserHasStake(currentStake);

        // Grab any accumulated ETH and ZUSD gains from the current stake
        uint ETHGain = _getPendingETHGain(msg.sender);
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

        emit StakingGainsWithdrawn(msg.sender, ZUSDGain, ETHGain);

        // Send accumulated ZUSD and ETH gains to the caller
        zusdToken.transfer(msg.sender, ZUSDGain);
        _sendETHGainToUser(ETHGain);
    }

    // --- Reward-per-unit-staked increase functions. Called by Liquity core contracts ---

    function increaseF_ETH(uint _ETHFee) external override {
        _requireCallerIsFeeDistributor();
        uint ETHFeePerZEROStaked;
     
        if (totalZEROStaked > 0) {ETHFeePerZEROStaked = _ETHFee.mul(DECIMAL_PRECISION).div(totalZEROStaked);}

        F_ETH = F_ETH.add(ETHFeePerZEROStaked); 
        emit F_ETHUpdated(F_ETH);
    }

    function increaseF_ZUSD(uint _ZUSDFee) external override {
        _requireCallerIsFeeDistributor();
        uint ZUSDFeePerZEROStaked;
        
        if (totalZEROStaked > 0) {ZUSDFeePerZEROStaked = _ZUSDFee.mul(DECIMAL_PRECISION).div(totalZEROStaked);}
        
        F_ZUSD = F_ZUSD.add(ZUSDFeePerZEROStaked);
        emit F_ZUSDUpdated(F_ZUSD);
    }

    // --- Pending reward functions ---

    function getPendingETHGain(address _user) external view override returns (uint) {
        return _getPendingETHGain(_user);
    }

    function _getPendingETHGain(address _user) internal view returns (uint) {
        uint F_ETH_Snapshot = snapshots[_user].F_ETH_Snapshot;
        uint ETHGain = stakes[_user].mul(F_ETH.sub(F_ETH_Snapshot)).div(DECIMAL_PRECISION);
        return ETHGain;
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
        snapshots[_user].F_ETH_Snapshot = F_ETH;
        snapshots[_user].F_ZUSD_Snapshot = F_ZUSD;
        emit StakerSnapshotsUpdated(_user, F_ETH, F_ZUSD);
    }

    function _sendETHGainToUser(uint ETHGain) internal {
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
