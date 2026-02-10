import { useContext } from "react";

import { WebPushContext } from "../components/WebPushContext";

export function useWebPush() {
  const context = useContext(WebPushContext);
  if (!context) {
    throw new Error("useWebPush must be used within a WebPushProvider");
  }
  return context;
}
