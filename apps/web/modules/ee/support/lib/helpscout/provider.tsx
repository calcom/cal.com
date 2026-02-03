import { FC } from "react";
import { LiveChatLoaderProvider } from "react-live-chat-loader";

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => (
  <LiveChatLoaderProvider providerKey={process.env.NEXT_PUBLIC_HELPSCOUT_KEY || ""} provider="helpScout">
    <>{children}</>
  </LiveChatLoaderProvider>
);

export default Provider;
