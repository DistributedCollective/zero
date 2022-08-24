import type { Web3Provider } from "@ethersproject/providers";
import { useConnectorContext } from "src/components/Connector";
import useSWR from "swr";

function getBlockNumber(library: Web3Provider) {
  return async () => {
    return library.getBlockNumber();
  };
}

export default function useBlockNumber() {
  const { provider } = useConnectorContext();
  const shouldFetch = !!provider;

  return useSWR(shouldFetch ? ["BlockNumber"] : null, getBlockNumber(provider as Web3Provider), {
    refreshInterval: 10 * 1000
  });
}
