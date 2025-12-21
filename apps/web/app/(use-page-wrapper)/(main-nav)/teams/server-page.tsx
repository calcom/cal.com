import type { SearchParams } from "app/_types";
import type { Session } from "next-auth";
import { unstable_cache } from "next/cache";

import { TeamsListing } from "@calcom/features/ee/teams/components/TeamsListing";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TeamsCTA } from "./CTA";

const getCachedTeams = unstable_cache(
  async (userId: number) => {
    const teamRepo = new TeamRepository(prisma);
    return await teamRepo.findTeamsByUserId({
      userId,
      includeOrgs: true,
    });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.teams.list"] } // Cache for 1 hour
);

export const ServerTeamsListing = async ({
  searchParams,
  session,
}: {
  searchParams: SearchParams;
  session: Session;
}) => {
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const autoAccept = Array.isArray(searchParams?.autoAccept)
    ? searchParams.autoAccept[0]
    : searchParams?.autoAccept;
  const userId = session.user.id;
  let invitationAccepted = false;

  let teamNameFromInvite,
    errorMsgFromInvite = null;

  if (token) {
    try {
      if (autoAccept === "true") {
        await TeamService.acceptInvitationByToken(token, userId);
        invitationAccepted = true;
      } else {
        teamNameFromInvite = await TeamService.inviteMemberByToken(token, userId);
      }
    } catch (e) {
      errorMsgFromInvite = "Error while fetching teams";
      if (e instanceof ErrorWithCode) errorMsgFromInvite = e.message;
    }
  }

  const teams = await getCachedTeams(userId);
  const userProfile = session?.user?.profile;
  const orgId = userProfile?.organizationId ?? session?.user.org?.id;

  const permissionCheckService = new PermissionCheckService();
  const canCreateTeam = orgId
    ? await permissionCheckService.checkPermission({
        userId: session.user.id,
        teamId: orgId,
        permission: "team.create",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      })
    : false;

  return {
    Main: (
      <TeamsListing
        invitationAccepted={invitationAccepted}
        teams={teams}
        orgId={orgId ?? null}
        permissions={{
          canCreateTeam: canCreateTeam,
        }}
        teamNameFromInvite={teamNameFromInvite ?? null}
        errorMsgFromInvite={errorMsgFromInvite}
      />
    ),
    CTA: !orgId || canCreateTeam ? <TeamsCTA /> : null,
  };
};
