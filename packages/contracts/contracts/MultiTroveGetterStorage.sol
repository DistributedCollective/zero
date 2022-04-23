// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;
import "./TroveManager.sol";
import "./SortedTroves.sol";
import "./Dependencies/Ownable.sol";

contract MultiTroveGetterStorage is Ownable {

    TroveManager public troveManager; // XXX Troves missing from ITroveManager?
    ISortedTroves public sortedTroves;

}
