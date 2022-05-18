import { useCallback, useMemo, useState } from "react";
import { COIN, COIN2 } from "../strings";

export const useNueTokenSelection = () => {
  const [useNueToken, setUseNueToken] = useState(false);
  const borrowedToken = useMemo(() => (useNueToken ? COIN2 : COIN), [useNueToken]);

  const handleSetNueToken = useCallback(() => {
    setUseNueToken(false);
  }, []);

  return {
    useNueToken,
    borrowedToken,
    handleSetNueToken
  };
};
