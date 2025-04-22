import { createRouterCaller } from "app/_trpc/context";
import type { SearchParams } from "app/_types";

import { TeamsListing } from "@calcom/features/ee/teams/components/TeamsListing";
import { CreationSource } from "@calcom/prisma/enums";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";

import { TRPCError } from "@trpc/server";

import { TeamsCTA } from "./CTA";

export const ServerTeamsListing = async ({ searchParams }: { searchParams: SearchParams }) => {
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;

  const [teamsCaller, meCaller] = await Promise.all([
    createRouterCaller(viewerTeamsRouter),
    createRouterCaller(meRouter),
  ]);

  let teamNameFromInvite,
    errorMsgFromInvite = null;

  if (token) {
    try {
      teamNameFromInvite = await teamsCaller.inviteMemberByToken({
        token,
        creationSource: CreationSource.WEBAPP,
      });
    } catch (e) {
      errorMsgFromInvite = "Error while fetching teams";
      if (e instanceof TRPCError) errorMsgFromInvite = e.message;
    }
  }

  const [user, teams] = await Promise.all([
    meCaller.get(),
    teamsCaller.list({
      includeOrgs: true,
    }),
  ]);

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
