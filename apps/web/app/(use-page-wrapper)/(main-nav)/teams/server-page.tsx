import type { SearchParams } from "app/_types";
import type { Session } from "next-auth";
import { unstable_cache } from "next/cache";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { TeamsListing } from "@calcom/features/ee/teams/components/TeamsListing";
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

  let teamNameFromInvite,
    errorMsgFromInvite = null;

  if (token) {
    try {
      teamNameFromInvite = await TeamService.inviteMemberByToken(token, userId);
    } catch (e) {
      errorMsgFromInvite = "Error while fetching teams";
      if (e instanceof TRPCError) errorMsgFromInvite = e.message;
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
      <TeamsListing
        teams={teams}
        orgId={orgId ?? null}
        isOrgAdmin={isOrgAdminOrOwner}
        teamNameFromInvite={teamNameFromInvite ?? null}
        errorMsgFromInvite={errorMsgFromInvite}
      />
    ),
    CTA: !orgId || isOrgAdminOrOwner ? <TeamsCTA /> : null,
  };
};
