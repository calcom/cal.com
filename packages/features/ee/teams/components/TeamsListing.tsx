"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import SkeletonLoaderTeamList from "@calcom/features/ee/teams/components/SkeletonloaderTeamList";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import { UpgradeTip } from "../../../tips";
import TeamList from "./TeamList";

type TeamsListingProps = {
  invitationAccepted: boolean;
  orgId: number | null;
  permissions: {
    canCreateTeam: boolean;
  };
  teams: RouterOutputs["viewer"]["teams"]["list"];
  teamNameFromInvite: string | null;
  errorMsgFromInvite: string | null;
};

export function TeamsListing({
  invitationAccepted,
  orgId,
  permissions,
  teams: data,
  teamNameFromInvite,
  errorMsgFromInvite,
}: TeamsListingProps) {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const { t } = useLocale();
  const router = useRouter();

  const teams = useMemo(() => data?.filter((m) => m.accepted && !m.isOrganization) || [], [data]);

  const teamInvites = useMemo(() => data?.filter((m) => !m.accepted && !m.isOrganization) || [], [data]);

  const organizationInvites = (data?.filter((m) => !m.accepted && m.isOrganization) || []).filter(
    (orgInvite) => {
      const isThereASubTeamOfTheOrganizationInInvites = teamInvites.find(
        (teamInvite) => teamInvite.parentId === orgInvite.id
      );
      // Accepting a subteam invite automatically accepts the invite for the parent organization. So, need to show such an organization's invite
      return !isThereASubTeamOfTheOrganizationInInvites;
    }
  );

  const isCreateTeamButtonDisabled = !!(orgId && !permissions.canCreateTeam);

  const features = [
    {
      icon: <Icon name="users" className="h-5 w-5 text-red-500" />,
      title: t("collective_scheduling"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <Icon name="refresh-ccw" className="h-5 w-5 text-blue-500" />,
      title: t("round_robin"),
      description: t("find_the_best_person"),
    },
    {
      icon: <Icon name="user-plus" className="h-5 w-5 text-green-500" />,
      title: t("fixed_round_robin"),
      description: t("add_one_fixed_attendee"),
    },
    {
      icon: <Icon name="mail" className="h-5 w-5 text-orange-500" />,
      title: t("sms_attendee_action"),
      description: t("send_reminder_sms"),
    },
    {
      icon: <Icon name="video" className="h-5 w-5 text-purple-500" />,
      title: `Cal Video ${t("recordings_title")}`,
      description: t("upgrade_to_access_recordings_description"),
    },
    {
      icon: <Icon name="eye-off" className="h-5 w-5 text-indigo-500" />,
      title: t("disable_cal_branding", { appName: APP_NAME }),
      description: t("disable_cal_branding_description", { appName: APP_NAME }),
    },
  ];

  useEffect(() => {
    if (!token) {
      return;
    }

    if (errorMsgFromInvite) {
      showToast(errorMsgFromInvite, "error");
      return;
    }

    if (invitationAccepted) {
      showToast(t("successfully_joined"), "success");
      return;
    }

    if (teamNameFromInvite) {
      showToast(t("team_invite_received", { teamName: teamNameFromInvite }), "success");
      return;
    }
  }, []);

  return (
    <>
      {organizationInvites.length > 0 && (
        <div className="bg-subtle mb-6 rounded-md p-5">
          <Label className="text-emphasis pb-2  font-semibold">{t("pending_organization_invites")}</Label>
          <TeamList orgId={orgId} teams={organizationInvites} pending />
        </div>
      )}

      {teamInvites.length > 0 && (
        <div className="bg-subtle mb-6 rounded-md p-5">
          <Label className="text-emphasis pb-2  font-semibold">{t("pending_invites")}</Label>
          <TeamList orgId={orgId} teams={teamInvites} pending />
        </div>
      )}

      {teams.length > 0 && <TeamList orgId={orgId} teams={teams} />}

      {teams.length === 0 && (
        <UpgradeTip
          plan="team"
          title={t("calcom_is_better_with_team", { appName: APP_NAME })}
          description={t("add_your_team_members")}
          features={features}
          background="/tips/teams"
          buttons={
            !orgId || permissions.canCreateTeam ? (
              <div className="stack-y-2 rtl:space-x-reverse sm:space-x-2">
                <ButtonGroup>
                  <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                    {t("create_team")}
                  </Button>
                  <Button color="minimal" href="https://go.cal.com/teams-video" target="_blank">
                    {t("learn_more")}
                  </Button>
                </ButtonGroup>
              </div>
            ) : (
              <p>{t("org_admins_can_create_new_teams")}</p>
            )
          }
          isParentLoading={<SkeletonLoaderTeamList />}>
          <EmptyScreen
            Icon="users"
            headline={t("create_team_to_get_started")}
            description={t("create_first_team_and_invite_others")}
            buttonRaw={
              <Button
                color="secondary"
                data-testid="create-team-btn"
                disabled={!!isCreateTeamButtonDisabled}
                tooltip={
                  isCreateTeamButtonDisabled ? t("org_admins_can_create_new_teams") : t("create_new_team")
                }
                onClick={() => router.push(`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`)}>
                {t(`create_new_team`)}
              </Button>
            }
          />
        </UpgradeTip>
      )}

      <p className="text-subtle mb-8 mt-4 flex w-full items-center gap-1 text-sm md:justify-center md:text-center">
        <Icon className="hidden sm:block" name="info" /> {t("tip_username_plus")}
      </p>
    </>
  );
}
