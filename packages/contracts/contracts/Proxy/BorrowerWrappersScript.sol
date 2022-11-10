// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/SafeMath.sol";
import "../Dependencies/ZeroMath.sol";
import "../Dependencies/IERC20.sol";
import "../Interfaces/IBorrowerOperations.sol";
import "../Interfaces/ILoCManager.sol";
import "../Interfaces/IStabilityPool.sol";
import "../Interfaces/IPriceFeed.sol";
import "../Interfaces/IZEROStaking.sol";
import "./BorrowerOperationsScript.sol";
import "./BTCTransferScript.sol";
import "./ZEROStakingScript.sol";
import "../Dependencies/console.sol";


contract BorrowerWrappersScript is BorrowerOperationsScript, BTCTransferScript, ZEROStakingScript {
    using SafeMath for uint;

    string constant public NAME = "BorrowerWrappersScript";

    ILoCManager immutable locManager;
    IStabilityPool immutable stabilityPool;
    IPriceFeed immutable priceFeed;
    IERC20 immutable zusdToken;
    IERC20 immutable zeroToken;
    IZEROStaking immutable zeroStaking;

    constructor(
        address _borrowerOperationsAddress,
        address _locManagerAddress,
        address _zeroStakingAddress,
        address _stabilityPoolAddress,
        address _priceFeedAddress,
        address _zusdTokenAddress,
        address _zeroTokenAddress
    )
        BorrowerOperationsScript(IBorrowerOperations(_borrowerOperationsAddress))
        ZEROStakingScript(_zeroStakingAddress)
        public
    {
        checkContract(_locManagerAddress);
        ILoCManager locManagerCached = ILoCManager(_locManagerAddress);
        locManager = locManagerCached;

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

    function claimCollateralAndOpenLoC(uint _maxFee, uint _ZUSDAmount, address _upperHint, address _lowerHint) external payable {
        uint balanceBefore = address(this).balance;

        // Claim collateral
        borrowerOperations.claimCollateral();

        uint balanceAfter = address(this).balance;

        // already checked in CollSurplusPool
        assert(balanceAfter > balanceBefore);

        uint totalCollateral = balanceAfter.sub(balanceBefore).add(msg.value);

        // Open LoC with obtained collateral, plus collateral sent by user
        borrowerOperations.openLoC{ value: totalCollateral }(_maxFee, _ZUSDAmount, _upperHint, _lowerHint);
    }

    function claimSPRewardsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = address(this).balance;
        uint zeroBalanceBefore = zeroToken.balanceOf(address(this));

        // Claim rewards
        stabilityPool.withdrawFromSP(0);

        uint collBalanceAfter = address(this).balance;
        uint zeroBalanceAfter = zeroToken.balanceOf(address(this));
        uint claimedCollateral = collBalanceAfter.sub(collBalanceBefore);

        // Add claimed BTC to loc, get more ZUSD and stake it into the Stability Pool
        if (claimedCollateral > 0) {
            _requireUserHasLoC(address(this));
            uint ZUSDAmount = _getNetZUSDAmount(claimedCollateral);
            borrowerOperations.adjustLoC{ value: claimedCollateral }(_maxFee, 0, ZUSDAmount, true, _upperHint, _lowerHint);
            // Provide withdrawn ZUSD to Stability Pool
            if (ZUSDAmount > 0) {
                stabilityPool.provideToSP(ZUSDAmount, address(0));
            }
        }

        // Stake claimed ZERO
        uint claimedZERO = zeroBalanceAfter.sub(zeroBalanceBefore);
        if (claimedZERO > 0) {
            zeroStaking.stake(claimedZERO);
        }
    }

    function claimStakingGainsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
        uint collBalanceBefore = address(this).balance;
        uint zusdBalanceBefore = zusdToken.balanceOf(address(this));
        uint zeroBalanceBefore = zeroToken.balanceOf(address(this));

        // Claim gains
        zeroStaking.unstake(0);

        uint gainedCollateral = address(this).balance.sub(collBalanceBefore); // stack too deep issues :'(
        uint gainedZUSD = zusdToken.balanceOf(address(this)).sub(zusdBalanceBefore);

        uint netZUSDAmount;
        // Top up LoC and get more ZUSD, keeping ICR constant
        if (gainedCollateral > 0) {
            _requireUserHasLoC(address(this));
            netZUSDAmount = _getNetZUSDAmount(gainedCollateral);
            borrowerOperations.adjustLoC{ value: gainedCollateral }(_maxFee, 0, netZUSDAmount, true, _upperHint, _lowerHint);
        }

        uint totalZUSD = gainedZUSD.add(netZUSDAmount);
        if (totalZUSD > 0) {
            stabilityPool.provideToSP(totalZUSD, address(0));

            // Providing to Stability Pool also triggers ZERO claim, so stake it if any
            uint zeroBalanceAfter = zeroToken.balanceOf(address(this));
            uint claimedZERO = zeroBalanceAfter.sub(zeroBalanceBefore);
            if (claimedZERO > 0) {
                zeroStaking.stake(claimedZERO);
            }
        }

    }

    function _getNetZUSDAmount(uint _collateral) internal returns (uint) {
        uint price = priceFeed.fetchPrice();
        uint ICR = locManager.getCurrentICR(address(this), price);

        uint ZUSDAmount = _collateral.mul(price).div(ICR);
        uint originationRate = locManager.getOriginationRateWithDecay();
        uint netDebt = ZUSDAmount.mul(ZeroMath.DECIMAL_PRECISION).div(ZeroMath.DECIMAL_PRECISION.add(originationRate));

        return netDebt;
    }

    function _requireUserHasLoC(address _depositor) internal view {
        require(locManager.getLoCStatus(_depositor) == 1, "BorrowerWrappersScript: caller must have an active loc");
    }
}
