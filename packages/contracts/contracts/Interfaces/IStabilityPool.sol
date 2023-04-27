// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "../Dependencies/Mynt/IMassetManager.sol";

/*
 * The Stability Pool holds ZUSD tokens deposited by Stability Pool depositors.
 *
 * When a trove is liquidated, then depending on system conditions, some of its ZUSD debt gets offset with
 * ZUSD in the Stability Pool:  that is, the offset debt evaporates, and an equal amount of ZUSD tokens in the Stability Pool is burned.
 *
 * Thus, a liquidation causes each depositor to receive a ZUSD loss, in proportion to their deposit as a share of total deposits.
 * They also receive an ETH gain, as the ETH collateral of the liquidated trove is distributed among Stability depositors,
 * in the same proportion.
 *
 * When a liquidation occurs, it depletes every deposit by the same fraction: for example, a liquidation that depletes 40%
 * of the total ZUSD in the Stability Pool, depletes 40% of each deposit.
 *
 * A deposit that has experienced a series of liquidations is termed a "compounded deposit": each liquidation depletes the deposit,
 * multiplying it by some factor in range ]0,1[
 *
 * Please see the implementation spec in the proof document, which closely follows on from the compounded deposit / ETH gain derivations:
 * https://github.com/liquity/liquity/blob/master/papers/Scalable_Reward_Distribution_with_Compounding_Stakes.pdf
 *
 * --- SOV ISSUANCE TO STABILITY POOL DEPOSITORS ---
 *
 * An SOV issuance event occurs at every deposit operation, and every liquidation.
 *
 * Each deposit is tagged with the address of the front end through which it was made.
 *
 * All deposits earn a share of the issued SOV in proportion to the deposit as a share of total deposits. The SOV earned
 * by a given deposit, is split between the depositor and the front end through which the deposit was made, based on the front end's kickbackRate.
 *
 * Please see the system Readme for an overview:
 * https://github.com/liquity/dev/blob/main/README.md#zero-issuance-to-stability-providers
 */
interface IStabilityPool {
    // --- Events ---

    event StabilityPoolETHBalanceUpdated(uint _newBalance);
    event StabilityPoolZUSDBalanceUpdated(uint _newBalance);

    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event ActivePoolAddressChanged(address _newActivePoolAddress);
    event DefaultPoolAddressChanged(address _newDefaultPoolAddress);
    event ZUSDTokenAddressChanged(address _newZUSDTokenAddress);
    event SortedTrovesAddressChanged(address _newSortedTrovesAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);
    event CommunityIssuanceAddressChanged(address _newCommunityIssuanceAddress);

    event P_Updated(uint _P);
    event S_Updated(uint _S, uint128 _epoch, uint128 _scale);
    event G_Updated(uint _G, uint128 _epoch, uint128 _scale);
    event EpochUpdated(uint128 _currentEpoch);
    event ScaleUpdated(uint128 _currentScale);

    event FrontEndRegistered(address indexed _frontEnd, uint _kickbackRate);
    event FrontEndTagSet(address indexed _depositor, address indexed _frontEnd);

    event DepositSnapshotUpdated(address indexed _depositor, uint _P, uint _S, uint _G);
    event FrontEndSnapshotUpdated(address indexed _frontEnd, uint _P, uint _G);
    event UserDepositChanged(address indexed _depositor, uint _newDeposit);
    event FrontEndStakeChanged(
        address indexed _frontEnd,
        uint _newFrontEndStake,
        address _depositor
    );

    event ETHGainWithdrawn(address indexed _depositor, uint _ETH, uint _ZUSDLoss);
    event SOVPaidToDepositor(address indexed _depositor, uint _SOV);
    event SOVPaidToFrontEnd(address indexed _frontEnd, uint _SOV);
    event EtherSent(address _to, uint _amount);

    event WithdrawFromSpAndConvertToDLLR(
        address _depositor,
        uint256 _zusdAmountRequested,
        uint256 _dllrAmountReceived
    );

    // --- Functions ---

    /**
     * @notice Called only once on init, to set addresses of other Liquity contracts. Callable only by owner
     * @dev initializer function, checks addresses are contracts
     * @param _liquityBaseParamsAddress LiquidityBaseParams contract address
     * @param _borrowerOperationsAddress BorrowerOperations contract address
     * @param _troveManagerAddress TroveManager contract address
     * @param _activePoolAddress ActivePool contract address
     * @param _zusdTokenAddress ZUSDToken contract address
     * @param _sortedTrovesAddress SortedTroves contract address
     * @param _priceFeedAddress PriceFeed contract address
     * @param _communityIssuanceAddress CommunityIssuanceAddress
     */
    function setAddresses(
        address _liquityBaseParamsAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _zusdTokenAddress,
        address _sortedTrovesAddress,
        address _priceFeedAddress,
        address _communityIssuanceAddress
    ) external;

