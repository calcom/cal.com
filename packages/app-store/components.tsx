import { useSession } from "next-auth/react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import Button from "@calcom/ui/Button";

import { InstallAppButtonMap } from "./apps.browser.generated";
import { InstallAppButtonProps } from "./types";

export const InstallAppButton = (
  props: {
    type: App["type"];
  } & InstallAppButtonProps
) => {
  const { status } = useSession();
  const { t } = useLocale();
  const key = deriveAppDictKeyFromType(props.type, InstallAppButtonMap);
  const InstallAppButtonComponent = InstallAppButtonMap[key as keyof typeof InstallAppButtonMap];
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

export { AppConfiguration } from "./_components/AppConfiguration";
