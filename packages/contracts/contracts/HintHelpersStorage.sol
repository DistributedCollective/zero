// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "./Interfaces/ITroveManager.sol";
import "./Interfaces/ISortedTroves.sol";
import "./Dependencies/Ownable.sol";

contract HintHelpersStorage is Ownable {
    string constant public NAME = "HintHelpers";

    ISortedTroves public sortedTroves;
    ITroveManager public troveManager;

}
