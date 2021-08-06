// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

/// Common interface for the Trove Manager.
interface IBorrowerOperations {

    // --- Events ---

    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolAddressChanged(address _activePoolAddress);
    event DefaultPoolAddressChanged(address _defaultPoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event GasPoolAddressChanged(address _gasPoolAddress);
    event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress);
    event PriceFeedAddressChanged(address  _newPriceFeedAddress);
    event SortedTrovesAddressChanged(address _sortedTrovesAddress);
    event ZUSDTokenAddressChanged(address _zusdTokenAddress);
    event ZEROStakingAddressChanged(address _zeroStakingAddress);

    event TroveCreated(address indexed _borrower, uint arrayIndex);
    event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake, uint8 operation);
    event ZUSDBorrowingFeePaid(address indexed _borrower, uint _ZUSDFee);

    // --- Functions ---
    
    /**
     * @notice Called only once on init, to set addresses of other Liquity contracts. Callable only by owner
     * @dev initializer function, checks addresses are contracts
     * @param _liquityBaseParamsAddress LiquidityBaseParams contract address
     * @param _troveManagerAddress TroveManager contract address
     * @param _activePoolAddress ActivePool contract address
     * @param _defaultPoolAddress DefaultPool contract address
     * @param _stabilityPoolAddress StabilityPool contract address
     * @param _gasPoolAddress GasPool contract address
     * @param _collSurplusPoolAddress CollSurplusPool contract address
     * @param _priceFeedAddress PrideFeed contract address
     * @param _sortedTrovesAddress SortedTroves contract address
     * @param _zusdTokenAddress ZUSDToken contract address
     * @param _zeroStakingAddress ZEROStaking contract address
     */
    function setAddresses(
        address _liquityBaseParamsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedTrovesAddress,
        address _zusdTokenAddress,
        address _zeroStakingAddress
    ) external;

    /**
     * @notice payable function that creates a Trove for the caller with the requested debt, and the Ether received as collateral.
     * Successful execution is conditional mainly on the resulting collateralization ratio which must exceed the minimum (110% in Normal Mode, 150% in Recovery Mode).
     * In addition to the requested debt, extra debt is issued to pay the issuance fee, and cover the gas compensation. 
     * The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee. 
     * @param _maxFee max fee percentage to acept in case of a fee slippage
     * @param _ZUSDAmount ZUSD requested debt 
     * @param _upperHint upper trove id hint
     * @param _lowerHint lower trove id hint
     */
    function openTrove(uint _maxFee, uint _ZUSDAmount, address _upperHint, address _lowerHint) external payable;

    
    /// @notice payable function that adds the received Ether to the caller's active Trove.
    /// @param _upperHint upper trove id hint
    /// @param _lowerHint lower trove id hint
    function addColl(address _upperHint, address _lowerHint) external payable;

    /// @notice send ETH as collateral to a trove. Called by only the Stability Pool.
    /// @param _user user trove address
    /// @param _upperHint upper trove id hint
    /// @param _lowerHint lower trove id hint
    function moveETHGainToTrove(address _user, address _upperHint, address _lowerHint) external payable;
    
    /**
     * @notice withdraws `_amount` of collateral from the caller’s Trove. 
     * Executes only if the user has an active Trove, the withdrawal would not pull the user’s Trove below the minimum collateralization ratio, 
     * and the resulting total collateralization ratio of the system is above 150%. 
     * @param _amount collateral amount to withdraw 
     * @param _upperHint upper trove id hint
     * @param _lowerHint lower trove id hint
     */
    function withdrawColl(uint _amount, address _upperHint, address _lowerHint) external;

    /**
     * @notice issues `_amount` of ZUSD from the caller’s Trove to the caller. 
     * Executes only if the Trove's collateralization ratio would remain above the minimum, and the resulting total collateralization ratio is above 150%. 
     * The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee.
     * @param _maxFee max fee percentage to acept in case of a fee slippage
     * @param _amount ZUSD amount to withdraw 
     * @param _upperHint upper trove id hint
     * @param _lowerHint lower trove id hint
     */
    function withdrawZUSD(uint _maxFee, uint _amount, address _upperHint, address _lowerHint) external;

    /// @notice repay `_amount` of ZUSD to the caller’s Trove, subject to leaving 50 debt in the Trove (which corresponds to the 50 ZUSD gas compensation).
    /// @param _amount ZUSD amount to repay
    /// @param _upperHint upper trove id hint
    /// @param _lowerHint lower trove id hint
    function repayZUSD(uint _amount, address _upperHint, address _lowerHint) external;

    /**
     * @notice allows a borrower to repay all debt, withdraw all their collateral, and close their Trove. 
     * Requires the borrower have a ZUSD balance sufficient to repay their trove's debt, excluding gas compensation - i.e. `(debt - 50)` ZUSD.
     */
    function closeTrove() external;

    /**
     * @notice enables a borrower to simultaneously change both their collateral and debt, subject to all the restrictions that apply to individual increases/decreases of each quantity with the following particularity: 
     * if the adjustment reduces the collateralization ratio of the Trove, the function only executes if the resulting total collateralization ratio is above 150%. 
     * The borrower has to provide a `_maxFeePercentage` that he/she is willing to accept in case of a fee slippage, i.e. when a redemption transaction is processed first, driving up the issuance fee. 
     * The parameter is ignored if the debt is not increased with the transaction.
     * @param _maxFee max fee percentage to acept in case of a fee slippage
     * @param _collWithdrawal collateral amount to withdraw 
     * @param _debtChange ZUSD amount to change 
     * @param isDebtIncrease indicates if increases debt
     * @param _upperHint upper trove id hint
     * @param _lowerHint lower trove id hint
     */
    function adjustTrove(uint _maxFee, uint _collWithdrawal, uint _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable;

    /** 
    * @notice when a borrower’s Trove has been fully redeemed from and closed, or liquidated in Recovery Mode with a collateralization ratio above 110%, 
    * this function allows the borrower to claim their ETH collateral surplus that remains in the system (collateral - debt upon redemption; collateral - 110% of the debt upon liquidation). 
    */
    function claimCollateral() external;

    function getCompositeDebt(uint _debt) external view returns (uint);

    function BORROWING_FEE_FLOOR() external view returns (uint);
}
