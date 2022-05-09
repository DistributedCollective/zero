
// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../Proxy/UpgradableProxy.sol";
contract Storage {
    uint256 someVar;
}

contract ProxiableContract is Storage {

    function getSomeVar() public view returns (uint) {
        return someVar;
    }

    function setSomeVar(uint256 value) public {
        someVar = value;
    }
}

contract Storage2 {
    uint256 anotherVar;
}

contract ProxiableContract2 is ProxiableContract, Storage2 {

    function getAnotherVar() public view returns (uint) {
        return anotherVar;
    }

    function setAnotherVar(uint256 value) public {
        anotherVar = value;
    }

    function mulVars() public view returns (uint) {
        return someVar * anotherVar;
    }
}

contract UpgradableProxyTester is UpgradableProxy, Storage {}
