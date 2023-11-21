import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect } from "react";

type CalProviderProps = {
  apiKey: string;
  children: ReactNode;
};

const ApiKeyContext = createContext("");

export const useApiKey = () => useContext(ApiKeyContext);

export function CalProvider({ apiKey, children }: CalProviderProps) {
  const [key, setKey] = useState("");

  useEffect(() => {
    async function verifyKey(key: string) {
      try {
        // here we'll call the /me endpoint in v2 to get user profile
        // v2 is not ready yet though
        const response = await fetch(`/v1/me?apiKey=${key}`);

        if (response.ok) {
          setKey(apiKey);
        }
      } catch (error) {
        console.error(error);
        setKey("invalid_key");
      }
    }

    if (apiKey.length === 0) {
      setKey("no_key");
    } else {
      verifyKey(apiKey);
    }
  }, [apiKey]);

  return <ApiKeyContext.Provider value={key}>{children}</ApiKeyContext.Provider>;
}
