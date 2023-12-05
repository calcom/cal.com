import type { FC } from "react";
import { LiveChatLoaderProvider } from "react-live-chat-loader";

import { AppConfig } from "@calcom/web/app-config";

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => (
  <LiveChatLoaderProvider providerKey={AppConfig.env.NEXT_PUBLIC_HELPSCOUT_KEY || ""} provider="helpScout">
    <>{children}</>
  </LiveChatLoaderProvider>
);

export default Provider;
