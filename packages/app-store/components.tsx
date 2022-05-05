import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import Button from "@calcom/ui/Button";

import { InstallAppButtonProps } from "./types";

export const InstallAppButtonMap = {
  // examplevideo: dynamic(() => import("./_example/components/InstallAppButton")),
  applecalendar: dynamic(() => import("./applecalendar/components/InstallAppButton")),
  caldavcalendar: dynamic(() => import("./caldavcalendar/components/InstallAppButton")),
  googlecalendar: dynamic(() => import("./googlecalendar/components/InstallAppButton")),
  hubspotothercalendar: dynamic(() => import("./hubspotothercalendar/components/InstallAppButton")),
  office365calendar: dynamic(() => import("./office365calendar/components/InstallAppButton")),
  slackmessaging: dynamic(() => import("./slackmessaging/components/InstallAppButton")),
  stripepayment: dynamic(() => import("./stripepayment/components/InstallAppButton")),
  tandemvideo: dynamic(() => import("./tandemvideo/components/InstallAppButton")),
  zoomvideo: dynamic(() => import("./zoomvideo/components/InstallAppButton")),
  office365video: dynamic(() => import("./office365video/components/InstallAppButton")),
  wipemycalother: dynamic(() => import("./wipemycalother/components/InstallAppButton")),
  zapier: dynamic(() => import("./zapier/components/InstallAppButton")),
  jitsivideo: dynamic(() => import("./jitsivideo/components/InstallAppButton")),
  huddle01video: dynamic(() => import("./huddle01video/components/InstallAppButton")),
  metamask: dynamic(() => import("./metamask/components/InstallAppButton")),
  giphy: dynamic(() => import("./giphy/components/InstallAppButton")),
  spacebookingother: dynamic(() => import("./spacebooking/components/InstallAppButton")),
};

export const InstallAppButton = (
  props: {
    type: App["type"];
  } & InstallAppButtonProps
) => {
  const { status } = useSession();
  const { t } = useLocale();
  let appName = props.type.replace(/_/g, "");
  let InstallAppButtonComponent = InstallAppButtonMap[appName as keyof typeof InstallAppButtonMap];
  /** So we can either call it by simple name (ex. `slack`, `giphy`) instead of
   * `slackmessaging`, `giphyother` while maintaining retro-compatibility. */
  if (!InstallAppButtonComponent) {
    [appName] = props.type.split("_");
    InstallAppButtonComponent = InstallAppButtonMap[appName as keyof typeof InstallAppButtonMap];
  }
  if (!InstallAppButtonComponent) return null;
  if (status === "unauthenticated")
    return (
      <InstallAppButtonComponent
        render={() => (
          <Button
            data-testid="install-app-button"
            color="primary"
            href={`${WEBAPP_URL}/auth/login?callbackUrl=${WEBAPP_URL + location.pathname + location.search}`}>
            {t("install_app")}
          </Button>
        )}
        onChanged={props.onChanged}
      />
    );
  return <InstallAppButtonComponent render={props.render} onChanged={props.onChanged} />;
};
