// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/ISortedLoCs.sol";


contract SortedLoCsTester {
    ISortedLoCs sortedLoCs;

    function setSortedLoCs(address _sortedLoCsAddress) external {
        sortedLoCs = ISortedLoCs(_sortedLoCsAddress);
    }

    function insert(address _id, uint256 _NICR, address _prevId, address _nextId) external {
        sortedLoCs.insert(_id, _NICR, _prevId, _nextId);
    }

    function remove(address _id) external {
        sortedLoCs.remove(_id);
    }

    function reInsert(address _id, uint256 _newNICR, address _prevId, address _nextId) external {
        sortedLoCs.reInsert(_id, _newNICR, _prevId, _nextId);
    }

    function getNominalICR(address) external pure returns (uint) {
        return 1;
    }

    function getCurrentICR(address, uint) external pure returns (uint) {
        return 1;
    }
}
