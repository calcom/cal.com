import { classNames } from "@calcom/lib";
import useApp from "@calcom/lib/hooks/useApp";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast } from "@calcom/ui";

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
      //TODO: viewer.appById might be replaced with viewer.apps so that a single query needs to be invalidated.
      utils.viewer.appById.invalidate({ appId });
      utils.viewer.integrations.invalidate({
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
                isOmniInstall: true,
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
