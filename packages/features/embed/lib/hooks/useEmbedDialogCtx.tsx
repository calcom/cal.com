import { createContext, useContext } from "react";
import React, { useState } from "react";

import type { EmbedState } from "../../types";

type EmbedDialogContextType = {
  embedState: EmbedState;
  setEmbedState: React.Dispatch<React.SetStateAction<EmbedState>>;
};

const EmbedDialogContext = createContext<EmbedDialogContextType | null>(null);

export function EmbedDialogProvider({ children }: { children: React.ReactNode }) {
  const [embedState, setEmbedState] = useState<EmbedState>(null);
  return (
    <EmbedDialogContext.Provider value={{ embedState, setEmbedState }}>
      {children}
    </EmbedDialogContext.Provider>
  );
}

export function useEmbedDialogCtx(noQueryParamMode: boolean) {
  const context = useContext(EmbedDialogContext);
  if (noQueryParamMode) {
    if (!context) {
      throw new Error("useEmbedDialogCtx must be used within an EmbedDialogProvider");
    }
    return context;
  } else {
    return {
      embedState: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      setEmbedState: ((_state: EmbedState) => {}) as React.Dispatch<React.SetStateAction<EmbedState>>,
    };
  }
}
