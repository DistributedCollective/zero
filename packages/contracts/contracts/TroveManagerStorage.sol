// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

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
    string public constant NAME = "TroveManager";

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

    uint256 public baseRate;

    // The timestamp of the latest fee operation (redemption or new ZUSD issuance)
    uint256 public lastFeeOperationTime;

    enum Status {
        nonExistent,
        active,
        closedByOwner,
        closedByLiquidation,
        closedByRedemption
    }

    // Store the necessary data for a trove
    struct Trove {
        uint256 debt;
        uint256 coll;
        uint256 stake;
        Status status;
        uint128 arrayIndex;
    }

    mapping(address => Trove) public Troves;

    uint256 public totalStakes;

    // Snapshot of the value of totalStakes, taken immediately after the latest liquidation
    uint256 public totalStakesSnapshot;

    // Snapshot of the total collateral across the ActivePool and DefaultPool, immediately after the latest liquidation.
    uint256 public totalCollateralSnapshot;

    /*
     * L_ETH and L_ZUSDDebt track the sums of accumulated liquidation rewards per unit staked. During its lifetime, each stake earns:
     *
     * An ETH gain of ( stake * [L_ETH - L_ETH(0)] )
     * A ZUSDDebt increase  of ( stake * [L_ZUSDDebt - L_ZUSDDebt(0)] )
     *
     * Where L_ETH(0) and L_ZUSDDebt(0) are snapshots of L_ETH and L_ZUSDDebt for the active Trove taken at the instant the stake was made
     */
    uint256 public L_ETH;
    uint256 public L_ZUSDDebt;

    // Map addresses with active troves to their RewardSnapshot
    mapping(address => RewardSnapshot) public rewardSnapshots;

    // Object containing the ETH and ZUSD snapshots for a given active trove
    struct RewardSnapshot {
        uint256 ETH;
        uint256 ZUSDDebt;
    }

    // Array of all active trove addresses - used to to compute an approximate hint off-chain, for the sorted list insertion
    address[] public TroveOwners;

    // Error trackers for the trove redistribution calculation
    uint256 public lastETHError_Redistribution;
    uint256 public lastZUSDDebtError_Redistribution;
}
