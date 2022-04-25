import React, { useState, useContext, useEffect, useCallback, useMemo } from "react";
import { Flex, Text, Image, Button } from "theme-ui";
import { Provider, TransactionResponse, TransactionReceipt } from "@ethersproject/abstract-provider";
import { hexDataSlice, hexDataLength } from "@ethersproject/bytes";
import { defaultAbiCoder } from "@ethersproject/abi";

import "react-circular-progressbar/dist/styles.css";

import { EthersTransactionOverrides } from "@liquity/lib-ethers";
import { SentLiquityTransaction, LiquityReceipt } from "@liquity/lib-base";

import { useLiquity } from "../hooks/LiquityContext";

import { Tooltip, TooltipProps, Hoverable } from "./Tooltip";
import { Dialog } from "./Dialog";
import { useWeb3React } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";

type TransactionIdle = {
  type: "idle";
};

type TransactionFailed = {
  type: "failed";
  id: string;
  error: Error;
  send?: TransactionFunction;
};

type TransactionWaitingForApproval = {
  type: "waitingForApproval";
  id: string;
};

type TransactionCancelled = {
  type: "cancelled";
  id: string;
  send?: TransactionFunction;
};

type TransactionWaitingForConfirmations = {
  type: "waitingForConfirmation";
  id: string;
  tx: SentTransaction;
};

type TransactionConfirmed = {
  type: "confirmed";
  id: string;
};

type TransactionConfirmedOneShot = {
  type: "confirmedOneShot";
  id: string;
};

type TransactionState =
  | TransactionIdle
  | TransactionFailed
  | TransactionWaitingForApproval
  | TransactionCancelled
  | TransactionWaitingForConfirmations
  | TransactionConfirmed
  | TransactionConfirmedOneShot;

const TransactionContext = React.createContext<
  [TransactionState, (state: TransactionState) => void] | undefined
>(undefined);

export const TransactionProvider: React.FC = ({ children }) => {
  const transactionState = useState<TransactionState>({ type: "idle" });
  return (
    <TransactionContext.Provider value={transactionState}>{children}</TransactionContext.Provider>
  );
};

const useTransactionState = () => {
  const transactionState = useContext(TransactionContext);

  if (!transactionState) {
    throw new Error("You must provide a TransactionContext via TransactionProvider");
  }

  return transactionState;
};

export const useMyTransactionState = (myId: string | RegExp): TransactionState => {
  const [transactionState] = useTransactionState();

  return transactionState.type !== "idle" &&
    (typeof myId === "string" ? transactionState.id === myId : transactionState.id.match(myId))
    ? transactionState
    : { type: "idle" };
};

const hasMessage = (error: unknown): error is { message: string } =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof (error as { message: unknown }).message === "string";

type ButtonlikeProps = {
  disabled?: boolean;
  variant?: string;
  onClick?: () => void;
};

type SentTransaction = SentLiquityTransaction<
  TransactionResponse,
  LiquityReceipt<TransactionReceipt>
>;

export type TransactionFunction = (
  overrides?: EthersTransactionOverrides
) => Promise<SentTransaction>;

type TransactionProps<C> = {
  id: string;
  tooltip?: string;
  tooltipPlacement?: TooltipProps<C>["placement"];
  showFailure?: "asTooltip" | "asChildText";
  requires?: readonly (readonly [boolean, string])[];
  send: TransactionFunction;
  children: C;
};

export const useTransactionFunction = (
  id: string,
  send: TransactionFunction
): [sendTransaction: () => Promise<void>, transactionState: TransactionState] => {
  const [transactionState, setTransactionState] = useTransactionState();

  const sendTransaction = useCallback(async () => {
    setTransactionState({ type: "waitingForApproval", id });

    try {
      const tx = await send();

      setTransactionState({
        type: "waitingForConfirmation",
        id,
        tx
      });
    } catch (error) {
      if (hasMessage(error) && error.message.includes("User denied transaction signature")) {
        setTransactionState({ type: "cancelled", id, send });
      } else {
        console.error(error);

        setTransactionState({
          type: "failed",
          id,
          error: new Error("Failed to send transaction (try again)"),
          send
        });
      }
    }
  }, [send, id, setTransactionState]);

  return [sendTransaction, transactionState];
};

