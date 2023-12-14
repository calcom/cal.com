import type { ReactNode } from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

import { NO_KEY_VALUE, INVALID_API_KEY } from "./errors";

type CalProviderProps = {
  apiKey: string;
  children: ReactNode;
};

const ApiKeyContext = createContext({ key: "", error: "" });

export const useApiKey = () => useContext(ApiKeyContext);

export function CalProvider({ apiKey, children }: CalProviderProps) {
  const [key, setKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const verifyApiKey = useCallback(
    async (key: string) => {
      try {
        // here we'll call the /me endpoint in v2 to get user profile
        const response = await fetch(`/v2/me?apiKey=${key}`);

        if (response.ok) {
          setKey(apiKey);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage(INVALID_API_KEY);
      }
    },
    [apiKey]
  );

  useEffect(() => {
    if (apiKey.length === 0) {
      setErrorMessage(NO_KEY_VALUE);
    } else {
      verifyApiKey(apiKey);
    }
  }, [verifyApiKey, apiKey]);

  return (
    <ApiKeyContext.Provider value={{ key: key, error: errorMessage }}>{children}</ApiKeyContext.Provider>
  );
}
