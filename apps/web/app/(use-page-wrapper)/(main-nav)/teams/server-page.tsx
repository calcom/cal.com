import { createRouterCaller } from "app/_trpc/context";
import type { SearchParams } from "app/_types";
import { getCachedTeams } from "app/cache/team";
import type { Session } from "next-auth";

import { TeamsListing } from "@calcom/features/ee/teams/components/TeamsListing";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";

import { TRPCError } from "@trpc/server";

import { TeamsCTA } from "./CTA";

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
