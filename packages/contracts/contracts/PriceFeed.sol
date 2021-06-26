// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/IPriceFeed.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/PriceFeed/MocMedianizer.sol";
import "./Dependencies/PriceFeed/RskOracle.sol";

/*
 * PriceFeed for mainnet deployment, to be connected to MoC's  medianizer live rBTC:USD aggregator reference
 * contract, and RskOracle.
 *
 * The PriceFeed uses the medianizer as primary oracle, and RSK one as fallback.
 */
contract PriceFeed is Ownable, CheckContract, IPriceFeed {
    string public constant NAME = "PriceFeed";

    IExternalPriceFeed[2] priceFeeds;
    //MoCMedianizer public medianizer;
    //RskOracle public rskOracle;

    // The last good price seen from an oracle by Liquity
    uint256 public lastGoodPrice;

    event LastGoodPriceUpdated(uint256 _lastGoodPrice);
    event PriceFeedBroken(uint8 index);

    // --- Dependency setters ---

    function setAddresses(address _medianizer, address _rskOracle) external onlyOwner {
        checkContract(_medianizer);
        checkContract(_rskOracle);

        priceFeeds[0] = MoCMedianizer(_medianizer);
        priceFeeds[1] = RskOracle(_rskOracle);

        // Get an initial price from the Medianizer to serve as first reference for lastGoodPrice
        (uint256 medianizerPrice, bool medianizerSuccess) = priceFeeds[0].latestAnswer();
        require(medianizerSuccess, "PriceFeed: Medianizer must be working");

        _storePrice(medianizerPrice);

        _renounceOwnership();
    }

    // --- Functions ---

    /*
     * fetchPrice():
     * Returns the latest price obtained from the Oracle. Called by Liquity functions that require a current price.
     *
     * Also callable by anyone externally.
     *
     * Non-view function - it stores the last good price seen by Liquity.
     *
     * Uses a main oracle (MoC Medianizer) and a fallback oracle (Tellor) in case the Medianizer fails. If both fail,
     * it uses the last good price seen by Liquity.
     *
     */
    function fetchPrice() external override returns (uint256) {
        for (uint8 index = 0; index < 2; index++) {
            (uint256 price, bool success) = priceFeeds[index].latestAnswer();
            if (success) {
                _storePrice(price);
                return price;
            } else {
                emit PriceFeedBroken(index);
            }
        }
        return lastGoodPrice;
    }

    // --- Helper functions ---
    function _storePrice(uint256 _currentPrice) internal {
        lastGoodPrice = _currentPrice;
        emit LastGoodPriceUpdated(_currentPrice);
    }
}
