import { ZeroStore } from "@sovryn-zero/lib-base";
import React, { createContext, useEffect, useState } from "react";

export const ZeroStoreContext = createContext<ZeroStore | undefined>(undefined);

type ZeroStoreProviderProps = {
  store: ZeroStore;
  loader?: React.ReactNode;
};

export const ZeroStoreProvider: React.FC<ZeroStoreProviderProps> = ({
  store,
  loader,
  children
}) => {
  const [loadedStore, setLoadedStore] = useState<ZeroStore>();

  useEffect(() => {
    store.onLoaded = () => setLoadedStore(store);
    const stop = store.start();

    return () => {
      store.onLoaded = undefined;
      setLoadedStore(undefined);
      stop();
    };
  }, [store]);

  if (!loadedStore) {
    return <>{loader}</>;
  }

  return <ZeroStoreContext.Provider value={loadedStore}>{children}</ZeroStoreContext.Provider>;
};
