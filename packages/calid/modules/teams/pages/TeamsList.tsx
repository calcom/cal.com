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
  DialogClose,
} from "@calid/features/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import React from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import { revalidateCalIdTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";

import { AddTeamMemberModal } from "../components/AddTeamMemberModal";
import { getTeamUrl } from "../lib/getTeamUrl";

type TeamsListProps = {
  teams: RouterOutputs["viewer"]["calidTeams"]["list"];
  teamNameFromInvitation: string | null;
  errorMsgFromInvitation: string | null;
};

export function TeamsList({
  teams: initialData,
  teamNameFromInvitation,
  errorMsgFromInvitation,
}: TeamsListProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const router = useRouter();
  const [isDisbandDialogOpen, setIsDisbandDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [openInviteModal, setOpenInviteModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const { data: teamsData, isLoading } = trpc.viewer.calidTeams.list.useQuery(undefined, {
    initialData: initialData,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const { teams, teamInvitation } = useMemo(() => {
    return (Array.isArray(teamsData) ? teamsData : []).reduce(
      (acc, team) => {
        if (team.acceptedInvitation) {
          acc.teams.push(team);
        } else {
          acc.teamInvitation.push(team);
        }
        return acc;
      },
      { teams: [] as typeof teamsData, teamInvitation: [] as typeof teamsData }
    );
  }, [teamsData]);

  const deleteTeamMutation = trpc.viewer.calidTeams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.calidTeams.list.invalidate();
      revalidateCalIdTeamsList();
      triggerToast(t("team_disbanded_successfully"), "success");
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
  }, [errorMsgFromInvitation, t, teamNameFromInvitation, token]);

  const acceptOrLeaveMutation = trpc.viewer.calidTeams.acceptOrLeave.useMutation({
    onSuccess: async () => {
      triggerToast(t("success"), "success");
      await utils.viewer.calidTeams.get.invalidate();
      await utils.viewer.calidTeams.list.invalidate();
      await utils.viewer.calidTeams.listPendingInvitations.invalidate();
      revalidateCalIdTeamsList();
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  function acceptOrLeave(accept: boolean, teamId: number) {
    acceptOrLeaveMutation.mutate({
      teamId: teamId,
      accept,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">{t("loading")}...</div>
      </div>
    );
  }

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
            {teamInvitation.map(function (team) {
              const url = teamUrl(team?.slug ?? null);

              return (
                <li
                  key={team.id}
                  className="border-subtle flex items-center justify-between rounded-md border p-4">
                  <div className="flex min-w-0 flex-1 items-center space-x-2">
                    <Avatar
                      size="md"
                      shape="square"
                      imageSrc={getDefaultAvatar(team?.logoUrl, team?.name as string)}
                      alt="Team logo"
                      className="flex-shrink-0"
                    />
                    <span className="text-default text-md truncate font-semibold">{team.name}</span>
                    <Badge variant="secondary" publicUrl={url} className="min-w-0 max-w-full">
                      <span className="truncate">{url}</span>
                    </Badge>
                  </div>
                  <div className="ml-4 flex flex-shrink-0 items-center space-x-2">
                    <Badge variant="attention">{t("pending")}</Badge>
                    <Button
                      type="button"
                      className="border-empthasis mr-3"
                      variant="icon"
                      color="secondary"
                      onClick={function () {
                        return acceptOrLeave(false, team.id);
                      }}
                      StartIcon="ban"
                      disabled={acceptOrLeaveMutation.isPending}
                    />
                    <Button
                      type="button"
                      className="border-empthasis"
                      variant="icon"
                      color="secondary"
                      onClick={function () {
                        return acceptOrLeave(true, team.id);
                      }}
                      StartIcon="check"
                      disabled={acceptOrLeaveMutation.isPending}
                    />
                  </div>
                </li>
              );
            })}
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
            {teams.map(function (team) {
              const url = teamUrl(team?.slug ?? null);

              return (
                <li
                  key={team.id}
                  className="border-default bg-default group relative rounded-md border transition hover:shadow-md">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex min-w-0 flex-1 items-center space-x-3">
                      <Avatar
                        size="md"
                        shape="square"
                        imageSrc={getDefaultAvatar(team?.logoUrl, team?.name as string)}
                        alt="Team logo"
                        className="bg-default h-10 w-10 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-default truncate text-base font-semibold">{team.name}</h3>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <Badge variant="secondary" publicUrl={url} className="min-w-0 max-w-full">
                            <span className="truncate">{url}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-shrink-0 items-center space-x-2">
                      <Badge variant="secondary">
                        {team.role.charAt(0).toUpperCase() + team.role.slice(1).toLowerCase()}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button StartIcon="ellipsis" variant="icon" size="sm" color="minimal" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {checkAdminOrOwner(team.role) && (
                            <DropdownMenuItem
                              href={`/settings/teams/${team.id}/profile`}
                              StartIcon="pencil-line">
                              {t("edit_team")}
                            </DropdownMenuItem>
                          )}
                          {checkAdminOrOwner(team.role) && (
                            <DropdownMenuItem
                              onClick={function () {
                                setSelectedTeamId(team.id);
                                setOpenInviteModal(true);
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
                                onSelect={function (e) {
                                  e.preventDefault(); // optional — if you don't want dropdown to close
                                  setIsDisbandDialogOpen(true);
                                }}>
                                {t("disband_team")}
                              </DropdownMenuItem>

                              <Dialog open={isDisbandDialogOpen} onOpenChange={setIsDisbandDialogOpen}>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{t("disband_team")}</DialogTitle>
                                    <DialogDescription>
                                      {t("disband_team_confirmation_message")}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      type="button"
                                      color="destructive"
                                      onClick={function () {
                                        return deleteTeam(team.id);
                                      }}>
                                      {t("confirm_disband_team")}
                                    </Button>
                                    <DialogClose color="primary" />
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          {team.role !== MembershipRole.OWNER && (
                            <>
                              <DropdownMenuItem
                                color="destructive"
                                StartIcon="log-out"
                                onClick={function (e) {
                                  e.preventDefault();
                                  setIsLeaveDialogOpen(true);
                                }}>
                                {t("leave_team")}
                              </DropdownMenuItem>
                              <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{t("leave_team")}</DialogTitle>
                                    <DialogDescription>
                                      {t("leave_team_confirmation_message")}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      type="button"
                                      color="destructive"
                                      onClick={function () {
                                        return acceptOrLeave(false, team.id);
                                      }}>
                                      {t("confirm_leave_team")}
                                    </Button>
                                    <DialogClose color="primary" />
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-subtle mb-4 mt-2 flex w-full items-center gap-2 text-[14px] md:justify-center md:text-center">
        <Icon className="hidden sm:block" name="info" /> {t("group_meeting_tip")}
      </p>

      {selectedTeamId && (
        <AddTeamMemberModal
          teamId={selectedTeamId}
          teamName={teams.find((team) => team.id === selectedTeamId)?.name}
          onSuccess={() => {
            utils.viewer.calidTeams.list.invalidate();
            revalidateCalIdTeamsList();
            setOpenInviteModal(false);
            setSelectedTeamId(null);
          }}
          isOpen={openInviteModal}
          onOpenChange={setOpenInviteModal}
        />
      )}
    </>
  );
}
