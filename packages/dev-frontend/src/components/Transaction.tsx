import React, { useState, useContext, useEffect, useCallback, useMemo } from "react";
import { Flex, Text, Image, Button } from "theme-ui";
import { Provider, TransactionResponse, TransactionReceipt } from "@ethersproject/abstract-provider";
import { hexDataSlice, hexDataLength } from "@ethersproject/bytes";
import { defaultAbiCoder } from "@ethersproject/abi";

import "react-circular-progressbar/dist/styles.css";

import { EthersTransactionOverrides } from "@sovryn-zero/lib-ethers";
import { SentLiquityTransaction, LiquityReceipt } from "@sovryn-zero/lib-base";

import { useLiquity } from "../hooks/LiquityContext";

import { Tooltip, TooltipProps, Hoverable } from "./Tooltip";
import { Dialog } from "./Dialog";
import { useConnectorContext } from "./Connector";

type TransactionIdle = {
  type: "idle";
  disableCheck?: boolean;
  title?: string;
  description?: string;
};

type TransactionFailed = {
  type: "failed";
  id: string;
  error: Error;
  send?: TransactionFunction;
  disableCheck?: boolean;
  title?: string;
  description?: string;
};

type TransactionWaitingForApproval = {
  type: "waitingForApproval";
  id: string;
  disableCheck?: boolean;
  title?: string;
  description?: string;
};

type TransactionCancelled = {
  type: "cancelled";
  id: string;
  send?: TransactionFunction;
  disableCheck?: boolean;
  title?: string;
  description?: string;
};

type TransactionWaitingForConfirmations = {
  type: "waitingForConfirmation";
  id: string;
  tx: SentTransaction;
  disableCheck?: boolean;
  title?: string;
  description?: string;
};

type TransactionConfirmed = {
  type: "confirmed";
  id: string;
  disableCheck?: boolean;
  title?: string;
  description?: string;
};

type TransactionConfirmedOneShot = {
  type: "confirmedOneShot";
  id: string;
  disableCheck?: boolean;
  title?: string;
  description?: string;
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

export const useTransactionState = () => {
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

export const hasMessage = (error: unknown): error is { message: string } =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof (error as { message: unknown }).message === "string";

export const catchTx = (error: any) => {
  if (!hasMessage(error) || !error.message.includes("invalid hash")) throw error;
};

export const thenTx = (tx: any) => {
  if (tx) return tx;
  return {
    wait: () => new Promise(res => setTimeout(res, 45000))
  };
};

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
      const tx = await send().catch(catchTx).then(thenTx);

      setTransactionState({
        type: "waitingForConfirmation",
        id,
        tx
      });

      if (!tx.rawSentTransaction) {
        await tx?.wait();

        setTransactionState({
          type: "confirmedOneShot",
          id
        });
      }
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
  if (tx.title) return tx.title;
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

const getTransactionDescription = (tx: TransactionState) => {
  if (tx.description) return tx.description;
  switch (tx.type) {
    case "idle":
      return "";
    case "waitingForConfirmation":
      return "Transaction processing...";
    case "cancelled":
      return "You have chosen to reject the transaction Please cancel or retry your transaction";
    case "waitingForApproval":
      return "Please confirm the transaction in your RSK wallet";
    case "failed":
      return tx.error.message + " Please cancel or retry your transaction";
    case "confirmed":
      return "Transaction is Successful";
    case "confirmedOneShot":
      return "Transaction is Successful";
  }
};

const getTransactionImage = (type: string) => {
  switch (type) {
    case "failed":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src={process.env.PUBLIC_URL + "/images/failed-tx.svg"}
        />
      );
    case "cancelled":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src={process.env.PUBLIC_URL + "/images/failed-tx.svg"}
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
          src={process.env.PUBLIC_URL + "/images/pending-tx.svg"}
        />
      );

    case "confirmed":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src={process.env.PUBLIC_URL + "/images/confirm-tx.svg"}
        />
      );
    case "confirmedOneShot":
      return (
        <Image
          sx={{
            mb: 20,
            width: 85
          }}
          src={process.env.PUBLIC_URL + "/images/confirm-tx.svg"}
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
          src={process.env.PUBLIC_URL + "/images/rsk.svg"}
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
  const { chainId } = useConnectorContext();
  const [open, setOpen] = useState(false);

  const id = transactionState.type !== "idle" ? transactionState.id : undefined;
  const tx = transactionState.type === "waitingForConfirmation" ? transactionState.tx : undefined;
  const disableCheck = !!transactionState.disableCheck;

  useEffect(() => {
    if (id && tx && !disableCheck && tx?.rawSentTransaction) {
      let cancelled = false;
      let finished = false;

      const txHash = tx.rawSentTransaction.hash;

      const waitForConfirmation = async () => {
        try {
          const receipt = await tx?.waitForReceipt();

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
  }, [provider, id, tx, setTransactionState, disableCheck]);

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
        {getTransactionImage(transactionState.type)}

        {["idle", "waitingForApproval"].includes(transactionState.type) && (
          <Text>RSK {chainId === 30 ? "Mainnet" : "Testnet"}</Text>
        )}

        <Text
          sx={{
            fontSize: 3,
            color: ["cancelled", "failed"].includes(transactionState.type) ? "danger" : "white",
            textAlign: "center",
            mt: 40,
            wordBreak: "keep-all"
          }}
        >
          {getTransactionDescription(transactionState)}
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
