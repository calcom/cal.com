import { cookies, headers } from "next/headers";
import "server-only";

import { forms } from "@calcom/app-store/routing-forms/trpc/procedures/forms";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { map } from "@calcom/features/flags/server/procedures/map";
import { createContext } from "@calcom/trpc/server/createContext";
import { teamsAndUserProfilesQuery } from "@calcom/trpc/server/routers/loggedInViewer/procedures/teamsAndUserProfilesQuery";
import { event } from "@calcom/trpc/server/routers/publicViewer/procedures/event";
import { session } from "@calcom/trpc/server/routers/publicViewer/procedures/session";
import { get } from "@calcom/trpc/server/routers/viewer/eventTypes/procedures/get";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { hasTeamPlan } from "@calcom/trpc/server/routers/viewer/teams/procedures/hasTeamPlan";
import { createCallerFactory } from "@calcom/trpc/server/trpc";
import { mergeRouters, router } from "@calcom/trpc/server/trpc";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const routerSlice = router({
  viewer: mergeRouters(
    router({
      me: meRouter,
      features: router({
        map,
      }),
      public: router({
        session,
        event,
      }),
      teams: router({
        hasTeamPlan,
      }),
      appRoutingForms: router({
        forms,
      }),
      teamsAndUserProfilesQuery: router({
        teamsAndUserProfilesQuery,
      }),
      eventTypes: router({
        get,
      }),
    })
  ),
});

export const getTRPCContext = async () => {
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  return await createContext({ req: legacyReq, res: {} as any }, getServerSession);
};
