import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import SkeletonLoaderTeamList from "@calcom/ee/teams/components/SkeletonloaderTeamList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, EmptyScreen, showToast } from "@calcom/ui";

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
          headline={t("no_other_teams_found")}
          title={t("no_other_teams_found")}
          description={t("no_other_teams_found_description")}
        />
      )}
    </>
  );
}
