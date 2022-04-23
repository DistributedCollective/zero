// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "./Interfaces/IStabilityPool.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Interfaces/ISortedTroves.sol";
import "./Interfaces/IZEROToken.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/BaseMath.sol";
import "./Dependencies/console.sol";

contract TroveManagerStorage is Ownable, BaseMath {
    string constant public NAME = "TroveManager";

    // --- Connected contract declarations ---

    address public troveManagerRedeemOps;

    address public borrowerOperationsAddress;

    IStabilityPool public _stabilityPool;

    address gasPoolAddress;

    ICollSurplusPool collSurplusPool;

    IZUSDToken public _zusdToken;

    IZEROToken public _zeroToken;

    IZEROStaking public _zeroStaking;

    IFeeDistributor public feeDistributor;

    // A doubly linked list of Troves, sorted by their sorted by their collateral ratios
    ISortedTroves public sortedTroves;

    // --- Data structures ---

    uint public baseRate;

    // The timestamp of the latest fee operation (redemption or new ZUSD issuance)
    uint public lastFeeOperationTime;

    enum Status {
        nonExistent,
        active,
        closedByOwner,
        closedByLiquidation,
        closedByRedemption
    }

    // Store the necessary data for a trove
    struct Trove {
        uint debt;
        uint coll;
        uint stake;
        Status status;
        uint128 arrayIndex;
    }

    mapping (address => Trove) public Troves;

    uint public totalStakes;

    // Snapshot of the value of totalStakes, taken immediately after the latest liquidation
    uint public totalStakesSnapshot;

    // Snapshot of the total collateral across the ActivePool and DefaultPool, immediately after the latest liquidation.
    uint public totalCollateralSnapshot;

    /*
    * L_RBTC and L_ZUSDDebt track the sums of accumulated liquidation rewards per unit staked. During its lifetime, each stake earns:
    *
    * An RBTC gain of ( stake * [L_RBTC - L_RBTC(0)] )
    * A ZUSDDebt increase  of ( stake * [L_ZUSDDebt - L_ZUSDDebt(0)] )
    *
    * Where L_RBTC(0) and L_ZUSDDebt(0) are snapshots of L_RBTC and L_ZUSDDebt for the active Trove taken at the instant the stake was made
    */
    uint public L_RBTC;
    uint public L_ZUSDDebt;

    // Map addresses with active troves to their RewardSnapshot
    mapping (address => RewardSnapshot) public rewardSnapshots;

    // Object containing the RBTC and ZUSD snapshots for a given active trove
    struct RewardSnapshot { uint RBTC; uint ZUSDDebt;}

    // Array of all active trove addresses - used to to compute an approximate hint off-chain, for the sorted list insertion
    address[] public TroveOwners;

    // Error trackers for the trove redistribution calculation
    uint public lastRBTCError_Redistribution;
    uint public lastZUSDDebtError_Redistribution;
}
