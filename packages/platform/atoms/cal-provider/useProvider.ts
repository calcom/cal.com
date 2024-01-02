import { createContext, useContext } from "react";

import type http from "../../lib/http";

export interface IAtomsContextOptions {
  refreshUrl?: string;
  apiUrl: string;
}

export interface IAtomsContext {
  clientId: string;
  accessToken?: string;
  options: IAtomsContextOptions;
  error?: string;
  getClient: () => typeof http | void;
  refreshToken?: string;
}

export const AtomsContext = createContext({
  clientId: "",
  accessToken: "",
  options: { refreshUrl: "", apiUrl: "" },
  error: "",
  getClient: () => {
    return;
  },
} as IAtomsContext);

export const useAtomsContext = () => useContext(AtomsContext);
