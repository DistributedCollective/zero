pragma solidity ^0.5.16;

import './Interfaces/IStabilityPool.sol';
import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/console.sol";

contract StabilityPool is Ownable, IStabilityPool {
    using SafeMath for uint256;

    address public poolManagerAddress;
    address public defaultPoolAddress;
    address public activePoolAddress;
    uint256 public ETH;  // deposited ether tracker
    
    // Total CLV held in the pool. Changes when users deposit/withdraw, and when CDP debt is offset.
    uint256 public totalCLVDeposits; 

    constructor() public {}

    // --- Contract setters ---

    function setPoolManagerAddress(address _poolManagerAddress) public onlyOwner {
        poolManagerAddress = _poolManagerAddress;
        emit PoolManagerAddressChanged(poolManagerAddress);
    }

    function setActivePoolAddress(address _activePoolAddress) public onlyOwner {
        activePoolAddress = _activePoolAddress;
        emit ActivePoolAddressChanged(activePoolAddress);
    }
    
    function setDefaultPoolAddress(address _defaultPoolAddress) public onlyOwner {
        defaultPoolAddress = _defaultPoolAddress; 
        emit DefaultPoolAddressChanged(defaultPoolAddress);
    }

    // --- Getters for public variables. Required by IPool interface ---

    function getETH() public view returns(uint) {
        return ETH;
    }

    function getCLV() public view returns(uint) {
        return totalCLVDeposits;
    }

    // --- Pool functionality ---

    function sendETH(address _account, uint _amount) public onlyPoolManager returns(bool){
        ETH = ETH.sub(_amount);
        (bool success, ) = _account.call.value(_amount)("");  // use call.value()('') as per Consensys latest advice 
        assert(success == true);
    
        emit ETHBalanceUpdated(ETH);
        emit EtherSent(_account, _amount);
        return success;
    }

    function increaseCLV(uint _amount) public onlyPoolManager () {
        totalCLVDeposits  = totalCLVDeposits.add(_amount);
        emit CLVBalanceUpdated(totalCLVDeposits);
    }

    function decreaseCLV(uint _amount) public onlyPoolManager () {
        totalCLVDeposits = totalCLVDeposits.sub(_amount);
        emit CLVBalanceUpdated(totalCLVDeposits);
    }

    /* Returns the raw ether balance at StabilityPool address.  
    Not necessarily equal to the ETH state variable - ether can be forcibly sent to contracts. */
    function getRawETHBalance() public view returns(uint) {
        return address(this).balance;
    }

    modifier onlyPoolManager {
        require(_msgSender() == poolManagerAddress, "StabilityPool: Only the poolManager is authorized");
        _;
    }

    modifier onlyPoolManagerOrPool {
        require(
            _msgSender() == poolManagerAddress || 
            _msgSender() == activePoolAddress || 
            _msgSender() == defaultPoolAddress, 
            "StabilityPool: only receive ETH from Pool or PoolManager");
        _;
    }

    function () external payable onlyPoolManagerOrPool {
        ETH = ETH.add(msg.value);
    }
}
