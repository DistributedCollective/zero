// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

// Common interface for the SortedTroves Doubly Linked List.
interface ISortedTroves {
    // --- Events ---

    event SortedTrovesAddressChanged(address _sortedDoublyLLAddress);
    event BorrowerOperationsAddressChanged(address _borrowerOperationsAddress);
    event NodeAdded(address _id, uint256 _NICR);
    event NodeRemoved(address _id);

    // --- Functions ---

    /**
     * @notice Called only once on init, to set addresses of other Zero contracts and size. Callable only by owner
     * @dev initializer function, checks addresses are contracts
     * @param _size max size of troves list
     * @param _TroveManagerAddress TroveManager contract address
     * @param _borrowerOperationsAddress BorrowerOperations contract address
     */
    function setParams(
        uint256 _size,
        address _TroveManagerAddress,
        address _borrowerOperationsAddress
    ) external;

    /**
     * @dev Add a node to the list
     * @param _id Node's id
     * @param _ICR Node's NICR
     * @param _prevId Id of previous node for the insert position
     * @param _nextId Id of next node for the insert position
     */
    function insert(
        address _id,
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external;

    /**
     * @dev Remove a node from the list
     * @param _id Node's id
     */
    function remove(address _id) external;

    /**
     * @dev Re-insert the node at a new position, based on its new NICR
     * @param _id Node's id
     * @param _newICR Node's new NICR
     * @param _prevId Id of previous node for the new insert position
     * @param _nextId Id of next node for the new insert position
     */
    function reInsert(
        address _id,
        uint256 _newICR,
        address _prevId,
        address _nextId
    ) external;

    /**
     * @dev Checks if the list contains a node
     * @param _id Node's id
     * @return true if list contains a node with given id
     */
    function contains(address _id) external view returns (bool);

    /**
     * @dev Checks if the list is full
     * @return true if list is full
     */
    function isFull() external view returns (bool);

    /**
     * @dev Checks if the list is empty
     * @return true if list is empty
     */
    function isEmpty() external view returns (bool);

    /**
     * @return list current size
     */
    function getSize() external view returns (uint256);

    /**
     * @return list max size
     */
    function getMaxSize() external view returns (uint256);

    /**
     * @return the first node in the list (node with the largest NICR)
     */
    function getFirst() external view returns (address);

    /**
     * @return the last node in the list (node with the smallest NICR)
     */
    function getLast() external view returns (address);

    /**
     * @param _id Node's id
     * @return the next node (with a smaller NICR) in the list for a given node
     */
    function getNext(address _id) external view returns (address);

    /**
     * @param _id Node's id
     * @return the previous node (with a larger NICR) in the list for a given node
     */
    function getPrev(address _id) external view returns (address);

    /**
     * @notice Check if a pair of nodes is a valid insertion point for a new node with the given NICR
     * @param _ICR Node's NICR
     * @param _prevId Id of previous node for the insert position
     * @param _nextId Id of next node for the insert position
     */
    function validInsertPosition(
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external view returns (bool);

    /**
     * @notice Find the insert position for a new node with the given NICR
     * @param _ICR Node's NICR
     * @param _prevId Id of previous node for the insert position
     * @param _nextId Id of next node for the insert position
     */
    function findInsertPosition(
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external view returns (address, address);
}
