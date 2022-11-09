import { useEffect, useReducer } from "react";

import { ZeroStoreState } from "@sovryn-zero/lib-base";

import { equals } from "../utils/equals";
import { useZeroStore } from "./useZeroStore";

export const useZeroSelector = <S, T>(select: (state: ZeroStoreState<T>) => S): S => {
  const store = useZeroStore<T>();
  const [, rerender] = useReducer(() => ({}), {});

  useEffect(
    () =>
      store.subscribe(({ newState, oldState }) => {
        if (!equals(select(newState), select(oldState))) {
          rerender();
        }
      }),
    [store, select]
  );

  return select(store.state);
};
