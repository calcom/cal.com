import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

import { NEXT_PUBLIC_BASE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import Button from "@calcom/ui/Button";

import { InstallAppButtonProps } from "./types";

export const AddIntegration = {
  applecalendar: dynamic(() => import("./applecalendar/components/AddIntegration")),
  caldavcalendar: dynamic(() => import("./caldavcalendar/components/AddIntegration")),
};

export const InstallAppButtonMap = {
  applecalendar: dynamic(() => import("./applecalendar/components/InstallAppButton")),
  caldavcalendar: dynamic(() => import("./caldavcalendar/components/InstallAppButton")),
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
      <Button
        href={`${NEXT_PUBLIC_BASE_URL}/auth/login?callbackUrl=${
          NEXT_PUBLIC_BASE_URL + location.pathname + location.search
        }`}
        {...props.buttonProps}>
        {t("install_app")}
      </Button>
    );
  return <InstallAppButtonComponent buttonProps={props.buttonProps} onChanged={props.onChanged} />;
};
