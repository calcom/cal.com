// lets refactor and move this into packages/lib/hooks/
import { useState, useEffect, useCallback } from "react";

import { localStorage } from "@calcom/lib/webstorage";

const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(initialValue);

  const handleSetState = useCallback(
    (value: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        setState(value);
      } catch (e) {
        console.warn(e);
      }
    },
    [key, setState]
  );

  // Load via useEffect to avoid hydration mismatch
  useEffect(() => {
    try {
      const json = localStorage.getItem(key);
      if (json) {
        setState(JSON.parse(json));
      }
    } catch (e) {
      console.warn(e);
    }
  }, [key]);

  return [state, handleSetState] as const;
};

export default useLocalStorage;
