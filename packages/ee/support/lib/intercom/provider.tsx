import { FC } from "react";
import { IntercomProvider } from "react-use-intercom";

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntercomProvider appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID || ""}>{children}</IntercomProvider>
);

export default Provider;
