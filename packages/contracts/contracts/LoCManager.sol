// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/ILoCManager.sol";
import "./Interfaces/IStabilityPool.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Interfaces/ISortedLoCs.sol";
import "./Interfaces/IZEROToken.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/ZeroBase.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./Dependencies/LoCManagerBase.sol";
import "./LoCManagerStorage.sol";

contract LoCManager is LoCManagerBase, CheckContract, ILoCManager {

    event FeeDistributorAddressChanged(address _feeDistributorAddress);
    event LoCManagerRedeemOpsAddressChanged(address _locManagerRedeemOps);
    event ZeroBaseParamsAddressChanges(address _borrowerOperationsAddress);
    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);
    event ZUSDTokenAddressChanged(address _newZUSDTokenAddress);
    event ActivePoolAddressChanged(address _activePoolAddress);
    event DefaultPoolAddressChanged(address _defaultPoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event GasPoolAddressChanged(address _gasPoolAddress);
    event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress);
    event SortedLoCsAddressChanged(address _sortedLoCsAddress);
    event ZEROTokenAddressChanged(address _zeroTokenAddress);
    event ZEROStakingAddressChanged(address _zeroStakingAddress);


    // --- Dependency setter ---
    function setAddresses(
        address _feeDistributorAddress,
        address _locManagerRedeemOps,
        address _zeroBaseParamsAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _zusdTokenAddress,
        address _sortedLoCsAddress,
        address _zeroTokenAddress,
        address _zeroStakingAddress
    ) external override onlyOwner {

        checkContract(_feeDistributorAddress);
        checkContract(_locManagerRedeemOps);
        checkContract(_zeroBaseParamsAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_activePoolAddress);
        checkContract(_defaultPoolAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_gasPoolAddress);
        checkContract(_collSurplusPoolAddress);
        checkContract(_priceFeedAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_sortedLoCsAddress);
        checkContract(_zeroTokenAddress);
        checkContract(_zeroStakingAddress);

        feeDistributor = IFeeDistributor(_feeDistributorAddress);
        locManagerRedeemOps = _locManagerRedeemOps;
        zeroBaseParams = IZeroBaseParams(_zeroBaseParamsAddress);
        borrowerOperationsAddress = _borrowerOperationsAddress;
        activePool = IActivePool(_activePoolAddress);
        defaultPool = IDefaultPool(_defaultPoolAddress);
        _stabilityPool = IStabilityPool(_stabilityPoolAddress);
        gasPoolAddress = _gasPoolAddress;
        collSurplusPool = ICollSurplusPool(_collSurplusPoolAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        _zusdToken = IZUSDToken(_zusdTokenAddress);
        sortedLoCs = ISortedLoCs(_sortedLoCsAddress);
        _zeroToken = IZEROToken(_zeroTokenAddress);
        _zeroStaking = IZEROStaking(_zeroStakingAddress);        

        emit FeeDistributorAddressChanged(_feeDistributorAddress);
        emit LoCManagerRedeemOpsAddressChanged(_locManagerRedeemOps);
        emit ZeroBaseParamsAddressChanges(_borrowerOperationsAddress);
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit GasPoolAddressChanged(_gasPoolAddress);
        emit CollSurplusPoolAddressChanged(_collSurplusPoolAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit SortedLoCsAddressChanged(_sortedLoCsAddress);
        emit ZEROTokenAddressChanged(_zeroTokenAddress);
        emit ZEROStakingAddressChanged(_zeroStakingAddress);

    }

    // --- Getters ---

    function getLoCOwnersCount() external view override returns (uint256) {
        return LoCOwners.length;
    }

    function getLoCFromLoCOwnersArray(uint256 _index) external view override returns (address) {
        return LoCOwners[_index];
    }

    // --- LoC Liquidation functions ---

    /// Single liquidation function. Closes the LoC if its ICR is lower than the minimum collateral ratio.
    function liquidate(address _borrower) external override {
        _requireLoCIsActive(_borrower);

        address[] memory borrowers = new address[](1);
        borrowers[0] = _borrower;
        batchLiquidateLoCs(borrowers);
    }

    // --- Inner single liquidation functions ---

    /// Liquidate one loc, in Normal Mode.
    function _liquidateNormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        address _borrower,
        uint256 _ZUSDInStabPool
    ) internal returns (LiquidationValues memory singleLiquidation) {
        LocalVariables_InnerSingleLiquidateFunction memory vars;

        (
            singleLiquidation.entireLoCDebt,
            singleLiquidation.entireLoCColl,
            vars.pendingDebtReward,
            vars.pendingCollReward
        ) = getEntireDebtAndColl(_borrower);

        _movePendingLoCRewardsToActivePool(
            _activePool,
            _defaultPool,
            vars.pendingDebtReward,
            vars.pendingCollReward
        );
        _removeStake(_borrower);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(
            singleLiquidation.entireLoCColl
        );
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;
        uint256 collToLiquidate = singleLiquidation.entireLoCColl.sub(
            singleLiquidation.collGasCompensation
        );

        (
            singleLiquidation.debtToOffset,
            singleLiquidation.collToSendToSP,
            singleLiquidation.debtToRedistribute,
            singleLiquidation.collToRedistribute
        ) = _getOffsetAndRedistributionVals(
            singleLiquidation.entireLoCDebt,
            collToLiquidate,
            _ZUSDInStabPool
        );

        _closeLoC(_borrower, Status.closedByLiquidation);
        emit LoCLiquidated(
            _borrower,
            singleLiquidation.entireLoCDebt,
            singleLiquidation.entireLoCColl,
            LoCManagerOperation.liquidateInNormalMode
        );
        emit LoCUpdated(_borrower, 0, 0, 0, LoCManagerOperation.liquidateInNormalMode);
        return singleLiquidation;
    }

    /// Liquidate one loc, in Recovery Mode.
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
        if (LoCOwners.length <= 1) {
            return singleLiquidation;
        } // don't liquidate if last loc
        (
            singleLiquidation.entireLoCDebt,
            singleLiquidation.entireLoCColl,
            vars.pendingDebtReward,
            vars.pendingCollReward
        ) = getEntireDebtAndColl(_borrower);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(
            singleLiquidation.entireLoCColl
        );
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;
        vars.collToLiquidate = singleLiquidation.entireLoCColl.sub(
            singleLiquidation.collGasCompensation
        );

        // If ICR <= 100%, purely redistribute the LoC across all active LoCs
        if (_ICR <= _100pct) {
            _movePendingLoCRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            _removeStake(_borrower);

            singleLiquidation.debtToOffset = 0;
            singleLiquidation.collToSendToSP = 0;
            singleLiquidation.debtToRedistribute = singleLiquidation.entireLoCDebt;
            singleLiquidation.collToRedistribute = vars.collToLiquidate;

            _closeLoC(_borrower, Status.closedByLiquidation);
            emit LoCLiquidated(
                _borrower,
                singleLiquidation.entireLoCDebt,
                singleLiquidation.entireLoCColl,
                LoCManagerOperation.liquidateInRecoveryMode
            );
            emit LoCUpdated(_borrower, 0, 0, 0, LoCManagerOperation.liquidateInRecoveryMode);

            // If 100% < ICR < MCR, offset as much as possible, and redistribute the remainder
        } else if ((_ICR > _100pct) && (_ICR < zeroBaseParams.MCR())) {
            _movePendingLoCRewardsToActivePool(
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
                singleLiquidation.entireLoCDebt,
                vars.collToLiquidate,
                _ZUSDInStabPool
            );

            _closeLoC(_borrower, Status.closedByLiquidation);
            emit LoCLiquidated(
                _borrower,
                singleLiquidation.entireLoCDebt,
                singleLiquidation.entireLoCColl,
                LoCManagerOperation.liquidateInRecoveryMode
            );
            emit LoCUpdated(_borrower, 0, 0, 0, LoCManagerOperation.liquidateInRecoveryMode);
            /*
             * If 110% <= ICR < current TCR (accounting for the preceding liquidations in the current sequence)
             * and there is ZUSD in the Stability Pool, only offset, with no redistribution,
             * but at a capped rate of 1.1 and only if the whole debt can be liquidated.
             * The remainder due to the capped rate will be claimable as collateral surplus.
             */
        } else if (
            (_ICR >= zeroBaseParams.MCR()) &&
            (_ICR < _TCR) &&
            (singleLiquidation.entireLoCDebt <= _ZUSDInStabPool)
        ) {
            _movePendingLoCRewardsToActivePool(
                _activePool,
                _defaultPool,
                vars.pendingDebtReward,
                vars.pendingCollReward
            );
            assert(_ZUSDInStabPool != 0);

            _removeStake(_borrower);
            singleLiquidation = _getCappedOffsetVals(
                singleLiquidation.entireLoCDebt,
                singleLiquidation.entireLoCColl,
                _price
            );

            _closeLoC(_borrower, Status.closedByLiquidation);
            if (singleLiquidation.collSurplus > 0) {
                collSurplusPool.accountSurplus(_borrower, singleLiquidation.collSurplus);
            }

            emit LoCLiquidated(
                _borrower,
                singleLiquidation.entireLoCDebt,
                singleLiquidation.collToSendToSP,
                LoCManagerOperation.liquidateInRecoveryMode
            );
            emit LoCUpdated(_borrower, 0, 0, 0, LoCManagerOperation.liquidateInRecoveryMode);
        } else {
            // if (_ICR >= zeroBaseParams.MCR() && ( _ICR >= _TCR || singleLiquidation.entireLoCDebt > _ZUSDInStabPool))
            LiquidationValues memory zeroVals;
            return zeroVals;
        }

        return singleLiquidation;
    }

    /** In a full liquidation, returns the values for a LoC's coll and debt to be offset, and coll and debt to be
     * redistributed to active locs.
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
             * between all active locs.
             *
             *  If the LoC's debt is larger than the deposited ZUSD in the Stability Pool:
             *
             *  - Offset an amount of the LoC's debt equal to the ZUSD in the Stability Pool
             *  - Send a fraction of the LoC's collateral to the Stability Pool, equal to the fraction of its offset debt
             *
             */
            debtToOffset = ZeroMath._min(_debt, _ZUSDInStabPool);
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
     *  Get its offset coll/debt and BTC gas comp, and close the loc.
     */
    function _getCappedOffsetVals(
        uint256 _entireLoCDebt,
        uint256 _entireLoCColl,
        uint256 _price
    ) internal view returns (LiquidationValues memory singleLiquidation) {
        singleLiquidation.entireLoCDebt = _entireLoCDebt;
        singleLiquidation.entireLoCColl = _entireLoCColl;
        uint256 collToOffset = _entireLoCDebt.mul(zeroBaseParams.MCR()).div(_price);

        singleLiquidation.collGasCompensation = _getCollGasCompensation(collToOffset);
        singleLiquidation.ZUSDGasCompensation = ZUSD_GAS_COMPENSATION;

        singleLiquidation.debtToOffset = _entireLoCDebt;
        singleLiquidation.collToSendToSP = collToOffset.sub(singleLiquidation.collGasCompensation);
        singleLiquidation.collSurplus = _entireLoCColl.sub(collToOffset);
        singleLiquidation.debtToRedistribute = 0;
        singleLiquidation.collToRedistribute = 0;
    }

    /**
     * Liquidate a sequence of locs. Closes a maximum number of n under-collateralized LoCs,
     * starting from the one with the lowest collateral ratio in the system, and moving upwards
     */
    function liquidateLoCs(uint256 _n) external override {
        ContractsCache memory contractsCache = ContractsCache(
            activePool,
            defaultPool,
            IZUSDToken(address(0)),
            IZEROStaking(address(0)),
            sortedLoCs,
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
            totals = _getTotalsFromLiquidateLoCsSequence_RecoveryMode(
                contractsCache,
                vars.price,
                vars.ZUSDInStabPool,
                _n
            );
        } else {
            // if !vars.recoveryModeAtStart
            totals = _getTotalsFromLiquidateLoCsSequence_NormalMode(
                contractsCache.activePool,
                contractsCache.defaultPool,
                vars.price,
                vars.ZUSDInStabPool,
                _n
            );
        }

        require(totals.totalDebtInSequence > 0, "LoCManager: nothing to liquidate");

        // Move liquidated BTC and ZUSD to the appropriate pools
        stabilityPoolCached.offset(totals.totalDebtToOffset, totals.totalCollToSendToSP);
        _redistributeDebtAndColl(
            contractsCache.activePool,
            contractsCache.defaultPool,
            totals.totalDebtToRedistribute,
            totals.totalCollToRedistribute
        );
        if (totals.totalCollSurplus > 0) {
            contractsCache.activePool.sendBTC(address(collSurplusPool), totals.totalCollSurplus);
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
     * This function is used when the liquidateLoCs sequence starts during Recovery Mode. However, it
     * handle the case where the system *leaves* Recovery Mode, part way through the liquidation sequence
     */
    function _getTotalsFromLiquidateLoCsSequence_RecoveryMode(
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

        vars.user = _contractsCache.sortedLoCs.getLast();
        address firstUser = _contractsCache.sortedLoCs.getFirst();
        for (vars.i = 0; vars.i < _n && vars.user != firstUser; vars.i++) {
            // we need to cache it, because current user is likely going to be deleted
            address nextUser = _contractsCache.sortedLoCs.getPrev(vars.user);

            vars.ICR = _getCurrentICR(vars.user, _price);

            if (!vars.backToNormalMode) {
                // Break the loop if ICR is greater than zeroBaseParams.MCR() and Stability Pool is empty
                if (vars.ICR >= zeroBaseParams.MCR() && vars.remainingZUSDInStabPool == 0) {
                    break;
                }

                uint256 TCR = ZeroMath._computeCR(
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
            } else if (vars.backToNormalMode && vars.ICR < zeroBaseParams.MCR()) {
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
            } else break; // break if the loop reaches a LoC with ICR >= MCR

            vars.user = nextUser;
        }
    }

    function _getTotalsFromLiquidateLoCsSequence_NormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        uint256 _n
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;
        ISortedLoCs sortedLoCsCached = sortedLoCs;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;

        for (vars.i = 0; vars.i < _n; vars.i++) {
            vars.user = sortedLoCsCached.getLast();
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (vars.ICR < zeroBaseParams.MCR()) {
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
            } else break; // break if the loop reaches a LoC with ICR >= MCR
        }
    }

    /**
     * Attempt to liquidate a custom list of locs provided by the caller.
     */
    function batchLiquidateLoCs(address[] memory _locArray) public override {
        require(_locArray.length != 0, "LoCManager: Calldata address array must not be empty");

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
                _locArray
            );
        } else {
            //  if !vars.recoveryModeAtStart
            totals = _getTotalsFromBatchLiquidate_NormalMode(
                activePoolCached,
                defaultPoolCached,
                vars.price,
                vars.ZUSDInStabPool,
                _locArray
            );
        }

        require(totals.totalDebtInSequence > 0, "LoCManager: nothing to liquidate");

        // Move liquidated BTC and ZUSD to the appropriate pools
        stabilityPoolCached.offset(totals.totalDebtToOffset, totals.totalCollToSendToSP);
        _redistributeDebtAndColl(
            activePoolCached,
            defaultPoolCached,
            totals.totalDebtToRedistribute,
            totals.totalCollToRedistribute
        );
        if (totals.totalCollSurplus > 0) {
            activePoolCached.sendBTC(address(collSurplusPool), totals.totalCollSurplus);
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
        address[] memory _locArray
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;
        vars.backToNormalMode = false;
        vars.entireSystemDebt = getEntireSystemDebt();
        vars.entireSystemColl = getEntireSystemColl();

        for (vars.i = 0; vars.i < _locArray.length; vars.i++) {
            vars.user = _locArray[vars.i];
            // Skip non-active locs
            if (LoCs[vars.user].status != Status.active) {
                continue;
            }
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (!vars.backToNormalMode) {
                // Skip this LoC if ICR is greater than zeroBaseParams.MCR() and Stability Pool is empty
                if (vars.ICR >= zeroBaseParams.MCR() && vars.remainingZUSDInStabPool == 0) {
                    continue;
                }

                uint256 TCR = ZeroMath._computeCR(
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
                vars.entireSystemColl = vars.entireSystemColl.sub(singleLiquidation.collToSendToSP);

                // Add liquidation values to their respective running totals
                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);

                vars.backToNormalMode = !_checkPotentialRecoveryMode(
                    vars.entireSystemColl,
                    vars.entireSystemDebt,
                    _price
                );
            } else if (vars.backToNormalMode && vars.ICR < zeroBaseParams.MCR()) {
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
            } else continue; // In Normal Mode skip locs with ICR >= MCR
        }
    }

    function _getTotalsFromBatchLiquidate_NormalMode(
        IActivePool _activePool,
        IDefaultPool _defaultPool,
        uint256 _price,
        uint256 _ZUSDInStabPool,
        address[] memory _locArray
    ) internal returns (LiquidationTotals memory totals) {
        LocalVariables_LiquidationSequence memory vars;
        LiquidationValues memory singleLiquidation;

        vars.remainingZUSDInStabPool = _ZUSDInStabPool;

        for (vars.i = 0; vars.i < _locArray.length; vars.i++) {
            vars.user = _locArray[vars.i];
            vars.ICR = _getCurrentICR(vars.user, _price);

            if (vars.ICR < zeroBaseParams.MCR()) {
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
            singleLiquidation.entireLoCDebt
        );
        newTotals.totalCollInSequence = oldTotals.totalCollInSequence.add(
            singleLiquidation.entireLoCColl
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
        uint256 _BTC
    ) internal {
        if (_ZUSD > 0) {
            _zusdToken.returnFromPool(gasPoolAddress, _liquidator, _ZUSD);
        }

        if (_BTC > 0) {
            _activePool.sendBTC(_liquidator, _BTC);
        }
    }

    // --- Helper functions ---

    /// @return the nominal collateral ratio (ICR) of a given LoC, without the price. Takes a LoC's pending coll and debt rewards from redistributions into account.
    function getNominalICR(address _borrower) public view override returns (uint256) {
        (uint256 currentBTC, uint256 currentZUSDDebt) = _getCurrentLoCAmounts(_borrower);

        uint256 NICR = ZeroMath._computeNominalCR(currentBTC, currentZUSDDebt);
        return NICR;
    }

    function applyPendingRewards(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _applyPendingRewards(activePool, defaultPool, _borrower);
    }

    /// Update borrower's snapshots of L_BTC and L_ZUSDDebt to reflect the current values
    function updateLoCRewardSnapshots(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _updateLoCRewardSnapshots(_borrower);
    }

    /// Return the LoCs entire debt and coll, including pending rewards from redistributions.
    function getEntireDebtAndColl(address _borrower)
        public
        view
        override
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingBTCReward
        )
    {
        debt = LoCs[_borrower].debt;
        coll = LoCs[_borrower].coll;

        pendingZUSDDebtReward = getPendingZUSDDebtReward(_borrower);
        pendingBTCReward = getPendingBTCReward(_borrower);

        debt = debt.add(pendingZUSDDebtReward);
        coll = coll.add(pendingBTCReward);
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
         * error correction, to keep the cumulative error low in the running totals L_BTC and L_ZUSDDebt:
         *
         * 1) Form numerators which compensate for the floor division errors that occurred the last time this
         * function was called.
         * 2) Calculate "per-unit-staked" ratios.
         * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
         * 4) Store these errors for use in the next correction when this function is called.
         * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
         */
        uint256 BTCNumerator = _coll.mul(DECIMAL_PRECISION).add(lastETHError_Redistribution);
        uint256 ZUSDDebtNumerator = _debt.mul(DECIMAL_PRECISION).add(
            lastZUSDDebtError_Redistribution
        );

        // Get the per-unit-staked terms
        uint256 BTCRewardPerUnitStaked = BTCNumerator.div(totalStakes);
        uint256 ZUSDDebtRewardPerUnitStaked = ZUSDDebtNumerator.div(totalStakes);

        lastETHError_Redistribution = BTCNumerator.sub(BTCRewardPerUnitStaked.mul(totalStakes));
        lastZUSDDebtError_Redistribution = ZUSDDebtNumerator.sub(
            ZUSDDebtRewardPerUnitStaked.mul(totalStakes)
        );

        // Add per-unit-staked terms to the running totals
        L_BTC = L_BTC.add(BTCRewardPerUnitStaked);
        L_ZUSDDebt = L_ZUSDDebt.add(ZUSDDebtRewardPerUnitStaked);

        emit LTermsUpdated(L_BTC, L_ZUSDDebt);

        // Transfer coll and debt from ActivePool to DefaultPool
        _activePool.decreaseZUSDDebt(_debt);
        _defaultPool.increaseZUSDDebt(_debt);
        _activePool.sendBTC(address(_defaultPool), _coll);
    }

    function closeLoC(address _borrower) external override {
        _requireCallerIsBorrowerOperations();
        return _closeLoC(_borrower, Status.closedByOwner);
    }

    /**
     * Updates snapshots of system total stakes and total collateral, excluding a given collateral remainder from the calculation.
     * Used in a liquidation sequence.
     *
     * The calculation excludes a portion of collateral that is in the ActivePool:
     *
     * the total BTC gas compensation from the liquidation sequence
     *
     * The BTC as compensation must be excluded as it is always sent out at the very end of the liquidation sequence.
     */
    function _updateSystemSnapshots_excludeCollRemainder(
        IActivePool _activePool,
        uint256 _collRemainder
    ) internal {
        totalStakesSnapshot = totalStakes;

        uint256 activeColl = _activePool.getBTC();
        uint256 liquidatedColl = defaultPool.getBTC();
        totalCollateralSnapshot = activeColl.sub(_collRemainder).add(liquidatedColl);

        emit SystemSnapshotsUpdated(totalStakesSnapshot, totalCollateralSnapshot);
    }

    /// Push the owner's address to the LoC owners list, and record the corresponding array index on the LoC struct
    function addLoCOwnerToArray(address _borrower) external override returns (uint256 index) {
        _requireCallerIsBorrowerOperations();
        return _addLoCOwnerToArray(_borrower);
    }

    function _addLoCOwnerToArray(address _borrower) internal returns (uint128 index) {
        /* Max array size is 2**128 - 1, i.e. ~3e30 locs. No risk of overflow, since locs have minimum ZUSD
        debt of liquidation reserve plus MIN_NET_DEBT. 3e30 ZUSD dwarfs the value of all wealth in the world ( which is < 1e15 USD). */

        // Push the LoCowner to the array
        LoCOwners.push(_borrower);

        // Record the index of the new LoCowner on their LoC struct
        index = uint128(LoCOwners.length.sub(1));
        LoCs[_borrower].arrayIndex = index;

        return index;
    }

    // --- Recovery Mode and TCR functions ---

    function getTCR(uint256 _price) external view override returns (uint256) {
        return _getTCR(_price);
    }

    function MCR() external view override returns (uint256) {
        return zeroBaseParams.MCR();
    }

    function CCR() external view override returns (uint256) {
        return zeroBaseParams.CCR();
    }

    function checkRecoveryMode(uint256 _price) external view override returns (bool) {
        return _checkRecoveryMode(_price);
    }

    // Check whether or not the system *would be* in Recovery Mode, given an BTC:USD price, and the entire system coll and debt.
    function _checkPotentialRecoveryMode(
        uint256 _entireSystemColl,
        uint256 _entireSystemDebt,
        uint256 _price
    ) internal view returns (bool) {
        uint256 TCR = ZeroMath._computeCR(_entireSystemColl, _entireSystemDebt, _price);

        return TCR < zeroBaseParams.CCR();
    }

    function getRedemptionRateWithDecay() public view override returns (uint256) {
        return _calcRedemptionRate(_calcDecayedBaseRate());
    }

    function getRedemptionFeeWithDecay(uint256 _BTCDrawn) external view override returns (uint256) {
        return _calcRedemptionFee(getRedemptionRateWithDecay(), _BTCDrawn);
    }

    // --- Origination fee functions ---

    function getOriginationRate() public view override returns (uint256) {
        return _calcOriginationRate(baseRate);
    }

    function getOriginationRateWithDecay() public view override returns (uint256) {
        return _calcOriginationRate(_calcDecayedBaseRate());
    }

    function _calcOriginationRate(uint256 _baseRate) internal view returns (uint256) {
        return
            ZeroMath._min(
                zeroBaseParams.ORIGINATION_FEE_FLOOR().add(_baseRate),
                zeroBaseParams.MAX_ORIGINATION_FEE()
            );
    }

    function getOriginationFee(uint256 _ZUSDDebt) external view override returns (uint256) {
        return _calcOriginationFee(getOriginationRate(), _ZUSDDebt);
    }

    function getOriginationFeeWithDecay(uint256 _ZUSDDebt) external view override returns (uint256) {
        return _calcOriginationFee(getOriginationRateWithDecay(), _ZUSDDebt);
    }

    function _calcOriginationFee(uint256 _originationRate, uint256 _ZUSDDebt)
        internal
        pure
        returns (uint256)
    {
        return _originationRate.mul(_ZUSDDebt).div(DECIMAL_PRECISION);
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

    // --- LoC property getters ---

    function getLoCStatus(address _borrower) external view override returns (uint256) {
        return uint256(LoCs[_borrower].status);
    }

    function getLoCStake(address _borrower) external view override returns (uint256) {
        return LoCs[_borrower].stake;
    }

    function getLoCDebt(address _borrower) external view override returns (uint256) {
        return LoCs[_borrower].debt;
    }

    function getLoCColl(address _borrower) external view override returns (uint256) {
        return LoCs[_borrower].coll;
    }

    // --- LoC property setters, called by BorrowerOperations ---

    function setLoCStatus(address _borrower, uint256 _num) external override {
        _requireCallerIsBorrowerOperations();
        LoCs[_borrower].status = Status(_num);
    }

    function increaseLoCColl(address _borrower, uint256 _collIncrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newColl = LoCs[_borrower].coll.add(_collIncrease);
        LoCs[_borrower].coll = newColl;
        return newColl;
    }

    function decreaseLoCColl(address _borrower, uint256 _collDecrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newColl = LoCs[_borrower].coll.sub(_collDecrease);
        LoCs[_borrower].coll = newColl;
        return newColl;
    }

    function increaseLoCDebt(address _borrower, uint256 _debtIncrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newDebt = LoCs[_borrower].debt.add(_debtIncrease);
        LoCs[_borrower].debt = newDebt;
        return newDebt;
    }

    function decreaseLoCDebt(address _borrower, uint256 _debtDecrease)
        external
        override
        returns (uint256)
    {
        _requireCallerIsBorrowerOperations();
        uint256 newDebt = LoCs[_borrower].debt.sub(_debtDecrease);
        LoCs[_borrower].debt = newDebt;
        return newDebt;
    }

    function getCurrentICR(address _borrower, uint256 _price)
        external
        view
        override
        returns (uint256)
    {
        return _getCurrentICR(_borrower, _price);
    }

    function getPendingBTCReward(address _borrower) public view override returns (uint256) {
        return _getPendingBTCReward(_borrower);
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

    /// @dev    this function forwards the call to the locManagerRedeemOps in a delegate call fashion
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
        (bool success, bytes memory returndata) = locManagerRedeemOps.delegatecall(msg.data);
        require(success, string(returndata));
    }
}
