import { createContext, useContext } from "react";

export const ApiKeyContext = createContext({ key: "", error: "" });

export const useApiKey = () => useContext(ApiKeyContext);
