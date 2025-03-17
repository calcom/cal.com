import type { GetServerSidePropsContext } from "next";
import superjson from "superjson";

import { forms } from "@calcom/app-store/routing-forms/trpc/procedures/forms";
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { map } from "@calcom/features/flags/server/procedures/map";
import { createContext } from "@calcom/trpc/server/createContext";
import { teamsAndUserProfilesQuery } from "@calcom/trpc/server/routers/loggedInViewer/procedures/teamsAndUserProfilesQuery";
import { event } from "@calcom/trpc/server/routers/publicViewer/procedures/event";
import { session } from "@calcom/trpc/server/routers/publicViewer/procedures/session";
import { get } from "@calcom/trpc/server/routers/viewer/eventTypes/procedures/get";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { hasTeamPlan } from "@calcom/trpc/server/routers/viewer/teams/procedures/hasTeamPlan";
import { mergeRouters, router } from "@calcom/trpc/server/trpc";

import { createServerSideHelpers } from "@trpc/react-query/server";

// Temporary workaround for OOM issue, import only procedures that are called on the server side
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

/**
 * Initialize server-side rendering tRPC helpers.
 * Provides a method to prefetch tRPC-queries in a `getServerSideProps`-function.
 * Automatically prefetches i18n based on the passed in `context`-object to prevent i18n-flickering.
 * Make sure to `return { props: { trpcState: ssr.dehydrate() } }` at the end.
 */
export async function ssrInit(context: GetServerSidePropsContext, options?: { noI18nPreload: boolean }) {
  const ctx = await createContext(context);
  const locale = await getLocale(context.req);

  const ssr = createServerSideHelpers({
    router: routerSlice,
    transformer: superjson,
    ctx: { ...ctx, locale },
  });

  await Promise.allSettled([
    // So feature flags are available on first render
    ssr.viewer.features.map.prefetch(),
    // Provides a better UX to the users who have already upgraded.
    ssr.viewer.teams.hasTeamPlan.prefetch(),
    ssr.viewer.public.session.prefetch(),
    ssr.viewer.me.get.prefetch(),
  ]);

  return ssr;
}
