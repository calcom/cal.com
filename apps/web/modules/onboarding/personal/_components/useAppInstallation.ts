import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

type InstallSuccessCallback = (appSlug: string) => void;

export const useAppInstallation = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [installingAppSlug, setInstallingAppSlug] = useState<string | null>(null);

  const createInstallHandlers = (
    appSlug: string,
    options?: { onSuccess?: InstallSuccessCallback; returnTo?: string }
  ) => {
    return {
      ...(options?.returnTo && { returnTo: options.returnTo }),
      onSuccess: () => {
        setInstallingAppSlug(null);
        utils.viewer.apps.integrations.invalidate();
        showToast(t("app_successfully_installed"), "success");

        options?.onSuccess?.(appSlug);
      },
      onError: (error: unknown) => {
        setInstallingAppSlug(null);
        if (error instanceof Error) {
          showToast(error.message || t("app_could_not_be_installed"), "error");
        }
      },
    };
  };

  return {
    installingAppSlug,
    setInstallingAppSlug,
    createInstallHandlers,
  };
};
