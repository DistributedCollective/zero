import { useCallback, useEffect, useReducer, useRef } from "react";

import { ZeroStoreState } from "@sovryn-zero/lib-base";

import { equals } from "../utils/equals";
import { useZeroStore } from "./useZeroStore";

export type ZeroStoreUpdate<T = unknown> = {
  type: "updateStore";
  newState: ZeroStoreState<T>;
  oldState: ZeroStoreState<T>;
  stateChange: Partial<ZeroStoreState<T>>;
};

export const useZeroReducer = <S, A, T>(
  reduce: (state: S, action: A | ZeroStoreUpdate<T>) => S,
  init: (storeState: ZeroStoreState<T>) => S
): [S, (action: A | ZeroStoreUpdate<T>) => void] => {
  const store = useZeroStore<T>();
  const oldStore = useRef(store);
  const state = useRef(init(store.state));
  const [, rerender] = useReducer(() => ({}), {});

  const dispatch = useCallback(
    (action: A | ZeroStoreUpdate<T>) => {
      const newState = reduce(state.current, action);

      if (!equals(newState, state.current)) {
        state.current = newState;
        rerender();
      }
    },
    [reduce]
  );

  useEffect(() => store.subscribe(params => dispatch({ type: "updateStore", ...params })), [
    store,
    dispatch
  ]);

  if (oldStore.current !== store) {
    state.current = init(store.state);
    oldStore.current = store;
  }

  return [state.current, dispatch];
};