export function Transaction<C extends React.ReactElement<ButtonlikeProps & Hoverable>>({
  id,
  tooltip,
  tooltipPlacement,
  showFailure,
  requires,
  send,
  children
}: TransactionProps<C>) {
  const [sendTransaction, transactionState] = useTransactionFunction(id, send);
  const trigger = React.Children.only<C>(children);

  const failureReasons = (requires || [])
    .filter(([requirement]) => !requirement)
    .map(([, reason]) => reason);

  if (
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation"
  ) {
    failureReasons.push("You must wait for confirmation");
  }

  showFailure =
    failureReasons.length > 0 ? showFailure ?? (tooltip ? "asTooltip" : "asChildText") : undefined;

  const clonedTrigger =
    showFailure === "asChildText"
      ? React.cloneElement(
          trigger,
          {
            disabled: true,
            variant: "danger"
          },
          failureReasons[0]
        )
      : showFailure === "asTooltip"
      ? React.cloneElement(trigger, { disabled: true })
      : React.cloneElement(trigger, { onClick: sendTransaction });

  if (showFailure === "asTooltip") {
    tooltip = failureReasons[0];
  }

  return tooltip ? (
    <>
      <Tooltip message={tooltip} placement={tooltipPlacement || "right"}>
        {clonedTrigger}
      </Tooltip>
    </>
  ) : (
    clonedTrigger
  );
}

// Doesn't work on Kovan:
// https://github.com/MetaMask/metamask-extension/issues/5579
const tryToGetRevertReason = async (provider: Provider, hash: string) => {
  try {
    const tx = await provider.getTransaction(hash);
    const result = await provider.call(tx, tx.blockNumber);

    if (hexDataLength(result) % 32 === 4 && hexDataSlice(result, 0, 4) === "0x08c379a0") {
      return (defaultAbiCoder.decode(["string"], hexDataSlice(result, 4)) as [string])[0];
    }
  } catch {
    return undefined;
  }
};

const getTransactionTitle = (tx: TransactionState) => {
  switch (tx.type) {
    case "idle":
      return "";
    case "failed":
      return "Confirm Failed";
    case "waitingForApproval":
      return "Confirm Transaction";
    case "waitingForConfirmation":
      return "Transaction Processing";
    case "confirmed":
      return "Transaction Succeeded";
    case "confirmedOneShot":
      return "Transaction Succeeded";
    case "cancelled":
      return "Confirm Rejected";
  }
};

const getTransactionImage = (tx: TransactionState) => {
  switch (tx.type) {
    case "failed":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src="/images/failed-tx.svg"
        />
      );
    case "cancelled":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src="/images/failed-tx.svg"
        />
      );

    case "waitingForConfirmation":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          className="spiner"
          src="/images/pending-tx.svg"
        />
      );

    case "confirmed":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src="/images/confirm-tx.svg"
        />
      );
    case "confirmedOneShot":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src="/images/confirm-tx.svg"
        />
      );

    default:
      return (
        <Image
          sx={{
            mb: 20,
            ml: 22,
            width: 85
          }}
          src="/images/rsk.svg"
        />
      );
  }
};

type RetryTransactionProps = {
  id: string;
  send: TransactionFunction;
};

export const RetryTransaction: React.FC<RetryTransactionProps> = ({ id, send }) => {
  const [sendTransaction] = useTransactionFunction(id, send);

  return (
    <Button sx={{ width: "100%", maxWidth: 320, height: 50 }} onClick={sendTransaction}>
      Retry
    </Button>
  );
};

