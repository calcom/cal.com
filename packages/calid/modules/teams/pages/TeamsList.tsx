"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon/Icon";
import { triggerToast } from "@calid/features/ui/components/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@calid/features/ui/components/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import React from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { trackFormbricksAction } from "@calcom/lib/formbricks-client";
import { getTeamUrlSync } from "@calcom/lib/getBookerUrl/client";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";

type TeamsListProps = {
  teams: RouterOutputs["viewer"]["teams"]["list"];
  teamNameFromInvitation: string | null;
  errorMsgFromInvitation: string | null;
};

export function TeamsList({ teams: data, teamNameFromInvitation, errorMsgFromInvitation }: TeamsListProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const router = useRouter();
  const [openInvitationDialog, setOpenInvitationDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { teams, teamInvitation } = useMemo(() => {
    return (Array.isArray(data) ? data : []).reduce(
      (acc, team) => {
        if (team.accepted) {
          acc.teams.push(team);
        } else {
          acc.teamInvitation.push(team);
        }
        return acc;
      },
      { teams: [] as typeof data, teamInvitation: [] as typeof data }
    );
  }, [data]);

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.list.invalidate();
      revalidateTeamsList();
      trackFormbricksAction("team_disbanded");
    },
    async onError(err) {},
  });

  function teamUrl(slug: string | null, orgSlug: string | null) {
    const fullUrl = getTeamUrlSync({ orgSlug, teamSlug: slug });
    return fullUrl.replace(/^https?:\/\//, "");
  }

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  function previewUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    if (!token) {
      return;
    }
    if (teamNameFromInvitation) {
      triggerToast(t("you_have_been_added_to_team"), "success");
    }
    if (errorMsgFromInvitation) {
      triggerToast(errorMsgFromInvitation, "error");
    }
  }, []);

  return (
    <>
      {teams.length > 0 && (
        <div className="mb-4 flex justify-end">
          <Button
            color="primary"
            StartIcon="plus"
            data-testid="create-team-btn"
            onClick={() => router.push(`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`)}>
            {t(`create_new_team`)}
          </Button>
        </div>
      )}
      {teamInvitation.length > 0 && (
        <div className="bg-subtle rounded-md p-2">
          <span className="text-emphasis font-semibold">{t("pending_invites")}</span>
          <ul className="mt-2 space-y-2">
            {teamInvitation.map((team) => (
              <li key={team.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center">
                  <Avatar
                    size="md"
                    imageSrc={getPlaceholderAvatar(
                      team?.logoUrl || team?.parent?.logoUrl,
                      team?.name as string
                    )}
                    alt="Team logo"
                    className="inline-flex justify-center"
                  />
                  <span className="text-default text-md font-semibold">{team.name}</span>
                  <span className="text-muted block text-xs">
                    {teamUrl(team?.slug ?? null, team?.parent?.slug ?? null)}
                  </span>{" "}
                </div>
                <Button
                  color="primary"
                  onClick={() => router.push(`${WEBAPP_URL}/settings/teams/${team.id}`)}
                  data-testid={`view-team-invite-${team.id}`}>
                  {t("view_team")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
              <li
                key={team.id}
                className="border-subtle flex items-center justify-between rounded-md border px-3 py-5">
                <div className="flex items-center space-x-2">
                  <Avatar
                    size="md"
                    imageSrc={getPlaceholderAvatar(
                      team?.logoUrl || team?.parent?.logoUrl,
                      team?.name as string
                    )}
                    alt="Team logo"
                    className="inline-flex justify-center"
                  />
                  <span className="text-default text-md font-semibold">{team.name}</span>
                  <Badge variant="secondary">{teamUrl(team?.slug ?? null, team?.parent?.slug ?? null)}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {team.role.charAt(0).toUpperCase() + team.role.slice(1).toLowerCase()}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          color="minimal"
                          variant="icon"
                          type="button"
                          StartIcon="external-link"
                          className="hover:bg-muted rounded-md transition-colors"
                          onClick={() => previewUrl(teamUrl(team?.slug ?? null, team?.parent?.slug ?? null))}
                        />
                      </TooltipTrigger>
                      <TooltipContent> {t("preview")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        StartIcon="ellipsis"
                        variant="icon"
                        color="minimal"
                        className="hover:bg-muted rounded-md transition-colors"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {checkAdminOrOwner(team.role) && (
                        <DropdownMenuItem href={`/settings/teams/${team.id}/profile`} StartIcon="pencil-line">
                          {t("edit_team")}
                        </DropdownMenuItem>
                      )}
                      {checkAdminOrOwner(team.role) && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTeamId(team.id);
                            setOpenInvitationDialog(true);
                          }}
                          StartIcon="user-plus">
                          {t("invite_team_member")}
                        </DropdownMenuItem>
                      )}
                      {team.role === MembershipRole.OWNER && (
                        <>
                          <DropdownMenuItem
                            color="destructive"
                            StartIcon="trash-2"
                            onSelect={(e) => {
                              e.preventDefault(); // optional — if you don't want dropdown to close
                              setIsOpen(true);
                            }}>
                            {t("disband_team")}
                          </DropdownMenuItem>

                          <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t("disband_team")}</DialogTitle>
                                <DialogDescription>
                                  {t("disband_team_confirmation_message")}
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button type="button" color="primary" onClick={() => setIsOpen(false)}>
                                  {t("cancel")}
                                </Button>
                                <Button type="button" color="destructive" onClick={() => deleteTeam(team.id)}>
                                  {t("confirm_disband_team")}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Dialog open={openInvitationDialog} onOpenChange={setOpenInvitationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("invite_team_member")}</DialogTitle>
            <DialogDescription>{t("add_team_members_description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button color="secondary" onClick={() => setOpenInvitationDialog(false)}>
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              onClick={() => {
                if (selectedTeamId) {
                  router.push(`/settings/teams/${selectedTeamId}/onboard-members`);
                }
                setOpenInvitationDialog(false);
              }}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="text-subtle mb-4 mt-4 flex w-full items-center gap-2 text-[14px] md:justify-center md:text-center">
        <Icon className="hidden sm:block" name="info" /> {t("tip_username_plus")}
      </p>
    </>
  );
}
