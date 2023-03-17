// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "./Interfaces/ITroveManager.sol";
import "./Interfaces/IStabilityPool.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Interfaces/ISortedTroves.sol";
import "./Interfaces/IZEROToken.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/LiquityBase.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./Dependencies/TroveManagerBase.sol";
import "./TroveManagerStorage.sol";

contract TroveManager is TroveManagerBase, CheckContract, ITroveManager {
    event FeeDistributorAddressChanged(address _feeDistributorAddress);
    event TroveManagerRedeemOpsAddressChanged(address _troveManagerRedeemOps);
    event LiquityBaseParamsAddressChanges(address _borrowerOperationsAddress);
    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);
    event ZUSDTokenAddressChanged(address _newZUSDTokenAddress);
    event ActivePoolAddressChanged(address _activePoolAddress);
    event DefaultPoolAddressChanged(address _defaultPoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event GasPoolAddressChanged(address _gasPoolAddress);
    event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress);
    event SortedTrovesAddressChanged(address _sortedTrovesAddress);
    event ZEROTokenAddressChanged(address _zeroTokenAddress);
    event ZEROStakingAddressChanged(address _zeroStakingAddress);

    ///@param _bootstrapPeriod During bootsrap period redemptions are not allowed
    constructor(uint256 _bootstrapPeriod) public TroveManagerBase(_bootstrapPeriod) {}

    // --- Dependency setter ---
    function setAddresses(
        TroveManagerInitAddressesParams memory _troveManagerInitAddressesParams
    ) external override onlyOwner {
        {
            checkContract(_troveManagerInitAddressesParams._feeDistributorAddress);
            checkContract(_troveManagerInitAddressesParams._troveManagerRedeemOps);
            checkContract(_troveManagerInitAddressesParams._liquityBaseParamsAddress);
            checkContract(_troveManagerInitAddressesParams._borrowerOperationsAddress);
            checkContract(_troveManagerInitAddressesParams._activePoolAddress);
            checkContract(_troveManagerInitAddressesParams._defaultPoolAddress);
            checkContract(_troveManagerInitAddressesParams._stabilityPoolAddress);
            checkContract(_troveManagerInitAddressesParams._gasPoolAddress);
            checkContract(_troveManagerInitAddressesParams._collSurplusPoolAddress);
            checkContract(_troveManagerInitAddressesParams._priceFeedAddress);
            checkContract(_troveManagerInitAddressesParams._zusdTokenAddress);
            checkContract(_troveManagerInitAddressesParams._sortedTrovesAddress);
            checkContract(_troveManagerInitAddressesParams._zeroTokenAddress);
            checkContract(_troveManagerInitAddressesParams._zeroStakingAddress);
        }

        feeDistributor = IFeeDistributor(_troveManagerInitAddressesParams._feeDistributorAddress);
        troveManagerRedeemOps = _troveManagerInitAddressesParams._troveManagerRedeemOps;
        liquityBaseParams = ILiquityBaseParams(
            _troveManagerInitAddressesParams._liquityBaseParamsAddress
        );
        {
            borrowerOperationsAddress = _troveManagerInitAddressesParams
                ._borrowerOperationsAddress;
            activePool = IActivePool(_troveManagerInitAddressesParams._activePoolAddress);
            defaultPool = IDefaultPool(_troveManagerInitAddressesParams._defaultPoolAddress);
            _stabilityPool = IStabilityPool(
                _troveManagerInitAddressesParams._stabilityPoolAddress
            );
            gasPoolAddress = _troveManagerInitAddressesParams._gasPoolAddress;
            collSurplusPool = ICollSurplusPool(
                _troveManagerInitAddressesParams._collSurplusPoolAddress
            );
            priceFeed = IPriceFeed(_troveManagerInitAddressesParams._priceFeedAddress);
            _zusdToken = IZUSDToken(_troveManagerInitAddressesParams._zusdTokenAddress);
            sortedTroves = ISortedTroves(_troveManagerInitAddressesParams._sortedTrovesAddress);
            _zeroToken = IZEROToken(_troveManagerInitAddressesParams._zeroTokenAddress);
            _zeroStaking = IZEROStaking(_troveManagerInitAddressesParams._zeroStakingAddress);
        }

        emit FeeDistributorAddressChanged(_troveManagerInitAddressesParams._feeDistributorAddress);
        emit TroveManagerRedeemOpsAddressChanged(
            _troveManagerInitAddressesParams._troveManagerRedeemOps
        );
        emit LiquityBaseParamsAddressChanges(
            _troveManagerInitAddressesParams._borrowerOperationsAddress
        );
        emit BorrowerOperationsAddressChanged(
            _troveManagerInitAddressesParams._borrowerOperationsAddress
        );
        emit ActivePoolAddressChanged(_troveManagerInitAddressesParams._activePoolAddress);
        emit DefaultPoolAddressChanged(_troveManagerInitAddressesParams._defaultPoolAddress);
        emit StabilityPoolAddressChanged(_troveManagerInitAddressesParams._stabilityPoolAddress);
        emit GasPoolAddressChanged(_troveManagerInitAddressesParams._gasPoolAddress);
        emit CollSurplusPoolAddressChanged(
            _troveManagerInitAddressesParams._collSurplusPoolAddress
        );
        emit PriceFeedAddressChanged(_troveManagerInitAddressesParams._priceFeedAddress);
        emit ZUSDTokenAddressChanged(_troveManagerInitAddressesParams._zusdTokenAddress);
        emit SortedTrovesAddressChanged(_troveManagerInitAddressesParams._sortedTrovesAddress);
        emit ZEROTokenAddressChanged(_troveManagerInitAddressesParams._zeroTokenAddress);
        emit ZEROStakingAddressChanged(_troveManagerInitAddressesParams._zeroStakingAddress);
    }

    function setTroveManagerRedeemOps(address _troveManagerRedeemOps) external override onlyOwner {
        checkContract(_troveManagerRedeemOps);
        troveManagerRedeemOps = _troveManagerRedeemOps;
        emit TroveManagerRedeemOpsAddressChanged(_troveManagerRedeemOps);
    }

    // --- Getters ---

    function getTroveOwnersCount() external view override returns (uint256) {
        return TroveOwners.length;
    }

    function getTroveFromTroveOwnersArray(
        uint256 _index
    ) external view override returns (address) {
        return TroveOwners[_index];
    }

    // --- Trove Liquidation functions ---

    /// Single liquidation function. Closes the trove if its ICR is lower than the minimum collateral ratio.
    function liquidate(address _borrower) external override {
        _requireTroveIsActive(_borrower);

        address[] memory borrowers = new address[](1);
        borrowers[0] = _borrower;
        batchLiquidateTroves(borrowers);
    }

    // --- Inner single liquidation functions ---

    /// Liquidate one trove, in Normal Mode.
    function _liquidateNormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        address _borrower,
        uint256 _ZUSDInStabPool
    ) internal returns (LiquidationValues memory singleLiquidation) {
        LocalVariables_InnerSingleLiquidateFunction memory vars;

        (
            singleLiquidation.entireTroveDebt,
            singleLiquidation.entireTroveColl,
            vars.pendingDebtReward,
            vars.pendingCollReward
        ) = getEntireDebtAndColl(_borrower);

        _movePendingTroveRewardsToActivePool(
            _activePool,
            _defaultPool,
            vars.pendingDebtReward,
            vars.pendingCollReward
        );
        _removeStake(_borrower);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(
            singleLiquidation.entireTroveColl
        );
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;
        uint256 collToLiquidate = singleLiquidation.entireTroveColl.sub(
            singleLiquidation.collGasCompensation
        );

        (
            singleLiquidation.debtToOffset,
            singleLiquidation.collToSendToSP,
            singleLiquidation.debtToRedistribute,
            singleLiquidation.collToRedistribute
        ) = _getOffsetAndRedistributionVals(
            singleLiquidation.entireTroveDebt,
            collToLiquidate,
            _ZUSDInStabPool
        );

        _closeTrove(_borrower, Status.closedByLiquidation);
        emit TroveLiquidated(
            _borrower,
            singleLiquidation.entireTroveDebt,
            singleLiquidation.entireTroveColl,
            TroveManagerOperation.liquidateInNormalMode
        );
        emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInNormalMode);
        return singleLiquidation;
    }

    /// Liquidate one trove, in Recovery Mode.
    function _liquidateRecoveryMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        address _borrower,
        uint256 _ICR,
        uint256 _ZUSDInStabPool,
        uint256 _TCR,
        uint256 _price
    ) internal returns (LiquidationValues memory singleLiquidation) {
        LocalVariables_InnerSingleLiquidateFunction memory vars;
        if (TroveOwners.length <= 1) {
            return singleLiquidation;
        } // don't liquidate if last trove
        (
            singleLiquidation.entireTroveDebt,
            singleLiquidation.entireTroveColl,
            vars.pendingDebtReward,
            vars.pendingCollReward
        ) = getEntireDebtAndColl(_borrower);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(
            singleLiquidation.entireTroveColl
        );
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;
        vars.collToLiquidate = singleLiquidation.entireTroveColl.sub(
            singleLiquidation.collGasCompensation
        );

        // If ICR <= 100%, purely redistribute the Trove across all active Troves
        if (_ICR <= _100pct) {
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            _removeStake(_borrower);

            singleLiquidation.debtToOffset = 0;
            singleLiquidation.collToSendToSP = 0;
            singleLiquidation.debtToRedistribute = singleLiquidation.entireTroveDebt;
            singleLiquidation.collToRedistribute = vars.collToLiquidate;

            _closeTrove(_borrower, Status.closedByLiquidation);
            emit TroveLiquidated(
                _borrower,
                singleLiquidation.entireTroveDebt,
                singleLiquidation.entireTroveColl,
                TroveManagerOperation.liquidateInRecoveryMode
            );
            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);

            // If 100% < ICR < MCR, offset as much as possible, and redistribute the remainder
        } else if ((_ICR > _100pct) && (_ICR < liquityBaseParams.MCR())) {
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            _removeStake(_borrower);

            (
                singleLiquidation.debtToOffset,
                singleLiquidation.collToSendToSP,
                singleLiquidation.debtToRedistribute,
                singleLiquidation.collToRedistribute
            ) = _getOffsetAndRedistributionVals(
                singleLiquidation.entireTroveDebt,
                vars.collToLiquidate,
                _ZUSDInStabPool
            );

            _closeTrove(_borrower, Status.closedByLiquidation);
            emit TroveLiquidated(
                _borrower,
                singleLiquidation.entireTroveDebt,
                singleLiquidation.entireTroveColl,
                TroveManagerOperation.liquidateInRecoveryMode
            );
            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);
            /*
             * If 110% <= ICR < current TCR (accounting for the preceding liquidations in the current sequence)
             * and there is ZUSD in the Stability Pool, only offset, with no redistribution,
             * but at a capped rate of 1.1 and only if the whole debt can be liquidated.
             * The remainder due to the capped rate will be claimable as collateral surplus.
             */
        } else if (
            (_ICR >= liquityBaseParams.MCR()) &&
            (_ICR < _TCR) &&
            (singleLiquidation.entireTroveDebt <= _ZUSDInStabPool)
        ) {
            _movePendingTroveRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            assert(_ZUSDInStabPool != 0);

            _removeStake(_borrower);
            singleLiquidation = _getCappedOffsetVals(
                singleLiquidation.entireTroveDebt,
                singleLiquidation.entireTroveColl,
                _price
            );

            _closeTrove(_borrower, Status.closedByLiquidation);
            if (singleLiquidation.collSurplus > 0) {
                collSurplusPool.accountSurplus(_borrower, singleLiquidation.collSurplus);
            }

            emit TroveLiquidated(
                _borrower,
                singleLiquidation.entireTroveDebt,
                singleLiquidation.collToSendToSP,
                TroveManagerOperation.liquidateInRecoveryMode
            );
            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);
        } else {
            // if (_ICR >= liquityBaseParams.MCR() && ( _ICR >= _TCR || singleLiquidation.entireTroveDebt > _ZUSDInStabPool))
            LiquidationValues memory zeroVals;
            return zeroVals;
        }

        return singleLiquidation;
    }

    /** In a full liquidation, returns the values for a trove's coll and debt to be offset, and coll and debt to be
     * redistributed to active troves.
     */
    function _getOffsetAndRedistributionVals(
        uint256 _debt,
        uint256 _coll,
        uint256 _ZUSDInStabPool
    )
        internal
        pure
        returns (
            uint256 debtToOffset,
            uint256 collToSendToSP,
            uint256 debtToRedistribute,
            uint256 collToRedistribute
        )
    {
        if (_ZUSDInStabPool > 0) {
            /*
             * Offset as much debt & collateral as possible against the Stability Pool, and redistribute the remainder
             * between all active troves.
             *
             *  If the trove's debt is larger than the deposited ZUSD in the Stability Pool:
             *
             *  - Offset an amount of the trove's debt equal to the ZUSD in the Stability Pool
             *  - Send a fraction of the trove's collateral to the Stability Pool, equal to the fraction of its offset debt
             *
             */
            debtToOffset = LiquityMath._min(_debt, _ZUSDInStabPool);
            collToSendToSP = _coll.mul(debtToOffset).div(_debt);
            debtToRedistribute = _debt.sub(debtToOffset);
            collToRedistribute = _coll.sub(collToSendToSP);
        } else {
            debtToOffset = 0;
            collToSendToSP = 0;
            debtToRedistribute = _debt;
            collToRedistribute = _coll;
        }
    }

    /**
     *  Get its offset coll/debt and ETH gas comp, and close the trove.
     */
    function _getCappedOffsetVals(
        uint256 _entireTroveDebt,
        uint256 _entireTroveColl,
        uint256 _price
    ) internal view returns (LiquidationValues memory singleLiquidation) {
        singleLiquidation.entireTroveDebt = _entireTroveDebt;
        singleLiquidation.entireTroveColl = _entireTroveColl;
        uint256 collToOffset = _entireTroveDebt.mul(liquityBaseParams.MCR()).div(_price);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(collToOffset);
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;

        singleLiquidation.debtToOffset = _entireTroveDebt;
        singleLiquidation.collToSendToSP = collToOffset.sub(singleLiquidation.collGasCompensation);
        singleLiquidation.collSurplus = _entireTroveColl.sub(collToOffset);
        singleLiquidation.debtToRedistribute = 0;
        singleLiquidation.collToRedistribute = 0;
    }

    /**
     * Liquidate a sequence of troves. Closes a maximum number of n under-collateralized Troves,
     * starting from the one with the lowest collateral ratio in the system, and moving upwards
     */
    function liquidateTroves(uint256 _n) external override {
        ContractsCache memory contractsCache = ContractsCache(
            activePool,
            defaultPool,
            IZUSDToken(address(0)),
            IZEROStaking(address(0)),
            sortedTroves,
            ICollSurplusPool(address(0)),
            address(0)
        );
        IStabilityPool stabilityPoolCached = _stabilityPool;

        LocalVariables_OuterLiquidationFunction memory vars;

        LiquidationTotals memory totals;

        vars.price = priceFeed.fetchPrice();
        vars.ZUSDInStabPool = stabilityPoolCached.getTotalZUSDDeposits();
        vars.recoveryModeAtStart = _checkRecoveryMode(vars.price);

        // Perform the appropriate liquidation sequence - tally the values, and obtain their totals
        if (vars.recoveryModeAtStart) {
            totals = _getTotalsFromLiquidateTrovesSequence_RecoveryMode(
                contractsCache,
                vars.price,
                vars.ZUSDInStabPool,
                _n
            );
        } else {
            // if !vars.recoveryModeAtStart
            totals = _getTotalsFromLiquidateTrovesSequence_NormalMode(
                contractsCache.activePool,
                contractsCache.defaultPool,
                vars.price,
                vars.ZUSDInStabPool,
                _n
            );
        }

        require(totals.totalDebtInSequence > 0, "TroveManager: nothing to liquidate");

        // Move liquidated ETH and ZUSD to the appropriate pools
        stabilityPoolCached.offset(totals.totalDebtToOffset, totals.totalCollToSendToSP);
        _redistributeDebtAndColl(
            contractsCache.activePool,
            contractsCache.defaultPool,
            totals.totalDebtToRedistribute,
            totals.totalCollToRedistribute
        );
        if (totals.totalCollSurplus > 0) {
            contractsCache.activePool.sendETH(address(collSurplusPool), totals.totalCollSurplus);
        }

        // Update system snapshots
        _updateSystemSnapshots_excludeCollRemainder(
            contractsCache.activePool,
            totals.totalCollGasCompensation
        );

        vars.liquidatedDebt = totals.totalDebtInSequence;
        vars.liquidatedColl = totals.totalCollInSequence.sub(totals.totalCollGasCompensation).sub(
            totals.totalCollSurplus
        );
        emit Liquidation(
            vars.liquidatedDebt,
            vars.liquidatedColl,
            totals.totalCollGasCompensation,
            totals.totalZUSDGasCompensation
        );

        // Send gas compensation to caller
        _sendGasCompensation(
            contractsCache.activePool,
            msg.sender,
            totals.totalZUSDGasCompensation,
            totals.totalCollGasCompensation
        );
    }

    /**
     * This function is used when the liquidateTroves sequence starts during Recovery Mode. However, it
     * handle the case where the system *leaves* Recovery Mode, part way through the liquidation sequence
     */
    function _getTotalsFromLiquidateTrovesSequence_RecoveryMode(
        ContractsCache memory _contractsCache,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        uint256 _n
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;
        vars.backToNormalMode = false;
        vars.entireSystemDebt = getEntireSystemDebt();
        vars.entireSystemColl = getEntireSystemColl();

        vars.user = _contractsCache.sortedTroves.getLast();
        address firstUser = _contractsCache.sortedTroves.getFirst();
        for (vars.i = 0; vars.i < _n && vars.user != firstUser; vars.i++) {
            // we need to cache it, because current user is likely going to be deleted
            address nextUser = _contractsCache.sortedTroves.getPrev(vars.user);

            vars.ICR = _getCurrentICR(vars.user, _price);

            if (!vars.backToNormalMode) {
                // Break the loop if ICR is greater than liquityBaseParams.MCR() and Stability Pool is empty
                if (vars.ICR >= liquityBaseParams.MCR() && vars.remainingZUSDInStabPool == 0) {
                    break;
                }

                uint256 TCR = LiquityMath._computeCR(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );

                singleLiquidation = _liquidateRecoveryMode(
                    _contractsCache.activePool,
                    _contractsCache.defaultPool,
                    vars.user,
                    vars.ICR,
                    vars.remainingZUSDInStabPool,
                    TCR,
                    _price
                );

                // Update aggregate trackers
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );
                vars.entireSystemDebt = vars.entireSystemDebt.sub(singleLiquidation.debtToOffset);
                vars.entireSystemColl = vars
                    .entireSystemColl
                    .sub(singleLiquidation.collToSendToSP)
                    .sub(singleLiquidation.collSurplus);

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);

                vars.backToNormalMode = !_checkPotentialRecoveryMode(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );
            } else if (vars.backToNormalMode && vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _contractsCache.activePool,
                    _contractsCache.defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );

                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            } else break; // break if the loop reaches a Trove with ICR >= MCR

            vars.user = nextUser;
        }
    }

    function _getTotalsFromLiquidateTrovesSequence_NormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        uint256 _n
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;
        ISortedTroves sortedTrovesCached = sortedTroves;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;

        for (vars.i = 0; vars.i < _n; vars.i++) {
            vars.user = sortedTrovesCached.getLast();
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );

                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            } else break; // break if the loop reaches a Trove with ICR >= MCR
        }
    }

    /**
     * Attempt to liquidate a custom list of troves provided by the caller.
     */
    function batchLiquidateTroves(address[] memory _troveArray) public override {
        require(_troveArray.length != 0, "TroveManager: Calldata address array must not be empty");

        IActivePool activePoolCached = activePool;
        IDefaultPool defaultPoolCached = defaultPool;
        IStabilityPool stabilityPoolCached = _stabilityPool;

        LocalVariables_OuterLiquidationFunction memory vars;
        LiquidationTotals memory totals;

        vars.price = priceFeed.fetchPrice();
        vars.ZUSDInStabPool = stabilityPoolCached.getTotalZUSDDeposits();
        vars.recoveryModeAtStart = _checkRecoveryMode(vars.price);

        // Perform the appropriate liquidation sequence - tally values and obtain their totals.
        if (vars.recoveryModeAtStart) {
            totals = _getTotalFromBatchLiquidate_RecoveryMode(
                activePoolCached,
                defaultPoolCached,
                vars.price,
                vars.ZUSDInStabPool,
                _troveArray
            );
        } else {
            //  if !vars.recoveryModeAtStart
            totals = _getTotalsFromBatchLiquidate_NormalMode(
                activePoolCached,
                defaultPoolCached,
                vars.price,
                vars.ZUSDInStabPool,
                _troveArray
            );
        }

        require(totals.totalDebtInSequence > 0, "TroveManager: nothing to liquidate");

        // Move liquidated ETH and ZUSD to the appropriate pools
        stabilityPoolCached.offset(totals.totalDebtToOffset, totals.totalCollToSendToSP);
        _redistributeDebtAndColl(
            activePoolCached,
            defaultPoolCached,
            totals.totalDebtToRedistribute,
            totals.totalCollToRedistribute
        );
        if (totals.totalCollSurplus > 0) {
            activePoolCached.sendETH(address(collSurplusPool), totals.totalCollSurplus);
        }

        // Update system snapshots
        _updateSystemSnapshots_excludeCollRemainder(
            activePoolCached,
            totals.totalCollGasCompensation
        );

        vars.liquidatedDebt = totals.totalDebtInSequence;
        vars.liquidatedColl = totals.totalCollInSequence.sub(totals.totalCollGasCompensation).sub(
            totals.totalCollSurplus
        );
        emit Liquidation(
            vars.liquidatedDebt,
            vars.liquidatedColl,
            totals.totalCollGasCompensation,
            totals.totalZUSDGasCompensation
        );

        // Send gas compensation to caller
        _sendGasCompensation(
            activePoolCached,
            msg.sender,
            totals.totalZUSDGasCompensation,
            totals.totalCollGasCompensation
        );
    }

    /**
     * This function is used when the batch liquidation sequence starts during Recovery Mode. However, it
     * handle the case where the system *leaves* Recovery Mode, part way through the liquidation sequence
     */
    function _getTotalFromBatchLiquidate_RecoveryMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        address[] memory _troveArray
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;
        vars.backToNormalMode = false;
        vars.entireSystemDebt = getEntireSystemDebt();
        vars.entireSystemColl = getEntireSystemColl();

        for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
            vars.user = _troveArray[vars.i];
            // Skip non-active troves
            if (Troves[vars.user].status != Status.active) {
                continue;
            }
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (!vars.backToNormalMode) {
                // Skip this trove if ICR is greater than liquityBaseParams.MCR() and Stability Pool is empty
                if (vars.ICR >= liquityBaseParams.MCR() && vars.remainingZUSDInStabPool == 0) {
                    continue;
                }

                uint256 TCR = LiquityMath._computeCR(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );

                singleLiquidation = _liquidateRecoveryMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.ICR,
                    vars.remainingZUSDInStabPool,
                    TCR,
                    _price
                );

                // Update aggregate trackers
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );
                vars.entireSystemDebt = vars.entireSystemDebt.sub(singleLiquidation.debtToOffset);
                vars.entireSystemColl = vars.entireSystemColl.sub(
                    singleLiquidation.collToSendToSP
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);

                vars.backToNormalMode = !_checkPotentialRecoveryMode(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );
            } else if (vars.backToNormalMode && vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            } else continue; // In Normal Mode skip troves with ICR >= MCR
        }
    }

    function _getTotalsFromBatchLiquidate_NormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        address[] memory _troveArray
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;

        for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
            vars.user = _troveArray[vars.i];
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (vars.ICR < liquityBaseParams.MCR()) {
                singleLiquidation = _liquidateNormalMode(
                    _activePool,
                    _defaultPool,
                    vars.user,
                    vars.remainingZUSDInStabPool
                );
                vars.remainingZUSDInStabPool = vars.remainingZUSDInStabPool.sub(
                    singleLiquidation.debtToOffset
                );

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
            }
        }
    }

    // --- Liquidation helper functions ---

    function _addLiquidationValuesToTotals(
        LiquidationTotals memory oldTotals,
        LiquidationValues memory singleLiquidation
    ) internal pure returns (LiquidationTotals memory newTotals) {
        // Tally all the values with their respective running totals
        newTotals.totalCollGasCompensation = oldTotals.totalCollGasCompensation.add(
            singleLiquidation.collGasCompensation
        );
        newTotals.totalZUSDGasCompensation = oldTotals.totalZUSDGasCompensation.add(
            singleLiquidation.ZUSDGasCompensation
        );
        newTotals.totalDebtInSequence = oldTotals.totalDebtInSequence.add(
            singleLiquidation.entireTroveDebt
        );
        newTotals.totalCollInSequence = oldTotals.totalCollInSequence.add(
            singleLiquidation.entireTroveColl
        );
        newTotals.totalDebtToOffset = oldTotals.totalDebtToOffset.add(
            singleLiquidation.debtToOffset
        );
        newTotals.totalCollToSendToSP = oldTotals.totalCollToSendToSP.add(
            singleLiquidation.collToSendToSP
        );
        newTotals.totalDebtToRedistribute = oldTotals.totalDebtToRedistribute.add(
            singleLiquidation.debtToRedistribute
        );
        newTotals.totalCollToRedistribute = oldTotals.totalCollToRedistribute.add(
            singleLiquidation.collToRedistribute
        );
        newTotals.totalCollSurplus = oldTotals.totalCollSurplus.add(singleLiquidation.collSurplus);

        return newTotals;
    }

    function _sendGasCompensation(
        IActivePool _activePool,
        address _liquidator,
        uint256 _ZUSD,
        uint256 _ETH
    ) internal {
        if (_ZUSD > 0) {
            _zusdToken.returnFromPool(gasPoolAddress, _liquidator, _ZUSD);
        }

        if (_ETH > 0) {
            _activePool.sendETH(_liquidator, _ETH);
        }
    }

    // --- Helper functions ---

    /// @return the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.
    function getNominalICR(address _borrower) public view override returns (uint256) {
        (uint256 currentETH, uint256 currentZUSDDebt) = _getCurrentTroveAmounts(_borrower);

        uint256 NICR = LiquityMath._computeNominalCR(currentETH, currentZUSDDebt);
        return NICR;
    }

    function applyPendingRewards(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _applyPendingRewards(activePool, defaultPool, _borrower);
    }

    /// Update borrower's snapshots of L_ETH and L_ZUSDDebt to reflect the current values
    function updateTroveRewardSnapshots(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _updateTroveRewardSnapshots(_borrower);
    }

    /// Return the Troves entire debt and coll, including pending rewards from redistributions.
    function getEntireDebtAndColl(
        address _borrower
    )
        public
        view
        override
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingETHReward
        )
    {
        debt = Troves[_borrower].debt;
        coll = Troves[_borrower].coll;

        pendingZUSDDebtReward = getPendingZUSDDebtReward(_borrower);
        pendingETHReward = getPendingETHReward(_borrower);

        debt = debt.add(pendingZUSDDebtReward);
        coll = coll.add(pendingETHReward);
    }

    function removeStake(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _removeStake(_borrower);
    }

    function updateStakeAndTotalStakes(address _borrower) external override returns (uint256) {
        _requireCallerIsBorrowerOperations();
        return _updateStakeAndTotalStakes(_borrower);
    }

    function _redistributeDebtAndColl(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _debt,
        uint256 _coll
    ) internal {
        if (_debt == 0) {
            return;
        }

        /*
         * Add distributed coll and debt rewards-per-unit-staked to the running totals. Division uses a "feedback"
         * error correction, to keep the cumulative error low in the running totals L_ETH and L_ZUSDDebt:
         *
         * 1) Form numerators which compensate for the floor division errors that occurred the last time this
         * function was called.
         * 2) Calculate "per-unit-staked" ratios.
         * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
         * 4) Store these errors for use in the next correction when this function is called.
         * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
         */
        uint256 ETHNumerator = _coll.mul(DECIMAL_PRECISION).add(lastETHError_Redistribution);
        uint256 ZUSDDebtNumerator = _debt.mul(DECIMAL_PRECISION).add(
            lastZUSDDebtError_Redistribution
        );

        // Get the per-unit-staked terms
        uint256 ETHRewardPerUnitStaked = ETHNumerator.div(totalStakes);
        uint256 ZUSDDebtRewardPerUnitStaked = ZUSDDebtNumerator.div(totalStakes);

        lastETHError_Redistribution = ETHNumerator.sub(ETHRewardPerUnitStaked.mul(totalStakes));
        lastZUSDDebtError_Redistribution = ZUSDDebtNumerator.sub(
            ZUSDDebtRewardPerUnitStaked.mul(totalStakes)
        );

        // Add per-unit-staked terms to the running totals
        L_ETH = L_ETH.add(ETHRewardPerUnitStaked);
        L_ZUSDDebt = L_ZUSDDebt.add(ZUSDDebtRewardPerUnitStaked);

        emit LTermsUpdated(L_ETH, L_ZUSDDebt);

        // Transfer coll and debt from ActivePool to DefaultPool
        _activePool.decreaseZUSDDebt(_debt);
        _defaultPool.increaseZUSDDebt(_debt);
        _activePool.sendETH(address(_defaultPool), _coll);
    }

    function closeTrove(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _closeTrove(_borrower, Status.closedByOwner);
    }

    /**
     * Updates snapshots of system total stakes and total collateral, excluding a given collateral remainder from the calculation.
     * Used in a liquidation sequence.
     *
     * The calculation excludes a portion of collateral that is in the ActivePool:
     *
     * the total ETH gas compensation from the liquidation sequence
     *
     * The ETH as compensation must be excluded as it is always sent out at the very end of the liquidation sequence.
     */
    function _updateSystemSnapshots_excludeCollRemainder(
        IActivePool _activePool,
        uint256 _collRemainder
    ) internal {
        totalStakesSnapshot = totalStakes;

        uint256 activeColl = _activePool.getETH();
        uint256 liquidatedColl = defaultPool.getETH();
        totalCollateralSnapshot = activeColl.sub(_collRemainder).add(liquidatedColl);

        emit SystemSnapshotsUpdated(totalStakesSnapshot, totalCollateralSnapshot);
    }

    /// Push the owner's address to the Trove owners list, and record the corresponding array index on the Trove struct
    function addTroveOwnerToArray(address _borrower) external override returns (uint256 index) {
        _requireCallerIsBorrowerOperations();
        return _addTroveOwnerToArray(_borrower);
    }

    function _addTroveOwnerToArray(address _borrower) internal returns (uint128 index) {
        /* Max array size is 2**128 - 1, i.e. ~3e30 troves. No risk of overflow, since troves have minimum ZUSD
        debt of liquidation reserve plus MIN_NET_DEBT. 3e30 ZUSD dwarfs the value of all wealth in the world ( which is < 1e15 USD). */

        // Push the Troveowner to the array
        TroveOwners.push(_borrower);

        // Record the index of the new Troveowner on their Trove struct
        index = uint128(TroveOwners.length.sub(1));
        Troves[_borrower].arrayIndex = index;

        return index;
    }

    // --- Recovery Mode and TCR functions ---

    function getTCR(uint256 _price) external view override returns (uint256) {
        return _getTCR(_price);
    }

    function MCR() external view override returns (uint256) {
        return liquityBaseParams.MCR();
    }

    function CCR() external view override returns (uint256) {
        return liquityBaseParams.CCR();
    }

    function checkRecoveryMode(uint256 _price) external view override returns (bool) {
        return _checkRecoveryMode(_price);
    }

    // Check whether or not the system *would be* in Recovery Mode, given an ETH:USD price, and the entire system coll and debt.
    function _checkPotentialRecoveryMode(
        uint256 _entireSystemColl,
        uint256 _entireSystemDebt,
        uint256 _price
    ) internal view returns (bool) {
        uint256 TCR = LiquityMath._computeCR(_entireSystemColl, _entireSystemDebt, _price);

        return TCR < liquityBaseParams.CCR();
    }

    function getRedemptionRateWithDecay() public view override returns (uint256) {
        return _calcRedemptionRate(_calcDecayedBaseRate());
    }

    function getRedemptionFeeWithDecay(
        uint256 _ETHDrawn
    ) external view override returns (uint256) {
        return _calcRedemptionFee(getRedemptionRateWithDecay(), _ETHDrawn);
    }

    // --- Borrowing fee functions ---

    function getBorrowingRate() public view override returns (uint256) {
        return _calcBorrowingRate(baseRate);
    }

    function getBorrowingRateWithDecay() public view override returns (uint256) {
        return _calcBorrowingRate(_calcDecayedBaseRate());
    }

    function _calcBorrowingRate(uint256 _baseRate) internal view returns (uint256) {
        return
            LiquityMath._min(
                liquityBaseParams.BORROWING_FEE_FLOOR().add(_baseRate),
                liquityBaseParams.MAX_BORROWING_FEE()
            );
    }

    function getBorrowingFee(uint256 _ZUSDDebt) external view override returns (uint256) {
        return _calcBorrowingFee(getBorrowingRate(), _ZUSDDebt);
    }

    function getBorrowingFeeWithDecay(uint256 _ZUSDDebt) external view override returns (uint256) {
        return _calcBorrowingFee(getBorrowingRateWithDecay(), _ZUSDDebt);
    }

    function _calcBorrowingFee(
        uint256 _borrowingRate,
        uint256 _ZUSDDebt
    ) internal pure returns (uint256) {
        return _borrowingRate.mul(_ZUSDDebt).div(DECIMAL_PRECISION);
    }

    /// Updates the baseRate state variable based on time elapsed since the last redemption or ZUSD borrowing operation.
    function decayBaseRateFromBorrowing() external override {
        _requireCallerIsBorrowerOperations();

        uint256 decayedBaseRate = _calcDecayedBaseRate();
        assert(decayedBaseRate <= DECIMAL_PRECISION); // The baseRate can decay to 0

        baseRate = decayedBaseRate;
        emit BaseRateUpdated(decayedBaseRate);

        _updateLastFeeOpTime();
    }

    // --- Internal fee functions ---

    // --- Trove property getters ---

    function getTroveStatus(address _borrower) external view override returns (uint256) {
        return uint256(Troves[_borrower].status);
    }

    function getTroveStake(address _borrower) external view override returns (uint256) {
        return Troves[_borrower].stake;
    }

    function getTroveDebt(address _borrower) external view override returns (uint256) {
        return Troves[_borrower].debt;
    }

    function getTroveColl(address _borrower) external view override returns (uint256) {
        return Troves[_borrower].coll;
    }

    // --- Trove property setters, called by BorrowerOperations ---

    function setTroveStatus(address _borrower, uint256 _num) external override {
        _requireCallerIsBorrowerOperations();
        Troves[_borrower].status = Status(_num);
    }

    function increaseTroveColl(
        address _borrower,
        uint256 _collIncrease
    ) external override returns (uint256) {
        _requireCallerIsBorrowerOperations();
        uint256 newColl = Troves[_borrower].coll.add(_collIncrease);
        Troves[_borrower].coll = newColl;
        return newColl;
    }

    function decreaseTroveColl(
        address _borrower,
        uint256 _collDecrease
    ) external override returns (uint256) {
        _requireCallerIsBorrowerOperations();
        uint256 newColl = Troves[_borrower].coll.sub(_collDecrease);
        Troves[_borrower].coll = newColl;
        return newColl;
    }

    function increaseTroveDebt(
        address _borrower,
        uint256 _debtIncrease
    ) external override returns (uint256) {
        _requireCallerIsBorrowerOperations();
        uint256 newDebt = Troves[_borrower].debt.add(_debtIncrease);
        Troves[_borrower].debt = newDebt;
        return newDebt;
    }

    function decreaseTroveDebt(
        address _borrower,
        uint256 _debtDecrease
    ) external override returns (uint256) {
        _requireCallerIsBorrowerOperations();
        uint256 newDebt = Troves[_borrower].debt.sub(_debtDecrease);
        Troves[_borrower].debt = newDebt;
        return newDebt;
    }

    function getCurrentICR(
        address _borrower,
        uint256 _price
    ) external view override returns (uint256) {
        return _getCurrentICR(_borrower, _price);
    }

    function getPendingETHReward(address _borrower) public view override returns (uint256) {
        return _getPendingETHReward(_borrower);
    }

    function getPendingZUSDDebtReward(address _borrower) public view override returns (uint256) {
        return _getPendingZUSDDebtReward(_borrower);
    }

    function hasPendingRewards(address _borrower) public view override returns (bool) {
        return _hasPendingRewards(_borrower);
    }

    function getRedemptionRate() public view override returns (uint256) {
        return _getRedemptionRate();
    }

    /// @dev    this function forwards the call to the troveManagerRedeemOps in a delegate call fashion
    ///         so the parameters are not needed
    function redeemCollateral(
        uint256 _ZUSDamount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage
    ) external override {
        (bool success, bytes memory returndata) = troveManagerRedeemOps.delegatecall(msg.data);
        require(success, string(returndata));
    }

    /// @dev    this function forwards the call to the troveManagerRedeemOps in a delegate call fashion
    ///         so the parameters are not needed
    ///DLLR _owner or _spender can use Sovryn Mynt to convert DLLR to ZUSD, then use the Zero redemption mechanism to redeem ZUSD for RBTC, all in a single transaction
    function redeemCollateralViaDLLR(
        uint256 _dllrAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage,
        IMassetManager.PermitParams calldata _permitParams
    ) external override {
        (bool success, bytes memory returndata) = troveManagerRedeemOps.delegatecall(msg.data);
        require(success, string(returndata));
    }
}
