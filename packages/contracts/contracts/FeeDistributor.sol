// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/LiquityMath.sol";
import "./FeeDistributorStorage.sol";
import "./Dependencies/SafeMath.sol";

contract FeeDistributor is CheckContract, FeeDistributorStorage, IFeeDistributor {
    using SafeMath for uint256;
    // --- Events ---

    event FeeSharingCollectorAddressChanged(address _feeSharingCollectorAddress);
    event ZeroStakingAddressChanged(address _zeroStakingAddress);
    event BorrowerOperationsAddressChanged(address _borrowerOperationsAddress);
    event TroveManagerAddressChanged(address _troveManagerAddress);
    event WrbtcAddressChanged(address _wrbtcAddress);
    event ZUSDTokenAddressChanged(address _zusdTokenAddress);
    event ActivePoolAddressSet(address _activePoolAddress);

    event ZUSDDistributed(uint256 _zusdDistributedAmount);
    event RBTCistributed(uint256 _rbtcDistributedAmount);

    // --- Dependency setters ---

    function setAddresses(
        address _feeSharingCollectorAddress,
        address _zeroStakingAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _wrbtcAddress,
        address _zusdTokenAddress,
        address _activePoolAddress
    ) external override onlyOwner {
        checkContract(_feeSharingCollectorAddress);
        checkContract(_zeroStakingAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_wrbtcAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_activePoolAddress);

        feeSharingCollector = IFeeSharingCollector(_feeSharingCollectorAddress);
        zeroStaking = IZEROStaking(_zeroStakingAddress);
        borrowerOperations = IBorrowerOperations(_borrowerOperationsAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        wrbtc = IWrbtc(_wrbtcAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        activePoolAddress = _activePoolAddress;

        // Not entirely removing this as per request from @light
        FEE_TO_FEE_SHARING_COLLECTOR = LiquityMath.DECIMAL_PRECISION; // 100%

        emit FeeSharingCollectorAddressChanged(_feeSharingCollectorAddress);
        emit ZeroStakingAddressChanged(_zeroStakingAddress);
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit WrbtcAddressChanged(_wrbtcAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit ActivePoolAddressSet(_activePoolAddress);
    }

    function setFeeToFeeSharingCollector(uint256 FEE_TO_FEE_SHARING_COLLECTOR_) public onlyOwner {
        FEE_TO_FEE_SHARING_COLLECTOR = FEE_TO_FEE_SHARING_COLLECTOR_;
    }

    function distributeFees() public override {
        require(
            msg.sender == address(borrowerOperations) || msg.sender == address(troveManager),
            "FeeDistributor: invalid caller"
        );
        uint256 zusdtoDistribute = zusdToken.balanceOf(address(this));
        uint256 rbtcToDistribute = address(this).balance;
        if (zusdtoDistribute != 0) {
            _distributeZUSD(zusdtoDistribute);
        }
        if (rbtcToDistribute != 0) {
            _distributeRBTC(rbtcToDistribute);
        }
    }

    function _distributeZUSD(uint256 toDistribute) internal {
        // Send fee to the FeeSharingCollector address
        uint256 feeToFeeSharingCollector = toDistribute.mul(FEE_TO_FEE_SHARING_COLLECTOR).div(
            LiquityMath.DECIMAL_PRECISION
        );
        zusdToken.approve(address(feeSharingCollector), feeToFeeSharingCollector);

        feeSharingCollector.transferTokens(address(zusdToken), uint96(feeToFeeSharingCollector));
        // Send fee to ZERO staking contract
        uint256 feeToZeroStaking = toDistribute.sub(feeToFeeSharingCollector);
        if (feeToZeroStaking != 0) {
            require(
                zusdToken.transfer(address(zeroStaking), feeToZeroStaking),
                "Coudn't execute ZUSD transfer"
            );
            zeroStaking.increaseF_ZUSD(feeToZeroStaking);
        }
        emit ZUSDDistributed(toDistribute);
    }

    function _distributeRBTC(uint256 toDistribute) internal {
        // Send fee to the feeSharingCollector address
        uint256 feeToFeeSharingCollector = toDistribute.mul(FEE_TO_FEE_SHARING_COLLECTOR).div(
            LiquityMath.DECIMAL_PRECISION
        );

        feeSharingCollector.transferRBTC{ value: feeToFeeSharingCollector }();

        // Send the ETH fee to the ZERO staking contract
        uint256 feeToZeroStaking = toDistribute.sub(feeToFeeSharingCollector);
        if (feeToZeroStaking != 0) {
            (bool success, ) = address(zeroStaking).call{ value: feeToZeroStaking }("");
            require(success, "FeeDistributor: sending ETH failed");
            zeroStaking.increaseF_ETH(feeToZeroStaking);
        }
        emit RBTCistributed(toDistribute);
    }

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "FeeDistributor: caller is not ActivePool");
    }

    receive() external payable {
        _requireCallerIsActivePool();
    }
}
