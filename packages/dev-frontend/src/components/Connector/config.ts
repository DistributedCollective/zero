import Onboard from "@web3-onboard/core";
import injectedModule from "@web3-onboard/injected-wallets";
import ledgerModule from "./custom/ledger-module";
import trezorModule from "./custom/trezor-module";
import walletConnectModule from "@web3-onboard/walletconnect";
import portisModule from "@web3-onboard/portis";
import { RPC_URL } from "src/contracts/config";
import { isMainnet } from "src/utils";

const injected = injectedModule();
const ledger = ledgerModule();
const trezor = trezorModule({
  email: "support@sovryn.com",
  appUrl: "https://test.sovryn.app/zero"
});
const walletConnect = walletConnectModule({
  qrcodeModalOptions: {
    mobileLinks: ["metamask", "trust", "rainbow", "argent", "imtoken", "pillar"]
  }
});
const portis = portisModule({ apiKey: process.env.REACT_APP_PORTIS_KEY || "" });

export const getChainIdHex = (networkId: number) => {
  return `0x${networkId.toString(16)}`;
};

export const getNetworkIdFromHex = (chainId: string) => {
  return parseInt(chainId, 16);
};

export const onboard = Onboard({
  appMetadata: {
    name: "ZERO",
    icon: process.env.PUBLIC_URL + "/images/zerologo.svg",
    logo: process.env.PUBLIC_URL + "/images/zerologo.svg",
    description: "0% interest loans backed by bitcoin | Sovryn",
    explore: "https://wiki.sovryn.app/en/getting-started/wallet-setup",
    gettingStartedGuide: "https://wiki.sovryn.app/en/getting-started/wallet-setup",
    recommendedInjectedWallets: [{ name: "MetaMask", url: "https://metamask.io" }]
  },
  wallets: [injected, ...(isMainnet ? [ledger, trezor] : []), walletConnect as any, portis],
  chains: [
    {
      id: getChainIdHex(30),
      token: "rBtc",
      label: "RSK Mainnet",
      rpcUrl: RPC_URL[30]
    },
    {
      id: getChainIdHex(31),
      token: "rBtc",
      label: "RSK Testnet",
      rpcUrl: RPC_URL[31]
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
