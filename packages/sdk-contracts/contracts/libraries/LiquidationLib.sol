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

    function liquidateBorrower(address borrowerAddress, address troveManagerContractAddress)
        internal
        isContractAddress(troveManagerContractAddress)
    {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        troveManager.liquidate(borrowerAddress);
    }

    function liquidateBadPositions(
        address borrowerAddress,
        address troveManagerContractAddress,
        uint256 maxLiquidations
    ) internal isContractAddress(troveManagerContractAddress) {
        ITroveManager troveManager = ITroveManager(troveManagerContractAddress);
        troveManager.liquidateTroves(maxLiquidations);
    }
}
