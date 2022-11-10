// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ILoCManager.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/ISortedLoCs.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/ZeroBase.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";
import "./BorrowerOperationsStorage.sol";

contract BorrowerOperations is
    ZeroBase,
    BorrowerOperationsStorage,
    CheckContract,
    IBorrowerOperations
{
    /* --- Variable container structs  ---

    Used to hold, return and assign variables inside a function, in order to avoid the error:
    "CompilerError: Stack too deep". */

    struct LocalVariables_adjustLoC {
        uint256 price;
        uint256 collChange;
        uint256 netDebtChange;
        bool isCollIncrease;
        uint256 debt;
        uint256 coll;
        uint256 oldICR;
        uint256 newICR;
        uint256 newTCR;
        uint256 ZUSDFee;
        uint256 newDebt;
        uint256 newColl;
        uint256 stake;
        uint256 newNICR;
        bool isRecoveryMode;
    }

    struct LocalVariables_openLoC {
        uint256 price;
        uint256 ZUSDFee;
        uint256 netDebt;
        uint256 compositeDebt;
        uint256 ICR;
        uint256 NICR;
        uint256 stake;
        uint256 arrayIndex;
    }

    struct ContractsCache {
        ILoCManager locManager;
        IActivePool activePool;
        IZUSDToken zusdToken;
    }

    enum BorrowerOperation {
        openLoC,
        closeLoC,
        adjustLoC
    }

    event FeeDistributorAddressChanged(address _feeDistributorAddress);
    event LoCManagerAddressChanged(address _newLoCManagerAddress);
    event ActivePoolAddressChanged(address _activePoolAddress);
    event DefaultPoolAddressChanged(address _defaultPoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event GasPoolAddressChanged(address _gasPoolAddress);
    event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);
    event SortedLoCsAddressChanged(address _sortedLoCsAddress);
    event ZUSDTokenAddressChanged(address _zusdTokenAddress);
    event ZEROStakingAddressChanged(address _zeroStakingAddress);

    event LoCCreated(address indexed _borrower, uint256 arrayIndex);
    event LoCUpdated(
        address indexed _borrower,
        uint256 _debt,
        uint256 _coll,
        uint256 stake,
        BorrowerOperation operation
    );
    event ZUSDOriginationFeePaid(address indexed _borrower, uint256 _ZUSDFee);

    // --- Dependency setters ---

    function setAddresses(
        address _feeDistributorAddress,
        address _zeroBaseParamsAddress,
        address _locManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedLoCsAddress,
        address _zusdTokenAddress,
        address _zeroStakingAddress
    ) external override onlyOwner {
        // This makes impossible to open a LoC with zero withdrawn ZUSD
        assert(MIN_NET_DEBT > 0);

        checkContract(_feeDistributorAddress);
        checkContract(_zeroBaseParamsAddress);
        checkContract(_locManagerAddress);
        checkContract(_activePoolAddress);
        checkContract(_defaultPoolAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_gasPoolAddress);
        checkContract(_collSurplusPoolAddress);
        checkContract(_priceFeedAddress);
        checkContract(_sortedLoCsAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_zeroStakingAddress);

        feeDistributor = IFeeDistributor(_feeDistributorAddress);
        zeroBaseParams = IZeroBaseParams(_zeroBaseParamsAddress);
        locManager = ILoCManager(_locManagerAddress);
        activePool = IActivePool(_activePoolAddress);
        defaultPool = IDefaultPool(_defaultPoolAddress);
        stabilityPoolAddress = _stabilityPoolAddress;
        gasPoolAddress = _gasPoolAddress;
        collSurplusPool = ICollSurplusPool(_collSurplusPoolAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        sortedLoCs = ISortedLoCs(_sortedLoCsAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        zeroStakingAddress = _zeroStakingAddress;
        zeroStaking = IZEROStaking(_zeroStakingAddress);

        emit FeeDistributorAddressChanged(_feeDistributorAddress);
        emit LoCManagerAddressChanged(_locManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit GasPoolAddressChanged(_gasPoolAddress);
        emit CollSurplusPoolAddressChanged(_collSurplusPoolAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit SortedLoCsAddressChanged(_sortedLoCsAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit ZEROStakingAddressChanged(_zeroStakingAddress);
    }

    function setMassetAddress(address _massetAddress) external onlyOwner {
        masset = IMasset(_massetAddress);
    }

    function openLoC(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        _openLoC(_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint, msg.sender);
    }

    function openNueLoC(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        require(address(masset) != address(0), "Masset address not set");

        _openLoC(_maxFeePercentage, _ZUSDAmount, _upperHint, _lowerHint, address(this));
        require(zusdToken.transfer(address(masset), _ZUSDAmount), "Couldn't execute ZUSD transfer");
        masset.onTokensMinted(_ZUSDAmount, address(zusdToken), abi.encode(msg.sender));
    }

    // --- Borrower LoC Operations ---
    function _openLoC(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint,
        address _tokensRecipient
    ) internal {
        ContractsCache memory contractsCache = ContractsCache(locManager, activePool, zusdToken);
        LocalVariables_openLoC memory vars;

        vars.price = priceFeed.fetchPrice();
        bool isRecoveryMode = _checkRecoveryMode(vars.price);

        _requireValidMaxFeePercentage(_maxFeePercentage, isRecoveryMode);
        _requireLoCisNotActive(contractsCache.locManager, msg.sender);

        vars.ZUSDFee;
        vars.netDebt = _ZUSDAmount;

        if (!isRecoveryMode) {
            vars.ZUSDFee = _triggerOriginationFee(
                contractsCache.locManager,
                contractsCache.zusdToken,
                _ZUSDAmount,
                _maxFeePercentage
            );
            vars.netDebt = vars.netDebt.add(vars.ZUSDFee);
        }
        _requireAtLeastMinNetDebt(vars.netDebt);

        // ICR is based on the composite debt, i.e. the requested ZUSD amount + ZUSD origination fee + ZUSD gas comp.
        vars.compositeDebt = _getCompositeDebt(vars.netDebt);
        assert(vars.compositeDebt > 0);

        vars.ICR = ZeroMath._computeCR(msg.value, vars.compositeDebt, vars.price);
        vars.NICR = ZeroMath._computeNominalCR(msg.value, vars.compositeDebt);

        if (isRecoveryMode) {
            _requireICRisAboveCCR(vars.ICR);
        } else {
            _requireICRisAboveMCR(vars.ICR);
            uint256 newTCR = _getNewTCRFromLoCChange(
                msg.value,
                true,
                vars.compositeDebt,
                true,
                vars.price
            ); // bools: coll increase, debt increase
            _requireNewTCRisAboveCCR(newTCR);
        }

        // Set the LoC struct's properties
        contractsCache.locManager.setLoCStatus(msg.sender, 1);
        contractsCache.locManager.increaseLoCColl(msg.sender, msg.value);
        contractsCache.locManager.increaseLoCDebt(msg.sender, vars.compositeDebt);

        contractsCache.locManager.updateLoCRewardSnapshots(msg.sender);
        vars.stake = contractsCache.locManager.updateStakeAndTotalStakes(msg.sender);

        sortedLoCs.insert(msg.sender, vars.NICR, _upperHint, _lowerHint);
        vars.arrayIndex = contractsCache.locManager.addLoCOwnerToArray(msg.sender);
        emit LoCCreated(msg.sender, vars.arrayIndex);

        // Move bitcoin to the Active Pool, and mint the ZUSDAmount to the borrower
        _activePoolAddColl(contractsCache.activePool, msg.value);
        _withdrawZUSD(
            contractsCache.activePool,
            contractsCache.zusdToken,
            _tokensRecipient,
            _ZUSDAmount,
            vars.netDebt
        );
        // Move the ZUSD gas compensation to the Gas Pool
        _withdrawZUSD(
            contractsCache.activePool,
            contractsCache.zusdToken,
            gasPoolAddress,
            ZUSD_GAS_COMPENSATION,
            ZUSD_GAS_COMPENSATION
        );

        emit LoCUpdated(
            msg.sender,
            vars.compositeDebt,
            msg.value,
            vars.stake,
            BorrowerOperation.openLoC
        );
        emit ZUSDOriginationFeePaid(msg.sender, vars.ZUSDFee);
    }

    /// Send BTC as collateral to a loc
    function addColl(address _upperHint, address _lowerHint) external payable override {
        _adjustLoC(msg.sender, 0, 0, false, _upperHint, _lowerHint, 0);
    }

    /// Send BTC as collateral to a loc. Called by only the Stability Pool.
    function moveBTCGainToLoC(
        address _borrower,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        _requireCallerIsStabilityPool();
        _adjustLoC(_borrower, 0, 0, false, _upperHint, _lowerHint, 0);
    }

    /// Withdraw BTC collateral from a loc
    function withdrawColl(
        uint256 _collWithdrawal,
        address _upperHint,
        address _lowerHint
    ) external override {
        _adjustLoC(msg.sender, _collWithdrawal, 0, false, _upperHint, _lowerHint, 0);
    }

    /// Withdraw ZUSD tokens from a loc: mint new ZUSD tokens to the owner, and increase the LoC's debt accordingly
    function withdrawZUSD(
        uint256 _maxFeePercentage,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external override {
        _adjustLoC(msg.sender, 0, _ZUSDAmount, true, _upperHint, _lowerHint, _maxFeePercentage);
    }

    /// Repay ZUSD tokens to a LoC: Burn the repaid ZUSD tokens, and reduce the LoC's debt accordingly
    function repayZUSD(
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external override {
        _adjustLoC(msg.sender, 0, _ZUSDAmount, false, _upperHint, _lowerHint, 0);
    }

    function adjustLoC(
        uint256 _maxFeePercentage,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        _adjustLoC(
            msg.sender,
            _collWithdrawal,
            _ZUSDChange,
            _isDebtIncrease,
            _upperHint,
            _lowerHint,
            _maxFeePercentage
        );
    }

    // in case of _isDebtIncrease = false masset contract must have an approval of NUE tokens
    function adjustNueLoC(
        uint256 _maxFeePercentage,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        require(address(masset) != address(0), "Masset address not set");

        if (!_isDebtIncrease && _ZUSDChange > 0) {
            masset.redeemByBridge(address(zusdToken), _ZUSDChange, msg.sender);
        }
        _adjustSenderLoC(
            msg.sender,
            _collWithdrawal,
            _ZUSDChange,
            _isDebtIncrease,
            _upperHint,
            _lowerHint,
            _maxFeePercentage,
            address(this)
        );
        if (_isDebtIncrease && _ZUSDChange > 0) {
            require(
                zusdToken.transfer(address(masset), _ZUSDChange),
                "Couldn't execute ZUSD transfer"
            );
            masset.onTokensMinted(_ZUSDChange, address(zusdToken), abi.encode(msg.sender));
        }
    }

    function _adjustLoC(
        address _borrower,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint,
        uint256 _maxFeePercentage
    ) internal {
        _adjustSenderLoC(
            _borrower,
            _collWithdrawal,
            _ZUSDChange,
            _isDebtIncrease,
            _upperHint,
            _lowerHint,
            _maxFeePercentage,
            msg.sender
        );
    }

    /**
     * _adjustLoC(): Alongside a debt change, this function can perform either a collateral top-up or a collateral withdrawal.
     *
     * It therefore expects either a positive msg.value, or a positive _collWithdrawal argument.
     *
     * If both are positive, it will revert.
     */
    function _adjustSenderLoC(
        address _borrower,
        uint256 _collWithdrawal,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint,
        uint256 _maxFeePercentage,
        address _tokensRecipient
    ) internal {
        ContractsCache memory contractsCache = ContractsCache(locManager, activePool, zusdToken);
        LocalVariables_adjustLoC memory vars;

        vars.price = priceFeed.fetchPrice();
        vars.isRecoveryMode = _checkRecoveryMode(vars.price);

        if (_isDebtIncrease) {
            _requireValidMaxFeePercentage(_maxFeePercentage, vars.isRecoveryMode);
            _requireNonZeroDebtChange(_ZUSDChange);
        }
        _requireSingularCollChange(_collWithdrawal);
        _requireNonZeroAdjustment(_collWithdrawal, _ZUSDChange);
        _requireLoCisActive(contractsCache.locManager, _borrower);

        // Confirm the operation is either a borrower adjusting their own loc, or a pure BTC transfer from the Stability Pool to a loc
        assert(
            msg.sender == _borrower ||
                (msg.sender == stabilityPoolAddress && msg.value > 0 && _ZUSDChange == 0)
        );

        contractsCache.locManager.applyPendingRewards(_borrower);

        // Get the collChange based on whether or not BTC was sent in the transaction
        (vars.collChange, vars.isCollIncrease) = _getCollChange(msg.value, _collWithdrawal);

        vars.netDebtChange = _ZUSDChange;

        // If the adjustment incorporates a debt increase and system is in Normal Mode, then trigger a origination fee
        if (_isDebtIncrease && !vars.isRecoveryMode) {
            vars.ZUSDFee = _triggerOriginationFee(
                contractsCache.locManager,
                contractsCache.zusdToken,
                _ZUSDChange,
                _maxFeePercentage
            );
            vars.netDebtChange = vars.netDebtChange.add(vars.ZUSDFee); // The raw debt change includes the fee
        }

        vars.debt = contractsCache.locManager.getLoCDebt(_borrower);
        vars.coll = contractsCache.locManager.getLoCColl(_borrower);

        // Get the LoC's old ICR before the adjustment, and what its new ICR will be after the adjustment
        vars.oldICR = ZeroMath._computeCR(vars.coll, vars.debt, vars.price);
        vars.newICR = _getNewICRFromLoCChange(
            vars.coll,
            vars.debt,
            vars.collChange,
            vars.isCollIncrease,
            vars.netDebtChange,
            _isDebtIncrease,
            vars.price
        );
        assert(_collWithdrawal <= vars.coll);

        // Check the adjustment satisfies all conditions for the current system mode
        _requireValidAdjustmentInCurrentMode(
            vars.isRecoveryMode,
            _collWithdrawal,
            _isDebtIncrease,
            vars
        );

        // When the adjustment is a debt repayment, check it's a valid amount and that the caller has enough ZUSD
        if (!_isDebtIncrease && _ZUSDChange > 0) {
            _requireAtLeastMinNetDebt(_getNetDebt(vars.debt).sub(vars.netDebtChange));
            _requireValidZUSDRepayment(vars.debt, vars.netDebtChange);
            _requireSufficientZUSDBalance(contractsCache.zusdToken, _borrower, vars.netDebtChange);
        }

        (vars.newColl, vars.newDebt) = _updateLoCFromAdjustment(
            contractsCache.locManager,
            _borrower,
            vars.collChange,
            vars.isCollIncrease,
            vars.netDebtChange,
            _isDebtIncrease
        );
        vars.stake = contractsCache.locManager.updateStakeAndTotalStakes(_borrower);

        // Re-insert LoC in to the sorted list
        vars.newNICR = _getNewNominalICRFromLoCChange(
            vars.coll,
            vars.debt,
            vars.collChange,
            vars.isCollIncrease,
            vars.netDebtChange,
            _isDebtIncrease
        );
        sortedLoCs.reInsert(_borrower, vars.newNICR, _upperHint, _lowerHint);

        emit LoCUpdated(
            _borrower,
            vars.newDebt,
            vars.newColl,
            vars.stake,
            BorrowerOperation.adjustLoC
        );
        emit ZUSDOriginationFeePaid(msg.sender, vars.ZUSDFee);

        // Use the unmodified _ZUSDChange here, as we don't send the fee to the user
        _moveTokensAndBTCfromAdjustment(
            contractsCache.activePool,
            contractsCache.zusdToken,
            msg.sender,
            vars.collChange,
            vars.isCollIncrease,
            _ZUSDChange,
            _isDebtIncrease,
            vars.netDebtChange,
            _tokensRecipient
        );
    }

    function closeLoC() external override {
        _closeLoC();
    }

    function closeNueLoC() external override {
        require(address(masset) != address(0), "Masset address not set");

        uint256 debt = locManager.getLoCDebt(msg.sender);

        masset.redeemByBridge(address(zusdToken), debt.sub(ZUSD_GAS_COMPENSATION), msg.sender);
        _closeLoC();
    }

    function _closeLoC() internal {
        ILoCManager locManagerCached = locManager;
        IActivePool activePoolCached = activePool;
        IZUSDToken zusdTokenCached = zusdToken;

        _requireLoCisActive(locManagerCached, msg.sender);
        uint256 price = priceFeed.fetchPrice();
        _requireNotInRecoveryMode(price);

        locManagerCached.applyPendingRewards(msg.sender);

        uint256 coll = locManagerCached.getLoCColl(msg.sender);
        uint256 debt = locManagerCached.getLoCDebt(msg.sender);

        _requireSufficientZUSDBalance(zusdTokenCached, msg.sender, debt.sub(ZUSD_GAS_COMPENSATION));

        uint256 newTCR = _getNewTCRFromLoCChange(coll, false, debt, false, price);
        _requireNewTCRisAboveCCR(newTCR);

        locManagerCached.removeStake(msg.sender);
        locManagerCached.closeLoC(msg.sender);

        emit LoCUpdated(msg.sender, 0, 0, 0, BorrowerOperation.closeLoC);

        // Burn the repaid ZUSD from the user's balance and the gas compensation from the Gas Pool
        _repayZUSD(activePoolCached, zusdTokenCached, msg.sender, debt.sub(ZUSD_GAS_COMPENSATION));
        _repayZUSD(activePoolCached, zusdTokenCached, gasPoolAddress, ZUSD_GAS_COMPENSATION);

        // Send the collateral back to the user
        activePoolCached.sendBTC(msg.sender, coll);
    }

    /**
     * Claim remaining collateral from a redemption or from a liquidation with ICR > MCR in Recovery Mode
     */
    function claimCollateral() external override {
        // send BTC from CollSurplus Pool to owner
        collSurplusPool.claimColl(msg.sender);
    }

    // --- Helper functions ---

    function _triggerOriginationFee(
        ILoCManager _locManager,
        IZUSDToken _zusdToken,
        uint256 _ZUSDAmount,
        uint256 _maxFeePercentage
    ) internal returns (uint256) {
        _locManager.decayBaseRateFromBorrowing(); // decay the baseRate state variable
        uint256 ZUSDFee = _locManager.getOriginationFee(_ZUSDAmount);

        _requireUserAcceptsFee(ZUSDFee, _ZUSDAmount, _maxFeePercentage);
        _zusdToken.mint(address(feeDistributor), ZUSDFee);
        feeDistributor.distributeFees();

        return ZUSDFee;
    }

    function _getUSDValue(uint256 _coll, uint256 _price) internal pure returns (uint256) {
        uint256 usdValue = _price.mul(_coll).div(DECIMAL_PRECISION);

        return usdValue;
    }

    function _getCollChange(uint256 _collReceived, uint256 _requestedCollWithdrawal)
        internal
        pure
        returns (uint256 collChange, bool isCollIncrease)
    {
        if (_collReceived != 0) {
            collChange = _collReceived;
            isCollIncrease = true;
        } else {
            collChange = _requestedCollWithdrawal;
        }
    }

    /// Update LoC's coll and debt based on whether they increase or decrease
    function _updateLoCFromAdjustment(
        ILoCManager _locManager,
        address _borrower,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) internal returns (uint256, uint256) {
        uint256 newColl = (_isCollIncrease)
            ? _locManager.increaseLoCColl(_borrower, _collChange)
            : _locManager.decreaseLoCColl(_borrower, _collChange);
        uint256 newDebt = (_isDebtIncrease)
            ? _locManager.increaseLoCDebt(_borrower, _debtChange)
            : _locManager.decreaseLoCDebt(_borrower, _debtChange);

        return (newColl, newDebt);
    }

    function _moveTokensAndBTCfromAdjustment(
        IActivePool _activePool,
        IZUSDToken _zusdToken,
        address _borrower,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _ZUSDChange,
        bool _isDebtIncrease,
        uint256 _netDebtChange,
        address _tokensRecipient
    ) internal {
        if (_isDebtIncrease) {
            _withdrawZUSD(_activePool, _zusdToken, _tokensRecipient, _ZUSDChange, _netDebtChange);
        } else {
            _repayZUSD(_activePool, _zusdToken, _borrower, _ZUSDChange);
        }

        if (_isCollIncrease) {
            _activePoolAddColl(_activePool, _collChange);
        } else {
            _activePool.sendBTC(_borrower, _collChange);
        }
    }

    /// Send BTC to Active Pool and increase its recorded BTC balance
    function _activePoolAddColl(IActivePool _activePool, uint256 _amount) internal {
        (bool success, ) = address(_activePool).call{value: _amount}("");
        require(success, "BorrowerOps: Sending BTC to ActivePool failed");
    }

    /// Issue the specified amount of ZUSD to _account and increases the total active debt (_netDebtIncrease potentially includes a ZUSDFee)
    function _withdrawZUSD(
        IActivePool _activePool,
        IZUSDToken _zusdToken,
        address _account,
        uint256 _ZUSDAmount,
        uint256 _netDebtIncrease
    ) internal {
        _activePool.increaseZUSDDebt(_netDebtIncrease);
        _zusdToken.mint(_account, _ZUSDAmount);
    }

    /// Burn the specified amount of ZUSD from _account and decreases the total active debt
    function _repayZUSD(
        IActivePool _activePool,
        IZUSDToken _zusdToken,
        address _account,
        uint256 _ZUSD
    ) internal {
        _activePool.decreaseZUSDDebt(_ZUSD);
        _zusdToken.burn(_account, _ZUSD);
    }

    // --- 'Require' wrapper functions ---

    function _requireSingularCollChange(uint256 _collWithdrawal) internal view {
        require(
            msg.value == 0 || _collWithdrawal == 0,
            "BorrowerOperations: Cannot withdraw and add coll"
        );
    }

    function _requireCallerIsBorrower(address _borrower) internal view {
        require(
            msg.sender == _borrower,
            "BorrowerOps: Caller must be the borrower for a withdrawal"
        );
    }

    function _requireNonZeroAdjustment(uint256 _collWithdrawal, uint256 _ZUSDChange) internal view {
        require(
            msg.value != 0 || _collWithdrawal != 0 || _ZUSDChange != 0,
            "BorrowerOps: There must be either a collateral change or a debt change"
        );
    }

    function _requireLoCisActive(ILoCManager _locManager, address _borrower) internal view {
        uint256 status = _locManager.getLoCStatus(_borrower);
        require(status == 1, "BorrowerOps: LoC does not exist or is closed");
    }

    function _requireLoCisNotActive(ILoCManager _locManager, address _borrower) internal view {
        uint256 status = _locManager.getLoCStatus(_borrower);
        require(status != 1, "BorrowerOps: LoC is active");
    }

    function _requireNonZeroDebtChange(uint256 _ZUSDChange) internal pure {
        require(_ZUSDChange > 0, "BorrowerOps: Debt increase requires non-zero debtChange");
    }

    function _requireNotInRecoveryMode(uint256 _price) internal view {
        require(
            !_checkRecoveryMode(_price),
            "BorrowerOps: Operation not permitted during Recovery Mode"
        );
    }

    function _requireNoCollWithdrawal(uint256 _collWithdrawal) internal pure {
        require(
            _collWithdrawal == 0,
            "BorrowerOps: Collateral withdrawal not permitted Recovery Mode"
        );
    }

    function _requireValidAdjustmentInCurrentMode(
        bool _isRecoveryMode,
        uint256 _collWithdrawal,
        bool _isDebtIncrease,
        LocalVariables_adjustLoC memory _vars
    ) internal view {
        /*
         *In Recovery Mode, only allow:
         *
         * - Pure collateral top-up
         * - Pure debt repayment
         * - Collateral top-up with debt repayment
         * - A debt increase combined with a collateral top-up which makes the ICR >= 150% and improves the ICR (and by extension improves the TCR).
         *
         * In Normal Mode, ensure:
         *
         * - The new ICR is above MCR
         * - The adjustment won't pull the TCR below CCR
         */
        if (_isRecoveryMode) {
            _requireNoCollWithdrawal(_collWithdrawal);
            if (_isDebtIncrease) {
                _requireICRisAboveCCR(_vars.newICR);
                _requireNewICRisAboveOldICR(_vars.newICR, _vars.oldICR);
            }
        } else {
            // if Normal Mode
            _requireICRisAboveMCR(_vars.newICR);
            _vars.newTCR = _getNewTCRFromLoCChange(
                _vars.collChange,
                _vars.isCollIncrease,
                _vars.netDebtChange,
                _isDebtIncrease,
                _vars.price
            );
            _requireNewTCRisAboveCCR(_vars.newTCR);
        }
    }

    function _requireICRisAboveMCR(uint256 _newICR) internal view {
        require(
            _newICR >= zeroBaseParams.MCR(),
            "BorrowerOps: An operation that would result in ICR < MCR is not permitted"
        );
    }

    function _requireICRisAboveCCR(uint256 _newICR) internal view {
        require(
            _newICR >= zeroBaseParams.CCR(),
            "BorrowerOps: Operation must leave LoC with ICR >= CCR"
        );
    }

    function _requireNewICRisAboveOldICR(uint256 _newICR, uint256 _oldICR) internal pure {
        require(
            _newICR >= _oldICR,
            "BorrowerOps: Cannot decrease your LoC's ICR in Recovery Mode"
        );
    }

    function _requireNewTCRisAboveCCR(uint256 _newTCR) internal view {
        require(
            _newTCR >= zeroBaseParams.CCR(),
            "BorrowerOps: An operation that would result in TCR < CCR is not permitted"
        );
    }

    function _requireAtLeastMinNetDebt(uint256 _netDebt) internal pure {
        require(
            _netDebt >= MIN_NET_DEBT,
            "BorrowerOps: LoC's net debt must be greater than minimum"
        );
    }

    function _requireValidZUSDRepayment(uint256 _currentDebt, uint256 _debtRepayment) internal pure {
        require(
            _debtRepayment <= _currentDebt.sub(ZUSD_GAS_COMPENSATION),
            "BorrowerOps: Amount repaid must not be larger than the LoC's debt"
        );
    }

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "BorrowerOps: Caller is not Stability Pool");
    }

    function _requireSufficientZUSDBalance(
        IZUSDToken _zusdToken,
        address _borrower,
        uint256 _debtRepayment
    ) internal view {
        require(
            _zusdToken.balanceOf(_borrower) >= _debtRepayment,
            "BorrowerOps: Caller doesnt have enough ZUSD to make repayment"
        );
    }

    function _requireValidMaxFeePercentage(uint256 _maxFeePercentage, bool _isRecoveryMode)
        internal
        view
    {
        if (_isRecoveryMode) {
            require(
                _maxFeePercentage <= DECIMAL_PRECISION,
                "Max fee percentage must less than or equal to 100%"
            );
        } else {
            require(
                _maxFeePercentage >= zeroBaseParams.ORIGINATION_FEE_FLOOR() &&
                    _maxFeePercentage <= DECIMAL_PRECISION,
                "Max fee percentage must be between 0.5% and 100%"
            );
        }
    }

    // --- ICR and TCR getters ---

    /// Compute the new collateral ratio, considering the change in coll and debt. Assumes 0 pending rewards.
    function _getNewNominalICRFromLoCChange(
        uint256 _coll,
        uint256 _debt,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) internal pure returns (uint256) {
        (uint256 newColl, uint256 newDebt) = _getNewLoCAmounts(
            _coll,
            _debt,
            _collChange,
            _isCollIncrease,
            _debtChange,
            _isDebtIncrease
        );

        uint256 newNICR = ZeroMath._computeNominalCR(newColl, newDebt);
        return newNICR;
    }

    /// Compute the new collateral ratio, considering the change in coll and debt. Assumes 0 pending rewards.
    function _getNewICRFromLoCChange(
        uint256 _coll,
        uint256 _debt,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease,
        uint256 _price
    ) internal pure returns (uint256) {
        (uint256 newColl, uint256 newDebt) = _getNewLoCAmounts(
            _coll,
            _debt,
            _collChange,
            _isCollIncrease,
            _debtChange,
            _isDebtIncrease
        );

        uint256 newICR = ZeroMath._computeCR(newColl, newDebt, _price);
        return newICR;
    }

    function _getNewLoCAmounts(
        uint256 _coll,
        uint256 _debt,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) internal pure returns (uint256, uint256) {
        uint256 newColl = _coll;
        uint256 newDebt = _debt;

        newColl = _isCollIncrease ? _coll.add(_collChange) : _coll.sub(_collChange);
        newDebt = _isDebtIncrease ? _debt.add(_debtChange) : _debt.sub(_debtChange);

        return (newColl, newDebt);
    }

    function _getNewTCRFromLoCChange(
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease,
        uint256 _price
    ) internal view returns (uint256) {
        uint256 totalColl = getEntireSystemColl();
        uint256 totalDebt = getEntireSystemDebt();

        totalColl = _isCollIncrease ? totalColl.add(_collChange) : totalColl.sub(_collChange);
        totalDebt = _isDebtIncrease ? totalDebt.add(_debtChange) : totalDebt.sub(_debtChange);

        uint256 newTCR = ZeroMath._computeCR(totalColl, totalDebt, _price);
        return newTCR;
    }

    function getCompositeDebt(uint256 _debt) external view override returns (uint256) {
        return _getCompositeDebt(_debt);
    }

    function ORIGINATION_FEE_FLOOR() external view override returns (uint256) {
        return zeroBaseParams.ORIGINATION_FEE_FLOOR();
    }
}
