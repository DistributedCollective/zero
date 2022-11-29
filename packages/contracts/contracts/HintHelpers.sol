// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "./Interfaces/ILoCManager.sol";
import "./Interfaces/ISortedLoCs.sol";
import "./Dependencies/ZeroBase.sol";
import "./Dependencies/CheckContract.sol";
import "./HintHelpersStorage.sol";

contract HintHelpers is ZeroBase, HintHelpersStorage, CheckContract {

    // --- Events ---

    event SortedLoCsAddressChanged(address _sortedLoCsAddress);
    event LoCManagerAddressChanged(address _locManagerAddress);

    // --- Dependency setters ---

    function setAddresses(
        address _zeroBaseParamsAddress,
        address _sortedLoCsAddress,
        address _locManagerAddress
    )
        external
        onlyOwner
    {
        checkContract(_zeroBaseParamsAddress);
        checkContract(_sortedLoCsAddress);
        checkContract(_locManagerAddress);

        zeroBaseParams = IZeroBaseParams(_zeroBaseParamsAddress);
        sortedLoCs = ISortedLoCs(_sortedLoCsAddress);
        locManager = ILoCManager(_locManagerAddress);

        emit SortedLoCsAddressChanged(_sortedLoCsAddress);
        emit LoCManagerAddressChanged(_locManagerAddress);

        
    }

    // --- Functions ---

    /** getRedemptionHints() - Helper function for finding the right hints to pass to redeemCollateral().
     *
     * It simulates a redemption of `_ZUSDamount` to figure out where the redemption sequence will start and what state the final LoC
     * of the sequence will end up in.
     *
     * Returns three hints:
     *  - `firstRedemptionHint` is the address of the first LoC with ICR >= MCR (i.e. the first LoC that will be redeemed).
     *  - `partialRedemptionHintNICR` is the final nominal ICR of the last LoC of the sequence after being hit by partial redemption,
     *     or zero in case of no partial redemption.
     *  - `truncatedZUSDamount` is the maximum amount that can be redeemed out of the the provided `_ZUSDamount`. This can be lower than
     *    `_ZUSDamount` when redeeming the full amount would leave the last LoC of the redemption sequence with less net debt than the
     *    minimum allowed value (i.e. MIN_NET_DEBT).
     *
     * The number of LoCs to consider for redemption can be capped by passing a non-zero value as `_maxIterations`, while passing zero
     * will leave it uncapped.
     */

    function getRedemptionHints(
        uint _ZUSDamount, 
        uint _price,
        uint _maxIterations
    )
        external
        view
        returns (
            address firstRedemptionHint,
            uint partialRedemptionHintNICR,
            uint truncatedZUSDamount
        )
    {
        ISortedLoCs sortedLoCsCached = sortedLoCs;

        uint remainingZUSD = _ZUSDamount;
        address currentLoCuser = sortedLoCsCached.getLast();

        while (currentLoCuser != address(0) && locManager.getCurrentICR(currentLoCuser, _price) < zeroBaseParams.MCR()) {
            currentLoCuser = sortedLoCsCached.getPrev(currentLoCuser);
        }

        firstRedemptionHint = currentLoCuser;

        if (_maxIterations == 0) {
            _maxIterations = uint(-1);
        }

        while (currentLoCuser != address(0) && remainingZUSD > 0 && _maxIterations-- > 0) {
            uint netZUSDDebt = _getNetDebt(locManager.getLoCDebt(currentLoCuser))
                .add(locManager.getPendingZUSDDebtReward(currentLoCuser));

            if (netZUSDDebt > remainingZUSD) {
                if (netZUSDDebt > MIN_NET_DEBT) {
                    uint maxRedeemableZUSD = ZeroMath._min(remainingZUSD, netZUSDDebt.sub(MIN_NET_DEBT));

                    uint BTC = locManager.getLoCColl(currentLoCuser)
                        .add(locManager.getPendingBTCReward(currentLoCuser));

                    uint newColl = BTC.sub(maxRedeemableZUSD.mul(DECIMAL_PRECISION).div(_price));
                    uint newDebt = netZUSDDebt.sub(maxRedeemableZUSD);

                    uint compositeDebt = _getCompositeDebt(newDebt);
                    partialRedemptionHintNICR = ZeroMath._computeNominalCR(newColl, compositeDebt);

                    remainingZUSD = remainingZUSD.sub(maxRedeemableZUSD);
                }
                break;
            } else {
                remainingZUSD = remainingZUSD.sub(netZUSDDebt);
            }

            currentLoCuser = sortedLoCsCached.getPrev(currentLoCuser);
        }

        truncatedZUSDamount = _ZUSDamount.sub(remainingZUSD);
    }

    /** getApproxHint() - return address of a LoC that is, on average, (length / numTrials) positions away in the 
    sortedLoCs list from the correct insert position of the LoC to be inserted. 
    
    Note: The output address is worst-case O(n) positions away from the correct insert position, however, the function 
    is probabilistic. Input can be tuned to guarantee results to a high degree of confidence, e.g:

    Submitting numTrials = k * sqrt(length), with k = 15 makes it very, very likely that the ouput address will 
    be <= sqrt(length) positions away from the correct insert position.
    */
    function getApproxHint(uint _CR, uint _numTrials, uint _inputRandomSeed)
        external
        view
        returns (address hintAddress, uint diff, uint latestRandomSeed)
    {
        uint arrayLength = locManager.getLoCOwnersCount();

        if (arrayLength == 0) {
            return (address(0), 0, _inputRandomSeed);
        }

        hintAddress = sortedLoCs.getLast();
        diff = ZeroMath._getAbsoluteDifference(_CR, locManager.getNominalICR(hintAddress));
        latestRandomSeed = _inputRandomSeed;

        uint i = 1;

        while (i < _numTrials) {
            latestRandomSeed = uint(keccak256(abi.encodePacked(latestRandomSeed)));

            uint arrayIndex = latestRandomSeed % arrayLength;
            address currentAddress = locManager.getLoCFromLoCOwnersArray(arrayIndex);
            uint currentNICR = locManager.getNominalICR(currentAddress);

            // check if abs(current - CR) > abs(closest - CR), and update closest if current is closer
            uint currentDiff = ZeroMath._getAbsoluteDifference(currentNICR, _CR);

            if (currentDiff < diff) {
                diff = currentDiff;
                hintAddress = currentAddress;
            }
            i++;
        }
    }

    function computeNominalCR(uint _coll, uint _debt) external pure returns (uint) {
        return ZeroMath._computeNominalCR(_coll, _debt);
    }

    function computeCR(uint _coll, uint _debt, uint _price) external pure returns (uint) {
        return ZeroMath._computeCR(_coll, _debt, _price);
    }
}
