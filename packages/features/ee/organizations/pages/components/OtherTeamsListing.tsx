import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, EmptyScreen, showToast } from "@calcom/ui";
import { EyeOff, Mail, RefreshCcw, UserPlus, Users, Video } from "@calcom/ui/components/icon";

import SkeletonLoaderTeamList from "./../../../teams/components/SkeletonLoaderTeamList";
import OtherTeamList from "./OtherTeamList";

export function OtherTeamsListing() {
  const { t } = useLocale();
  const trpcContext = trpc.useContext();
  const router = useRouter();

  const [inviteTokenChecked, setInviteTokenChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading } = trpc.viewer.organizations.listOtherTeams.useQuery(undefined, {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  const { data: user } = trpc.viewer.me.useQuery();

  const { mutate: inviteMemberByToken } = trpc.viewer.teams.inviteMemberByToken.useMutation({
    onSuccess: (teamName) => {
      trpcContext.viewer.organizations.listOtherTeams.invalidate();
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
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <Video className="h-5 w-5 text-purple-500" />,
      title: "Cal Video" + " " + t("recordings_title"),
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
    if (router.query.token) inviteMemberByToken({ token: router.query.token as string });
    else setInviteTokenChecked(true);
  }, [router, inviteMemberByToken, setInviteTokenChecked]);

  if (isLoading || !inviteTokenChecked) {
    return <SkeletonLoaderTeamList />;
  }

  return (
    <>
      {!!errorMessage && <Alert severity="error" title={errorMessage} />}

      {teams.length > 0 ? (
        <OtherTeamList teams={teams} />
      ) : (
        <EmptyScreen
          headline="Edit TODO:"
          title={t("no_other_teams_found")}
          description={t("no_other_teams_found_description")}
        />
      )}
    </>
  );
}
