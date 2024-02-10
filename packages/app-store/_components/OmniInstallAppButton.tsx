import { useRouter } from "next/navigation";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { classNames } from "@calcom/lib";
import { getAppOnboardingRedirectUrl } from "@calcom/lib/getAppOnboardingRedirectUrl";
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
  teamId,
}: {
  appId: string;
  className: string;
  returnTo?: string;
  teamId?: number;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { data: app } = useApp(appId);
  const utils = trpc.useContext();

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

  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
  const hasEventTypes = appMetadata.extendsFeature == "EventType";
  const isOAuth = appMetadata.isOAuth;
  const redirectToAppOnboarding = hasEventTypes || isOAuth;

  return (
    <InstallAppButton
      type={app.type}
      teamsPlanRequired={app.teamsPlanRequired}
      wrapperClassName={classNames("[@media(max-width:260px)]:w-full", className)}
      render={({ useDefaultComponent, ...props }) => {
        if (useDefaultComponent && !redirectToAppOnboarding) {
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

        if (redirectToAppOnboarding) {
          props = {
            ...props,
            onClick: () => {
              router.push(getAppOnboardingRedirectUrl(app.slug, teamId));
            },
          };
        }

        return (
          <Button
            loading={mutation.isPending}
            color="secondary"
            className="[@media(max-width:260px)]:w-full [@media(max-width:260px)]:justify-center"
            StartIcon={Plus}
            {...props}>
            {t("add")}
          </Button>
        );
      }}
    />
  );
}
