// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IBorrowerOperations.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/IZUSDToken.sol';
import './Interfaces/ISortedTroves.sol';
import "./Interfaces/ICommunityIssuance.sol";
import "./Dependencies/LiquityBase.sol";
import "./Dependencies/LiquitySafeMath128.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./StabilityPoolStorage.sol";

/**
 * The Stability Pool holds ZUSD tokens deposited by Stability Pool depositors.
 *
 * When a trove is liquidated, then depending on system conditions, some of its ZUSD debt gets offset with
 * ZUSD in the Stability Pool:  that is, the offset debt evaporates, and an equal amount of ZUSD tokens in the Stability Pool is burned.
 *
 * Thus, a liquidation causes each depositor to receive a ZUSD loss, in proportion to their deposit as a share of total deposits.
 * They also receive an RBTC gain, as the RBTC collateral of the liquidated trove is distributed among Stability depositors,
 * in the same proportion.
 *
 * When a liquidation occurs, it depletes every deposit by the same fraction: for example, a liquidation that depletes 40%
 * of the total ZUSD in the Stability Pool, depletes 40% of each deposit.
 *
 * A deposit that has experienced a series of liquidations is termed a "compounded deposit": each liquidation depletes the deposit,
 * multiplying it by some factor in range ]0,1[
 *
 *
 * --- IMPLEMENTATION ---
 *
 * We use a highly scalable method of tracking deposits and RBTC gains that has O(1) complexity.
 *
 * When a liquidation occurs, rather than updating each depositor's deposit and RBTC gain, we simply update two state variables:
 * a product P, and a sum S.
 *
 * A mathematical manipulation allows us to factor out the initial deposit, and accurately track all depositors' compounded deposits
 * and accumulated RBTC gains over time, as liquidations occur, using just these two variables P and S. When depositors join the
 * Stability Pool, they get a snapshot of the latest P and S: P_t and S_t, respectively.
 *
 * The formula for a depositor's accumulated RBTC gain is derived here:
 * https://github.com/liquity/dev/blob/main/packages/contracts/mathProofs/Scalable%20Compounding%20Stability%20Pool%20Deposits.pdf
 *
 * For a given deposit d_t, the ratio P/P_t tells us the factor by which a deposit has decreased since it joined the Stability Pool,
 * and the term d_t * (S - S_t)/P_t gives us the deposit's total accumulated RBTC gain.
 *
 * Each liquidation updates the product P and sum S. After a series of liquidations, a compounded deposit and corresponding RBTC gain
 * can be calculated using the initial deposit, the depositor’s snapshots of P and S, and the latest values of P and S.
 *
 * Any time a depositor updates their deposit (withdrawal, top-up) their accumulated RBTC gain is paid out, their new deposit is recorded
 * (based on their latest compounded deposit and modified by the withdrawal/top-up), and they receive new snapshots of the latest P and S.
 * Essentially, they make a fresh deposit that overwrites the old one.
 *
 *
 * --- SCALE FACTOR ---
 *
 * Since P is a running product in range ]0,1] that is always-decreasing, it should never reach 0 when multiplied by a number in range ]0,1[.
 * Unfortunately, Solidity floor division always reaches 0, sooner or later.
 *
 * A series of liquidations that nearly empty the Pool (and thus each multiply P by a very small number in range ]0,1[ ) may push P
 * to its 18 digit decimal limit, and round it to 0, when in fact the Pool hasn't been emptied: this would break deposit tracking.
 *
 * So, to track P accurately, we use a scale factor: if a liquidation would cause P to decrease to <1e-9 (and be rounded to 0 by Solidity),
 * we first multiply P by 1e9, and increment a currentScale factor by 1.
 *
 * The added benefit of using 1e9 for the scale factor (rather than 1e18) is that it ensures negligible precision loss close to the 
 * scale boundary: when P is at its minimum value of 1e9, the relative precision loss in P due to floor division is only on the 
 * order of 1e-9. 
 *
 * --- EPOCHS ---
 *
 * Whenever a liquidation fully empties the Stability Pool, all deposits should become 0. However, setting P to 0 would make P be 0
 * forever, and break all future reward calculations.
 *
 * So, every time the Stability Pool is emptied by a liquidation, we reset P = 1 and currentScale = 0, and increment the currentEpoch by 1.
 *
 * --- TRACKING DEPOSIT OVER SCALE CHANGES AND EPOCHS ---
 *
 * When a deposit is made, it gets snapshots of the currentEpoch and the currentScale.
 *
 * When calculating a compounded deposit, we compare the current epoch to the deposit's epoch snapshot. If the current epoch is newer,
 * then the deposit was present during a pool-emptying liquidation, and necessarily has been depleted to 0.
 *
 * Otherwise, we then compare the current scale to the deposit's scale snapshot. If they're equal, the compounded deposit is given by d_t * P/P_t.
 * If it spans one scale change, it is given by d_t * P/(P_t * 1e9). If it spans more than one scale change, we define the compounded deposit
 * as 0, since it is now less than 1e-9'th of its initial value (e.g. a deposit of 1 billion ZUSD has depleted to < 1 ZUSD).
 *
 *
 *  --- TRACKING DEPOSITOR'S RBTC GAIN OVER SCALE CHANGES AND EPOCHS ---
 *
 * In the current epoch, the latest value of S is stored upon each scale change, and the mapping (scale -> S) is stored for each epoch.
 *
 * This allows us to calculate a deposit's accumulated RBTC gain, during the epoch in which the deposit was non-zero and earned RBTC.
 *
 * We calculate the depositor's accumulated RBTC gain for the scale at which they made the deposit, using the RBTC gain formula:
 * e_1 = d_t * (S - S_t) / P_t
 *
 * and also for scale after, taking care to divide the latter by a factor of 1e9:
 * e_2 = d_t * S / (P_t * 1e9)
 *
 * The gain in the second scale will be full, as the starting point was in the previous scale, thus no need to subtract anything.
 * The deposit therefore was present for reward events from the beginning of that second scale.
 *
 *        S_i-S_t + S_{i+1}
 *      .<--------.------------>
 *      .         .
 *      . S_i     .   S_{i+1}
 *   <--.-------->.<----------->
 *   S_t.         .
 *   <->.         .
 *      t         .
 *  |---+---------|-------------|-----...
 *         i            i+1
 *
 * The sum of (e_1 + e_2) captures the depositor's total accumulated RBTC gain, handling the case where their
 * deposit spanned one scale change. We only care about gains across one scale change, since the compounded
 * deposit is defined as being 0 once it has spanned more than one scale change.
 *
 *
 * --- UPDATING P WHEN A LIQUIDATION OCCURS ---
 *
 * Please see the implementation spec in the proof document, which closely follows on from the compounded deposit / RBTC gain derivations:
 * https://github.com/liquity/liquity/blob/master/papers/Scalable_Reward_Distribution_with_Compounding_Stakes.pdf
 *
 *
 * --- ZERO ISSUANCE TO STABILITY POOL DEPOSITORS ---
 *
 * An ZERO issuance event occurs at every deposit operation, and every liquidation.
 *
 * Each deposit is tagged with the address of the front end through which it was made.
 *
 * All deposits earn a share of the issued ZERO in proportion to the deposit as a share of total deposits. The ZERO earned
 * by a given deposit, is split between the depositor and the front end through which the deposit was made, based on the front end's kickbackRate.
 *
 * Please see the system Readme for an overview:
 * https://github.com/liquity/dev/blob/main/README.md#zero-issuance-to-stability-providers
 *
 * We use the same mathematical product-sum approach to track ZERO gains for depositors, where 'G' is the sum corresponding to ZERO gains.
 * The product P (and snapshot P_t) is re-used, as the ratio P/P_t tracks a deposit's depletion due to liquidations.
 *
 */
