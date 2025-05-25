import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { SearchParams, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";

import { TeamsListing } from "@calcom/features/ee/teams/components/TeamsListing";
import { CreationSource } from "@calcom/prisma/enums";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";

import { TRPCError } from "@trpc/server";

import { TeamsCTA } from "./CTA";

const getCachedMe = unstable_cache(
  async (headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const meCaller = await createRouterCaller(meRouter, await getTRPCContext(headers, cookies));
    return await meCaller.get();
  },
  ["viewer.me.get"],
  { revalidate: 3600 } // Cache for 1 hour
);

const getCachedTeams = unstable_cache(
  async (headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const teamsCaller = await createRouterCaller(viewerTeamsRouter, await getTRPCContext(headers, cookies));
    return await teamsCaller.list({
      includeOrgs: true,
    });
  },
  ["viewer.teams.list"],
  { revalidate: 3600 } // Cache for 1 hour
);

export const ServerTeamsListing = async ({ searchParams }: { searchParams: SearchParams }) => {
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const _headers = await headers();
  const _cookies = await cookies();

  const teamsCaller = await createRouterCaller(viewerTeamsRouter);

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
    getCachedMe(_headers, _cookies),
    getCachedTeams(_headers, _cookies),
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
