import type { FC } from "react";
import { IntercomProvider } from "react-use-intercom";

import { AppConfig } from "@calcom/web/app-config";

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntercomProvider appId={AppConfig.env.NEXT_PUBLIC_INTERCOM_APP_ID || ""}>{children}</IntercomProvider>
);

export default Provider;
