// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "./UpgradableProxy.sol";
import "../DefaultPoolStorage.sol";

contract DefaultPoolProxy is UpgradableProxy, DefaultPoolStorage {}
