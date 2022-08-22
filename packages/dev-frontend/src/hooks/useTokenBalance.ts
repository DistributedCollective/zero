import { useEffect, useState } from "react";
import useSWR from "swr";

import useContract from "./useContract";
import useKeepSWRDataLiveAsBlocksArrive from "./useKeepSWRDataLiveAsBlocksArrive";
import { Contract } from "@ethersproject/contracts";
import ERC20_ABI from "../contracts/ERC20.json";
import { Decimal } from "@sovryn-zero/lib-base";
import { parseBalance } from "src/utils";

function getTokenBalance(contract: Contract) {
  return async (_: string, address: string) => {
    const balance = await contract.balanceOf(address);
    return balance;
  };
}

export default function useTokenBalance(address: string, tokenAddress: string, suspense = false) {
  const contract = useContract(tokenAddress, ERC20_ABI);
  const [decimals, setDecimals] = useState(18);

  const shouldFetch = typeof address === "string" && typeof tokenAddress === "string" && !!contract;

  useEffect(() => {
    const updateDecimals = async () => {
      const d = await contract?.decimals();
      setDecimals(Number(d?.toString()));
    };

    if (contract) updateDecimals();
  }, [contract]);

  const result = useSWR(
    shouldFetch ? ["TokenBalance", address, tokenAddress] : null,
    getTokenBalance(contract as Contract),
    {
      suspense
    }
  );

  useKeepSWRDataLiveAsBlocksArrive(result.mutate);

  return {
    ...result,
    balance: Decimal.from(parseBalance(result.data ?? 0, decimals, decimals)),
    decimals
  };
}
