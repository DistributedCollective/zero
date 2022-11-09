// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/ILoCManager.sol";
import "./Interfaces/ISortedLoCs.sol";
import "./Dependencies/Ownable.sol";

contract HintHelpersStorage is Ownable {
    string constant public NAME = "HintHelpers";

    ISortedLoCs public sortedLoCs;
    ILoCManager public locManager;

}
