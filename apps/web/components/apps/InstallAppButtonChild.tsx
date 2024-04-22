import { useRouter } from "next/navigation";

import { doesAppSupportTeamInstall } from "@calcom/app-store/utils";
import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { AppOnboardingSteps } from "@calcom/lib/apps/appOnboardingSteps";
import { getAppOnboardingUrl } from "@calcom/lib/apps/getAppOnboardingUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppFrontendPayload } from "@calcom/types/App";
import type { ButtonProps } from "@calcom/ui";
import { Button } from "@calcom/ui";

export const InstallAppButtonChild = ({
  userAdminTeams,
  addAppMutationInput,
  appCategories,
  multiInstall,
  credentials,
  concurrentMeetings,
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
} & ButtonProps) => {
  const { t } = useLocale();
  const router = useRouter();

  const shouldDisableInstallation = !multiInstall ? !!(credentials && credentials.length) : false;

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
