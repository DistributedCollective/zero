// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "./libraries/BorrowerLib.sol";
import "./libraries/TroveStatisticsLib.sol";

contract IntegrationExample {
    uint8 constant percentScale = 90;
    uint8 constant divider = 100;
    uint8 constant maxFeePercentage = 1;

    /// @notice Example integration function. This function opens a credit line with amount equal to 90% of the collateral value
    /// and withdraws the credit line to callers wallet
    /// @dev This function could be converted into a receive function once the SC SDK handles addresses of dependencies by itself
    /// NOTE: maxFeePercentage is hardoc
    function openCreditLine(address priceFeedAddress, address borrowerContractAddress)
        external
        payable
    {
        uint256 btcPrice = TroveStatisticsLib.getBtcPrice(priceFeedAddress);
        uint256 zusdAmount = ((btcPrice * msg.value) * percentScale) / divider;
        BorrowerLib.openCreditLineInZusd(maxFeePercentage, zusdAmount, borrowerContractAddress);
        BorrowerLib.withdrawZUSD(maxFeePercentage, zusdAmount, borrowerContractAddress);
    }
}
