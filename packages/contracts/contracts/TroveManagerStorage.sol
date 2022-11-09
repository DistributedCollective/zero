// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IStabilityPool.sol";
import "./Interfaces/ICollSurplusPool.sol";
import "./Interfaces/IZUSDToken.sol";
import "./Interfaces/ISortedLoCs.sol";
import "./Interfaces/IZEROToken.sol";
import "./Interfaces/IZEROStaking.sol";
import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/BaseMath.sol";
import "./Dependencies/console.sol";

contract LoCManagerStorage is Ownable, BaseMath {
    string constant public NAME = "LoCManager";

    // --- Connected contract declarations ---

    address public locManagerRedeemOps;

    address public borrowerOperationsAddress;

    IStabilityPool public _stabilityPool;

    address gasPoolAddress;

    ICollSurplusPool collSurplusPool;

    IZUSDToken public _zusdToken;

    IZEROToken public _zeroToken;

    IZEROStaking public _zeroStaking;

    IFeeDistributor public feeDistributor;

    // A doubly linked list of LoCs, sorted by their sorted by their collateral ratios
    ISortedLoCs public sortedLoCs;

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

    // Store the necessary data for a loc
    struct LoC {
        uint debt;
        uint coll;
        uint stake;
        Status status;
        uint128 arrayIndex;
    }

    mapping (address => LoC) public LoCs;

    uint public totalStakes;

    // Snapshot of the value of totalStakes, taken immediately after the latest liquidation
    uint public totalStakesSnapshot;

    // Snapshot of the total collateral across the ActivePool and DefaultPool, immediately after the latest liquidation.
    uint public totalCollateralSnapshot;

    /*
    * L_BTC and L_ZUSDDebt track the sums of accumulated liquidation rewards per unit staked. During its lifetime, each stake earns:
    *
    * An BTC gain of ( stake * [L_BTC - L_BTC(0)] )
    * A ZUSDDebt increase  of ( stake * [L_ZUSDDebt - L_ZUSDDebt(0)] )
    *
    * Where L_BTC(0) and L_ZUSDDebt(0) are snapshots of L_BTC and L_ZUSDDebt for the active LoC taken at the instant the stake was made
    */
    uint public L_BTC;
    uint public L_ZUSDDebt;

    // Map addresses with active locs to their RewardSnapshot
    mapping (address => RewardSnapshot) public rewardSnapshots;

    // Object containing the BTC and ZUSD snapshots for a given active loc
    struct RewardSnapshot { uint BTC; uint ZUSDDebt;}

    // Array of all active LoC addresses - used to to compute an approximate hint off-chain, for the sorted list insertion
    address[] public LoCOwners;

    // Error trackers for the LoC redistribution calculation
    uint public lastETHError_Redistribution;
    uint public lastZUSDDebtError_Redistribution;
}
