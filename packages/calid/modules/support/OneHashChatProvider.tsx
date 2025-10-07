import type { ReactNode, Dispatch, SetStateAction } from "react";
import { createContext, useState, useContext } from "react";

import OneHashChatScript from "./OneHashChatScript";

type OneHashChatContextType = { active: boolean; setActive: Dispatch<SetStateAction<boolean>> };

const OneHashChatContext = createContext<OneHashChatContextType>({
  active: false,
  setActive: () => undefined,
});

interface OneHashChatProviderProps {
  children: ReactNode;
}

export const useOneHashChat = () => useContext(OneHashChatContext);

export default function OneHashChatProvider(props: OneHashChatProviderProps) {
  const [active, setActive] = useState(true);
  return (
    <OneHashChatContext.Provider value={{ active, setActive }}>
      {props.children}
      {active && <OneHashChatScript />}
    </OneHashChatContext.Provider>
  );
}
