import useAddAppMutation from "@calcom/app-store/_utils/useAddAppMutation";
import { doesAppSupportTeamInstall } from "@calcom/app-store/utils";
import { Spinner } from "@calcom/features/calendars/weeklyview/components/spinner/Spinner";
import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppFrontendPayload } from "@calcom/types/App";
import type { ButtonProps } from "@calcom/ui";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  showToast,
} from "@calcom/ui";

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
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="install-app-button"
          {...props}
          // @TODO: Overriding color and size prevent us from
          // having to duplicate InstallAppButton for now.
          color="primary"
          size="base">
          {multiInstall ? t("install_another") : t("install_app")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          className="w-auto"
          onInteractOutside={(event) => {
            if (mutation.isLoading) event.preventDefault();
          }}>
          {mutation.isLoading && (
            <div className="z-1 fixed inset-0 flex items-center justify-center">
              <Spinner />
            </div>
          )}
          <DropdownMenuLabel>{t("install_app_on")}</DropdownMenuLabel>
          {userAdminTeams.map((team) => {
            const isInstalled =
              credentials &&
              credentials.some((credential) =>
                credential?.teamId ? credential?.teamId === team.id : credential.userId === team.id
              );

            return (
              <DropdownItem
                className="flex"
                type="button"
                data-testid={team.isUser ? "install-app-button-personal" : "anything else"}
                key={team.id}
                disabled={isInstalled}
                StartIcon={(props) => (
                  <Avatar
                    alt={team.logo || ""}
                    imageSrc={team.logo || `${CAL_URL}/${team.logo}/avatar.png`} // if no image, use default avatar
                    size="sm"
                    {...props}
                  />
                )}
                onClick={() => {
                  mutation.mutate(
                    team.isUser ? addAppMutationInput : { ...addAppMutationInput, teamId: team.id }
                  );
                }}>
                <p>
                  {t(team.name)} {isInstalled && `(${t("installed")})`}
                </p>
              </DropdownItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
};
