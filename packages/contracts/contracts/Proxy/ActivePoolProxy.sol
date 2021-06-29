// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "./UpgradableProxy.sol";
import "../ActivePoolStorage.sol";

contract ActivePoolProxy is UpgradableProxy, ActivePoolStorage {}
