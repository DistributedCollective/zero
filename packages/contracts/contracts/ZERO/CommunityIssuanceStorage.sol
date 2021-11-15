// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/Ownable.sol";
import "../Interfaces/IZEROToken.sol";

contract CommunityIssuanceStorage is Ownable {
    // --- Data ---

    string constant public NAME = "CommunityIssuance";

    uint constant public SECONDS_IN_ONE_MINUTE = 60;

   /** The issuance factor F determines the curvature of the issuance curve.
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
    uint public constant ISSUANCE_FACTOR = 999998681227695000;

    /** 
    * The community ZERO supply cap is the starting balance of the Community Issuance contract.
    * It should be minted to this contract by ZEROToken, when the token is deployed.
    */
    uint public ZEROSupplyCap = 0;

    IZEROToken public zeroToken;

    address public communityPotAddress;

    // Address that will send the Zero tokens to distribute funds
    address public fundingWalletAddress;

    uint public totalZEROIssued;
    uint public deploymentTime;

}
