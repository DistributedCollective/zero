// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IBorrowerOperations.sol";
import "./Interfaces/ITroveManager.sol";
import "./Interfaces/ICLVToken.sol";
import "./Interfaces/IPool.sol";
import "./Interfaces/ICollSurplusPool.sol";
import './Interfaces/ICLVToken.sol';
import "./Interfaces/IPriceFeed.sol";
import "./Interfaces/ISortedCDPs.sol";
import "./Interfaces/ILQTYStaking.sol";
import "./Dependencies/LiquityBase.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/console.sol";

contract BorrowerOperations is LiquityBase, Ownable, IBorrowerOperations {

    // --- Connected contract declarations ---

    ITroveManager public cdpManager;

    IPool public activePool;

    IPool public defaultPool;

    address stabilityPoolAddress;

    ICollSurplusPool collSurplusPool;

    IPriceFeed public priceFeed;

    ILQTYStaking public lqtyStaking;
    address public lqtyStakingAddress;

    ICLVToken public clvToken;

    // A doubly linked list of CDPs, sorted by their sorted by their collateral ratios
    ISortedCDPs public sortedCDPs;

    /* --- Variable container structs  ---

    Used to hold, return and assign variables inside a function, in order to avoid the error:
    "CompilerError: Stack too deep". */

     struct LocalVariables_adjustLoan {
        uint price;
        uint collChange;
        uint rawDebtChange;
        bool isCollIncrease;
        uint debt;
        uint coll;
        uint newICR;
        uint CLVFee;
        uint newDebt;
        uint newColl;
        uint stake;
    }

    enum BorrowerOperation {
        openLoan,
        closeLoan,
        addColl,
        withdrawColl,
        withdrawCLV,
        repayCLV,
        adjustLoan
    }

    event CDPCreated(address indexed _borrower, uint arrayIndex);
    event CDPUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake, BorrowerOperation operation);
    event LUSDBorrowingFeePaid(address indexed _borrower, uint _CLVFee);

    // --- Dependency setters ---

    function setAddresses(
        address _cdpManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedCDPsAddress,
        address _clvTokenAddress,
        address _lqtyStakingAddress
    )
        external
        override
        onlyOwner
    {
        cdpManager = ITroveManager(_cdpManagerAddress);
        activePool = IPool(_activePoolAddress);
        defaultPool = IPool(_defaultPoolAddress);
        stabilityPoolAddress = _stabilityPoolAddress;
        collSurplusPool = ICollSurplusPool(_collSurplusPoolAddress);
        priceFeed = IPriceFeed(_priceFeedAddress);
        sortedCDPs = ISortedCDPs(_sortedCDPsAddress);
        clvToken = ICLVToken(_clvTokenAddress);
        lqtyStakingAddress = _lqtyStakingAddress;
        lqtyStaking = ILQTYStaking(_lqtyStakingAddress);

        emit TroveManagerAddressChanged(_cdpManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit CollSurplusPoolAddressChanged(_collSurplusPoolAddress);
        emit CLVTokenAddressChanged(_clvTokenAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit SortedCDPsAddressChanged(_sortedCDPsAddress);
        emit CLVTokenAddressChanged(_clvTokenAddress);
        emit LQTYStakingAddressChanged(_lqtyStakingAddress);

        _renounceOwnership();
    }

    // --- Borrower Trove Operations ---

    function openLoan(uint _CLVAmount, address _hint) external payable override {
        uint price = priceFeed.getPrice();

        _requireCDPisNotActive(msg.sender);

        // Decay the base rate, and calculate the borrowing fee
        cdpManager.decayBaseRateFromBorrowing();
        uint CLVFee = cdpManager.getBorrowingFee(_CLVAmount);
        uint rawDebt = _CLVAmount.add(CLVFee);

        // ICR is based on the composite debt, i.e. the requested LUSD amount + LUSD borrowing fee + LUSD gas comp.
        uint compositeDebt = _getCompositeDebt(rawDebt);
        assert(compositeDebt > 0);
        uint ICR = LiquityMath._computeCR(msg.value, compositeDebt, price);

        if (_checkRecoveryMode()) {
            _requireICRisAboveR_MCR(ICR);
        } else {
            _requireICRisAboveMCR(ICR);
            _requireNewTCRisAboveCCR(msg.value, true, compositeDebt, true, price);  // bools: coll increase, debt increase
        }

        // Set the trove struct's properties
        cdpManager.setCDPStatus(msg.sender, 1);
        cdpManager.increaseCDPColl(msg.sender, msg.value);
        cdpManager.increaseCDPDebt(msg.sender, compositeDebt);

        cdpManager.updateCDPRewardSnapshots(msg.sender);
        uint stake = cdpManager.updateStakeAndTotalStakes(msg.sender);

        sortedCDPs.insert(msg.sender, ICR, price, _hint, _hint);
        uint arrayIndex = cdpManager.addCDPOwnerToArray(msg.sender);
        emit CDPCreated(msg.sender, arrayIndex);

        // Send the LUSD borrowing fee to the staking contract
        clvToken.mint(lqtyStakingAddress, CLVFee);
        lqtyStaking.increaseF_LUSD(CLVFee);

        // Move the ether to the Active Pool, and mint the CLVAmount to the borrower
        _activePoolAddColl(msg.value);
        _withdrawCLV(msg.sender, _CLVAmount, rawDebt);
        // Move the CLV gas compensation to the Gas Pool
        _withdrawCLV(GAS_POOL_ADDRESS, CLV_GAS_COMPENSATION, CLV_GAS_COMPENSATION);

        emit CDPUpdated(msg.sender, rawDebt, msg.value, stake, BorrowerOperation.openLoan);
        emit LUSDBorrowingFeePaid(msg.sender, CLVFee);
    }

    // Send ETH as collateral to a trove
    function addColl(address _hint) external payable override {
        _adjustLoan(msg.sender, 0, 0, false, _hint);
    }

    // Send ETH as collateral to a trove. Called by only the Stability Pool.
    function moveETHGainToTrove(address _borrower, address _hint) external payable override {
        _requireCallerIsStabilityPool();
        _adjustLoan(_borrower, 0, 0, false, _hint);
    }

    // Withdraw ETH collateral from a trove
    function withdrawColl(uint _collWithdrawal, address _hint) external override {
        _adjustLoan(msg.sender, _collWithdrawal, 0, false, _hint);
    }

    // Withdraw CLV tokens from a trove: mint new CLV tokens to the owner, and increase the trove's debt accordingly
    function withdrawCLV(uint _CLVAmount, address _hint) external override {
        _adjustLoan(msg.sender, 0, _CLVAmount, true, _hint);
    }

    // Repay CLV tokens to a CDP: Burn the repaid CLV tokens, and reduce the trove's debt accordingly
    function repayCLV(uint _CLVAmount, address _hint) external override {
        _adjustLoan(msg.sender, 0, _CLVAmount, false, _hint);
    }

    /*
    * If ETH is sent, the operation is considered as a collateral increase, and the first parameter
    * _collWithdrawal must be zero 
    */
    function adjustLoan(uint _collWithdrawal, uint _debtChange, bool _isDebtIncrease, address _hint) external payable override {
        _adjustLoan(msg.sender, _collWithdrawal, _debtChange, _isDebtIncrease, _hint);
    }

    function _adjustLoan(address _borrower, uint _collWithdrawal, uint _debtChange, bool _isDebtIncrease, address _hint) internal {
        require(msg.value == 0 || _collWithdrawal == 0, "BorrowerOperations: Cannot withdraw and add coll");
        // The operation "isWithdrawal" if it removes collateral or LUSD, i.e. it removes funds and lowers the ICR
        bool isWithdrawal = _collWithdrawal != 0 || _isDebtIncrease;
        require(msg.sender == _borrower || !isWithdrawal, "BorrowerOps: User must be sender for withdrawals");
        require(msg.value != 0 || _collWithdrawal != 0 || _debtChange != 0, "BorrowerOps: There must be either a collateral change or a debt change");

        LocalVariables_adjustLoan memory L;

        _requireCDPisActive(_borrower);
        if (isWithdrawal) {_requireNotInRecoveryMode();}

        L.price = priceFeed.getPrice();

        cdpManager.applyPendingRewards(_borrower);

        (L.collChange, L.isCollIncrease) = _getCollChange(msg.value, _collWithdrawal);

        L.rawDebtChange = _debtChange;
        if (_isDebtIncrease && _debtChange > 0) {
            // Decay the baseRate and get the fee
            cdpManager.decayBaseRateFromBorrowing();
            L.CLVFee = cdpManager.getBorrowingFee(_debtChange);

            // The raw debt change includes the fee, if there was one
            L.rawDebtChange = L.rawDebtChange.add(L.CLVFee);

            // Send fee to LQTY staking contract
            lqtyStaking.increaseF_LUSD(L.CLVFee);
            clvToken.mint(lqtyStakingAddress, L.CLVFee);
        }

        L.debt = cdpManager.getCDPDebt(_borrower);
        L.coll = cdpManager.getCDPColl(_borrower);

        L.newICR = _getNewICRFromTroveChange(L.coll, L.debt, L.collChange, L.isCollIncrease, L.rawDebtChange, _isDebtIncrease, L.price);

        if (isWithdrawal) {_requireICRisAboveMCR(L.newICR);}
        if (_isDebtIncrease && _debtChange > 0) {
            _requireNewTCRisAboveCCR(L.collChange, L.isCollIncrease, L.rawDebtChange, _isDebtIncrease, L.price);
        }
        if (!L.isCollIncrease) {_requireCollAmountIsWithdrawable(L.coll, L.collChange);}
        if (!_isDebtIncrease && _debtChange > 0) {_requireCLVRepaymentAllowed(L.debt, L.rawDebtChange);}

        (L.newColl, L.newDebt) = _updateTroveFromAdjustment(_borrower, L.collChange, L.isCollIncrease, L.rawDebtChange, _isDebtIncrease);
        L.stake = cdpManager.updateStakeAndTotalStakes(_borrower);

        // Re-insert trove it in the sorted list
        sortedCDPs.reInsert(_borrower, L.newICR, L.price, _hint, _hint);
  
        // Pass unmodified _debtChange here, as we don't send the fee to the user
        _moveTokensAndETHfromAdjustment(msg.sender, L.collChange, L.isCollIncrease, _debtChange, _isDebtIncrease, L.rawDebtChange);

        emit CDPUpdated(_borrower, L.newDebt, L.newColl, L.stake, BorrowerOperation.adjustLoan);
        emit LUSDBorrowingFeePaid(msg.sender,  L.CLVFee);
    }

    function closeLoan() external override {
        _requireCDPisActive(msg.sender);
        _requireNotInRecoveryMode();

        cdpManager.applyPendingRewards(msg.sender);

        uint coll = cdpManager.getCDPColl(msg.sender);
        uint debt = cdpManager.getCDPDebt(msg.sender);

        cdpManager.removeStake(msg.sender);
        cdpManager.closeCDP(msg.sender);

        // Burn the debt from the user's balance, and send the collateral back to the user
        _repayCLV(msg.sender, debt.sub(CLV_GAS_COMPENSATION));
        activePool.sendETH(msg.sender, coll);
        // Refund gas compensation
        _repayCLV(GAS_POOL_ADDRESS, CLV_GAS_COMPENSATION);

        emit CDPUpdated(msg.sender, 0, 0, 0, BorrowerOperation.closeLoan);
    }

    function claimRedeemedCollateral(address _user) external override {
        _requireCDPisNotActive(_user);

        // send ETH from CollSurplus Pool to owner
        collSurplusPool.claimColl(_user);

        emit RedeemedCollateralClaimed(_user);
    }

    // --- Helper functions ---

    function _getUSDValue(uint _coll, uint _price) internal pure returns (uint) {
        uint usdValue = _price.mul(_coll).div(1e18);

        return usdValue;
    }

    function _getCollChange(
        uint _collReceived,
        uint _requestedCollWithdrawal
    )
        internal
        pure
        returns(uint collChange, bool isCollIncrease)
    {
        if (_collReceived != 0) {
            collChange = _collReceived;
            isCollIncrease = true;
        } else {
            collChange = _requestedCollWithdrawal;
        }
    }

    // Update trove's coll and debt based on whether they increase or decrease
    function _updateTroveFromAdjustment
    (
        address _borrower,
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease
    )
        internal
        returns (uint, uint)
    {
        uint newColl = (_isCollIncrease) ? cdpManager.increaseCDPColl(_borrower, _collChange)
                                        : cdpManager.decreaseCDPColl(_borrower, _collChange);
        uint newDebt = (_isDebtIncrease) ? cdpManager.increaseCDPDebt(_borrower, _debtChange)
                                        : cdpManager.decreaseCDPDebt(_borrower, _debtChange);

        return (newColl, newDebt);
    }

    function _moveTokensAndETHfromAdjustment
    (
        address _borrower,
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease,
        uint _rawDebtChange
    )
        internal
    {
        if (_isDebtIncrease) {
            _withdrawCLV(_borrower, _debtChange, _rawDebtChange);
        } else {
            _repayCLV(_borrower, _debtChange);
        }

        if (_isCollIncrease) {
            _activePoolAddColl(_collChange);
        } else {
            activePool.sendETH(_borrower, _collChange);
        }
    }

    // Send ETH to Active Pool and increase its recorded ETH balance
    function _activePoolAddColl(uint _amount) internal {
        (bool success, ) = address(activePool).call{value: _amount}("");
        assert(success == true);
    }

    // Issue the specified amount of CLV to _account and increases the total active debt (_rawDebtIncrease potentially includes a CLVFee)
    function _withdrawCLV(address _account, uint _CLVAmount, uint _rawDebtIncrease) internal {
        activePool.increaseCLVDebt(_rawDebtIncrease);
        clvToken.mint(_account, _CLVAmount);
    }

    // Burn the specified amount of CLV from _account and decreases the total active debt
    function _repayCLV(address _account, uint _CLV) internal {
        activePool.decreaseCLVDebt(_CLV);
        clvToken.burn(_account, _CLV);
    }

    // --- 'Require' wrapper functions ---

    function _requireCDPisActive(address _borrower) internal view {
        uint status = cdpManager.getCDPStatus(_borrower);
        require(status == 1, "BorrowerOps: CDP does not exist or is closed");
    }

    function _requireCDPisNotActive(address _borrower) internal view {
        uint status = cdpManager.getCDPStatus(_borrower);
        require(status != 1, "BorrowerOps: CDP is active");
    }

    function _requireNotInRecoveryMode() internal view {
        require(_checkRecoveryMode() == false, "BorrowerOps: Operation not permitted during Recovery Mode");
    }

    function _requireICRisAboveMCR(uint _newICR)  internal pure {
        require(_newICR >= MCR, "BorrowerOps: An operation that would result in ICR < MCR is not permitted");
    }

    function _requireICRisAboveR_MCR(uint _newICR) internal pure {
        require(_newICR >= R_MCR, "BorrowerOps: In Recovery Mode new loans must have ICR >= R_MCR");
    }

    function _requireNewTCRisAboveCCR
    (
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease,
        uint _price
    )
        internal
        view
    {
        uint newTCR = _getNewTCRFromTroveChange(_collChange, _isCollIncrease, _debtChange, _isDebtIncrease, _price);
        require(newTCR >= CCR, "BorrowerOps: An operation that would result in TCR < CCR is not permitted");
    }

    function _requireCLVRepaymentAllowed(uint _currentDebt, uint _debtRepayment) internal pure {
        require(_debtRepayment <= _currentDebt.sub(CLV_GAS_COMPENSATION), "BorrowerOps: Amount repaid must not be larger than the CDP's debt");
    }

    function _requireCollAmountIsWithdrawable(uint _currentColl, uint _collWithdrawal)
        internal
        pure
    {
        require(_collWithdrawal <= _currentColl, "BorrowerOps: Insufficient balance for ETH withdrawal");
    }

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "BorrowerOps: Caller is not Stability Pool");
    }

    // --- ICR and TCR checks ---

    // Compute the new collateral ratio, considering the change in coll and debt. Assumes 0 pending rewards.
    function _getNewICRFromTroveChange
    (
        uint _coll,
        uint _debt,
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease,
        uint _price
    )
        pure
        internal
        returns (uint)
    {
        uint newColl = _coll;
        uint newDebt = _debt;

        newColl = _isCollIncrease ? _coll.add(_collChange) :  _coll.sub(_collChange);
        newDebt = _isDebtIncrease ? _debt.add(_debtChange) : _debt.sub(_debtChange);

        uint newICR = LiquityMath._computeCR(newColl, newDebt, _price);
        return newICR;
    }

    function _getNewTCRFromTroveChange
    (
        uint _collChange,
        bool _isCollIncrease,
        uint _debtChange,
        bool _isDebtIncrease,
        uint _price
    )
        internal
        view
        returns (uint)
    {
        uint totalColl = activePool.getETH().add(defaultPool.getETH());
        uint totalDebt = activePool.getCLVDebt().add(defaultPool.getCLVDebt());

        totalColl = _isCollIncrease ? totalColl.add(_collChange) : totalColl.sub(_collChange);
        totalDebt = _isDebtIncrease ? totalDebt.add(_debtChange) : totalDebt = totalDebt.sub(_debtChange);

        uint newTCR = LiquityMath._computeCR(totalColl, totalDebt, _price);
        return newTCR;
    }

    function getCompositeDebt(uint _debt) external pure override returns (uint) {
        return _getCompositeDebt(_debt);
    }

    // --- Recovery Mode and TCR functions ---

    function _checkRecoveryMode() internal view returns (bool) {
        uint TCR = _getTCR();

        if (TCR < CCR) {
            return true;
        } else {
            return false;
        }
    }

    function _getTCR() internal view returns (uint TCR) {
        uint price = priceFeed.getPrice();
        uint activeColl = activePool.getETH();
        uint activeDebt = activePool.getCLVDebt();
        uint liquidatedColl = defaultPool.getETH();
        uint closedDebt = defaultPool.getCLVDebt();

        uint totalCollateral = activeColl.add(liquidatedColl);
        uint totalDebt = activeDebt.add(closedDebt);

        TCR = LiquityMath._computeCR(totalCollateral, totalDebt, price);

        return TCR;
    }
}
