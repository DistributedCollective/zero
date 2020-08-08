pragma solidity >=0.5.16;

// Common interface for the CDP Manager.
interface IBorrowerOperations {

    // --- Events ---

    event CDPManagerAddressChanged(address _newCDPManagerAddress);

    event PoolManagerAddressChanged(address _newPoolManagerAddress);

    event ActivePoolAddressChanged(address _activePoolAddress);

    event DefaultPoolAddressChanged(address _defaultPoolAddress);

    event PriceFeedAddressChanged(address  _newPriceFeedAddress);
    
    event SortedCDPsAddressChanged(address _sortedCDPsAddress);

    event SizeListAddressChanged(uint _sizeRange, address _sizeListAddress);

    // --- Functions ---

    function setCDPManager(address _CDPManagerAddress) external;

    function setPoolManager(address _poolManagerAddress) external;

    function setPriceFeed(address _priceFeedAddress) external;

    function setSortedCDPs(address _sortedCDPsAddress) external;

    function setActivePool(address _activePoolAddress) external; 

    function setDefaultPool(address _defaultPoolAddress) external;

    function openLoan(uint _CLVAmount, address _hint,  address _sizeListHint) external payable;

    function addColl(address _user, address _hint, address _sizeListHint) external payable;

    function withdrawColl(uint _amount, address _hint, address _sizeListHint) external;

    function withdrawCLV(uint _amount, address _hint, address _sizeListHint) external;

    function repayCLV(uint _amount, address _hint, address _sizeListHint) external;

    function closeLoan() external;

    function adjustLoan(uint _collWithdrawal, int _debtChange, address _hint, address _sizeListHint) external payable;
}