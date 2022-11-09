// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/ILoCManager.sol";
import "../Interfaces/ISortedLoCs.sol";
import "../Interfaces/IPriceFeed.sol";
import "../Dependencies/ZeroMath.sol";

/* Wrapper contract - used for calculating gas of read-only and internal functions. 
Not part of the Zero application. */
contract FunctionCaller {
    ILoCManager locManager;
    address public locManagerAddress;

    ISortedLoCs sortedLoCs;
    address public sortedLoCsAddress;

    IPriceFeed priceFeed;
    address public priceFeedAddress;

    // --- Dependency setters ---

    function setLoCManagerAddress(address _locManagerAddress) external {
        locManagerAddress = _locManagerAddress;
        locManager = ILoCManager(_locManagerAddress);
    }

    function setSortedLoCsAddress(address _sortedLoCsAddress) external {
        locManagerAddress = _sortedLoCsAddress;
        sortedLoCs = ISortedLoCs(_sortedLoCsAddress);
    }

    function setPriceFeedAddress(address _priceFeedAddress) external {
        priceFeedAddress = _priceFeedAddress;
        priceFeed = IPriceFeed(_priceFeedAddress);
    }

    // --- Non-view wrapper functions used for calculating gas ---

    function locManager_getCurrentICR(address _address, uint256 _price)
        external
        returns (uint256)
    {
        return locManager.getCurrentICR(_address, _price);
    }

    function sortedLoCs_findInsertPosition(
        uint256 _NICR,
        address _prevId,
        address _nextId
    ) external returns (address, address) {
        return sortedLoCs.findInsertPosition(_NICR, _prevId, _nextId);
    }
}
