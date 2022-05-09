// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "./Interfaces/IFeeDistributor.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/LiquityMath.sol";
import "./FeeDistributorStorage.sol";

contract FeeDistributor is CheckContract, FeeDistributorStorage, IFeeDistributor {
    
    // --- Dependency setters ---

    function setAddresses(
        address _sovFeeCollectorAddress,
        address _zeroStakingAddress,
        address _borrowerOperationsAddress,
        address _troveManagerAddress,
        address _wrbtcAddress,
        address _zusdTokenAddress,
        address _activePoolAddress
    )
        external
        override
        onlyOwner
    {
        checkContract(_sovFeeCollectorAddress);
        checkContract(_zeroStakingAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_troveManagerAddress);
        checkContract(_wrbtcAddress);
        checkContract(_zusdTokenAddress);
        checkContract(_activePoolAddress);
        
        sovFeeCollector = IFeeSharingProxy(_sovFeeCollectorAddress);
        zeroStaking = IZEROStaking(_zeroStakingAddress);
        borrowerOperations = IBorrowerOperations(_borrowerOperationsAddress);
        troveManager = ITroveManager(_troveManagerAddress);
        wrbtc = IWrbtc(_wrbtcAddress);
        zusdToken = IZUSDToken(_zusdTokenAddress);
        activePoolAddress = _activePoolAddress;

        // Not entirely removing this as per request from @light
        FEE_TO_SOV_COLLECTOR = LiquityMath.DECIMAL_PRECISION; // 100%

        emit SOVFeeCollectorAddressChanged(_sovFeeCollectorAddress);
        emit ZeroStakingAddressChanged(_zeroStakingAddress);
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit WrbtcAddressChanged(_wrbtcAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit ActivePoolAddressSet(_activePoolAddress);
    }

    function setFeeToSOVCollector(uint256 FEE_TO_SOV_COLLECTOR_) public onlyOwner {
        FEE_TO_SOV_COLLECTOR = FEE_TO_SOV_COLLECTOR_;
    }

    function distributeFees() public override {
        require(msg.sender == address(borrowerOperations) || msg.sender == address(troveManager),"FeeDistributor: invalid caller");
        uint256 zusdtoDistribute = zusdToken.balanceOf(address(this));
        uint256 rbtcToDistribute = address(this).balance; 
        if(zusdtoDistribute != 0) {
            distributeZUSD(zusdtoDistribute);
        }
        if(rbtcToDistribute != 0) {
            distributeRBTC(rbtcToDistribute);
        }
    }

    function distributeZUSD(uint256 toDistribute) internal {
        // Send fee to the SOVFeeCollector address
        uint256 feeToSovCollector = toDistribute * FEE_TO_SOV_COLLECTOR / LiquityMath.DECIMAL_PRECISION;
        zusdToken.approve(address(sovFeeCollector), feeToSovCollector);
        sovFeeCollector.transferTokens(address(zusdToken), uint96(feeToSovCollector));

        // Send fee to ZERO staking contract
        uint256 feeToZeroStaking = toDistribute - feeToSovCollector;
        zusdToken.transfer(address(zeroStaking), feeToZeroStaking);
        zeroStaking.increaseF_ZUSD(feeToZeroStaking);

        emit ZUSDDistributed(toDistribute);

    }

    function distributeRBTC(uint256 toDistribute) internal {
        // Send fee to the SOVFeeCollector address
        uint256 feeToSovCollector = toDistribute * FEE_TO_SOV_COLLECTOR / LiquityMath.DECIMAL_PRECISION;
        wrbtc.deposit{value: feeToSovCollector}();
        wrbtc.approve(address(sovFeeCollector), feeToSovCollector);
        sovFeeCollector.transferTokens(address(wrbtc), uint96(feeToSovCollector));

        // Send the RBTC fee to the ZERO staking contract
        uint256 feeToZeroStaking = toDistribute - feeToSovCollector;
        (bool success, ) = address(zeroStaking).call{value: feeToZeroStaking}("");
        require(success, "FeeDistributor: sending RBTC failed");
        zeroStaking.increaseF_RBTC(feeToZeroStaking);

        emit RBTCistributed(toDistribute);
    } 

    function _requireCallerIsActivePool() internal view {
        require(msg.sender == activePoolAddress, "FeeDistributor: caller is not ActivePool");
    }

    receive() external payable {
        _requireCallerIsActivePool();
    }

}