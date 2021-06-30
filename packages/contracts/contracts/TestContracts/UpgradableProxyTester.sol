
// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../Proxy/UpgradableProxy.sol";
contract Storage {
    uint someVar;
}

contract ProxiableContract is Storage {

    function getSomeVar() public view returns (uint) {
        return someVar;
    }

    function setSomeVar(uint value) public {
        someVar = value;
    }
}

contract Storage2 {
    address anotherVar;
}

contract ProxiableContract2 is ProxiableContract, Storage2 {

    function getAnotherVar() public view returns (address) {
        return anotherVar;
    }

    function setAnotherVar(address value) public {
        anotherVar = value;
    }
}

contract UpgradableProxyTester is UpgradableProxy, Storage {}
