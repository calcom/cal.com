import dynamic from "next/dynamic";

import type { App } from "@calcom/types/App";

export const AddIntegration = {
  applecalendar: dynamic(() => import("./applecalendar/components/AddIntegration")),
  caldavcalendar: dynamic(() => import("./caldavcalendar/components/AddIntegration")),
};

export const InstallAppButtonMap = {
  applecalendar: dynamic(() => import("./applecalendar/components/InstallAppButton")),
};

export const InstallAppButton = ({ type }: { type: App["type"] }) => {
  const appName = type.replace("_", "") as keyof typeof InstallAppButtonMap;
  const InstallAppButtonComponent = InstallAppButtonMap[appName];
  if (!InstallAppButtonComponent) return null;
  return <InstallAppButtonComponent />;
};
