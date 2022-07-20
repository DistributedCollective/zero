import { LedgerConnector } from "@web3-react/ledger-connector";
import { currentChainId } from "../contracts/config";

const POLLING_INTERVAL = 12000;
const RPC_URLS = {
  30: "https://public-node.rsk.co",
  31: "https://public-node.testnet.rsk.co"
};

export const ledgerConnector = new LedgerConnector({
  chainId: currentChainId,
  url: RPC_URLS[currentChainId],
  pollingInterval: POLLING_INTERVAL
});