export const TransactionMonitor: React.FC = () => {
  const { provider } = useLiquity();
  const [transactionState, setTransactionState] = useTransactionState();
  const { chainId } = useWeb3React<Web3Provider>();
  const [open, setOpen] = useState(false);

  const id = transactionState.type !== "idle" ? transactionState.id : undefined;
  const tx = transactionState.type === "waitingForConfirmation" ? transactionState.tx : undefined;

  useEffect(() => {
    if (id && tx) {
      let cancelled = false;
      let finished = false;

      const txHash = tx.rawSentTransaction.hash;

      const waitForConfirmation = async () => {
        try {
          const receipt = await tx.waitForReceipt();

          if (cancelled) {
            return;
          }

          const { confirmations } = receipt.rawReceipt;
          const blockNumber = receipt.rawReceipt.blockNumber + confirmations - 1;
          console.log(`Block #${blockNumber} ${confirmations}-confirms tx ${txHash}`);
          console.log(`Finish monitoring tx ${txHash}`);
          finished = true;

          if (receipt.status === "succeeded") {
            console.log(`${receipt}`);

            setTransactionState({
              type: "confirmedOneShot",
              id
            });
          } else {
            const reason = await tryToGetRevertReason(provider, txHash);

            if (cancelled) {
              return;
            }

            console.error(`Tx ${txHash} failed`);
            if (reason) {
              console.error(`Revert reason: ${reason}`);
            }

            setTransactionState({
              type: "failed",
              id,
              error: new Error(reason ? `Reverted: ${reason}` : "Failed")
            });
          }
        } catch (rawError) {
          if (cancelled) {
            return;
          }

          console.error(`Failed to get receipt for tx ${txHash}`);
          console.error(rawError);

          setTransactionState({
            type: "failed",
            id,
            error: new Error("Failed")
          });
        }
      };

      console.log(`Start monitoring tx ${txHash}`);
      waitForConfirmation();

      return () => {
        if (!finished) {
          setTransactionState({ type: "idle" });
          console.log(`Cancel monitoring tx ${txHash}`);
          cancelled = true;
        }
      };
    }
  }, [provider, id, tx, setTransactionState]);

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot" && id) {
      // hack: the txn confirmed state lasts 5 seconds which blocks other states, review with Dani
      setTransactionState({ type: "confirmed", id });
    }
  }, [transactionState.type, setTransactionState, id]);

  const isIdle = useMemo(() => transactionState.type === "idle", [transactionState.type]);

  useEffect(() => {
    setOpen(!isIdle);
  }, [isIdle]);

  return (
    <Dialog
      disableClose
      sx={{ width: 468, bg: "#000000" }}
      open={open}
      onExited={() => setTransactionState({ type: "idle" })}
      onClose={() => setOpen(false)}
    >
      <Flex
        sx={{
          alignItems: "center",
          flexDirection: "column",
          p: 3,
          pl: 4
        }}
      >
        <Text sx={{ fontSize: 22, fontWeight: 600, mb: 50, minHeight: 33 }}>
          {getTransactionTitle(transactionState)}
        </Text>
        {getTransactionImage(transactionState)}

        {["idle", "waitingForApproval"].includes(transactionState.type) && (
          <Text>RSK {chainId === 30 ? "Mainnet" : "Testnet"}</Text>
        )}

        <Text
          sx={{
            fontSize: 3,
            color: ["cancelled", "failed"].includes(transactionState.type) ? "danger" : "white",
            textAlign: "center",
            mt: 40
          }}
        >
          {transactionState.type === "waitingForConfirmation" ? (
            "Transaction processing..."
          ) : transactionState.type === "cancelled" ? (
            "You have chosen to reject the transaction Please cancel or retry your transaction"
          ) : transactionState.type === "waitingForApproval" ? (
            <>
              Please confirm the transaction <br /> in your RSK wallet
            </>
          ) : transactionState.type === "failed" ? (
            transactionState.error.message + " Please cancel or retry your transaction"
          ) : (
            "Transaction is Successful"
          )}
          <br />
          <br />
        </Text>

        {(transactionState.type === "cancelled" || transactionState.type === "failed") &&
          transactionState.send && (
            <RetryTransaction send={transactionState.send} id={transactionState.id} />
          )}
      </Flex>
    </Dialog>
  );
};
