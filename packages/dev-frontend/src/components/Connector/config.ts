import Onboard from "@web3-onboard/core";
import injectedModule from "@web3-onboard/injected-wallets";
import ledgerModule from "@web3-onboard/ledger";
import trezorModule from "@web3-onboard/trezor";
import walletConnectModule from "@web3-onboard/walletconnect";

const injected = injectedModule();
const ledger = ledgerModule();
const trezor = trezorModule({
  email: "support@sovryn.com",
  appUrl: "https://test.sovryn.app/zero"
});

const walletConnect = walletConnectModule({
  qrcodeModalOptions: {
    mobileLinks: ["rainbow", "metamask", "argent", "trust", "imtoken", "pillar"]
  }
});

export const onboard = Onboard({
  appMetadata: {
    name: "ZERO",
    icon: process.env.PUBLIC_URL + "/images/zerologo.svg",
    logo: process.env.PUBLIC_URL + "/images/zerologo.svg",
    description: "0% interest loans backed by bitcoin | Sovryn",
    recommendedInjectedWallets: [{ name: "MetaMask", url: "https://metamask.io" }]
  },
  //@ts-ignore
  wallets: [injected, ledger, trezor, walletConnect],
  chains: [
    {
      id: `0x${(31).toString(16)}`,
      token: "Rbtc",
      label: "RSK Testnet",
      rpcUrl: "https://public-node.testnet.rsk.co"
    }
  ],
  accountCenter: {
    desktop: {
      enabled: false,
      containerElement: "body"
    },
    mobile: {
      enabled: false,
      containerElement: "body"
    }
  },
  notify: {
    enabled: false
  }
});

export const getChainIdHex = (networkId: number) => {
  return `0x${networkId.toString(16)}`;
};

export const getNetworkIdFromHex = (chainId: string) => {
  return parseInt(chainId, 16);
};
