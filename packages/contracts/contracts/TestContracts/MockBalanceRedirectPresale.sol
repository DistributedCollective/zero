// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;


contract MockBalanceRedirectPresale  {

    bool public isClosed;

    function closePresale() public {
        isClosed = true;
    }

    function openPresale() public {
        isClosed = false;
    }
}