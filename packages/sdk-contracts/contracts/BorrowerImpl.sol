pragma solidity ^0.6.11;
import "./interfaces/IBorrowerOperations.sol";

contract BorrowerImpl is IBorrowerOperations {
    function setAddresses(
        address _feeDistributorAddress,
        address _liquityBaseParamsAddress,
        address _troveManagerAddress,
        address _activePoolAddress,
        address _defaultPoolAddress,
        address _stabilityPoolAddress,
        address _gasPoolAddress,
        address _collSurplusPoolAddress,
        address _priceFeedAddress,
        address _sortedTrovesAddress,
        address _zusdTokenAddress,
        address _zeroStakingAddress
    ) external override {
        emit FeeDistributorAddressChanged(_feeDistributorAddress);
        emit TroveManagerAddressChanged(_troveManagerAddress);
        emit ActivePoolAddressChanged(_activePoolAddress);
        emit DefaultPoolAddressChanged(_defaultPoolAddress);
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);
        emit GasPoolAddressChanged(_gasPoolAddress);
        emit CollSurplusPoolAddressChanged(_collSurplusPoolAddress);
        emit PriceFeedAddressChanged(_priceFeedAddress);
        emit SortedTrovesAddressChanged(_sortedTrovesAddress);
        emit ZUSDTokenAddressChanged(_zusdTokenAddress);
        emit ZEROStakingAddressChanged(_zeroStakingAddress);
    }

    function openTrove(
        uint256 _maxFee,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable override {
        emit TroveCreated(msg.sender, 1);
        emit TroveUpdated(msg.sender, 1, 1, 1, 1);
        emit ZUSDBorrowingFeePaid(msg.sender, 1);
    }

    function openNueTrove(
        uint256 _maxFee,
        uint256 _ZUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable override {}

    function addColl(address _upperHint, address _lowerHint) external payable override {}

    function moveETHGainToTrove(
        address _user,
        address _upperHint,
        address _lowerHint
    ) external payable override {}

    function withdrawColl(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external override {}

    function withdrawZUSD(
        uint256 _maxFee,
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external override {}

    function repayZUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external override {}

    function closeTrove() external override {}

    function closeNueTrove() external override {}

    function adjustTrove(
        uint256 _maxFee,
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable override {}

    function adjustNueTrove(
        uint256 _maxFee,
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable override {}

    function claimCollateral() external override {}

    function getCompositeDebt(uint256 _debt) external view override returns (uint256) {
        return _debt;
    }

    function BORROWING_FEE_FLOOR() external view override returns (uint256) {
        return 1;
    }
}
