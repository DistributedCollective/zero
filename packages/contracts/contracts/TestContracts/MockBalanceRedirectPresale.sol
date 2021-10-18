// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;


contract MockBalanceRedirectPresale  {

    bool public isClosed;

    function closePresale() public {
        isClosed = true;
    }

    function openPresale() public {
        isClosed = false;
    }
}