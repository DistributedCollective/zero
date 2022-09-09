// @ts-nocheck
// these cannot be dynamically imported
import { TypedDataUtils } from '@metamask/eth-sig-util';
const LEDGER_LIVE_PATH = `m/44'/60'`;
const LEDGER_DEFAULT_PATH = `m/44'/60'/0'`;
const RSK_MAINNET_PATH = `m/44'/137'/0'/0`;
const DEFAULT_BASE_PATHS = [
    {
        label: 'RSK',
        value: RSK_MAINNET_PATH
    },
    {
        label: 'Ledger Live',
        value: LEDGER_LIVE_PATH
    },
    {
        label: 'Ledger Legacy',
        value: LEDGER_DEFAULT_PATH
    }
];
const assets = [
    {
        label: 'RBTC'
    }
];
const supportsWebUSB = () => Promise.resolve(!!navigator &&
    !!navigator.usb &&
    typeof navigator.usb.getDevices === 'function');
/**
 * Returns the correct ledger transport based on browser compatibility for webUSB.
 * @returns
 */
const getTransport = async () => ((await supportsWebUSB())
    ? (await import('@ledgerhq/hw-transport-webusb')).default
    // @ts-ignore
    : (await import('@ledgerhq/hw-transport-u2f')).default).create()
    // @ts-ignore
