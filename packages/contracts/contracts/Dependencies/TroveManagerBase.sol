// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../Interfaces/IActivePool.sol";
import "../Interfaces/IDefaultPool.sol";
import "../Interfaces/IZUSDToken.sol";
import "../Interfaces/IZEROStaking.sol";
import "../Interfaces/ISortedTroves.sol";
import "../Interfaces/ICollSurplusPool.sol";
import "../Interfaces/ITroveManager.sol";
import "../TroveManagerStorage.sol";
import "./LiquityBase.sol";

abstract contract TroveManagerBase is ITroveManager, LiquityBase, TroveManagerStorage {

    
    uint256 public constant SECONDS_IN_ONE_MINUTE = 60;

    uint256 public constant MINUTE_DECAY_FACTOR = 999037758833783000;

    /// During bootsrap period redemptions are not allowed
    uint256 public constant BOOTSTRAP_PERIOD = 14 days;

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
        uint256 totalRBTCDrawn;
        uint256 RBTCFee;
        uint256 RBTCToSendToRedeemer;
        uint256 decayedBaseRate;
        uint256 price;
        uint256 totalZUSDSupplyAtStart;
    }

    struct SingleRedemptionValues {
        uint256 ZUSDLot;
        uint256 RBTCLot;
        bool cancelledPartial;
    }

    // --- Events not covered by interface ---

    event TroveUpdated(
        address indexed _borrower,
        uint256 _debt,
        uint256 _coll,
        uint256 _stake,
        TroveManagerOperation _operation
    );
    
    enum TroveManagerOperation {
        applyPendingRewards,
        liquidateInNormalMode,
        liquidateInRecoveryMode,
        redeemCollateral
    }

    /// Return the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.
    function _getCurrentICR(address _borrower, uint256 _price) public view returns (uint256) {
        (uint256 currentRBTC, uint256 currentZUSDDebt) = _getCurrentTroveAmounts(_borrower);

        uint256 ICR = LiquityMath._computeCR(currentRBTC, currentZUSDDebt, _price);
        return ICR;
    }

    function _getCurrentTroveAmounts(address _borrower) internal view returns (uint256, uint256) {
        uint256 pendingRBTCReward = _getPendingRBTCReward(_borrower);
        uint256 pendingZUSDDebtReward = _getPendingZUSDDebtReward(_borrower);

        uint256 currentRBTC = Troves[_borrower].coll + pendingRBTCReward;
        uint256 currentZUSDDebt = Troves[_borrower].debt + pendingZUSDDebtReward;

        return (currentRBTC, currentZUSDDebt);
    }

    /// Get the borrower's pending accumulated RBTC reward, earned by their stake
    function _getPendingRBTCReward(address _borrower) public view returns (uint256) {
        uint256 snapshotRBTC = rewardSnapshots[_borrower].RBTC;
        uint256 rewardPerUnitStaked = L_RBTC - snapshotRBTC;

        if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
            return 0;
        }

        uint256 stake = Troves[_borrower].stake;

        uint256 pendingRBTCReward = stake * rewardPerUnitStaked / DECIMAL_PRECISION;

        return pendingRBTCReward;
    }

    /// Get the borrower's pending accumulated ZUSD reward, earned by their stake
    function _getPendingZUSDDebtReward(address _borrower) public view returns (uint256) {
        uint256 snapshotZUSDDebt = rewardSnapshots[_borrower].ZUSDDebt;
        uint256 rewardPerUnitStaked = L_ZUSDDebt - snapshotZUSDDebt;

        if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
            return 0;
        }

        uint256 stake = Troves[_borrower].stake;

        uint256 pendingZUSDDebtReward = stake * rewardPerUnitStaked / DECIMAL_PRECISION;

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
            uint256 pendingRBTCReward = _getPendingRBTCReward(_borrower);
            uint256 pendingZUSDDebtReward = _getPendingZUSDDebtReward(_borrower);

            // Apply pending rewards to trove's state
            Troves[_borrower].coll += pendingRBTCReward;
            Troves[_borrower].debt += pendingZUSDDebtReward;

            _updateTroveRewardSnapshots(_borrower);

            // Transfer from DefaultPool to ActivePool
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                pendingZUSDDebtReward,
                pendingRBTCReward
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

        return (rewardSnapshots[_borrower].RBTC < L_RBTC);
    }

    function _updateTroveRewardSnapshots(address _borrower) internal {
        rewardSnapshots[_borrower].RBTC = L_RBTC;
        rewardSnapshots[_borrower].ZUSDDebt = L_ZUSDDebt;
        emit TroveSnapshotsUpdated(L_RBTC, L_ZUSDDebt);
    }

    /// Move a Trove's pending debt and collateral rewards from distributions, from the Default Pool to the Active Pool
    function _movePendingTroveRewardsToActivePool(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _ZUSD,
        uint256 _RBTC
    ) internal {
        _defaultPool.decreaseZUSDDebt(_ZUSD);
        _activePool.increaseZUSDDebt(_ZUSD);
        _defaultPool.sendRBTCToActivePool(_RBTC);
    }

    /// Remove borrower's stake from the totalStakes sum, and set their stake to 0
    function _removeStake(address _borrower) internal {
        uint256 stake = Troves[_borrower].stake;
        totalStakes -= stake;
        Troves[_borrower].stake = 0;
    }

    function _closeTrove(address _borrower, Status closedStatus) internal {
        assert(closedStatus != Status.nonExistent && closedStatus != Status.active);

        uint256 TroveOwnersArrayLength = TroveOwners.length;
        _requireMoreThanOneTroveInSystem(TroveOwnersArrayLength);

        Troves[_borrower].status = closedStatus;
        Troves[_borrower].coll = 0;
        Troves[_borrower].debt = 0;

        rewardSnapshots[_borrower].RBTC = 0;
        rewardSnapshots[_borrower].ZUSDDebt = 0;

        _removeTroveOwner(_borrower, TroveOwnersArrayLength);
        sortedTroves.remove(_borrower);
    }

    /// Update borrower's stake based on their latest collateral value
    function _updateStakeAndTotalStakes(address _borrower) internal returns (uint256) {
        uint256 newStake = _computeNewStake(Troves[_borrower].coll);
        uint256 oldStake = Troves[_borrower].stake;
        Troves[_borrower].stake = newStake;

        totalStakes = totalStakes - oldStake + newStake;
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
            stake = _coll * totalStakesSnapshot / totalCollateralSnapshot;
        }
        return stake;
    }

    function _calcDecayedBaseRate() internal view returns (uint256) {
        uint256 minutesPassed = _minutesPassedSinceLastFeeOp();
        uint256 decayFactor = LiquityMath._decPow(MINUTE_DECAY_FACTOR, minutesPassed);

        return baseRate * decayFactor / DECIMAL_PRECISION;
    }

    function _minutesPassedSinceLastFeeOp() internal view returns (uint256) {
        return (block.timestamp - lastFeeOperationTime) / SECONDS_IN_ONE_MINUTE;
    }

    // Update the last fee operation time only if time passed >= decay interval. This prevents base rate griefing.
    function _updateLastFeeOpTime() internal {
        uint256 timePassed = block.timestamp - lastFeeOperationTime;

        if (timePassed >= SECONDS_IN_ONE_MINUTE) {
            lastFeeOperationTime = block.timestamp;
            emit LastFeeOpTimeUpdated(block.timestamp);
        }
    }

    function _calcRedemptionFee(uint256 _redemptionRate, uint256 _RBTCDrawn)
        internal
        pure
        returns (uint256)
    {
        uint256 redemptionFee = _redemptionRate * _RBTCDrawn / DECIMAL_PRECISION;
        require(redemptionFee < _RBTCDrawn, "TroveManager: Fee would eat up all returned collateral");
        return redemptionFee;
    }

    function _getRedemptionRate() public view returns (uint256) {
        return _calcRedemptionRate(baseRate);
    }

    function _getRedemptionFee(uint256 _RBTCDrawn) internal view returns (uint256) {
        return _calcRedemptionFee(_getRedemptionRate(), _RBTCDrawn);
    }

    function _calcRedemptionRate(uint256 _baseRate) internal view returns (uint256) {
        return
            LiquityMath._min(
                liquityBaseParams.REDEMPTION_FEE_FLOOR() + _baseRate,
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
        uint256 idxLast = length - 1;

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
            block.timestamp >= systemDeploymentTime + BOOTSTRAP_PERIOD,
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