contract StabilityPool is LiquityBase, StabilityPoolStorage, CheckContract, IStabilityPool {
    using LiquitySafeMath128 for uint128;
    using SafeMath for uint256;

    // --- Contract setters ---

    function setAddresses(
        address _liquityBaseParamsAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _zusdTokenAddress,
        address _sortedTrovesAddress,
        address _priceFeedAddress,
        address _communityIssuanceAddress
    )
        external
        override
        onlyOwner
    {
        checkContract(_liquityBaseParamsAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_activePoolAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_sortedTrovesAddress);
        checkContract(_priceFeedAddress);
        checkContract(_communityIssuanceAddress);

        P = DECIMAL_PRECISION;
        
        liquityBaseParams = ILiquityBaseParams(_liquityBaseParamsAddress);
        borrowerOperations = IBorrowerOperations(_borrowerOperationsAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        activePool = IActivePool(_activePoolAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        sortedTroves = ISortedTroves(_sortedTrovesAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        communityIssuance = ICommunityIssuance(_communityIssuanceAddress);

        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit SortedTrovesAddressChanged(_sortedTrovesAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit CommunityIssuanceAddressChanged(_communityIssuanceAddress);

        
    }

    // --- Getters for public variables. Required by IPool interface ---

    function getRBTC() external view override returns (uint) {
        return RBTC;
    }

    function getTotalZUSDDeposits() external view override returns (uint) {
        return totalZUSDDeposits;
    }

    // --- External Depositor Functions ---

    /**  provideToSP():
    *
    * - Triggers a ZERO issuance, based on time passed since the last issuance. The ZERO issuance is shared between *all* depositors and front ends
    * - Tags the deposit with the provided front end tag param, if it's a new deposit
    * - Sends depositor's accumulated gains (ZERO, RBTC) to depositor
    * - Sends the tagged front end's accumulated ZERO gains to the tagged front end
    * - Increases deposit and tagged front end's stake, and takes new snapshots for each.
    */
    function provideToSP(uint256 _amount, address _frontEndTag) external override {
        _requireFrontEndIsRegisteredOrZero(_frontEndTag);
        _requireFrontEndNotRegistered(msg.sender);
        _requireNonZeroAmount(_amount);

        uint256 initialDeposit = deposits[msg.sender].initialValue;

        ICommunityIssuance communityIssuanceCached = communityIssuance;

        _triggerZEROIssuance(communityIssuanceCached);

        if (initialDeposit == 0) {_setFrontEndTag(msg.sender, _frontEndTag);}
        uint256 depositorRBTCGain = getDepositorRBTCGain(msg.sender);
        uint256 compoundedZUSDDeposit = getCompoundedZUSDDeposit(msg.sender);
        uint256 ZUSDLoss = initialDeposit - compoundedZUSDDeposit; // Needed only for event log

        // First pay out any ZERO gains
        address frontEnd = deposits[msg.sender].frontEndTag;
        _payOutZEROGains(communityIssuanceCached, msg.sender, frontEnd);

        // Update front end stake
        uint256 compoundedFrontEndStake = getCompoundedFrontEndStake(frontEnd);
        uint256 newFrontEndStake = compoundedFrontEndStake + _amount;
        _updateFrontEndStakeAndSnapshots(frontEnd, newFrontEndStake);
        emit FrontEndStakeChanged(frontEnd, newFrontEndStake, msg.sender);

        _sendZUSDtoStabilityPool(msg.sender, _amount);

        uint256 newDeposit = compoundedZUSDDeposit + _amount;
        _updateDepositAndSnapshots(msg.sender, newDeposit);
        emit UserDepositChanged(msg.sender, newDeposit);

        emit RBTCGainWithdrawn(msg.sender, depositorRBTCGain, ZUSDLoss); // ZUSD Loss required for event log

        _sendRBTCGainToDepositor(depositorRBTCGain);
     }

    /**  withdrawFromSP():
    *
    * - Triggers a ZERO issuance, based on time passed since the last issuance. The ZERO issuance is shared between *all* depositors and front ends
    * - Removes the deposit's front end tag if it is a full withdrawal
    * - Sends all depositor's accumulated gains (ZERO, RBTC) to depositor
    * - Sends the tagged front end's accumulated ZERO gains to the tagged front end
    * - Decreases deposit and tagged front end's stake, and takes new snapshots for each.
    *
    * If _amount > userDeposit, the user withdraws all of their compounded deposit.
    */
    function withdrawFromSP(uint256 _amount) external override {
        if (_amount !=0) {_requireNoUnderCollateralizedTroves();}
        uint256 initialDeposit = deposits[msg.sender].initialValue;
        _requireUserHasDeposit(initialDeposit);

        ICommunityIssuance communityIssuanceCached = communityIssuance;

        _triggerZEROIssuance(communityIssuanceCached);

        uint256 depositorRBTCGain = getDepositorRBTCGain(msg.sender);

        uint256 compoundedZUSDDeposit = getCompoundedZUSDDeposit(msg.sender);
        uint256 ZUSDtoWithdraw = LiquityMath._min(_amount, compoundedZUSDDeposit);
        uint256 ZUSDLoss = initialDeposit - compoundedZUSDDeposit; // Needed only for event log

        // First pay out any ZERO gains
        address frontEnd = deposits[msg.sender].frontEndTag;
        _payOutZEROGains(communityIssuanceCached, msg.sender, frontEnd);
        
        // Update front end stake
        uint256 compoundedFrontEndStake = getCompoundedFrontEndStake(frontEnd);
        uint256 newFrontEndStake = compoundedFrontEndStake - ZUSDtoWithdraw;
        _updateFrontEndStakeAndSnapshots(frontEnd, newFrontEndStake);
        emit FrontEndStakeChanged(frontEnd, newFrontEndStake, msg.sender);

        _sendZUSDToDepositor(msg.sender, ZUSDtoWithdraw);

        // Update deposit
        uint256 newDeposit = compoundedZUSDDeposit - ZUSDtoWithdraw;
        _updateDepositAndSnapshots(msg.sender, newDeposit);
        emit UserDepositChanged(msg.sender, newDeposit);

        emit RBTCGainWithdrawn(msg.sender, depositorRBTCGain, ZUSDLoss);  // ZUSD Loss required for event log

        _sendRBTCGainToDepositor(depositorRBTCGain);
    }

    /** withdrawRBTCGainToTrove:
    * - Triggers a ZERO issuance, based on time passed since the last issuance. The ZERO issuance is shared between *all* depositors and front ends
    * - Sends all depositor's ZERO gain to  depositor
    * - Sends all tagged front end's ZERO gain to the tagged front end
    * - Transfers the depositor's entire RBTC gain from the Stability Pool to the caller's trove
    * - Leaves their compounded deposit in the Stability Pool
    * - Updates snapshots for deposit and tagged front end stake */
    function withdrawRBTCGainToTrove(address _upperHint, address _lowerHint) external override {
        uint256 initialDeposit = deposits[msg.sender].initialValue;
        _requireUserHasDeposit(initialDeposit);
        _requireUserHasTrove(msg.sender);
        _requireUserHasRBTCGain(msg.sender);

        ICommunityIssuance communityIssuanceCached = communityIssuance;

        _triggerZEROIssuance(communityIssuanceCached);

        uint256 depositorRBTCGain = getDepositorRBTCGain(msg.sender);

        uint256 compoundedZUSDDeposit = getCompoundedZUSDDeposit(msg.sender);
        uint256 ZUSDLoss = initialDeposit - compoundedZUSDDeposit; // Needed only for event log

        // First pay out any ZERO gains
        address frontEnd = deposits[msg.sender].frontEndTag;
        _payOutZEROGains(communityIssuanceCached, msg.sender, frontEnd);

        // Update front end stake
        uint256 compoundedFrontEndStake = getCompoundedFrontEndStake(frontEnd);
        uint256 newFrontEndStake = compoundedFrontEndStake;
        _updateFrontEndStakeAndSnapshots(frontEnd, newFrontEndStake);
        emit FrontEndStakeChanged(frontEnd, newFrontEndStake, msg.sender);

        _updateDepositAndSnapshots(msg.sender, compoundedZUSDDeposit);

        /* Emit events before transferring RBTC gain to Trove.
         This lets the event log make more sense (i.e. so it appears that first the RBTC gain is withdrawn
        and then it is deposited into the Trove, not the other way around). */
        emit RBTCGainWithdrawn(msg.sender, depositorRBTCGain, ZUSDLoss);
        emit UserDepositChanged(msg.sender, compoundedZUSDDeposit);

        RBTC -= depositorRBTCGain;
        emit StabilityPoolRBTCBalanceUpdated(RBTC);
        emit RBtcerSent(msg.sender, depositorRBTCGain);

        borrowerOperations.moveRBTCGainToTrove{ value: depositorRBTCGain }(msg.sender, _upperHint, _lowerHint);
    }

    // --- ZERO issuance functions ---

    function _triggerZEROIssuance(ICommunityIssuance _communityIssuance) internal {
        uint256 ZEROIssuance = _communityIssuance.issueZERO();
       _updateG(ZEROIssuance);
    }

    function _updateG(uint256 _ZEROIssuance) internal {
        uint256 totalZUSD = totalZUSDDeposits; // cached to save an SLOAD
        /*
        * When total deposits is 0, G is not updated. In this case, the ZERO issued can not be obtained by later
        * depositors - it is missed out on, and remains in the balanceof the CommunityIssuance contract.
        *
        */
        if (totalZUSD == 0 || _ZEROIssuance == 0) {return;}

        uint256 ZEROPerUnitStaked;
        ZEROPerUnitStaked =_computeZEROPerUnitStaked(_ZEROIssuance, totalZUSD);

        uint256 marginalZEROGain = ZEROPerUnitStaked * P;
        epochToScaleToG[currentEpoch][currentScale] = epochToScaleToG[currentEpoch][currentScale] + marginalZEROGain;

        emit G_Updated(epochToScaleToG[currentEpoch][currentScale], currentEpoch, currentScale);
    }

    function _computeZEROPerUnitStaked(uint256 _ZEROIssuance, uint256 _totalZUSDDeposits) internal returns (uint) {
        /*  
        * Calculate the ZERO-per-unit staked.  Division uses a "feedback" error correction, to keep the 
        * cumulative error low in the running total G:
        *
        * 1) Form a numerator which compensates for the floor division error that occurred the last time this 
        * function was called.  
        * 2) Calculate "per-unit-staked" ratio.
        * 3) Multiply the ratio back by its denominator, to reveal the current floor division error.
        * 4) Store this error for use in the next correction when this function is called.
        * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
        */
        uint256 ZERONumerator = _ZEROIssuance * DECIMAL_PRECISION + lastZEROError;

        uint256 ZEROPerUnitStaked = ZERONumerator / _totalZUSDDeposits;
        lastZEROError = ZERONumerator - ZEROPerUnitStaked * _totalZUSDDeposits;

        return ZEROPerUnitStaked;
    }

    // --- Liquidation functions ---

    /**
    * Cancels out the specified debt against the ZUSD contained in the Stability Pool (as far as possible)
    * and transfers the Trove's RBTC collateral from ActivePool to StabilityPool.
    * Only called by liquidation functions in the TroveManager.
    */
    function offset(uint256 _debtToOffset, uint256 _collToAdd) external override {
        _requireCallerIsTroveManager();
        uint256 totalZUSD = totalZUSDDeposits; // cached to save an SLOAD
        if (totalZUSD == 0 || _debtToOffset == 0) { return; }

        _triggerZEROIssuance(communityIssuance);

        (uint256 RBTCGainPerUnitStaked,
            uint256 ZUSDLossPerUnitStaked) = _computeRewardsPerUnitStaked(_collToAdd, _debtToOffset, totalZUSD);

        _updateRewardSumAndProduct(RBTCGainPerUnitStaked, ZUSDLossPerUnitStaked);  // updates S and P

        _moveOffsetCollAndDebt(_collToAdd, _debtToOffset);
    }

    // --- Offset helper functions ---

    function _computeRewardsPerUnitStaked(
        uint256 _collToAdd,
        uint256 _debtToOffset,
        uint256 _totalZUSDDeposits
    )
        internal
        returns (uint256 RBTCGainPerUnitStaked, uint256 ZUSDLossPerUnitStaked)
    {
        /*
        * Compute the ZUSD and RBTC rewards. Uses a "feedback" error correction, to keep
        * the cumulative error in the P and S state variables low:
        *
        * 1) Form numerators which compensate for the floor division errors that occurred the last time this 
        * function was called.  
        * 2) Calculate "per-unit-staked" ratios.
        * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
        * 4) Store these errors for use in the next correction when this function is called.
        * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
        */
        uint256 RBTCNumerator = _collToAdd * DECIMAL_PRECISION + lastRBTCError_Offset;

        assert(_debtToOffset <= _totalZUSDDeposits);
        if (_debtToOffset == _totalZUSDDeposits) {
            ZUSDLossPerUnitStaked = DECIMAL_PRECISION;  // When the Pool depletes to 0, so does each deposit 
            lastZUSDLossError_Offset = 0;
        } else {
            uint256 ZUSDLossNumerator = _debtToOffset * DECIMAL_PRECISION - lastZUSDLossError_Offset;
            /*
            * Add 1 to make error in quotient positive. We want "slightly too much" ZUSD loss,
            * which ensures the error in any given compoundedZUSDDeposit favors the Stability Pool.
            */
            ZUSDLossPerUnitStaked = ZUSDLossNumerator / _totalZUSDDeposits + 1;
            lastZUSDLossError_Offset = ZUSDLossPerUnitStaked * _totalZUSDDeposits - ZUSDLossNumerator;
        }

        RBTCGainPerUnitStaked = RBTCNumerator / _totalZUSDDeposits;
        lastRBTCError_Offset = RBTCNumerator - RBTCGainPerUnitStaked * _totalZUSDDeposits;

        return (RBTCGainPerUnitStaked, ZUSDLossPerUnitStaked);
    }

    /// Update the Stability Pool reward sum S and product P
    function _updateRewardSumAndProduct(uint256 _RBTCGainPerUnitStaked, uint256 _ZUSDLossPerUnitStaked) internal {
        uint256 currentP = P;
        uint256 newP;

        assert(_ZUSDLossPerUnitStaked <= DECIMAL_PRECISION);
        /*
        * The newProductFactor is the factor by which to change all deposits, due to the depletion of Stability Pool ZUSD in the liquidation.
        * We make the product factor 0 if there was a pool-emptying. Otherwise, it is (1 - ZUSDLossPerUnitStaked)
        */
        uint256 newProductFactor = uint(DECIMAL_PRECISION) - _ZUSDLossPerUnitStaked;

        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;
        uint256 currentS = epochToScaleToSum[currentEpochCached][currentScaleCached];

        /*
        * Calculate the new S first, before we update P.
        * The RBTC gain for any given depositor from a liquidation depends on the value of their deposit
        * (and the value of totalDeposits) prior to the Stability being depleted by the debt in the liquidation.
        *
        * Since S corresponds to RBTC gain, and P to deposit loss, we update S first.
        */
        uint256 marginalRBTCGain = _RBTCGainPerUnitStaked * currentP;
        uint256 newS = currentS + marginalRBTCGain;
        epochToScaleToSum[currentEpochCached][currentScaleCached] = newS;
        emit S_Updated(newS, currentEpochCached, currentScaleCached);

        // If the Stability Pool was emptied, increment the epoch, and reset the scale and product P
        if (newProductFactor == 0) {
            currentEpoch = currentEpochCached + 1;
            emit EpochUpdated(currentEpoch);
            currentScale = 0;
            emit ScaleUpdated(currentScale);
            newP = DECIMAL_PRECISION;

        // If multiplying P by a non-zero product factor would reduce P below the scale boundary, increment the scale
        } else if (currentP * newProductFactor / DECIMAL_PRECISION < SCALE_FACTOR) {
            newP = currentP * newProductFactor * SCALE_FACTOR / DECIMAL_PRECISION; 
            currentScale = currentScaleCached + 1;
            emit ScaleUpdated(currentScale);
        } else {
            newP = currentP * newProductFactor / DECIMAL_PRECISION;
        }

        assert(newP > 0);
        P = newP;

        emit P_Updated(newP);
    }

    function _moveOffsetCollAndDebt(uint256 _collToAdd, uint256 _debtToOffset) internal {
        IActivePool activePoolCached = activePool;

        // Cancel the liquidated ZUSD debt with the ZUSD in the stability pool
        activePoolCached.decreaseZUSDDebt(_debtToOffset);
        _decreaseZUSD(_debtToOffset);

        // Burn the debt that was successfully offset
        zusdToken.burn(address(this), _debtToOffset);

        activePoolCached.sendRBTC(address(this), _collToAdd);
    }

    function _decreaseZUSD(uint256 _amount) internal {
        uint256 newTotalZUSDDeposits = totalZUSDDeposits - _amount;
        totalZUSDDeposits = newTotalZUSDDeposits;
        emit StabilityPoolZUSDBalanceUpdated(newTotalZUSDDeposits);
    }

    // --- Reward calculator functions for depositor and front end ---

    /** Calculates the RBTC gain earned by the deposit since its last snapshots were taken.
    * Given by the formula:  E = d0 * (S - S(0))/P(0)
    * where S(0) and P(0) are the depositor's snapshots of the sum S and product P, respectively.
    * d0 is the last recorded deposit value.
    */
    function getDepositorRBTCGain(address _depositor) public view override returns (uint) {
        uint256 initialDeposit = deposits[_depositor].initialValue;

        if (initialDeposit == 0) { return 0; }

        Snapshots memory snapshots = depositSnapshots[_depositor];

        uint256 RBTCGain = _getRBTCGainFromSnapshots(initialDeposit, snapshots);
        return RBTCGain;
    }

    function _getRBTCGainFromSnapshots(uint256 initialDeposit, Snapshots memory snapshots) internal view returns (uint) {
        /*
        * Grab the sum 'S' from the epoch at which the stake was made. The RBTC gain may span up to one scale change.
        * If it does, the second portion of the RBTC gain is scaled by 1e9.
        * If the gain spans no scale change, the second portion will be 0.
        */
        uint128 epochSnapshot = snapshots.epoch;
        uint128 scaleSnapshot = snapshots.scale;
        uint256 S_Snapshot = snapshots.S;
        uint256 P_Snapshot = snapshots.P;

        uint256 firstPortion = epochToScaleToSum[epochSnapshot][scaleSnapshot] - S_Snapshot;
        uint256 secondPortion = epochToScaleToSum[epochSnapshot][scaleSnapshot + 1] / SCALE_FACTOR;

        uint256 RBTCGain = initialDeposit * (firstPortion + secondPortion) / (P_Snapshot * DECIMAL_PRECISION);

        return RBTCGain;
    }

    /**
    * Calculate the ZERO gain earned by a deposit since its last snapshots were taken.
    * Given by the formula:  ZERO = d0 * (G - G(0))/P(0)
    * where G(0) and P(0) are the depositor's snapshots of the sum G and product P, respectively.
    * d0 is the last recorded deposit value.
    */
    function getDepositorZEROGain(address _depositor) public view override returns (uint) {
        uint256 initialDeposit = deposits[_depositor].initialValue;
        if (initialDeposit == 0) {return 0;}

        address frontEndTag = deposits[_depositor].frontEndTag;

        /*
        * If not tagged with a front end, the depositor gets a 100% cut of what their deposit earned.
        * Otherwise, their cut of the deposit's earnings is equal to the kickbackRate, set by the front end through
        * which they made their deposit.
        */
        uint256 kickbackRate = frontEndTag == address(0) ? DECIMAL_PRECISION : frontEnds[frontEndTag].kickbackRate;

        Snapshots memory snapshots = depositSnapshots[_depositor];

        uint256 ZEROGain = kickbackRate * _getZEROGainFromSnapshots(initialDeposit, snapshots) / DECIMAL_PRECISION;

        return ZEROGain;
    }

    /**
    * Return the ZERO gain earned by the front end. Given by the formula:  E = D0 * (G - G(0))/P(0)
    * where G(0) and P(0) are the depositor's snapshots of the sum G and product P, respectively.
    *
    * D0 is the last recorded value of the front end's total tagged deposits.
    */
    function getFrontEndZEROGain(address _frontEnd) public view override returns (uint) {
        uint256 frontEndStake = frontEndStakes[_frontEnd];
        if (frontEndStake == 0) { return 0; }

        uint256 kickbackRate = frontEnds[_frontEnd].kickbackRate;
        uint256 frontEndShare = uint(DECIMAL_PRECISION) - kickbackRate;

        Snapshots memory snapshots = frontEndSnapshots[_frontEnd];

        uint256 ZEROGain = frontEndShare * _getZEROGainFromSnapshots(frontEndStake, snapshots) / DECIMAL_PRECISION;
        return ZEROGain;
    }

    function _getZEROGainFromSnapshots(uint256 initialStake, Snapshots memory snapshots) internal view returns (uint) {
       /*
        * Grab the sum 'G' from the epoch at which the stake was made. The ZERO gain may span up to one scale change.
        * If it does, the second portion of the ZERO gain is scaled by 1e9.
        * If the gain spans no scale change, the second portion will be 0.
        */
        uint128 epochSnapshot = snapshots.epoch;
        uint128 scaleSnapshot = snapshots.scale;
        uint256 G_Snapshot = snapshots.G;
        uint256 P_Snapshot = snapshots.P;

        uint256 firstPortion = epochToScaleToG[epochSnapshot][scaleSnapshot] - G_Snapshot;
        uint256 secondPortion = epochToScaleToG[epochSnapshot][scaleSnapshot+1] / SCALE_FACTOR;

        uint256 ZEROGain = initialStake * (firstPortion + secondPortion) / (DECIMAL_PRECISION * P_Snapshot);
        return ZEROGain;
    }

    // --- Compounded deposit and compounded front end stake ---

    /**
    * Return the user's compounded deposit. Given by the formula:  d = d0 * P/P(0)
    * where P(0) is the depositor's snapshot of the product P, taken when they last updated their deposit.
    */
    function getCompoundedZUSDDeposit(address _depositor) public view override returns (uint) {
        uint256 initialDeposit = deposits[_depositor].initialValue;
        if (initialDeposit == 0) { return 0; }

        Snapshots memory snapshots = depositSnapshots[_depositor];

        uint256 compoundedDeposit = _getCompoundedStakeFromSnapshots(initialDeposit, snapshots);
        return compoundedDeposit;
    }

    /**
    * Return the front end's compounded stake. Given by the formula:  D = D0 * P/P(0)
    * where P(0) is the depositor's snapshot of the product P, taken at the last time
    * when one of the front end's tagged deposits updated their deposit.
    *
    * The front end's compounded stake is equal to the sum of its depositors' compounded deposits.
    */
    function getCompoundedFrontEndStake(address _frontEnd) public view override returns (uint) {
        uint256 frontEndStake = frontEndStakes[_frontEnd];
        if (frontEndStake == 0) { return 0; }

        Snapshots memory snapshots = frontEndSnapshots[_frontEnd];

        uint256 compoundedFrontEndStake = _getCompoundedStakeFromSnapshots(frontEndStake, snapshots);
        return compoundedFrontEndStake;
    }

    // Internal function, used to calculcate compounded deposits and compounded front end stakes.
    function _getCompoundedStakeFromSnapshots(
        uint256 initialStake,
        Snapshots memory snapshots
    )
        internal
        view
        returns (uint)
    {
        uint256 snapshot_P = snapshots.P;
        uint128 scaleSnapshot = snapshots.scale;
        uint128 epochSnapshot = snapshots.epoch;

        // If stake was made before a pool-emptying event, then it has been fully cancelled with debt -- so, return 0
        if (epochSnapshot < currentEpoch) { return 0; }

        uint256 compoundedStake;
        uint128 scaleDiff = currentScale - scaleSnapshot;

        /* Compute the compounded stake. If a scale change in P was made during the stake's lifetime,
        * account for it. If more than one scale change was made, then the stake has decreased by a factor of
        * at least 1e-9 -- so return 0.
        */
        if (scaleDiff == 0) {
            compoundedStake = initialStake * P / snapshot_P;
        } else if (scaleDiff == 1) {
            compoundedStake = initialStake * P  / (snapshot_P * SCALE_FACTOR);
        } else { // if scaleDiff >= 2
            compoundedStake = 0;
        }

        /*
        * If compounded deposit is less than a billionth of the initial deposit, return 0.
        *
        * NOTE: originally, this line was in place to stop rounding errors making the deposit too large. However, the error
        * corrections should ensure the error in P "favors the Pool", i.e. any given compounded deposit should slightly less
        * than it's theoretical value.
        *
        * Thus it's unclear whether this line is still really needed.
        */
        if (compoundedStake < initialStake / 1e9) {return 0;}

        return compoundedStake;
    }

    // --- Sender functions for ZUSD deposit, RBTC gains and ZERO gains ---

    /// Transfer the ZUSD tokens from the user to the Stability Pool's address, and update its recorded ZUSD
    function _sendZUSDtoStabilityPool(address _address, uint256 _amount) internal {
        zusdToken.sendToPool(_address, address(this), _amount);
        uint256 newTotalZUSDDeposits = totalZUSDDeposits + _amount;
        totalZUSDDeposits = newTotalZUSDDeposits;
        emit StabilityPoolZUSDBalanceUpdated(newTotalZUSDDeposits);
    }

    function _sendRBTCGainToDepositor(uint256 _amount) internal {
        if (_amount == 0) {return;}
        uint256 newRBTC = RBTC - _amount;
        RBTC = newRBTC;
        emit StabilityPoolRBTCBalanceUpdated(newRBTC);
        emit RBtcerSent(msg.sender, _amount);

        (bool success, ) = msg.sender.call{ value: _amount }("");
        require(success, "StabilityPool: sending RBTC failed");
    }

    /// Send ZUSD to user and decrease ZUSD in Pool
    function _sendZUSDToDepositor(address _depositor, uint256 ZUSDWithdrawal) internal {
        if (ZUSDWithdrawal == 0) {return;}

        zusdToken.returnFromPool(address(this), _depositor, ZUSDWithdrawal);
        _decreaseZUSD(ZUSDWithdrawal);
    }

    // --- External Front End functions ---

    /// Front end makes a one-time selection of kickback rate upon registering
    function registerFrontEnd(uint256 _kickbackRate) external override {
        _requireFrontEndNotRegistered(msg.sender);
        _requireUserHasNoDeposit(msg.sender);
        _requireValidKickbackRate(_kickbackRate);

        frontEnds[msg.sender].kickbackRate = _kickbackRate;
        frontEnds[msg.sender].registered = true;

        emit FrontEndRegistered(msg.sender, _kickbackRate);
    }

    // --- Stability Pool Deposit Functionality ---

    function _setFrontEndTag(address _depositor, address _frontEndTag) internal {
        deposits[_depositor].frontEndTag = _frontEndTag;
        emit FrontEndTagSet(_depositor, _frontEndTag);
    }


    function _updateDepositAndSnapshots(address _depositor, uint256 _newValue) internal {
        deposits[_depositor].initialValue = _newValue;

        if (_newValue == 0) {
            delete deposits[_depositor].frontEndTag;
            delete depositSnapshots[_depositor];
            emit DepositSnapshotUpdated(_depositor, 0, 0, 0);
            return;
        }
        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;
        uint256 currentP = P;

        // Get S and G for the current epoch and current scale
        uint256 currentS = epochToScaleToSum[currentEpochCached][currentScaleCached];
        uint256 currentG = epochToScaleToG[currentEpochCached][currentScaleCached];

        // Record new snapshots of the latest running product P, sum S, and sum G, for the depositor
        depositSnapshots[_depositor].P = currentP;
        depositSnapshots[_depositor].S = currentS;
        depositSnapshots[_depositor].G = currentG;
        depositSnapshots[_depositor].scale = currentScaleCached;
        depositSnapshots[_depositor].epoch = currentEpochCached;

        emit DepositSnapshotUpdated(_depositor, currentP, currentS, currentG);
    }

    function _updateFrontEndStakeAndSnapshots(address _frontEnd, uint256 _newValue) internal {
        frontEndStakes[_frontEnd] = _newValue;

        if (_newValue == 0) {
            delete frontEndSnapshots[_frontEnd];
            emit FrontEndSnapshotUpdated(_frontEnd, 0, 0);
            return;
        }

        uint128 currentScaleCached = currentScale;
        uint128 currentEpochCached = currentEpoch;
        uint256 currentP = P;

        // Get G for the current epoch and current scale
        uint256 currentG = epochToScaleToG[currentEpochCached][currentScaleCached];

        // Record new snapshots of the latest running product P and sum G for the front end
        frontEndSnapshots[_frontEnd].P = currentP;
        frontEndSnapshots[_frontEnd].G = currentG;
        frontEndSnapshots[_frontEnd].scale = currentScaleCached;
        frontEndSnapshots[_frontEnd].epoch = currentEpochCached;

        emit FrontEndSnapshotUpdated(_frontEnd, currentP, currentG);
    }

    function _payOutZEROGains(ICommunityIssuance _communityIssuance, address _depositor, address _frontEnd) internal {
        // Pay out front end's ZERO gain
        if (_frontEnd != address(0)) {
            uint256 frontEndZEROGain = getFrontEndZEROGain(_frontEnd);
            _communityIssuance.sendZERO(_frontEnd, frontEndZEROGain);
            emit ZEROPaidToFrontEnd(_frontEnd, frontEndZEROGain);
        }

        // Pay out depositor's ZERO gain
        uint256 depositorZEROGain = getDepositorZEROGain(_depositor);
        _communityIssuance.sendZERO(_depositor, depositorZEROGain);
        emit ZEROPaidToDepositor(_depositor, depositorZEROGain);
    }

    // --- 'require' functions ---

    function _requireCallerIsActivePool() internal view {
        require( msg.sender == address(activePool), "StabilityPool: Caller is not ActivePool");
    }

    function _requireCallerIsTroveManager() internal view {
        require(msg.sender == address(troveManager), "StabilityPool: Caller is not TroveManager");
    }

    function _requireNoUnderCollateralizedTroves() internal {
        uint256 price = priceFeed.fetchPrice();
        address lowestTrove = sortedTroves.getLast();
        uint256 ICR = troveManager.getCurrentICR(lowestTrove, price);
        require(ICR >= liquityBaseParams.MCR(), "StabilityPool: Cannot withdraw while there are troves with ICR < MCR");
    }

    function _requireUserHasDeposit(uint256 _initialDeposit) internal pure {
        require(_initialDeposit > 0, 'StabilityPool: User must have a non-zero deposit');
    }

     function _requireUserHasNoDeposit(address _address) internal view {
        uint256 initialDeposit = deposits[_address].initialValue;
        require(initialDeposit == 0, 'StabilityPool: User must have no deposit');
    }

    function _requireNonZeroAmount(uint256 _amount) internal pure {
        require(_amount > 0, 'StabilityPool: Amount must be non-zero');
    }

    function _requireUserHasTrove(address _depositor) internal view {
        require(troveManager.getTroveStatus(_depositor) == 1, "StabilityPool: caller must have an active trove to withdraw RBTCGain to");
    }

    function _requireUserHasRBTCGain(address _depositor) internal view {
        uint256 RBTCGain = getDepositorRBTCGain(_depositor);
        require(RBTCGain > 0, "StabilityPool: caller must have non-zero RBTC Gain");
    }

    function _requireFrontEndNotRegistered(address _address) internal view {
        require(!frontEnds[_address].registered, "StabilityPool: must not already be a registered front end");
    }

     function _requireFrontEndIsRegisteredOrZero(address _address) internal view {
        require(frontEnds[_address].registered || _address == address(0),
            "StabilityPool: Tag must be a registered front end, or the zero address");
    }

    function  _requireValidKickbackRate(uint256 _kickbackRate) internal pure {
        require (_kickbackRate <= DECIMAL_PRECISION, "StabilityPool: Kickback rate must be in range [0,1]");
    }

    // --- Fallback function ---

    receive() external payable {
        _requireCallerIsActivePool();
        RBTC = RBTC + msg.value;
        emit StabilityPoolRBTCBalanceUpdated(RBTC);
    }
}
