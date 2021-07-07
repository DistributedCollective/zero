// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/Ownable.sol";
import "../Interfaces/ILQTYToken.sol";

contract CommunityIssuanceStorage is Ownable {
    // --- Data ---

    string constant public NAME = "CommunityIssuance";

    uint constant public SECONDS_IN_ONE_MINUTE = 60;

   /* The issuance factor F determines the curvature of the issuance curve.
    *
    * Minutes in one year: 60*24*365 = 525600
    *
    * For 50% of remaining tokens issued each year, with minutes as time units, we have:
    * 
    * F ** 525600 = 0.5
    * 
    * Re-arranging:
    * 
    * 525600 * ln(F) = ln(0.5)
    * F = 0.5 ** (1/525600)
    * F = 0.999998681227695000 
    */
    uint public ISSUANCE_FACTOR = 999998681227695000;

    /* 
    * The community LQTY supply cap is the starting balance of the Community Issuance contract.
    * It should be minted to this contract by LQTYToken, when the token is deployed.
    * 
    * Set to 32M (slightly less than 1/3) of total LQTY supply.
    */
    uint public LQTYSupplyCap = 32e24; // 32 million

    ILQTYToken public lqtyToken;

    address public stabilityPoolAddress;

    uint public totalLQTYIssued;
    uint public deploymentTime;

}
