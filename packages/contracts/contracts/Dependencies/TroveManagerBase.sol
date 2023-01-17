// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IActivePool.sol";
import "../Interfaces/IDefaultPool.sol";
import "../Interfaces/IZUSDToken.sol";
import "../Interfaces/IZEROStaking.sol";
import "../Interfaces/ISortedTroves.sol";
import "../Interfaces/ICollSurplusPool.sol";
import "../TroveManagerStorage.sol";
import "./LiquityBase.sol";

contract TroveManagerBase is LiquityBase, TroveManagerStorage {
    uint256 public constant SECONDS_IN_ONE_MINUTE = 60;

    uint256 public constant MINUTE_DECAY_FACTOR = 999037758833783000;

    /// During bootsrap period redemptions are not allowed
    uint256 public immutable BOOTSTRAP_PERIOD;

    /**
      BETA: 18 digit decimal. Parameter by which to divide the redeemed fraction, in order to calc the new base rate from a redemption.
      Corresponds to (1 / ALPHA) in the white paper.
     */
    uint256 public constant BETA = 2;

    /**
      --- Variable container structs for liquidations ---
     
      These structs are used to hold, return and assign variables inside the liquidation functions,
      in order to avoid the error: "CompilerError: Stack too deep".
     */

    struct LocalVariables_OuterLiquidationFunction {
        uint256 price;
        uint256 ZUSDInStabPool;
        bool recoveryModeAtStart;
        uint256 liquidatedDebt;
        uint256 liquidatedColl;
    }

    struct LocalVariables_InnerSingleLiquidateFunction {
        uint256 collToLiquidate;
        uint256 pendingDebtReward;
        uint256 pendingCollReward;
    }

    struct LocalVariables_LiquidationSequence {
        uint256 remainingZUSDInStabPool;
        uint256 i;
        uint256 ICR;
        address user;
        bool backToNormalMode;
        uint256 entireSystemDebt;
        uint256 entireSystemColl;
    }

    struct LiquidationValues {
        uint256 entireTroveDebt;
        uint256 entireTroveColl;
        uint256 collGasCompensation;
        uint256 ZUSDGasCompensation;
        uint256 debtToOffset;
        uint256 collToSendToSP;
        uint256 debtToRedistribute;
        uint256 collToRedistribute;
        uint256 collSurplus;
    }

    struct LiquidationTotals {
        uint256 totalCollInSequence;
        uint256 totalDebtInSequence;
        uint256 totalCollGasCompensation;
        uint256 totalZUSDGasCompensation;
        uint256 totalDebtToOffset;
        uint256 totalCollToSendToSP;
        uint256 totalDebtToRedistribute;
        uint256 totalCollToRedistribute;
        uint256 totalCollSurplus;
    }

    struct ContractsCache {
        IActivePool activePool;
        IDefaultPool defaultPool;
        IZUSDToken zusdToken;
        IZEROStaking zeroStaking;
        ISortedTroves sortedTroves;
        ICollSurplusPool collSurplusPool;
        address gasPoolAddress;
    }
    // --- Variable container structs for redemptions ---

    struct RedemptionTotals {
        uint256 remainingZUSD;
        uint256 totalZUSDToRedeem;
        uint256 totalETHDrawn;
        uint256 ETHFee;
        uint256 ETHToSendToRedeemer;
        uint256 decayedBaseRate;
        uint256 price;
        uint256 totalZUSDSupplyAtStart;
    }

    struct SingleRedemptionValues {
        uint256 ZUSDLot;
        uint256 ETHLot;
        bool cancelledPartial;
    }

    // --- Events ---

    event Liquidation(
        uint256 _liquidatedDebt,
        uint256 _liquidatedColl,
        uint256 _collGasCompensation,
        uint256 _ZUSDGasCompensation
    );
    event Redemption(
        uint256 _attemptedZUSDAmount,
        uint256 _actualZUSDAmount,
        uint256 _ETHSent,
        uint256 _ETHFee
    );
    event TroveUpdated(
        address indexed _borrower,
        uint256 _debt,
        uint256 _coll,
        uint256 _stake,
        TroveManagerOperation _operation
    );
    event TroveLiquidated(
        address indexed _borrower,
        uint256 _debt,
        uint256 _coll,
        TroveManagerOperation _operation
    );
    event BaseRateUpdated(uint256 _baseRate);
    event LastFeeOpTimeUpdated(uint256 _lastFeeOpTime);
    event TotalStakesUpdated(uint256 _newTotalStakes);
    event SystemSnapshotsUpdated(uint256 _totalStakesSnapshot, uint256 _totalCollateralSnapshot);
    event LTermsUpdated(uint256 _L_ETH, uint256 _L_ZUSDDebt);
    event TroveSnapshotsUpdated(uint256 _L_ETH, uint256 _L_ZUSDDebt);
    event TroveIndexUpdated(address _borrower, uint256 _newIndex);

    enum TroveManagerOperation {
        applyPendingRewards,
        liquidateInNormalMode,
        liquidateInRecoveryMode,
        redeemCollateral
    }

    constructor(uint256 _bootstrapPeriod) public {
        BOOTSTRAP_PERIOD = _bootstrapPeriod;
    }

    /// Return the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.
    function _getCurrentICR(address _borrower, uint256 _price) public view returns (uint256) {
        (uint256 currentETH, uint256 currentZUSDDebt) = _getCurrentTroveAmounts(_borrower);

        uint256 ICR = LiquityMath._computeCR(currentETH, currentZUSDDebt, _price);
        return ICR;
    }

    function _getCurrentTroveAmounts(address _borrower) internal view returns (uint256, uint256) {
        uint256 pendingETHReward = _getPendingETHReward(_borrower);
        uint256 pendingZUSDDebtReward = _getPendingZUSDDebtReward(_borrower);

        uint256 currentETH = Troves[_borrower].coll.add(pendingETHReward);
        uint256 currentZUSDDebt = Troves[_borrower].debt.add(pendingZUSDDebtReward);

        return (currentETH, currentZUSDDebt);
    }

    /// Get the borrower's pending accumulated ETH reward, earned by their stake
    function _getPendingETHReward(address _borrower) public view returns (uint256) {
        uint256 snapshotETH = rewardSnapshots[_borrower].ETH;
        uint256 rewardPerUnitStaked = L_ETH.sub(snapshotETH);

        if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
            return 0;
        }

        uint256 stake = Troves[_borrower].stake;

        uint256 pendingETHReward = stake.mul(rewardPerUnitStaked).div(DECIMAL_PRECISION);

        return pendingETHReward;
    }

    /// Get the borrower's pending accumulated ZUSD reward, earned by their stake
    function _getPendingZUSDDebtReward(address _borrower) public view returns (uint256) {
        uint256 snapshotZUSDDebt = rewardSnapshots[_borrower].ZUSDDebt;
        uint256 rewardPerUnitStaked = L_ZUSDDebt.sub(snapshotZUSDDebt);

        if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
            return 0;
        }

        uint256 stake = Troves[_borrower].stake;

        uint256 pendingZUSDDebtReward = stake.mul(rewardPerUnitStaked).div(DECIMAL_PRECISION);

        return pendingZUSDDebtReward;
    }

    /// Add the borrowers's coll and debt rewards earned from redistributions, to their Trove
    function _applyPendingRewards(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        address _borrower
    ) internal {
        if (_hasPendingRewards(_borrower)) {
            _requireTroveIsActive(_borrower);

            // Compute pending rewards
            uint256 pendingETHReward = _getPendingETHReward(_borrower);
            uint256 pendingZUSDDebtReward = _getPendingZUSDDebtReward(_borrower);

            // Apply pending rewards to trove's state
            Troves[_borrower].coll = Troves[_borrower].coll.add(pendingETHReward);
            Troves[_borrower].debt = Troves[_borrower].debt.add(pendingZUSDDebtReward);

            _updateTroveRewardSnapshots(_borrower);

            // Transfer from DefaultPool to ActivePool
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                pendingZUSDDebtReward,
                pendingETHReward
            );

            emit TroveUpdated(
                _borrower,
                Troves[_borrower].debt,
                Troves[_borrower].coll,
                Troves[_borrower].stake,
                TroveManagerOperation.applyPendingRewards
            );
        }
    }

    function _hasPendingRewards(address _borrower) public view returns (bool) {
        /*
         * A Trove has pending rewards if its snapshot is less than the current rewards per-unit-staked sum:
         * this indicates that rewards have occured since the snapshot was made, and the user therefore has
         * pending rewards
         */
        if (Troves[_borrower].status != Status.active) {
            return false;
        }

        return (rewardSnapshots[_borrower].ETH < L_ETH);
    }

    function _updateTroveRewardSnapshots(address _borrower) internal {
        rewardSnapshots[_borrower].ETH = L_ETH;
        rewardSnapshots[_borrower].ZUSDDebt = L_ZUSDDebt;
        emit TroveSnapshotsUpdated(L_ETH, L_ZUSDDebt);
    }

    /// Move a Trove's pending debt and collateral rewards from distributions, from the Default Pool to the Active Pool
    function _movePendingTroveRewardsToActivePool(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _ZUSD,
        uint256 _ETH
    ) internal {
        _defaultPool.decreaseZUSDDebt(_ZUSD);
        _activePool.increaseZUSDDebt(_ZUSD);
        _defaultPool.sendETHToActivePool(_ETH);
    }

    /// Remove borrower's stake from the totalStakes sum, and set their stake to 0
    function _removeStake(address _borrower) internal {
        uint256 stake = Troves[_borrower].stake;
        totalStakes = totalStakes.sub(stake);
        Troves[_borrower].stake = 0;
    }

    function _closeTrove(address _borrower, Status closedStatus) internal {
        assert(closedStatus != Status.nonExistent && closedStatus != Status.active);

        uint256 TroveOwnersArrayLength = TroveOwners.length;
        _requireMoreThanOneTroveInSystem(TroveOwnersArrayLength);

        Troves[_borrower].status = closedStatus;
        Troves[_borrower].coll = 0;
        Troves[_borrower].debt = 0;

        rewardSnapshots[_borrower].ETH = 0;
        rewardSnapshots[_borrower].ZUSDDebt = 0;

        _removeTroveOwner(_borrower, TroveOwnersArrayLength);
        sortedTroves.remove(_borrower);
    }

    /// Update borrower's stake based on their latest collateral value
    function _updateStakeAndTotalStakes(address _borrower) internal returns (uint256) {
        uint256 newStake = _computeNewStake(Troves[_borrower].coll);
        uint256 oldStake = Troves[_borrower].stake;
        Troves[_borrower].stake = newStake;

        totalStakes = totalStakes.sub(oldStake).add(newStake);
        emit TotalStakesUpdated(totalStakes);

        return newStake;
    }

    // Calculate a new stake based on the snapshots of the totalStakes and totalCollateral taken at the last liquidation
    function _computeNewStake(uint256 _coll) internal view returns (uint256) {
        uint256 stake;
        if (totalCollateralSnapshot == 0) {
            stake = _coll;
        } else {
            /*
             * The following assert() holds true because:
             * - The system always contains >= 1 trove
             * - When we close or liquidate a trove, we redistribute the pending rewards, so if all troves were closed/liquidated,
             * rewards would’ve been emptied and totalCollateralSnapshot would be zero too.
             */
            assert(totalStakesSnapshot > 0);
            stake = _coll.mul(totalStakesSnapshot).div(totalCollateralSnapshot);
        }
        return stake;
    }

    function _calcDecayedBaseRate() internal view returns (uint256) {
        uint256 minutesPassed = _minutesPassedSinceLastFeeOp();
        uint256 decayFactor = LiquityMath._decPow(MINUTE_DECAY_FACTOR, minutesPassed);

        return baseRate.mul(decayFactor).div(DECIMAL_PRECISION);
    }

    function _minutesPassedSinceLastFeeOp() internal view returns (uint256) {
        return (block.timestamp.sub(lastFeeOperationTime)).div(SECONDS_IN_ONE_MINUTE);
    }

    // Update the last fee operation time only if time passed >= decay interval. This prevents base rate griefing.
    function _updateLastFeeOpTime() internal {
        uint256 timePassed = block.timestamp.sub(lastFeeOperationTime);

        if (timePassed >= SECONDS_IN_ONE_MINUTE) {
            lastFeeOperationTime = block.timestamp;
            emit LastFeeOpTimeUpdated(block.timestamp);
        }
    }

    function _calcRedemptionFee(
        uint256 _redemptionRate,
        uint256 _ETHDrawn
    ) internal pure returns (uint256) {
        uint256 redemptionFee = _redemptionRate.mul(_ETHDrawn).div(DECIMAL_PRECISION);
        require(
            redemptionFee < _ETHDrawn,
            "TroveManager: Fee would eat up all returned collateral"
        );
        return redemptionFee;
    }

    function _getRedemptionRate() public view returns (uint256) {
        return _calcRedemptionRate(baseRate);
    }

    function _getRedemptionFee(uint256 _ETHDrawn) internal view returns (uint256) {
        return _calcRedemptionFee(_getRedemptionRate(), _ETHDrawn);
    }

    function _calcRedemptionRate(uint256 _baseRate) internal view returns (uint256) {
        return
            LiquityMath._min(
                liquityBaseParams.REDEMPTION_FEE_FLOOR().add(_baseRate),
                DECIMAL_PRECISION // cap at a maximum of 100%
            );
    }

    /**
      Remove a Trove owner from the TroveOwners array, not preserving array order. Removing owner 'B' does the following:
      [A B C D E] => [A E C D], and updates E's Trove struct to point to its new array index.
     */
    function _removeTroveOwner(address _borrower, uint256 TroveOwnersArrayLength) internal {
        Status troveStatus = Troves[_borrower].status;
        // It’s set in caller function `_closeTrove`
        assert(troveStatus != Status.nonExistent && troveStatus != Status.active);

        uint128 index = Troves[_borrower].arrayIndex;
        uint256 length = TroveOwnersArrayLength;
        uint256 idxLast = length.sub(1);

        assert(index <= idxLast);

        address addressToMove = TroveOwners[idxLast];

        TroveOwners[index] = addressToMove;
        Troves[addressToMove].arrayIndex = index;
        emit TroveIndexUpdated(addressToMove, index);

        TroveOwners.pop();
    }

    // --- 'require' wrapper functions ---

    function _requireCallerIsBorrowerOperations() internal view {
        require(
            msg.sender == borrowerOperationsAddress,
            "TroveManager: Caller is not the BorrowerOperations contract"
        );
    }

    function _requireTroveIsActive(address _borrower) internal view {
        require(
            Troves[_borrower].status == Status.active,
            "TroveManager: Trove does not exist or is closed"
        );
    }

    function _requireZUSDBalanceCoversRedemption(
        IZUSDToken _zusdToken,
        address _redeemer,
        uint256 _amount
    ) internal view {
        require(
            _zusdToken.balanceOf(_redeemer) >= _amount,
            "TroveManager: Requested redemption amount must be <= user's ZUSD token balance"
        );
    }

    function _requireMoreThanOneTroveInSystem(uint256 TroveOwnersArrayLength) internal view {
        require(
            TroveOwnersArrayLength > 1 && sortedTroves.getSize() > 1,
            "TroveManager: Only one trove in the system"
        );
    }

    function _requireAmountGreaterThanZero(uint256 _amount) internal pure {
        require(_amount > 0, "TroveManager: Amount must be greater than zero");
    }

    function _requireTCRoverMCR(uint256 _price) internal view {
        require(
            _getTCR(_price) >= liquityBaseParams.MCR(),
            "TroveManager: Cannot redeem when TCR < MCR"
        );
    }

    function _requireAfterBootstrapPeriod() internal view {
        uint256 systemDeploymentTime = _zeroToken.getDeploymentStartTime();
        require(
            block.timestamp >= systemDeploymentTime.add(BOOTSTRAP_PERIOD),
            "TroveManager: Redemptions are not allowed during bootstrap phase"
        );
    }

    function _requireValidMaxFeePercentage(uint256 _maxFeePercentage) internal view {
        require(
            _maxFeePercentage >= liquityBaseParams.REDEMPTION_FEE_FLOOR() &&
                _maxFeePercentage <= DECIMAL_PRECISION,
            "Max fee percentage must be between 0.5% and 100%"
        );
    }
}
