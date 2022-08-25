// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/contracts/contracts/Interfaces/IStabilityPool.sol";

/// @title ZERO-SDK Liquidation Lib
/// @notice Library containing basic operations regarding ZERO Stability Pool
library StabilityPoolLib {
    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    /// @notice Adds the corresponding amount of ZERO to stability pool
    /// @param _amount amount of ZUSD to be deposited
    /// @param _stabilityPoolAddress address of Stability Pool Contract
    function provideToSP(uint256 _amount, address _stabilityPoolAddress)
        internal
        isContractAddress(_stabilityPoolAddress)
    {
        IStabilityPool stabilityPool = IStabilityPool(_stabilityPoolAddress);
        stabilityPool.provideToSP(_amount, address(0));
    }

    /// @notice Withdraws the corresponding amount of ZERO from stability pool
    /// @param _amount amount of ZUSD to be withdrawn
    /// @param _stabilityPoolAddress address of Stability Pool Contract
    function withdrawFromSP(uint256 _amount, address _stabilityPoolAddress)
        internal
        isContractAddress(_stabilityPoolAddress)
    {
        IStabilityPool stabilityPool = IStabilityPool(_stabilityPoolAddress);
        stabilityPool.withdrawFromSP(_amount);
    }

    /// @notice Withdraws all gains from the stability pool and adds them as a collateral to the credit line
    /// @param _stabilityPoolAddress address of Stability Pool Contract
    function withdrawRBTCGainToTrove(address _stabilityPoolAddress)
        internal
        isContractAddress(_stabilityPoolAddress)
    {
        IStabilityPool stabilityPool = IStabilityPool(_stabilityPoolAddress);
        stabilityPool.withdrawETHGainToTrove(msg.sender, msg.sender);
    }
}
