import { TeamsList } from "@calid/features/modules/teams/pages/TeamsList";
import type { SearchParams } from "app/_types";
import type { Session } from "next-auth";
import { unstable_cache } from "next/cache";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { TeamService } from "@calcom/lib/server/service/teamService";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

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
  const userId = session.user.id;

  let teamNameFromInvitation,
    errorMsgFromInvitation = null;

  if (token) {
    try {
      teamNameFromInvitation = await TeamService.inviteMemberByToken(token, userId);
    } catch (e) {
      errorMsgFromInvitation = "Error while fetching teams";
      if (e instanceof TRPCError) errorMsgFromInvitation = e.message;
    }
  }

  const teams = await getCachedTeams(userId);
  const userProfile = session?.user?.profile;
  const orgId = userProfile?.organizationId ?? session?.user.org?.id;
  const orgRole =
    session?.user?.org?.role ??
    userProfile?.organization?.members.find((m: { userId: number }) => m.userId === userId)?.role;
  const isOrgAdminOrOwner = checkAdminOrOwner(orgRole);

  return {
    Main: (
      <TeamsList
        teams={teams}
        teamNameFromInvitation={teamNameFromInvitation}
        errorMsgFromInvitation={errorMsgFromInvitation}
      />
    ),
    CTA: !orgId || isOrgAdminOrOwner ? <TeamsCTA /> : null,
  };
};
