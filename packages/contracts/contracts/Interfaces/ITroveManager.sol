// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "./ILiquityBase.sol";
import "./IStabilityPool.sol";
import "./IZUSDToken.sol";
import "./IZEROToken.sol";
import "./IZEROStaking.sol";
import "../Dependencies/Mynt/IMassetManager.sol";

/// Common interface for the Trove Manager.
interface ITroveManager is ILiquityBase {
    // --- Events ---

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
        uint256 stake,
        uint8 operation
    );
    event TroveLiquidated(
        address indexed _borrower,
        uint256 _debt,
        uint256 _coll,
        uint8 operation
    );
    event BaseRateUpdated(uint256 _baseRate);
    event LastFeeOpTimeUpdated(uint256 _lastFeeOpTime);
    event TotalStakesUpdated(uint256 _newTotalStakes);
    event SystemSnapshotsUpdated(uint256 _totalStakesSnapshot, uint256 _totalCollateralSnapshot);
    event LTermsUpdated(uint256 _L_ETH, uint256 _L_ZUSDDebt);
    event TroveSnapshotsUpdated(uint256 _L_ETH, uint256 _L_ZUSDDebt);
    event TroveIndexUpdated(address _borrower, uint256 _newIndex);

    struct TroveManagerInitAddressesParams {
        address _feeDistributorAddress;
        address _troveManagerRedeemOps;
        address _liquityBaseParamsAddress;
        address _borrowerOperationsAddress;
        address _activePoolAddress;
        address _defaultPoolAddress;
        address _stabilityPoolAddress;
        address _gasPoolAddress;
        address _collSurplusPoolAddress;
        address _priceFeedAddress;
        address _zusdTokenAddress;
        address _sortedTrovesAddress;
        address _zeroTokenAddress;
        address _zeroStakingAddress;
    }

    // --- Functions ---
    /**
     * @notice Called only once on init, to set addresses of other Zero contracts. Callable only by owner
     * @dev initializer function, checks addresses are contracts
     * @param _troveManagerInitAddresses addresses list to intialize TroveManager with _
     *        _feeDistributorAddress feeDistributor contract address
     *        _troveManagerRedeemOps TroveManagerRedeemOps contract address
     *        _liquityBaseParamsAddress LiquityBaseParams contract address
     *        _borrowerOperationsAddress BorrowerOperations contract address
     *        _activePoolAddress ActivePool contract address
     *        _defaultPoolAddress DefaultPool contract address
     *        _stabilityPoolAddress StabilityPool contract address
     *        _gasPoolAddress GasPool contract address
     *        _collSurplusPoolAddress CollSurplusPool contract address
     *        _priceFeedAddress PriceFeed contract address
     *        _zusdTokenAddress ZUSDToken contract address
     *        _sortedTrovesAddress SortedTroves contract address
     *        _zeroTokenAddress ZEROToken contract address
     *        _zeroStakingAddress ZEROStaking contract address
     */
    function setAddresses(
        TroveManagerInitAddressesParams memory _troveManagerInitAddresses
    ) external;

    function setTroveManagerRedeemOps(address _troveManagerRedeemOps) external;

    /// @return Trove owners count
    function getTroveOwnersCount() external view returns (uint256);

    /// @param _index Trove owner index
    /// @return Trove from TroveOwners array in given index
    function getTroveFromTroveOwnersArray(uint256 _index) external view returns (address);

    /// @param _borrower borrower address
    /// @return the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.
    function getNominalICR(address _borrower) external view returns (uint256);

    /// @notice computes the user’s individual collateralization ratio (ICR) based on their total collateral and total ZUSD debt. Returns 2^256 -1 if they have 0 debt.
    /// @param _borrower borrower address
    /// @param _price ETH price
    /// @return the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.
    function getCurrentICR(address _borrower, uint256 _price) external view returns (uint256);

    /// @notice Closes the trove if its ICR is lower than the minimum collateral ratio.
    /// @param _borrower borrower address
    function liquidate(address _borrower) external;

    /**
     * @notice Liquidate a sequence of troves. Closes a maximum number of n under-collateralized Troves,
     * starting from the one with the lowest collateral ratio in the system, and moving upwards
     * @param _n max number of under-collateralized Troves to liquidate
     */
    function liquidateTroves(uint256 _n) external;

    /**
     * @notice Attempt to liquidate a custom list of troves provided by the caller.
     * @param _troveArray list of trove addresses
     */
    function batchLiquidateTroves(address[] calldata _troveArray) external;

    /**
     * @notice Send _ZUSDamount ZUSD to the system and redeem the corresponding amount of collateral from as many Troves as are needed to fill the redemption
     * request.  Applies pending rewards to a Trove before reducing its debt and coll.
     *
     * Note that if _amount is very large, this function can run out of gas, specially if traversed troves are small. This can be easily avoided by
     * splitting the total _amount in appropriate chunks and calling the function multiple times.
     *
     * Param `_maxIterations` can also be provided, so the loop through Troves is capped (if it’s zero, it will be ignored).This makes it easier to
     * avoid OOG for the frontend, as only knowing approximately the average cost of an iteration is enough, without needing to know the “topology”
     * of the trove list. It also avoids the need to set the cap in stone in the contract, nor doing gas calculations, as both gas price and opcode
     * costs can vary.
     *
     * All Troves that are redeemed from -- with the likely exception of the last one -- will end up with no debt left, therefore they will be closed.
     * If the last Trove does have some remaining debt, it has a finite ICR, and the reinsertion could be anywhere in the list, therefore it requires a hint.
     * A frontend should use getRedemptionHints() to calculate what the ICR of this Trove will be after redemption, and pass a hint for its position
     * in the sortedTroves list along with the ICR value that the hint was found for.
     *
     * If another transaction modifies the list between calling getRedemptionHints() and passing the hints to redeemCollateral(), it
     * is very likely that the last (partially) redeemed Trove would end up with a different ICR than what the hint is for. In this case the
     * redemption will stop after the last completely redeemed Trove and the sender will keep the remaining ZUSD amount, which they can attempt
     * to redeem later.
     *
     * @param _ZUSDAmount ZUSD amount to send to the system
     * @param _firstRedemptionHint calculated ICR hint of first trove after redemption
     * @param _maxIterations max Troves iterations (can be 0)
     * @param _maxFee max fee percentage to accept
     */
    function redeemCollateral(
        uint256 _ZUSDAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFee
    ) external;

    function redeemCollateralViaDLLR(
        uint256 _dllrAmount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations,
        uint256 _maxFeePercentage,
        IMassetManager.PermitParams calldata _permitParams
    ) external;

    /// @notice Update borrower's stake based on their latest collateral value
    /// @param _borrower borrower address
    function updateStakeAndTotalStakes(address _borrower) external returns (uint256);

    /// @notice Update borrower's snapshots of L_ETH and L_ZUSDDebt to reflect the current values
    /// @param _borrower borrower address
    function updateTroveRewardSnapshots(address _borrower) external;

    /// @notice Push the owner's address to the Trove owners list, and record the corresponding array index on the Trove struct
    /// @param _borrower borrower address
    /// @return index where Trove was inserted
    function addTroveOwnerToArray(address _borrower) external returns (uint256 index);

    /// @notice Add the borrowers's coll and debt rewards earned from redistributions, to their Trove
    /// @param _borrower borrower address
    function applyPendingRewards(address _borrower) external;

    /// @param _borrower borrower address
    /// @return the borrower's pending accumulated ETH reward, earned by their stake
    function getPendingETHReward(address _borrower) external view returns (uint256);

    /// @param _borrower borrower address
    /// @return the borrower's pending accumulated ZUSD reward, earned by their stake
    function getPendingZUSDDebtReward(address _borrower) external view returns (uint256);

    /*
     * @notice A Trove has pending rewards if its snapshot is less than the current rewards per-unit-staked sum:
     * this indicates that rewards have occured since the snapshot was made, and the user therefore has
     * pending rewards
     *
     * @param _borrower borrower address
     * @return true if has pending rewards
     */
    function hasPendingRewards(address _borrower) external view returns (bool);

    /// @notice returns the Troves entire debt and coll, including pending rewards from redistributions.
    /// @param _borrower borrower address
    function getEntireDebtAndColl(
        address _borrower
    )
        external
        view
        returns (
            uint256 debt,
            uint256 coll,
            uint256 pendingZUSDDebtReward,
            uint256 pendingETHReward
        );

    /// @notice Close given trove. Called by BorrowerOperations.
    /// @param _borrower borrower address
    function closeTrove(address _borrower) external;

    /// @notice Remove borrower's stake from the totalStakes sum, and set their stake to 0
    /// @param _borrower borrower address
    function removeStake(address _borrower) external;

    /// @return calculated redemption rate using baseRate
    function getRedemptionRate() external view returns (uint256);

    /// @return calculated redemption rate using calculated decayed as base rate
    function getRedemptionRateWithDecay() external view returns (uint256);

    /// @notice The redemption fee is taken as a cut of the total ETH drawn from the system in a redemption. It is based on the current redemption rate.
    /// @param _ETHDrawn ETH drawn
    function getRedemptionFeeWithDecay(uint256 _ETHDrawn) external view returns (uint256);

    /// @return borrowing rate
    function getBorrowingRate() external view returns (uint256);

    /// @return borrowing rate calculated using decayed as base rate
    function getBorrowingRateWithDecay() external view returns (uint256);

    /// @param ZUSDDebt ZUSD debt amount to calculate fee
    /// @return borrowing fee using borrowing rate
    function getBorrowingFee(uint256 ZUSDDebt) external view returns (uint256);

    /// @param _ZUSDDebt ZUSD debt amount to calculate fee
    /// @return borrowing fee using borrowing rate with decay
    function getBorrowingFeeWithDecay(uint256 _ZUSDDebt) external view returns (uint256);

    /// @notice Updates the baseRate state variable based on time elapsed since the last redemption or ZUSD borrowing operation.
    function decayBaseRateFromBorrowing() external;

    /// @param _borrower borrower address
    /// @return Trove status from given trove
    function getTroveStatus(address _borrower) external view returns (uint256);

    /// @param _borrower borrower address
    /// @return Trove stake from given trove
    function getTroveStake(address _borrower) external view returns (uint256);

    /// @param _borrower borrower address
    /// @return Trove debt from given trove
    function getTroveDebt(address _borrower) external view returns (uint256);

    /// @param _borrower borrower address
    /// @return Trove collateral from given trove
    function getTroveColl(address _borrower) external view returns (uint256);

    /// @param _borrower borrower address
    /// @param num status to set
    function setTroveStatus(address _borrower, uint256 num) external;

    /// @param _borrower borrower address
    /// @param _collIncrease amount of collateral to increase
    /// @return new trove collateral
    function increaseTroveColl(
        address _borrower,
        uint256 _collIncrease
    ) external returns (uint256);

    /// @param _borrower borrower address
    /// @param _collDecrease amount of collateral to decrease
    /// @return new trove collateral
    function decreaseTroveColl(
        address _borrower,
        uint256 _collDecrease
    ) external returns (uint256);

    /// @param _borrower borrower address
    /// @param _debtIncrease amount of debt to increase
    /// @return new trove debt
    function increaseTroveDebt(
        address _borrower,
        uint256 _debtIncrease
    ) external returns (uint256);

    /// @param _borrower borrower address
    /// @param _debtDecrease amount of debt to decrease
    /// @return new trove debt
    function decreaseTroveDebt(
        address _borrower,
        uint256 _debtDecrease
    ) external returns (uint256);

    /**
     * @param _price ETH price
     * @return the total collateralization ratio (TCR) of the system.
     * The TCR is based on the the entire system debt and collateral (including pending rewards).
     */
    function getTCR(uint256 _price) external view returns (uint256);

    function MCR() external view returns (uint256);

    function CCR() external view returns (uint256);

    /// @notice reveals whether or not the system is in Recovery Mode (i.e. whether the Total Collateralization Ratio (TCR) is below the Critical Collateralization Ratio (CCR)).
    function checkRecoveryMode(uint256 _price) external view returns (bool);
}
