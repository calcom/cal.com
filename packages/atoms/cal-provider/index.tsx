import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type CalProviderProps = {
  apiKey: string;
  children: ReactNode;
};

const ApiKeyContext = createContext("");

export const useApiKey = () => useContext(ApiKeyContext);

export function CalProvider({ apiKey, children }: CalProviderProps) {
  return <ApiKeyContext.Provider value={apiKey}>{children}</ApiKeyContext.Provider>;
}
