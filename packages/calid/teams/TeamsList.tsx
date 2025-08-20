"use client";

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
import { toast } from "@calid/features/ui/components/toast/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import React from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
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
  const [openInvitationDialog, setOpenInvitationDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
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
                <div>
                  <h3 className="text-lg font-semibold">{team.name}</h3>
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
                className="border-subtle flex items-center justify-between rounded-md border p-4">
                <div>
                  <h3 className="text-lg font-semibold">{team.name}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button StartIcon="ellipsis" variant="icon" color="secondary" />
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
                    {team.role == MembershipRole.OWNER && (
                      <DropdownMenuItem>
                        <Dialog>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("disband_team")}</DialogTitle>
                              <DialogDescription>{t("disband_team_confirmation_message")}</DialogDescription>
                            </DialogHeader>
                            {/* <DialogFooter>
                              <Button
                                className="btn btn-secondary"
                                onClick={() => setHideDropdown(false)}
                                disabled={props.isPending}>
                                {t("cancel")}
                              </Button>
                              <Button
                                className="btn btn-danger"
                                onClick={() => props.onActionSelect("disband")}
                                disabled={props.isPending}>
                                {t("confirm_disband_team")}
                              </Button>
                            </DialogFooter> */}
                          </DialogContent>
                        </Dialog>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
    </>
  );
}
