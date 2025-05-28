import { createRouterCaller } from "app/_trpc/context";
import type { SearchParams } from "app/_types";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { TeamsListing } from "@calcom/features/ee/teams/components/TeamsListing";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { TRPCError } from "@trpc/server";

import { TeamsCTA } from "./CTA";

const getCachedTeams = unstable_cache(
  async (userId: number) => {
    return await TeamRepository.findTeamsByUserId({
      userId,
      includeOrgs: true,
    });
  },
  ["viewer.teams.list"],
  { revalidate: 3600 } // Cache for 1 hour
);

export const ServerTeamsListing = async ({ searchParams }: { searchParams: SearchParams }) => {
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  const userId = session.user.id;

  let teamNameFromInvite,
    errorMsgFromInvite = null;

  if (token) {
    try {
      teamNameFromInvite = await TeamRepository.inviteMemberByToken(token, userId);
    } catch (e) {
      errorMsgFromInvite = "Error while fetching teams";
      if (e instanceof TRPCError) errorMsgFromInvite = e.message;
    }
  }

  const meCaller = await createRouterCaller(meRouter);
  const [user, teams] = await Promise.all([meCaller.get(), getCachedTeams(userId)]);

  return {
    Main: (
      <TeamsListing
        teams={teams}
        user={user}
        teamNameFromInvite={teamNameFromInvite ?? null}
        errorMsgFromInvite={errorMsgFromInvite}
      />
    ),
    CTA: !user.organizationId || user.organization.isOrgAdmin ? <TeamsCTA /> : null,
  };
};
