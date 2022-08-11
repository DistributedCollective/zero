# Integration Example
This is the sample integration code on how we open the credit line.
In this example, it used 90% of the collateral value (RBTC), and then withdraw the credit line to the callers wallet.
The maximum fee tolerance to open the credit line is set to 1%.
All of the configuration number is hardcoded to constant only for example purposes.

#### Sample Code

```javascript
// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "@sovryn-zero/sdk-contracts/contracts/libraries/BorrowerLib.sol";
import "@sovryn-zero/sdk-contracts/contracts/libraries/TroveStatisticsLib.sol";

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
```