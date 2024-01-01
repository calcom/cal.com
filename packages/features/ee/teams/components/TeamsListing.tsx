import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, ButtonGroup, EmptyScreen, Label, showToast } from "@calcom/ui";
import { EyeOff, Mail, RefreshCcw, UserPlus, Users, Video } from "@calcom/ui/components/icon";

import { UpgradeTip } from "../../../tips";
import SkeletonLoaderTeamList from "./SkeletonloaderTeamList";
import TeamList from "./TeamList";

export function TeamsListing() {
  const searchParams = useCompatSearchParams();
  const token = searchParams?.get("token");
  const { t } = useLocale();
  const trpcContext = trpc.useContext();
  const router = useRouter();

  const [inviteTokenChecked, setInviteTokenChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading } = trpc.viewer.teams.list.useQuery(undefined, {
    enabled: inviteTokenChecked,
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  const { data: user } = trpc.viewer.me.useQuery();

  const { mutate: inviteMemberByToken } = trpc.viewer.teams.inviteMemberByToken.useMutation({
    onSuccess: (teamName) => {
      trpcContext.viewer.teams.list.invalidate();
      showToast(t("team_invite_received", { teamName }), "success");
    },
    onError: (e) => {
      showToast(e.message, "error");
    },
    onSettled: () => {
      setInviteTokenChecked(true);
    },
  });

  const teams = useMemo(() => data?.filter((m) => m.accepted) || [], [data]);
  const invites = useMemo(() => data?.filter((m) => !m.accepted) || [], [data]);

  const isCreateTeamButtonDisabled = !!(user?.organizationId && !user?.organization?.isOrgAdmin);

  const features = [
    {
      icon: <Users className="h-5 w-5 text-red-500" />,
      title: t("collective_scheduling"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <RefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("round_robin"),
      description: t("find_the_best_person"),
    },
    {
      icon: <UserPlus className="h-5 w-5 text-green-500" />,
      title: t("fixed_round_robin"),
      description: t("add_one_fixed_attendee"),
    },
    {
      icon: <Mail className="h-5 w-5 text-orange-500" />,
      title: t("sms_attendee_action"),
      description: t("send_reminder_sms"),
    },
    {
      icon: <Video className="h-5 w-5 text-purple-500" />,
      title: `Cal Video ${t("recordings_title")}`,
      description: t("upgrade_to_access_recordings_description"),
    },
    {
      icon: <EyeOff className="h-5 w-5 text-indigo-500" />,
      title: t("disable_cal_branding", { appName: APP_NAME }),
      description: t("disable_cal_branding_description", { appName: APP_NAME }),
    },
  ];

  useEffect(() => {
    if (!router) return;
    if (token) inviteMemberByToken({ token });
    else setInviteTokenChecked(true);
  }, [router, inviteMemberByToken, setInviteTokenChecked, token]);

  if (isLoading || !inviteTokenChecked) {
    return <SkeletonLoaderTeamList />;
  }

  return (
    <>
      {!!errorMessage && <Alert severity="error" title={errorMessage} />}

      {invites.length > 0 && (
        <div className="bg-subtle mb-6 rounded-md p-5">
          <Label className="text-emphasis pb-2  font-semibold">{t("pending_invites")}</Label>
          <TeamList teams={invites} pending />
        </div>
      )}
      <UpgradeTip
        plan="team"
        title={t("calcom_is_better_with_team", { appName: APP_NAME })}
        description="add_your_team_members"
        features={features}
        background="/tips/teams"
        buttons={
          !user?.organizationId || user?.organization.isOrgAdmin ? (
            <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
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
        }>
        {teams.length > 0 ? (
          <TeamList teams={teams} />
        ) : (
          <EmptyScreen
            Icon={Users}
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
        )}
      </UpgradeTip>
    </>
  );
}