    /**
     * @notice Initial checks:
     *  - Frontend is registered or zero address
     *  - Sender is not a registered frontend
     *  - _amount is not zero
     *  ---
     *  - Triggers a SOV issuance, based on time passed since the last issuance. The SOV issuance is shared between *all* depositors and front ends
     *  - Tags the deposit with the provided front end tag param, if it's a new deposit
     *  - Sends depositor's accumulated gains (SOV, ETH) to depositor
     *  - Sends the tagged front end's accumulated SOV gains to the tagged front end
     *  - Increases deposit and tagged front end's stake, and takes new snapshots for each.
     * @param _amount amount to provide
     * @param _frontEndTag frontend address to receive accumulated SOV gains
     */
    function provideToSP(uint _amount, address _frontEndTag) external;

    /**
     * @notice Initial checks:
     *    - _amount is zero or there are no under collateralized troves left in the system
     *    - User has a non zero deposit
     *    ---
     *    - Triggers a SOV issuance, based on time passed since the last issuance. The SOV issuance is shared between *all* depositors and front ends
     *    - Removes the deposit's front end tag if it is a full withdrawal
     *    - Sends all depositor's accumulated gains (SOV, ETH) to depositor
     *    - Sends the tagged front end's accumulated SOV gains to the tagged front end
     *    - Decreases deposit and tagged front end's stake, and takes new snapshots for each.
     *
     *    If _amount > userDeposit, the user withdraws all of their compounded deposit.
     * @param _amount amount to withdraw
     */
    function withdrawFromSP(uint _amount) external;

    /**
     * @notice Initial checks:
     *    - User has a non zero deposit
     *    - User has an open trove
     *    - User has some ETH gain
     *    ---
     *    - Triggers a SOV issuance, based on time passed since the last issuance. The SOV issuance is shared between *all* depositors and front ends
     *    - Sends all depositor's SOV gain to  depositor
     *    - Sends all tagged front end's SOV gain to the tagged front end
     *    - Transfers the depositor's entire ETH gain from the Stability Pool to the caller's trove
     *    - Leaves their compounded deposit in the Stability Pool
     *    - Updates snapshots for deposit and tagged front end stake
     * @param _upperHint upper trove id hint
     * @param _lowerHint lower trove id hint
     */
    function withdrawETHGainToTrove(address _upperHint, address _lowerHint) external;

    /**
     * @notice Initial checks:
     *    - Frontend (sender) not already registered
     *    - User (sender) has no deposit
     *    - _kickbackRate is in the range [0, 100%]
     *    ---
     *    Front end makes a one-time selection of kickback rate upon registering
     * @param _kickbackRate kickback rate selected by frontend
     */
    function registerFrontEnd(uint _kickbackRate) external;

    /**
     * @notice Initial checks:
     *    - Caller is TroveManager
     *    ---
     *    Cancels out the specified debt against the ZUSD contained in the Stability Pool (as far as possible)
     *    and transfers the Trove's ETH collateral from ActivePool to StabilityPool.
     *    Only called by liquidation functions in the TroveManager.
     * @param _debt debt to cancel
     * @param _coll collateral to transfer
     */
    function offset(uint _debt, uint _coll) external;

    /**
     * @return the total amount of ETH held by the pool, accounted in an internal variable instead of `balance`,
     * to exclude edge cases like ETH received from a self-destruct.
     */
    function getETH() external view returns (uint);

    /**
     * @return ZUSD held in the pool. Changes when users deposit/withdraw, and when Trove debt is offset.
     */
    function getTotalZUSDDeposits() external view returns (uint);

    /**
     * @notice Calculates the ETH gain earned by the deposit since its last snapshots were taken.
     * @param _depositor address to calculate ETH gain
     * @return ETH gain from given depositor
     */
    function getDepositorETHGain(address _depositor) external view returns (uint);

    /**
     * @notice Calculate the SOV gain earned by a deposit since its last snapshots were taken.
     *    If not tagged with a front end, the depositor gets a 100% cut of what their deposit earned.
     *    Otherwise, their cut of the deposit's earnings is equal to the kickbackRate, set by the front end through
     *    which they made their deposit.
     * @param _depositor address to calculate ETH gain
     * @return SOV gain from given depositor
     */
    function getDepositorSOVGain(address _depositor) external view returns (uint);

    /**
     * @param _frontEnd front end address
     * @return the SOV gain earned by the front end.
     */
    function getFrontEndSOVGain(address _frontEnd) external view returns (uint);

    /**
     * @param _depositor depositor address
     * @return the user's compounded deposit.
     */
    function getCompoundedZUSDDeposit(address _depositor) external view returns (uint);

    /**
     * @notice The front end's compounded stake is equal to the sum of its depositors' compounded deposits.
     * @param _frontEnd front end address
     * @return the front end's compounded stake.
     */
    function getCompoundedFrontEndStake(address _frontEnd) external view returns (uint);

    //DLLR _owner or _spender can convert a specified amount of DLLR into ZUSD via Sovryn Mynt and deposit the ZUSD into the Zero Stability Pool, all in a single transaction
    function provideToSpFromDLLR(
        uint _dllrAmount,
        IMassetManager.PermitParams calldata _permitParams
    ) external;

    /// Stability Pool depositor can withdraw a specified amount of ZUSD from the Zero Stability Pool and optionally convert the ZUSD to DLLR via Sovryn Mynt, all in a single transaction
    function withdrawFromSpAndConvertToDLLR(uint256 _zusdAmount) external;

    /**
     * Fallback function
     * Only callable by Active Pool, it just accounts for ETH received
     * receive() external payable;
     */
}
