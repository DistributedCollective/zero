// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "./LoCManager.sol";
import "./SortedLoCs.sol";
import "./MultiLoCGetterStorage.sol";

/**  Helper contract for grabbing LoC data for the front end. Not part of the core Zero system. */
contract MultiLoCGetter is MultiLoCGetterStorage {
    struct CombinedLoCData {
        address owner;
        uint256 debt;
        uint256 coll;
        uint256 stake;
        uint256 snapshotBTC;
        uint256 snapshotZUSDDebt;
    }

    function setAddresses(LoCManager _locManager, ISortedLoCs _sortedLoCs) public onlyOwner {
        locManager = _locManager;
        sortedLoCs = _sortedLoCs;
    }

    function getMultipleSortedLoCs(int256 _startIdx, uint256 _count)
        external
        view
        returns (CombinedLoCData[] memory _locs)
    {
        uint256 startIdx;
        bool descend;

        if (_startIdx >= 0) {
            startIdx = uint256(_startIdx);
            descend = true;
        } else {
            startIdx = uint256(-(_startIdx + 1));
            descend = false;
        }

        uint256 sortedLoCsSize = sortedLoCs.getSize();

        if (startIdx >= sortedLoCsSize) {
            _locs = new CombinedLoCData[](0);
        } else {
            uint256 maxCount = sortedLoCsSize - startIdx;

            if (_count > maxCount) {
                _count = maxCount;
            }

            if (descend) {
                _locs = _getMultipleSortedLoCsFromHead(startIdx, _count);
            } else {
                _locs = _getMultipleSortedLoCsFromTail(startIdx, _count);
            }
        }
    }

    function _getMultipleSortedLoCsFromHead(uint256 _startIdx, uint256 _count)
        internal
        view
        returns (CombinedLoCData[] memory _locs)
    {
        address currentLoCowner = sortedLoCs.getFirst();

        for (uint256 idx = 0; idx < _startIdx; ++idx) {
            currentLoCowner = sortedLoCs.getNext(currentLoCowner);
        }

        _locs = new CombinedLoCData[](_count);

        for (uint256 idx = 0; idx < _count; ++idx) {
            _locs[idx].owner = currentLoCowner;
            (
                _locs[idx].debt,
                _locs[idx].coll,
                _locs[idx].stake,
                /* status */
                /* arrayIndex */
                ,

            ) = locManager.LoCs(currentLoCowner);
            (_locs[idx].snapshotBTC, _locs[idx].snapshotZUSDDebt) = locManager.rewardSnapshots(
                currentLoCowner
            );

            currentLoCowner = sortedLoCs.getNext(currentLoCowner);
        }
    }

    function _getMultipleSortedLoCsFromTail(uint256 _startIdx, uint256 _count)
        internal
        view
        returns (CombinedLoCData[] memory _locs)
    {
        address currentLoCowner = sortedLoCs.getLast();

        for (uint256 idx = 0; idx < _startIdx; ++idx) {
            currentLoCowner = sortedLoCs.getPrev(currentLoCowner);
        }

        _locs = new CombinedLoCData[](_count);

        for (uint256 idx = 0; idx < _count; ++idx) {
            _locs[idx].owner = currentLoCowner;
            (
                _locs[idx].debt,
                _locs[idx].coll,
                _locs[idx].stake,
                /* status */
                /* arrayIndex */
                ,

            ) = locManager.LoCs(currentLoCowner);
            (_locs[idx].snapshotBTC, _locs[idx].snapshotZUSDDebt) = locManager.rewardSnapshots(
                currentLoCowner
            );

            currentLoCowner = sortedLoCs.getPrev(currentLoCowner);
        }
    }
}
