import { useRouter } from "next/navigation";

import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { doesAppSupportTeamInstall } from "@calcom/app-store/utils";
import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppFrontendPayload } from "@calcom/types/App";
import type { ButtonProps } from "@calcom/ui";
import { Button, showToast } from "@calcom/ui";

export const InstallAppButtonChild = ({
  userAdminTeams,
  addAppMutationInput,
  appCategories,
  multiInstall,
  credentials,
  concurrentMeetings,
  dirName,
  paid,
  ...props
}: {
  userAdminTeams?: UserAdminTeams;
  addAppMutationInput: { type: AppFrontendPayload["type"]; variant: string; slug: string };
  appCategories: string[];
  multiInstall?: boolean;
  credentials?: RouterOutputs["viewer"]["appCredentialsByType"]["credentials"];
  concurrentMeetings?: boolean;
  paid?: AppFrontendPayload["paid"];
  dirName: string | undefined;
} & ButtonProps) => {
  const { t } = useLocale();
  const router = useRouter();

  const mutation = useAddAppMutation(null, {
    onSuccess: (data) => {
      if (data?.setupPending) return;
      showToast(t("app_successfully_installed"), "success");
    },
    onError: (error) => {
      if (error instanceof Error) showToast(error.message || t("app_could_not_be_installed"), "error");
    },
  });
  const shouldDisableInstallation = !multiInstall ? !!(credentials && credentials.length) : false;
  // const appMetadata = appStoreMetadata[dirName as keyof typeof appStoreMetadata];
  // const redirectToAppOnboarding = useMemo(() => shouldRedirectToAppOnboarding(appMetadata), [appMetadata]);

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

  if (
    !userAdminTeams?.length ||
    !doesAppSupportTeamInstall({ appCategories, concurrentMeetings, isPaid: !!paid })
  ) {
    return (
      <Button
        data-testid="install-app-button"
        {...props}
        // @TODO: Overriding color and size prevent us from
        // having to duplicate InstallAppButton for now.
        color="primary"
        disabled={shouldDisableInstallation}
        size="base">
        {multiInstall ? t("install_another") : t("install_app")}
      </Button>
    );
  }

  return (
    <Button
      data-testid="install-app-button"
      disabled={shouldDisableInstallation}
      onClick={() => {
        router.push(
          getAppOnboardingUrl({ slug: addAppMutationInput.slug, step: AppOnboardingSteps.ACCOUNTS_STEP })
        );
      }}
      color="primary"
      size="base"
      {...props}>
      {t("install_app")}
    </Button>
  );
};
