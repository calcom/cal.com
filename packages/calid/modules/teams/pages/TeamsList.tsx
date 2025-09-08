"use client";

import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card/blank-card";
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
import { Icon } from "@calid/features/ui/components/icon";
import { triggerToast } from "@calid/features/ui/components/toast";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@calid/features/ui/components/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import React from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";

import { getTeamUrl } from "../lib/getTeamUrl";

type TeamsListProps = {
  teams: RouterOutputs["viewer"]["calidTeams"]["list"];
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
        if (team.acceptedInvitation) {
          acc.teams.push(team);
        } else {
          acc.teamInvitation.push(team);
        }
        return acc;
      },
      { teams: [] as typeof data, teamInvitation: [] as typeof data }
    );
  }, [data]);

  const deleteTeamMutation = trpc.viewer.calidTeams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.calidTeams.list.invalidate();
      revalidateTeamsList();
      triggerToast("team_disbanded_successfully", "success");
    },
    async onError(err) {
      triggerToast(err.message, "error");
    },
  });

  function teamUrl(slug: string | null) {
    const fullUrl = getTeamUrl(slug ?? "");
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
      triggerToast(t("you_have_been_added_to_team(teamNameFromInvitation)"), "success");
    }
    if (errorMsgFromInvitation) {
      triggerToast(errorMsgFromInvitation, "error");
    }
  }, []);

  return (
    <>
      {(teams.length > 0 || teamInvitation.length > 0) && (
        <div className="mb-4 flex justify-end">
          <Button
            color="primary"
            StartIcon="plus"
            data-testid="create-team-btn"
            onClick={() => router.push(`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`)}>
            {t(`create_a_new_team`)}
          </Button>
        </div>
      )}
      {teamInvitation.length > 0 && (
        <div className="mb-4">
          <ul className="mt-2 space-y-2">
            {teamInvitation.map((team) => (
              <li
                key={team.id}
                className="border-subtle flex items-center justify-between rounded-md border p-4">
                <div className="flex items-center space-x-2">
                  <Avatar
                    size="md"
                    shape="square"
                    imageSrc={getDefaultAvatar(team?.logoUrl, team?.name as string)}
                    alt="Team logo"
                  />
                  <span className="text-default text-md font-semibold">{team.name}</span>
                  <Badge variant="secondary" isPublicUrl={true}>
                    {teamUrl(team?.slug ?? null)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="attention">{t("pending")}</Badge>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          color="minimal"
                          variant="icon"
                          size="sm"
                          type="button"
                          StartIcon="external-link"
                          onClick={() => router.push(`${WEBAPP_URL}/settings/teams/${team.id}/profile`)}
                          data-testid={`view-team-invite-${team.id}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{t("view_team")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {teams.length === 0 && teamInvitation.length === 0 && (
        <BlankCard
          Icon="users"
          headline={t("create_a_new_team")}
          description={t("create_a_new_team_description")}
          buttonRaw={
            <Button
              color="primary"
              data-testid="create-team-btn"
              onClick={() => router.push(`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`)}>
              {t(`create_a_new_team`)}
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
                className="border-subtle flex items-center justify-between rounded-md border p-4">
                <div className="flex items-center space-x-2">
                  <Avatar
                    size="md"
                    shape="square"
                    imageSrc={getDefaultAvatar(team?.logoUrl, team?.name as string)}
                    alt="Team logo"
                  />
                  <span className="text-default text-md font-semibold">{team.name}</span>
                  <Badge variant="secondary" isPublicUrl={true}>
                    {teamUrl(team?.slug ?? null)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {team.role.charAt(0).toUpperCase() + team.role.slice(1).toLowerCase()}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button StartIcon="ellipsis" variant="icon" size="sm" color="minimal" />
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
      <p className="text-subtle mb-4 mt-2 flex w-full items-center gap-2 text-[14px] md:justify-center md:text-center">
        <Icon className="hidden sm:block" name="info" /> {t("group_meeting_tip")}
      </p>
    </>
  );
}
