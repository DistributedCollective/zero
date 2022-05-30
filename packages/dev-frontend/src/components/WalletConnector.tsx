import React, { useCallback, useEffect, useReducer, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { AbstractConnector } from "@web3-react/abstract-connector";
import { Button, Text } from "theme-ui";

import { injectedConnector } from "../connectors/injectedConnector";
import { useAuthorizedConnection } from "../hooks/useAuthorizedConnection";

import { WaitListSignup } from "../pages/WaitListSignup";
import { shortenAddress } from "../utils/shortenAddress";
import { checkAccountAccess } from "../utils/whitelist";
import { useLocation } from "react-router-dom";
import { AccessPage } from "../pages/AccessPage";

interface MaybeHasMetaMask {
  ethereum?: {
    isMetaMask?: boolean;
  };
}

type ConnectionState =
  | { type: "inactive" }
  | {
      type: "activating" | "active" | "rejectedByUser" | "alreadyPending" | "failed";
      connector: AbstractConnector;
    };

type ConnectionAction =
  | { type: "startActivating"; connector: AbstractConnector }
  | { type: "fail"; error: Error }
  | { type: "finishActivating" | "retry" | "cancel" | "deactivate" };

const connectionReducer: React.Reducer<ConnectionState, ConnectionAction> = (state, action) => {
  switch (action.type) {
    case "startActivating":
      return {
        type: "activating",
        connector: action.connector
      };
    case "finishActivating":
      return {
        type: "active",
        connector: state.type === "inactive" ? injectedConnector : state.connector
      };
    case "fail":
      if (state.type !== "inactive") {
        return {
          type: action.error.message.match(/user rejected/i)
            ? "rejectedByUser"
            : action.error.message.match(/already pending/i)
            ? "alreadyPending"
            : "failed",
          connector: state.connector
        };
      }
      break;
    case "retry":
      if (state.type !== "inactive") {
        return {
          type: "activating",
          connector: state.connector
        };
      }
      break;
    case "cancel":
      return {
        type: "inactive"
      };
    case "deactivate":
      return {
        type: "inactive"
      };
  }

  console.warn("Ignoring connectionReducer action:");
  console.log(action);
  console.log("  in state:");
  console.log(state);

  return state;
};

export const detectMetaMask = () => (window as MaybeHasMetaMask).ethereum?.isMetaMask ?? false;

type WalletConnectorProps = {
  loader?: React.ReactNode;
};

export const WalletConnector: React.FC<WalletConnectorProps> = ({ children, loader }) => {
  const { activate, deactivate, active, error, account } = useWeb3React<unknown>();
  const triedAuthorizedConnection = useAuthorizedConnection();
  const [connectionState, dispatch] = useReducer(connectionReducer, { type: "inactive" });
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (error) {
      dispatch({ type: "fail", error });
      deactivate();
    }
  }, [error, deactivate]);

  useEffect(() => {
    const checkAccess = async (account: string) => {
      setLoading(true);
      setHasAccess(false);
      try {
        const { data } = await checkAccountAccess(account);
        setHasAccess(!data.access);
      } catch (error) {
        console.log("error:", error);
      } finally {
        setLoading(false);
      }
    };
    if (account) {
      console.log("account:", account);
      checkAccess(account);
    }
  }, [active, account]);

  useEffect(() => {
    if (active) {
      dispatch({ type: "finishActivating" });
    } else {
      dispatch({ type: "deactivate" });
    }
  }, [active]);

  const onClick = useCallback(() => {
    if (active) {
      deactivate();
    } else {
      dispatch({ type: "startActivating", connector: injectedConnector });
      activate(injectedConnector);
    }
  }, [activate, active, deactivate]);

  if (!triedAuthorizedConnection || loading) {
    return <>{loader}</>;
  }

  if (location && location.pathname === "/zero/access") {
    return <AccessPage />;
  }

  if (connectionState.type === "active" && hasAccess) {
    return <>{children}</>;
  }

  return (
    <WaitListSignup>
      <Button
        onClick={onClick}
        sx={{
          width: "174px",
          height: "40px",
          p: 0
        }}
      >
        {!account ? (
          "Connect Wallet"
        ) : (
          <Text as="span" sx={{ fontSize: 2, fontWeight: 600 }}>
            {shortenAddress(account!, 4)}
          </Text>
        )}
      </Button>
      <Text
        as="p"
        sx={{
          fontSize: 2,
          fontWeight: 600,
          color: "danger",
          mt: 2,
          visibility: account && !hasAccess && !loading ? "visible" : "hidden"
        }}
      >
        Sign up above to get added to the waitlist.
      </Text>
    </WaitListSignup>
  );
};
