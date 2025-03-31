import useApp from "@calcom/lib/hooks/useApp";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { Button } from "@calcom/ui/components/button";
import classNames from "@calcom/ui/classNames";

import useAddAppMutation from "../_utils/useAddAppMutation";
import { InstallAppButton } from "../components";

/**
 * Use this component to allow installing an app from anywhere on the app.
 * Use of this component requires you to remove custom InstallAppButtonComponent so that it can manage the redirection itself
 */
export default function OmniInstallAppButton({
  appId,
  className,
  returnTo,
  teamId,
}: {
  appId: string;
  className: string;
  returnTo?: string;
  teamId?: number;
}) {
  const { t } = useLocale();
  const { data: app } = useApp(appId);
  const utils = trpc.useUtils();

  const mutation = useAddAppMutation(null, {
    returnTo,
    onSuccess: (data) => {
      utils.viewer.apps.appById.invalidate({ appId });
      utils.viewer.apps.integrations.invalidate({
        extendsFeature: "EventType",
        ...(teamId && { teamId }),
      });
      if (data?.setupPending) return;
      showToast(t("app_successfully_installed"), "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
    },
  });

  if (!app) {
    return null;
  }

  return (
    <InstallAppButton
      type={app.type}
      teamsPlanRequired={app.teamsPlanRequired}
      wrapperClassName={classNames("[@media(max-width:260px)]:w-full", className)}
      render={({ useDefaultComponent, ...props }) => {
        if (useDefaultComponent) {
          props = {
            ...props,
            onClick: () => {
              mutation.mutate({
                type: app.type,
                variant: app.variant,
                slug: app.slug,
                ...(teamId && { teamId }),
              });
            },
          };
        }

        return (
          <Button
            loading={mutation.isPending}
            color="secondary"
            className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
            StartIcon="plus"
            {...props}>
            {t("add")}
          </Button>
        );
      }}
    />
  );
}
