// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

/**
 * @title Interface of The Price Feeds Sovryn contract.
 *
 * @notice This contract is the interface of priceFeed that is being used as PriceFeed registry in sovryn protocol.
 *
 * This contract queries the price feeds contracts where
 * oracles updates token prices computing relative token prices.
 * And besides it includes some calculations about loans such as
 * drawdown, margin and collateral.
 * */
interface IPriceFeedSovryn {
    function queryRate(address sourceToken, address destToken)
        external
        view
        returns (uint256 rate, uint256 precision);

    function queryPrecision(address sourceToken, address destToken)
        external
        view
        returns (uint256 precision);

    function queryReturn(
        address sourceToken,
        address destToken,
        uint256 sourceAmount
    ) external view returns (uint256 destAmount);

    function checkPriceDisagreement(
        address sourceToken,
        address destToken,
        uint256 sourceAmount,
        uint256 destAmount,
        uint256 maxSlippage
    ) external view returns (uint256 sourceToDestSwapRate);

    function amountInEth(address Token, uint256 amount) external view returns (uint256 ethAmount);

    function getMaxDrawdown(
        address loanToken,
        address collateralToken,
        uint256 loanAmount,
        uint256 collateralAmount,
        uint256 maintenanceMargin
    ) external view returns (uint256);

    function getCurrentMarginAndCollateralSize(
        address loanToken,
        address collateralToken,
        uint256 loanAmount,
        uint256 collateralAmount
    ) external view returns (uint256 currentMargin, uint256 collateralInEthAmount);

    function getCurrentMargin(
        address loanToken,
        address collateralToken,
        uint256 loanAmount,
        uint256 collateralAmount
    ) external view returns (uint256 currentMargin, uint256 collateralToLoanRate);

    function shouldLiquidate(
        address loanToken,
        address collateralToken,
        uint256 loanAmount,
        uint256 collateralAmount,
        uint256 maintenanceMargin
    ) external view returns (bool);

    function getFastGasPrice(address payToken) external view returns (uint256);
}
