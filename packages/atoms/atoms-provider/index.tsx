import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type AtomsProviderProps = {
  apiKey: string;
  children: ReactNode;
};

// context for the api key value
const ApiKeyContext = createContext("");

// custom hook to simplify using the context
export const useApiKey = () => useContext(ApiKeyContext);

export function AtomsProvider({ apiKey, children }: AtomsProviderProps) {
  return <ApiKeyContext.Provider value={apiKey}>{children}</ApiKeyContext.Provider>;
}
