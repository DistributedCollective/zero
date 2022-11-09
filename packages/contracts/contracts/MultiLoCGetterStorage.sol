// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "./LoCManager.sol";
import "./SortedLoCs.sol";
import "./Dependencies/Ownable.sol";

contract MultiLoCGetterStorage is Ownable {

    LoCManager public locManager; // XXX LoCs missing from ILoCManager?
    ISortedLoCs public sortedLoCs;

}
