"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppFrontendPayload } from "@calcom/types/App";
import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";

export const InstallAppButtonChild = ({
  multiInstall,
  credentials,
  paid,
  ...props
}: {
  multiInstall?: boolean;
  credentials?: RouterOutputs["viewer"]["apps"]["appCredentialsByType"]["credentials"];
  paid?: AppFrontendPayload["paid"];
} & ButtonProps) => {
  const { t } = useLocale();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const shouldDisableInstallation = !multiInstall ? !!(credentials && credentials.length) : false;

  if (!isClient) {
    return (
      <Button data-testid="install-app-button" {...props} disabled={true} color="primary" size="base">
        {t("install_app")}
      </Button>
    );
  }

  // Paid apps don't support team installs at the moment
  // Also, cal.ai(the only paid app at the moment) doesn't support team install either
  if (paid) {
    return (
      <Button
        data-testid="install-app-button"
        {...props}
        disabled={shouldDisableInstallation}
        color="primary"
        size="base">
        {paid.trial ? t("start_paid_trial") : t("subscribe")}
      </Button>
    );
  }

  return (
    <Button
      data-testid="install-app-button"
      {...props}
      disabled={shouldDisableInstallation}
      color="primary"
      size="base">
      {multiInstall ? t("install_another") : t("install_app")}
    </Button>
  );
};
