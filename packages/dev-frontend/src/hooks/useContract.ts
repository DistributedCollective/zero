import { Contract } from "@ethersproject/contracts";
import { useMemo } from "react";
import { useConnectorContext } from "src/components/Connector";
import { AbiItem } from "web3-utils";

export default function useContract<T extends Contract = Contract>(
  address: string,
  ABI: AbiItem | AbiItem[] | any
): T | null {
  const { provider, walletAddress, chainId } = useConnectorContext();

  return useMemo(() => {
    if (!address || !ABI || !provider || !chainId) {
      return null;
    }

    try {
      return new Contract(address, ABI, provider?.getSigner(walletAddress || undefined));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed To Get Contract", error);
      return null;
    }
  }, [address, ABI, provider, chainId, walletAddress]) as T;
}
