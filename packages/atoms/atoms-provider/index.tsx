import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type AtomsProviderProps = {
  apiKey: string;
  children: ReactNode;
};

const ApiKeyContext = createContext("");

export const useApiKey = () => useContext(ApiKeyContext);

export function AtomsProvider({ apiKey, children }: AtomsProviderProps) {
  return <ApiKeyContext.Provider value={apiKey}>{children}</ApiKeyContext.Provider>;
}
