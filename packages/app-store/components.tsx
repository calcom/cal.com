import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

import { NEXT_PUBLIC_BASE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import Button from "@calcom/ui/Button";

import { InstallAppButtonProps } from "./types";

export const InstallAppButtonMap = {
  // examplevideo: dynamic(() => import("./_example/components/InstallAppButton")),
  applecalendar: dynamic(() => import("./applecalendar/components/InstallAppButton")),
  caldavcalendar: dynamic(() => import("./caldavcalendar/components/InstallAppButton")),
  googlecalendar: dynamic(() => import("./googlecalendar/components/InstallAppButton")),
  office365calendar: dynamic(() => import("./office365calendar/components/InstallAppButton")),
  stripepayment: dynamic(() => import("./stripepayment/components/InstallAppButton")),
  tandemvideo: dynamic(() => import("./tandemvideo/components/InstallAppButton")),
  zoomvideo: dynamic(() => import("./zoomvideo/components/InstallAppButton")),
  office365video: dynamic(() => import("./office365video/components/InstallAppButton")),
};

export const InstallAppButton = (
  props: {
    type: App["type"];
  } & InstallAppButtonProps
) => {
  const { status } = useSession();
  const { t } = useLocale();
  const appName = props.type.replace("_", "") as keyof typeof InstallAppButtonMap;
  const InstallAppButtonComponent = InstallAppButtonMap[appName];
  if (!InstallAppButtonComponent) return null;
  if (status === "unauthenticated")
    return (
      <InstallAppButtonComponent
        render={() => (
          <Button
            color="primary"
            href={`${NEXT_PUBLIC_BASE_URL}/auth/login?callbackUrl=${
              NEXT_PUBLIC_BASE_URL + location.pathname + location.search
            }`}>
            {t("install_app")}
          </Button>
        )}
        onChanged={props.onChanged}
      />
    );
  return <InstallAppButtonComponent render={props.render} onChanged={props.onChanged} />;
};
