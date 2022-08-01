import Onboard from "@web3-onboard/core";
import injectedModule from "@web3-onboard/injected-wallets";
// import ledgerModule from "@web3-onboard/ledger";

import hidFraming from "@ledgerhq/devices/hid-framing";

const injected = injectedModule();
// const ledger = ledgerModule();

console.log({
  hidFraming
});
export const onboard = Onboard({
  wallets: [injected],
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
