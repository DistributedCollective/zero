import React, { useEffect, useContext, createContext, useCallback, useReducer } from "react";
import { ethers } from "ethers";
import { getChainIdHex, getNetworkIdFromHex, onboard as Web3Onboard } from "./config";
import { AppEvents, initialState, reducer } from "./reducer";

import { AppState, OnboardAPI } from "@web3-onboard/core";
import { currentChainId } from "src/contracts/config";

export const LOCAL_STORAGE_KEYS = {
  SELECTED_WALLET: "selectedWallet",
  WATCHED_WALLETS: "watchedWallets"
};

type ConnectorContextType = {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  isAppReady: boolean;
  walletAddress: string | null;
  walletWatched: string | null;
  walletType: string | null;
  onboard: OnboardAPI | null;

  ensName: string | null;
  ensAvatar: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchAccounts: () => Promise<void>;
  isHardwareWallet: boolean;
  isWalletConnected: boolean;
  chainId: number;
};

const ConnectorContext = createContext<unknown>(null);

export const useConnectorContext = () => {
  return useContext(ConnectorContext) as ConnectorContextType;
};

export const ConnectorContextProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    isAppReady,
    provider,
    signer,
    walletAddress,
    walletWatched,
    ensName,
    ensAvatar,
    onboard,
    walletType,
    chainId
  } = state;

  const updateState = useCallback(
    (update: AppState) => {
      if (update.wallets.length > 0) {
        const wallet = update.wallets[0].accounts[0];

        const { label } = update.wallets[0];
        const { id } = update.wallets[0].chains[0];
        const networkId = getNetworkIdFromHex(id);

        const isSupported = networkId === currentChainId;

        if (!isSupported) {
          // Switch to mainnet ethereum by default
          (async () => {
            // Only switch chains if the user has tab open
            await onboard?.setChain({ chainId: getChainIdHex(currentChainId) });
          })();
        } else {
          const network = {
            id: networkId,
            name: "RSK " + (networkId === 30 ? "Mainnet" : "Testnet")
          };

          const provider = new ethers.providers.Web3Provider(update.wallets[0].provider, {
            name: network.name,
            chainId: networkId
          });

          const signer = provider.getSigner();

          dispatch({
            type: AppEvents.CONFIG_UPDATE,
            payload: {
              address: wallet.address,
              walletWatched: null,
              walletType: label,
              provider,
              signer,
              ensName: wallet?.ens?.name || null,
              ensAvatar: wallet?.ens?.avatar?.url || null,
              chainId: networkId
            }
          });

          const connectedWallets = update.wallets.map(({ label }) => label);
          localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_WALLET, JSON.stringify(connectedWallets));
        }
      } else {
        dispatch({ type: AppEvents.WALLET_DISCONNECTED });
      }
    },
    [onboard]
  );

  useEffect(() => {
    dispatch({ type: AppEvents.APP_READY, payload: Web3Onboard }); //
  }, []);

  useEffect(() => {
    const previousWalletsSerialised = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_WALLET);
    const previousWallets: string[] | null = previousWalletsSerialised
      ? JSON.parse(previousWalletsSerialised)
      : null;

    if (onboard && previousWallets) {
      (async () => {
        try {
          await onboard.connectWallet({
            autoSelect: {
              label: previousWallets[0],
              disableModals: true
            }
          });
        } catch (error) {
          console.log(error);
        }
      })();
    }

    if (onboard) {
      const state = onboard.state.select();
      const { unsubscribe } = state.subscribe(updateState);

      return () => {
        if (process.env.NODE_ENV !== "development" && unsubscribe) unsubscribe();
      };
    }

    // Always keep this hook with the single dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboard]);

  const connectWallet = useCallback(async () => {
    try {
      if (onboard) {
        await onboard.connectWallet();
      }
    } catch (e) {
      console.log(e);
    }
  }, [onboard]);

  const disconnectWallet = useCallback(async () => {
    try {
      if (onboard) {
        const [primaryWallet] = onboard.state.get().wallets;
        onboard.disconnectWallet({ label: primaryWallet?.label });
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_WALLET);
      }
    } catch (e) {
      console.log(e);
    }
  }, [onboard]);

  const switchAccounts = useCallback(async () => {
    try {
      if (onboard) {
        await onboard.connectWallet({
          autoSelect: { label: onboard.state.get()?.wallets[0]?.label, disableModals: false }
        });
      }
    } catch (e) {
      console.log(e);
    }
  }, [onboard]);

  const isHardwareWallet = useCallback(() => {
    if (onboard) {
      const walletLabel = onboard.state.get()?.wallets[0]?.label || null;
      return walletLabel === "Trezor" || walletLabel === "Ledger";
    }
    return false;
  }, [onboard]);

  return (
    <ConnectorContext.Provider
      value={{
        ensAvatar,
        ensName,
        connectWallet,
        disconnectWallet,
        switchAccounts,
        isHardwareWallet,
        isAppReady,
        provider,
        signer,
        walletAddress,
        walletWatched,
        onboard,
        walletType,
        isWalletConnected: !!walletAddress,
        chainId
      }}
    >
      {children}
    </ConnectorContext.Provider>
  );
};
