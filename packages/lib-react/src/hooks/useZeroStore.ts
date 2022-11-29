import { useContext } from "react";

import { ZeroStore } from "@sovryn-zero/lib-base";

import { ZeroStoreContext } from "../components/ZeroStoreProvider";

export const useZeroStore = <T>(): ZeroStore<T> => {
  const store = useContext(ZeroStoreContext);

  if (!store) {
    throw new Error("You must provide a ZeroStore via ZeroStoreProvider");
  }

  return store as ZeroStore<T>;
};
