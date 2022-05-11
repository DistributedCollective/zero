import { Contract } from "@ethersproject/contracts";
import { useWeb3React } from "@web3-react/core";
import { useMemo } from "react";
import { AbiItem } from "web3-utils";

export default function useContract<T extends Contract = Contract>(
  address: string,
  ABI: AbiItem | AbiItem[] | any
): T | null {
  const { library, account, chainId } = useWeb3React();

  return useMemo(() => {
    if (!address || !ABI || !library || !chainId) {
      return null;
    }

    try {
      return new Contract(address, ABI, library?.getSigner(account));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed To Get Contract", error);
      return null;
    }
  }, [address, ABI, library, chainId, account]) as T;
}
