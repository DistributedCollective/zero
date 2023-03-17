// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/ISortedTroves.sol";
import "./Interfaces/ITroveManager.sol";
import "./Interfaces/IBorrowerOperations.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/CheckContract.sol";
import "./Dependencies/console.sol";

contract SortedTrovesStorage is Ownable {
    string public constant NAME = "SortedTroves";

    address public borrowerOperationsAddress;

    ITroveManager public troveManager;

    // Information for a node in the list
    struct Node {
        bool exists;
        address nextId; // Id of next node (smaller NICR) in the list
        address prevId; // Id of previous node (larger NICR) in the list
    }

    // Information for the list
    struct Data {
        address head; // Head of the list. Also the node in the list with the largest NICR
        address tail; // Tail of the list. Also the node in the list with the smallest NICR
        uint256 maxSize; // Maximum size of the list
        uint256 size; // Current size of the list
        mapping(address => Node) nodes; // Track the corresponding ids for each node in the list
    }

    Data public data;
}
