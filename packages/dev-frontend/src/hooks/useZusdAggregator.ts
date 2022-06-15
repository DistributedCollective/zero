import { useCallback } from "react";
import BabelfishAggregator_ABI from "../contracts/BabelfishAggregator.json";
import ERC20_ABI from "../contracts/ERC20.json";
import { addresses } from "../contracts/config";
import useContract from "./useContract";
import { useTransactionState } from "../components/Transaction";

export default function useZusdAggregator(account: string | undefined | null) {
  const [, setTransactionState] = useTransactionState();
  const babelfish = useContract(addresses.babelfish, BabelfishAggregator_ABI);
  const zusd = useContract(addresses.zusd, ERC20_ABI);

  const mint = useCallback(
    async (amount: string) => {
      const id = "mint-xusd";
      const disableCheck = true;
      try {
        setTransactionState({
          type: "waitingForApproval",
          id,
          title: "Confirm Approval",
          disableCheck,
          description: "Please approve ZUSD to be spent by Sovryn smart contracts in your RSK wallet"
        });

        const _allowance = await zusd?.allowance(account, addresses.babelfish);
        let tx;
        if (_allowance.lt(amount)) {
          tx = await zusd?.approve(addresses.babelfish, amount);
          setTransactionState({
            type: "waitingForConfirmation",
            id,
            disableCheck,
            tx,
            description: "ZUSD approval is processing..."
          });

          await tx.wait();

          setTransactionState({ type: "waitingForApproval", id, disableCheck });
        }

        tx = await babelfish?.mintTo(addresses.zusd, amount, account);

        setTransactionState({
          type: "waitingForConfirmation",
          id,
          disableCheck,
          tx
        });

        await tx.wait();

        setTransactionState({
          type: "confirmedOneShot",
          id,
          disableCheck
        });
      } catch (error) {
        setTransactionState({
          type: "failed",
          id,
          disableCheck,
          error: new Error("Confirm Failed")
        });
        console.log("error:", error);
      }
    },
    [account, babelfish, setTransactionState, zusd]
  );

  const redeem = useCallback(
    async (amount: string) => {
      const id = "redeem-zusd";
      const disableCheck = true;

      try {
        setTransactionState({ type: "waitingForApproval", id, disableCheck });
        const tx = await babelfish?.redeemTo(addresses.zusd, amount, account);
        setTransactionState({
          type: "waitingForConfirmation",
          id,
          disableCheck,
          tx
        });
        await tx.wait();

        setTransactionState({
          type: "confirmedOneShot",
          id,
          disableCheck
        });
      } catch (error) {
        setTransactionState({
          type: "failed",
          id,
          disableCheck,
          error: new Error("Confirm Failed")
        });
        console.log("error:", error);
      }
    },
    [account, babelfish, setTransactionState]
  );

  return { mint, redeem };
}
