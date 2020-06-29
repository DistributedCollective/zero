pragma solidity 0.5.16;

import './Interfaces/IPool.sol';
import "./Dependencies/SafeMath.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/console.sol";

contract ActivePool is Ownable, IPool {
    using SafeMath for uint256;

    address public poolManagerAddress;
    address public stabilityPoolAddress;
    address public defaultPoolAddress;
    uint256 public ETH;  // deposited ether tracker
    uint256 public CLVDebt;

   // --- Modifiers ---
   
    modifier onlyPoolManager {
        require(_msgSender() == poolManagerAddress, "ActivePool: Caller is not the PoolManager");
        _;
    }

    modifier onlyPoolManagerOrPool {
        require(
            _msgSender() == poolManagerAddress || 
            _msgSender() == stabilityPoolAddress || 
            _msgSender() == defaultPoolAddress, 
            "ActivePool: Caller is neither the PoolManager nor a Pool");
        _;
    }

    // --- Contract setters ---

    function setPoolManagerAddress(address _poolManagerAddress) external onlyOwner {
        poolManagerAddress = _poolManagerAddress;
        emit PoolManagerAddressChanged(_poolManagerAddress);
    }

    function setDefaultPoolAddress(address _defaultPoolAddress) external onlyOwner {
        defaultPoolAddress = _defaultPoolAddress; 
        emit DefaultPoolAddressChanged(defaultPoolAddress);
    }

    function setStabilityPoolAddress(address _stabilityPoolAddress) external onlyOwner {
        stabilityPoolAddress = _stabilityPoolAddress;
        emit StabilityPoolAddressChanged(stabilityPoolAddress);
    }

    // --- Getters for public variables. Required by IPool interface ---

    function getETH() external view returns (uint) {
        return ETH;
    }

    function getCLVDebt() external view returns (uint) {
        return CLVDebt;
    }

    // --- Pool functionality ---

    function sendETH(address _account, uint _amount) public onlyPoolManager {
        ETH = ETH.sub(_amount);  
        emit EtherSent(_account, _amount);  

        (bool success, ) = _account.call.value(_amount)(""); //  use call.value()('') as per Consensys latest advice 
        assert(success == true); 
    }

    function increaseCLVDebt(uint _amount) external onlyPoolManager () {
        CLVDebt  = CLVDebt.add(_amount); 
    }

    function decreaseCLVDebt(uint _amount) external onlyPoolManager () {
        CLVDebt = CLVDebt.sub(_amount); 
    }

    /* Returns the raw ether balance at ActivePool address.  
    Not necessarily equal to the ETH state variable - ether can be forcibly sent to contracts. */
    function getRawETHBalance() external view returns (uint) {
        return address(this).balance;
    }

    function () external payable onlyPoolManagerOrPool {
        ETH = ETH.add(msg.value);
    }
}
