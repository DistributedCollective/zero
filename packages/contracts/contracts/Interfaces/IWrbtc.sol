/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.8.13;

import "../Dependencies/IERC20.sol";

interface IWrbtc is IERC20 {
	
	function deposit() external payable;

	function withdraw(uint256 wad) external;

}
