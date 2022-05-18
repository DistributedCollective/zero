// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/contracts/contracts/Interfaces/ITroveManager.sol";

library LiquidationLib {
    modifier isContractAddress(address contractAddress) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        require(size > 0);
        _;
    }

    /// @notice Liquidates credit line of the borrower
    /// @dev Closes the trove if its ICR is lower than the minimum collateral ratio.
    /// @param borrowerAddress address of the borrower to be liquidated
    /// @param troveManagerContractAddress address of TroveManager contract
    function liquidateBorrower(address borrowerAddress, address troveManagerContractAddress)
        internal
        isContractAddress(troveManagerContractAddress)
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        troveManager.liquidate(borrowerAddress);
    }

    /// @notice Liquidates bad credit lines in the protocol
    /// @dev Closes a maximum number of n under-collateralized Troves,
    /// starting from the one with the lowest collateral ratio in the system, and moving upwards
    /// @param maxLiquidations address of the borrower to be liquidated
    /// @param troveManagerContractAddress address of TroveManager contract
    function liquidateBadPositions(address troveManagerContractAddress, uint256 maxLiquidations)
        internal
        isContractAddress(troveManagerContractAddress)
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        troveManager.liquidateTroves(maxLiquidations);
    }
}
