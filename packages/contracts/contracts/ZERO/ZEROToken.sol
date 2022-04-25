// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "../Dependencies/CheckContract.sol";
import "../Interfaces/IZEROToken.sol";
import "./ZEROTokenStorage.sol";

/**
* Based upon OpenZeppelin's ERC20 contract:
* https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
*  
* and their EIP2612 (ERC20Permit / ERC712) functionality:
* https://github.com/OpenZeppelin/openzeppelin-contracts/blob/53516bc555a454862470e7860a9b5254db4d00f5/contracts/token/ERC20/ERC20Permit.sol
* 
*
*  --- Functionality added specific to the ZEROToken ---
* 
* 1) Transfer protection: blacklist of addresses that are invalid recipients (i.e. core Liquity contracts) in external 
* transfer() and transferFrom() calls. The purpose is to protect users from losing tokens by mistakenly sending ZERO directly to a Liquity
* core contract, when they should rather call the right function.
*
* 2) sendToZEROStaking(): callable only by Liquity core contracts, which move ZERO tokens from user -> ZEROStaking contract.
*
*/

contract ZEROToken is ZEROTokenStorage, CheckContract, IZEROToken {
    
    // --- Functions ---

    function initialize (
        address _zeroStakingAddress,
        address _marketMakerAddress,
        address _presaleAddress
    ) initializer public {
        checkContract(_marketMakerAddress);
        checkContract(_presaleAddress);

        deploymentStartTime  = block.timestamp;

        zeroStakingAddress = _zeroStakingAddress;
        marketMakerAddress = _marketMakerAddress;
        presale = IBalanceRedirectPresale(_presaleAddress);

        bytes32 hashedName = keccak256(bytes(_NAME));
        bytes32 hashedVersion = keccak256(bytes(_VERSION));

        _HASHED_NAME = hashedName;
        _HASHED_VERSION = hashedVersion;
        _CACHED_CHAIN_ID = block.chainid;
        _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(_TYPE_HASH, hashedName, hashedVersion);
        
    }

    // --- External functions ---

    /// @notice Generates `amount` tokens that are assigned to `account`
    /// @param account The address that will be assigned the new tokens
    /// @param amount The quantity of tokens generated
    function mint (address account, uint256 amount) external {
        require(msg.sender == marketMakerAddress || msg.sender == address(presale), 'Invalid caller');
        _mint(account,amount);
    }

    /// @notice Burns `amount` tokens from `account`
    /// @param account The address that will lose the tokens
    /// @param amount The quantity of tokens to burn
    function burn (address account, uint256 amount) external {
        require(msg.sender == marketMakerAddress , 'Invalid caller');
        _burn(account, amount);
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function getDeploymentStartTime() external view override returns (uint256) {
        return deploymentStartTime;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _requireValidRecipient(recipient);

        // Otherwise, standard transfer functionality
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        _requireValidRecipient(recipient);

        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender] - amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external override returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external override returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] - subtractedValue);
        return true;
    }

    function sendToZEROStaking(address _sender, uint256 _amount) external override {
        _requireCallerIsZEROStaking();
        _transfer(_sender, zeroStakingAddress, _amount);
    }

    // --- EIP 2612 functionality ---

    function domainSeparator() public view override returns (bytes32) {    
        if (block.chainid == _CACHED_CHAIN_ID) {
            return _CACHED_DOMAIN_SEPARATOR;
        } else {
            return _buildDomainSeparator(_TYPE_HASH, _HASHED_NAME, _HASHED_VERSION);
        }
    }

    function permit
    (
        address owner, 
        address spender, 
        uint256 amount, 
        uint256 deadline, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) 
        external 
        override 
    {            
        require(deadline >= block.timestamp, 'ZERO: expired deadline');
        uint256 nonce;
        unchecked {
            nonce = _nonces[owner]++;
        }
        bytes32 digest = keccak256(abi.encodePacked('\x19\x01', 
                         domainSeparator(), keccak256(abi.encode(
                         _PERMIT_TYPEHASH, owner, spender, amount, 
                         nonce, deadline))));
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress == owner, 'ZERO: invalid signature');
        _approve(owner, spender, amount);
    }

    function nonces(address owner) external view override returns (uint256) { // FOR EIP 2612
        return _nonces[owner];
    }

    // --- Internal operations ---

    function _buildDomainSeparator(bytes32 _typeHash, bytes32 _name, bytes32 _version) private view returns (bytes32) {
        return keccak256(abi.encode(_typeHash, _name, _version, block.chainid, address(this)));
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(presale.isClosed(), "Presale is not over yet");

        _balances[sender] -= amount;
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");
        require(amount <= _balances[account], "balance too low");

        _totalSupply -= amount;
        _balances[account] -= amount;
        emit Transfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // --- Helper functions ---

    // --- 'require' functions ---
    
    function _requireValidRecipient(address _recipient) internal view {
        require(
            _recipient != address(0) && 
            _recipient != address(this),
            "ZERO: Cannot transfer tokens directly to the ZERO token contract or the zero address"
        );
    }

    function _requireCallerIsZEROStaking() internal view {
         require(msg.sender == zeroStakingAddress, "ZEROToken: caller must be the ZEROStaking contract");
    }

    // --- Optional functions ---

    function name() external pure override returns (string memory) {
        return _NAME;
    }

    function symbol() external pure override returns (string memory) {
        return _SYMBOL;
    }

    function decimals() external pure override returns (uint8) {
        return _DECIMALS;
    }

    function version() external pure override returns (string memory) {
        return _VERSION;
    }

    function permitTypeHash() external pure override returns (bytes32) {
        return _PERMIT_TYPEHASH;
    }
}
