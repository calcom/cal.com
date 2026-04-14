"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getTeamUrlSync } from "@calcom/features/ee/organizations/lib/getTeamUrlSync";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { trpc } from "@calcom/trpc/react";
import { revalidateEventTypesList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/event-types/actions";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";
import { trackFormbricksAction } from "@calcom/web/modules/formbricks/lib/trackFormbricksAction";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Label } from "@coss/ui/components/label";
import { toastManager } from "@coss/ui/components/toast";
import { CopyIcon } from "@coss/ui/icons";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useLayoutEffect } from "react";
import { TeamDangerZone } from "./components/team-danger-zone";
import { TeamProfileFormCard } from "./components/team-profile-form-card";
import {
  TeamProfilePageSkeleton,
  teamProfileSkeletonPropsFromList,
} from "./components/team-profile-page-skeleton";

const ProfileView = () => {
  const params = useParamsWithFallback();
  const teamId = Number(params.id);
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const session = useSession();

  useLayoutEffect(() => {
    document.body.focus();
  }, []);

  const { data: teamsList } = trpc.viewer.teams.list.useQuery();

  const {
    data: team,
    isPending,
    error,
  } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/teams");
      }
    },
    [error]
  );

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  const permalink = team
    ? `${getTeamUrlSync({
      orgSlug: team.parent ? team.parent.slug : null,
      teamSlug: team.slug,
    })}`
    : "";

  const isBioEmpty = !team || !team.bio || !team.bio.replace("<p><br></p>", "").length;

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      revalidateTeamsList();
      await utils.viewer.teams.list.invalidate();
      await utils.viewer.eventTypes.getUserEventGroups.invalidate();
      revalidateEventTypesList();
      await utils.viewer.eventTypes.getByViewer.invalidate();
      toastManager.add({
        title: t("your_team_disbanded_successfully"),
        type: "success",
      });
      router.push(`${WEBAPP_URL}/teams`);
      trackFormbricksAction("team_disbanded");
    },
    async onError(err) {
      toastManager.add({ title: err.message, type: "error" });
    },
  });

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.teams.list.invalidate();
      revalidateTeamsList();
      await utils.viewer.eventTypes.invalidate();
      toastManager.add({ title: t("success"), type: "success" });
    },
    async onError(err) {
      toastManager.add({ title: err.message, type: "error" });
    },
  });

  function deleteTeam() {
    if (team?.id) deleteTeamMutation.mutate({ teamId: team.id });
  }

  function leaveTeam() {
    if (team?.id && session.data)
      removeMemberMutation.mutate({
        teamIds: [team.id],
        memberIds: [session.data.user.id],
      });
  }

  if (isPending) {
    return <TeamProfilePageSkeleton {...teamProfileSkeletonPropsFromList(teamId, teamsList)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdmin ? (
        <TeamProfileFormCard team={team} teamId={teamId} />
      ) : (
        <Card>
          <CardPanel>
            <div className="flex flex-col gap-4">
              <div>
                <Label render={<div />}>{t("team_name")}</Label>
                <p className="text-sm">{team?.name}</p>
              </div>

              {team && !isBioEmpty && (
                <div>
                  <Label render={<div />}>{t("about")}</Label>
                  <div
                    className="wrap-break-word text-sm"
                    dangerouslySetInnerHTML={{
                      __html: markdownToSafeHTML(team.bio ?? null),
                    }}
                  />
                </div>
              )}

              {team && (
                <div>
                  <Label render={<div />}>{t("team_url")}</Label>
                  <div className="flex items-center gap-2">
                    <p className="wrap-break-word text-sm">{permalink}</p>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("copy_to_clipboard")}
                      onClick={() => {
                        navigator.clipboard.writeText(permalink);
                        toastManager.add({
                          title: t("copied_to_clipboard"),
                          type: "success",
                        });
                      }}>
                      <CopyIcon aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardPanel>
        </Card>
      )}

      <TeamDangerZone
        isOwner={team?.membership.role === "OWNER"}
        onDisbandTeam={deleteTeam}
        onLeaveTeam={leaveTeam}
        isDisbanding={deleteTeamMutation.isPending}
        isLeaving={removeMemberMutation.isPending}
      />
    </div>
  );
};

export default ProfileView;
