// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../Dependencies/LiquityMath.sol";
import "../Dependencies/IERC20.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "../Interfaces/ITroveManager.sol";
import "../Interfaces/IStabilityPool.sol";
import "../Interfaces/IPriceFeed.sol";
import "../Interfaces/IZEROStaking.sol";
import "./BorrowerOperationsScript.sol";
import "./RBTCTransferScript.sol";
import "./ZEROStakingScript.sol";
import "../Dependencies/console.sol";


contract BorrowerWrappersScript is BorrowerOperationsScript, RBTCTransferScript, ZEROStakingScript {
    
    string constant public NAME = "BorrowerWrappersScript";

    ITroveManager immutable troveManager;
    IStabilityPool immutable stabilityPool;
    IPriceFeed immutable priceFeed;
    IERC20 immutable zusdToken;
    IERC20 immutable zeroToken;
    IZEROStaking immutable zeroStaking;

    constructor(
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _zeroStakingAddress,
        address _stabilityPoolAddress,
        address _priceFeedAddress,
        address _zusdTokenAddress,
        address _zeroTokenAddress
    )
        BorrowerOperationsScript(IBorrowerOperations(_borrowerOperationsAddress))
        ZEROStakingScript(_zeroStakingAddress)
    {
        checkContract(_troveManagerAddress);
        ITroveManager troveManagerCached = ITroveManager(_troveManagerAddress);
        troveManager = troveManagerCached;

        IStabilityPool stabilityPoolCached = IStabilityPool(_stabilityPoolAddress);
        checkContract(_stabilityPoolAddress);
        stabilityPool = stabilityPoolCached;

        IPriceFeed priceFeedCached = IPriceFeed(_priceFeedAddress); 
        checkContract(_priceFeedAddress);
        priceFeed = priceFeedCached;

        checkContract(_zusdTokenAddress);
        zusdToken = IERC20(_zusdTokenAddress);

        checkContract(_zeroTokenAddress);
        zeroToken = IERC20(_zeroTokenAddress);

        IZEROStaking zeroStakingCached = IZEROStaking(_zeroStakingAddress);
        checkContract(_zeroStakingAddress);
        zeroStaking = zeroStakingCached;
    }

    function claimCollateralAndOpenTrove(uint256 _maxFee, uint256 _ZUSDAmount, address _upperHint, address _lowerHint) external payable {
        uint256 balanceBefore = address(this).balance;

        // Claim collateral
        borrowerOperations.claimCollateral();

        uint256 balanceAfter = address(this).balance;

        // already checked in CollSurplusPool
        assert(balanceAfter > balanceBefore);

        uint256 totalCollateral = balanceAfter - balanceBefore + msg.value;

        // Open trove with obtained collateral, plus collateral sent by user
        borrowerOperations.openTrove{ value: totalCollateral }(_maxFee, _ZUSDAmount, _upperHint, _lowerHint);
    }

    function claimSPRewardsAndRecycle(uint256 _maxFee, address _upperHint, address _lowerHint) external {
        uint256 collBalanceBefore = address(this).balance;
        uint256 zeroBalanceBefore = zeroToken.balanceOf(address(this));

        // Claim rewards
        stabilityPool.withdrawFromSP(0);

        uint256 collBalanceAfter = address(this).balance;
        uint256 zeroBalanceAfter = zeroToken.balanceOf(address(this));
        uint256 claimedCollateral = collBalanceAfter - collBalanceBefore;

        // Add claimed RBTC to trove, get more ZUSD and stake it into the Stability Pool
        if (claimedCollateral > 0) {
            _requireUserHasTrove(address(this));
            uint256 ZUSDAmount = _getNetZUSDAmount(claimedCollateral);
            borrowerOperations.adjustTrove{ value: claimedCollateral }(_maxFee, 0, ZUSDAmount, true, _upperHint, _lowerHint);
            // Provide withdrawn ZUSD to Stability Pool
            if (ZUSDAmount > 0) {
                stabilityPool.provideToSP(ZUSDAmount, address(0));
            }
        }

        // Stake claimed ZERO
        uint256 claimedZERO = zeroBalanceAfter - zeroBalanceBefore;
        if (claimedZERO > 0) {
            zeroStaking.stake(claimedZERO);
        }
    }

    function claimStakingGainsAndRecycle(uint256 _maxFee, address _upperHint, address _lowerHint) external {
        uint256 collBalanceBefore = address(this).balance;
        uint256 zusdBalanceBefore = zusdToken.balanceOf(address(this));
        uint256 zeroBalanceBefore = zeroToken.balanceOf(address(this));

        // Claim gains
        zeroStaking.unstake(0);

        uint256 gainedCollateral = address(this).balance - collBalanceBefore; // stack too deep issues :'(
        uint256 gainedZUSD = zusdToken.balanceOf(address(this)) - zusdBalanceBefore;

        uint256 netZUSDAmount;
        // Top up trove and get more ZUSD, keeping ICR constant
        if (gainedCollateral > 0) {
            _requireUserHasTrove(address(this));
            netZUSDAmount = _getNetZUSDAmount(gainedCollateral);
            borrowerOperations.adjustTrove{ value: gainedCollateral }(_maxFee, 0, netZUSDAmount, true, _upperHint, _lowerHint);
        }

        uint256 totalZUSD = gainedZUSD + netZUSDAmount;
        if (totalZUSD > 0) {
            stabilityPool.provideToSP(totalZUSD, address(0));

            // Providing to Stability Pool also triggers ZERO claim, so stake it if any
            uint256 zeroBalanceAfter = zeroToken.balanceOf(address(this));
            uint256 claimedZERO = zeroBalanceAfter - zeroBalanceBefore;
            if (claimedZERO > 0) {
                zeroStaking.stake(claimedZERO);
            }
        }

    }

    function _getNetZUSDAmount(uint256 _collateral) internal returns (uint) {
        uint256 price = priceFeed.fetchPrice();
        uint256 ICR = troveManager.getCurrentICR(address(this), price);

        uint256 ZUSDAmount = _collateral * price / ICR;
        uint256 borrowingRate = troveManager.getBorrowingRateWithDecay();
        uint256 netDebt = ZUSDAmount * LiquityMath.DECIMAL_PRECISION / (LiquityMath.DECIMAL_PRECISION + borrowingRate);

        return netDebt;
    }

    function _requireUserHasTrove(address _depositor) internal view {
        require(troveManager.getTroveStatus(_depositor) == 1, "BorrowerWrappersScript: caller must have an active trove");
    }
}