const getAccount = async (derivationPath, asset, index, provider, eth) => {
    const dPath = derivationPath === LEDGER_LIVE_PATH
        ? `${derivationPath}/${index}'/0/0`
        : `${derivationPath}/${index}`;
    const { address } = await eth.getAddress(dPath);
    return {
        derivationPath: dPath,
        address: address.toLowerCase(),
        balance: {
            asset: asset.label,
            value: await provider.getBalance(address.toLowerCase())
        }
    };
};
// @ts-ignore
const getAddresses = async (derivationPath, asset, provider, eth) => {
    const accounts = [];
    let index = 0;
    let zeroBalanceAccounts = 0;
    // Iterates until a 0 balance account is found
    // Then adds 4 more 0 balance accounts to the array
    while (zeroBalanceAccounts < 5) {
        const acc = await getAccount(derivationPath, asset, index, provider, eth);
        if (acc.balance.value.isZero()) {
            zeroBalanceAccounts++;
            accounts.push(acc);
        }
        else {
            accounts.push(acc);
            // Reset the number of 0 balance accounts
            zeroBalanceAccounts = 0;
        }
        index++;
    }
    return accounts;
};
// @ts-ignore
function ledger({ customNetwork } = {}) {
    const getIcon = async () => (await import('@web3-onboard/ledger/dist/icon.js')).default;
    return () => {
        // @ts-ignore
        let accounts: Array<any> = [];
        return {
            label: 'Ledger',
            getIcon,
            // @ts-ignore
            getInterface: async ({ EventEmitter, chains }) => {
                const Eth = (await import('@ledgerhq/hw-app-eth')).default;
                const ethUtil = await import('ethereumjs-util');
                const { SignTypedDataVersion } = await import('@metamask/eth-sig-util');
                const { StaticJsonRpcProvider } = await import('@ethersproject/providers');
                const { accountSelect, createEIP1193Provider, ProviderRpcError, getCommon, bigNumberFieldsToStrings, getHardwareWalletProvider } = await import('@web3-onboard/common');
                const { TransactionFactory: Transaction, Capability } = await import('@ethereumjs/tx');
                const transport = await getTransport();
                const eth = new Eth(transport);
                const eventEmitter = new EventEmitter();
                // @ts-ignore
                let ethersProvider;
                let currentChain = chains[0];
                // @ts-ignore
                const scanAccounts = async ({ derivationPath, chainId, asset }) => {
                    try {
                        currentChain =
                            // @ts-ignore
                            chains.find(({ id }) => id === chainId) || currentChain;
                        ethersProvider = new StaticJsonRpcProvider(currentChain.rpcUrl);
                        // Checks to see if this is a custom derivation path
                        // If it is then just return the single account
                        if (derivationPath !== LEDGER_LIVE_PATH &&
                            derivationPath !== LEDGER_DEFAULT_PATH &&
                            derivationPath !== RSK_MAINNET_PATH) {
                            const { address } = await eth.getAddress(derivationPath);
                            return [
                                {
                                    derivationPath,
                                    address: address.toLowerCase(),
                                    balance: {
                                        asset: asset.label,
                                        value: await ethersProvider.getBalance(address.toLowerCase())
                                    }
                                }
                            ];
                        }
                        return getAddresses(derivationPath, asset, ethersProvider, eth);
                    }
                    catch (error) {
                        console.log('err', error);
                        // @ts-ignore
                        const { statusText } = error;
                        throw new Error(statusText === 'UNKNOWN_ERROR'
                            ? 'Ledger device is locked, please unlock to continue'
                            : statusText);
                    }
                };
                const getAccounts = async () => {
                    accounts = await accountSelect({
                        basePaths: DEFAULT_BASE_PATHS,
                        assets,
                        chains,
                        // @ts-ignore
                        scanAccounts
                    });
                    if (accounts && accounts.length) {
                        eventEmitter.emit('accountsChanged', [accounts[0].address]);
                    }
                    return accounts;
                };
                // @ts-ignore
                const signMessage = async (address, message) => {
                    // @ts-ignore
                    if (!(accounts && accounts.length && accounts.length > 0))
                        throw new Error('No account selected. Must call eth_requestAccounts first.');
                    // @ts-ignore
                    const account = accounts.find(account => account.address === address) || accounts[0];
                    return eth
                        // @ts-ignore
                        .signPersonalMessage(account.derivationPath, ethUtil.stripHexPrefix(message))
                        .then(result => {
                        let v = (result['v'] - 27).toString(16);
                        if (v.length < 2) {
                            v = '0' + v;
                        }
                        return `0x${result['r']}${result['s']}${v}`;
                    });
                };
                const ledgerProvider = getHardwareWalletProvider(() => currentChain === null || currentChain === void 0 ? void 0 : currentChain.rpcUrl);
                const provider = createEIP1193Provider(ledgerProvider, {
                    eth_requestAccounts: async () => {
                        // Triggers the account select modal if no accounts have been selected
                        const accounts = await getAccounts();
                        if (!Array.isArray(accounts))
                            throw new Error('No account selected. Must call eth_requestAccounts first.');
                        if (accounts.length === 0) {
                            throw new ProviderRpcError({
                                code: 4001,
                                message: 'User rejected the request.'
                            });
                        }
                        if (!accounts[0].hasOwnProperty('address'))
                            throw new Error('No address property associated with the selected account');
                        return [accounts[0].address];
                    },
                    eth_selectAccounts: async () => {
                        const accounts = await getAccounts();
                        // @ts-ignore
                        return accounts.map(({ address }) => address);
                    },
                    eth_accounts: async () => {
                        return Array.isArray(accounts) &&
                            accounts.length &&
                            accounts[0].hasOwnProperty('address')
                            ? [accounts[0].address]
                            : [];
                    },
                    eth_chainId: async () => {
                        return (currentChain && currentChain.id) || '';
                    },
                    eth_signTransaction: async ({ params: [transactionObject] }) => {
                        if (!accounts || !Array.isArray(accounts) || !accounts.length)
                            throw new Error('No account selected. Must call eth_requestAccounts first.');
                        let account;
                        if (transactionObject.hasOwnProperty('from')) {
                            account = accounts.find(account => account.address === transactionObject.from);
                        }
                        account = account ? account : accounts[0];
                        const { address: from, derivationPath } = account;
                        // Set the `from` field to the currently selected account
                        transactionObject = { ...transactionObject, from };
                        const chainId = currentChain.hasOwnProperty('id')
                            ? Number.parseInt(currentChain.id)
                            : process.env.REACT_APP_NETWORK === 'mainnet' ? 30 : 31;
                        const common = await getCommon({ customNetwork, chainId });
                        transactionObject.gasLimit =
                            transactionObject.gas || transactionObject.gasLimit;
                        // 'gas' is an invalid property for the TransactionRequest type
                        delete transactionObject.gas;
                        // @ts-ignore
                        const signer = ethersProvider.getSigner(from);
                        let populatedTransaction = await signer.populateTransaction(transactionObject);
                        populatedTransaction =
                            bigNumberFieldsToStrings(populatedTransaction);
                        const transaction = Transaction.fromTxData(populatedTransaction, {
                            // @ts-ignore
                            common
                        });
                        let unsignedTx = transaction.getMessageToSign(false);
                        // If this is not an EIP1559 transaction then it is legacy and it needs to be
                        // rlp encoded before being passed to ledger
                        if (!transaction.supports(Capability.EIP1559FeeMarket)) {
                            unsignedTx = ethUtil.rlp.encode(unsignedTx);
                        }
                        const { v, r, s } = await eth.signTransaction(derivationPath, unsignedTx.toString('hex'));
                        // Reconstruct the signed transaction
                        const signedTx = Transaction.fromTxData({
                            ...populatedTransaction,
                            v: `0x${v}`,
                            r: `0x${r}`,
                            s: `0x${s}`
                            // @ts-ignore
                        }, { common });
                        return signedTx ? `0x${signedTx.serialize().toString('hex')}` : '';
                    },
                    // @ts-ignore
                    eth_sendTransaction: async ({ baseRequest, params }) => {
                        const signedTx = await provider.request({
                            method: 'eth_signTransaction',
                            params
                        });
                        const transactionHash = await baseRequest({
                            method: 'eth_sendRawTransaction',
                            params: [signedTx]
                        });
                        return transactionHash;
                    },
                    eth_sign: async ({ params: [address, message] }) => signMessage(address, message),
                    personal_sign: async ({ params: [message, address] }) => signMessage(address, message),
                    eth_signTypedData: async ({ params: [address, typedData] }) => {
                        if (!(accounts && accounts.length && accounts.length > 0))
                            throw new Error('No account selected. Must call eth_requestAccounts first.');
                            // @ts-ignore
                        const account = accounts.find(account => account.address === address) ||
                            accounts[0];
                        const domainHash = TypedDataUtils.hashStruct('EIP712Domain', typedData.domain, typedData.types, SignTypedDataVersion.V3).toString('hex');
                        const messageHash = TypedDataUtils.hashStruct(typedData.primaryType, typedData.message, typedData.types, SignTypedDataVersion.V3).toString('hex');
                        return eth
                            .signEIP712HashedMessage(account.derivationPath, domainHash, messageHash)
                            .then(result => {
                            let v = (result['v'] - 27).toString(16);
                            if (v.length < 2) {
                                v = '0' + v;
                            }
                            return `0x${result['r']}${result['s']}${v}`;
                        });
                    },
                    wallet_switchEthereumChain: async ({ params: [{ chainId }] }) => {
                        currentChain =
                            // @ts-ignore
                            chains.find(({ id }) => id === chainId) || currentChain;
                        if (!currentChain)
                            throw new Error('chain must be set before switching');
                        eventEmitter.emit('chainChanged', currentChain.id);
                        return null;
                    },
                    wallet_addEthereumChain: null
                });
                provider.on = eventEmitter.on.bind(eventEmitter);
                return {
                    provider
                };
            }
        };
    };
}
export default ledger;
