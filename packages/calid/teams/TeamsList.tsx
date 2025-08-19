"use client";

import { Button } from "@calid/features/ui/components/button";
import { toast } from "@calid/features/ui/components/toast/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

type TeamsListProps = {
  teams: RouterOutputs["viewer"]["teams"]["list"];
  teamNameFromInvitation: string | null;
  errorMsgFromInvitation: string | null;
};

export function TeamsList({ teams: data, teamNameFromInvitation, errorMsgFromInvitation }: TeamsListProps) {
  const { t } = useLocale();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  const router = useRouter();
  const teams = useMemo(() => data?.filter((team) => team.accepted) || [], [data]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (teamNameFromInvitation) {
      toast({
        title: t("team_invite_accepted", { teamName: teamNameFromInvitation }),
        description: t("you_can_now_manage_team"),
      });
    }
    if (errorMsgFromInvitation) {
      toast({
        title: t("error"),
        description: errorMsgFromInvitation,
        variant: "destructive",
      });
    }
  }, []);

  return (
    <>
      {teams.length === 0 && (
        <EmptyScreen
          Icon="users"
          headline={t("create_team_to_get_started")}
          description={t("create_first_team_and_invite_others")}
          buttonRaw={
            <Button
              color="secondary"
              data-testid="create-team-btn"
              onClick={() => router.push(`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`)}>
              {t(`create_new_team`)}
            </Button>
          }
        />
      )}
      {teams.length > 0 && (
        <div className="flex flex-col gap-4">
          <ul className="space-y-2">
            {teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h3 className="text-lg font-semibold">{team.name}</h3>
                </div>
                <Button
                  color="primary"
                  onClick={() => router.push(`${WEBAPP_URL}/settings/teams/${team.id}`)}
                  data-testid={`view-team-${team.id}`}>
                  {t("view_team")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
