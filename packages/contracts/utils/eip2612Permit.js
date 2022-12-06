const ethSigUtil = require('eth-sig-util');
const { ethers } = require('hardhat');

const { EIP712Domain, Permit, domainSeparator } = require('../utils/eip712');

const { fromRpcSig } = require("ethereumjs-util");

const maxPermitDeadline = ethers.constants.MaxUint256.sub(1);

const buildTypedPermitMessage = (chainId, verifyingContract, tokenName, version, owner, spender, value, nonce, deadline = maxPermitDeadline) => ({
    primaryType: 'Permit',
    types: { EIP712Domain, Permit },
    domain: { name: tokenName, version, chainId, verifyingContract },
    message: { owner, spender, value, nonce, deadline },
});

const signTypedMessage = (privateKey, message) => {
    const signature = ethSigUtil.signTypedMessage(privateKey, { data: message });
    return { v, r, s } = fromRpcSig(signature);
};

const buildTypedPermitData = async (
    signer,
    token,
    version,
    chainId,
    spender,
    value,
    deadline = maxPermitDeadline) => {
    const address = await signer.getAddress();
    const domain = {
        name: await token.name(), // unique name of EIP-712 domain
        version: version, //await token.version(), // version of domain
        chainId,
        verifyingContract: token.address, // address that receives permit
    };

    const types = {
        Permit: [
            {
                name: "owner",
                type: "address",
            },
            {
                name: "spender",
                type: "address",
            },
            {
                name: "value",
                type: "uint256",
            },
            {
                name: "nonce",
                type: "uint256",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
    };
    const values = {
        owner: address,
        spender,
        value,
        nonce: (await token.nonces(address)).toString(), // current nonce
        deadline,
    };
    return ({ domain, types, values });
};

const signPermit = async (
    signer,
    token,
    version,
    chainId,
    spender,
    value,
    deadline
) => {
    const address = await signer.getAddress();
    const domain = {
        name: await token.name(), // unique name of EIP-712 domain - token name
        version: version, //await token.version(), // version of domain
        chainId,
        verifyingContract: token.address, // address that receives permit
    };

    const types = {
        Permit: [
            {
                name: "owner",
                type: "address",
            },
            {
                name: "spender",
                type: "address",
            },
            {
                name: "value",
                type: "uint256",
            },
            {
                name: "nonce",
                type: "uint256",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
    };

    const values = {
        owner: address,
        spender,
        value,
        nonce: await token.nonces(address), // current nonce
        deadline,
    };

    const rawSignature = await signer._signTypedData(
        domain,
        types,
        values
    );
    return ethers.utils.splitSignature(rawSignature);
};

/* usage example 
it('accepts owner signature', async function () {
    const data = buildData(this.chainId, this.token.address);
    const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
    const { v, r, s } = fromRpcSig(signature);

    const receipt = await this.token.permit(owner, spender, value, maxDeadline, v, r, s);

    expect(await this.token.nonces(owner)).to.be.bignumber.equal('1');
    expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(value);
});
*/

module.exports = {
    EIP712Domain,
    Permit,
    domainSeparator,
    buildTypedPermitMessage,
    buildTypedPermitData,
    signTypedMessage,
    maxPermitDeadline,
    signPermit
};
