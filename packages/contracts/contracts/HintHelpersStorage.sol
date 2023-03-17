// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/ITroveManager.sol";
import "./Interfaces/ISortedTroves.sol";
import "./Dependencies/Ownable.sol";

contract HintHelpersStorage is Ownable {
    string public constant NAME = "HintHelpers";

    ISortedTroves public sortedTroves;
    ITroveManager public troveManager;
}
