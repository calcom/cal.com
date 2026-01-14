import type { ReactNode, Dispatch, SetStateAction } from "react";
import { createContext, useState, useContext } from "react";

import CrispChatScript from "./CrispChatScript";

type CrispChatContextType = { active: boolean; setActive: Dispatch<SetStateAction<boolean>> };

const CrispChatContext = createContext<CrispChatContextType>({
  active: false,
  setActive: () => undefined,
});

interface CrispChatProviderProps {
  children: ReactNode;
}

export const useCrispChat = () => useContext(CrispChatContext);

export default function CrispChatProvider(props: CrispChatProviderProps) {
  const [active, setActive] = useState(true);
  return (
    <CrispChatContext.Provider value={{ active, setActive }}>
      {props.children}
      {active && <CrispChatScript />}
    </CrispChatContext.Provider>
  );
}
