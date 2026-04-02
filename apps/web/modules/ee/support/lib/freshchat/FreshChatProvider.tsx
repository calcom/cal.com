import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState } from "react";
import FreshChatScript from "./FreshChatScript";

type FreshChatContextType = { active: boolean; setActive: Dispatch<SetStateAction<boolean>> };

const FreshChatContext = createContext<FreshChatContextType>({ active: false, setActive: () => undefined });

interface FreshChatProviderProps {
  children: ReactNode;
}

export const useFreshChat = () => useContext(FreshChatContext);

export default function FreshChatProvider(props: FreshChatProviderProps) {
  const [active, setActive] = useState(false);

  return (
    <FreshChatContext.Provider value={{ active, setActive }}>
      {props.children}
      {active && <FreshChatScript />}
    </FreshChatContext.Provider>
  );
}
