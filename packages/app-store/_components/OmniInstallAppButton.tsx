import { classNames } from "@calcom/lib";
import useApp from "@calcom/lib/hooks/useApp";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

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
}: {
  appId: string;
  className: string;
  returnTo?: string;
}) {
  const { t } = useLocale();
  const { data: app } = useApp(appId);
  const utils = trpc.useContext();

  const mutation = useAddAppMutation(null, {
    returnTo,
    onSuccess: (data) => {
      //TODO: viewer.appById might be replaced with viewer.apps so that a single query needs to be invalidated.
      utils.viewer.appById.invalidate({ appId });
      utils.viewer.apps.invalidate({ extendsFeature: "EventType" });
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
      isProOnly={app.isProOnly}
      wrapperClassName={classNames("[@media(max-width:260px)]:w-full", className)}
      render={({ useDefaultComponent, ...props }) => {
        if (useDefaultComponent) {
          props = {
            ...props,
            onClick: () => {
              mutation.mutate({ type: app.type, variant: app.variant, slug: app.slug, isOmniInstall: true });
            },
          };
        }

        return (
          <Button
            loading={mutation.isLoading}
            color="secondary"
            className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
            StartIcon={Plus}
            {...props}>
            {t("install")}
          </Button>
        );
      }}
    />
  );
}
