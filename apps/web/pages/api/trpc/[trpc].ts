/**
 * This file contains tRPC's HTTP response handler
 */
import * as trpcNext from "@calcom/trpc/server/adapters/next";
import { createContext } from "@calcom/trpc/server/createContext";
import { appRouter } from "@calcom/trpc/server/routers/_app";

export default trpcNext.createNextApiHandler({
  router: appRouter,
  /**
   * @link https://trpc.io/docs/context
   */
  createContext,
  /**
   * @link https://trpc.io/docs/error-handling
   */
  onError({ error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      // send to bug reporting
      console.error("Something went wrong", error);
    }
  },
  /**
   * Enable query batching
   */
  batching: {
    enabled: true,
  },
  /**
   * @link https://trpc.io/docs/caching#api-response-caching
   */
  responseMeta({ ctx, paths, type, errors }) {
    // Some helpers relevant to this function only
    const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
    const TWO_HOURS_IN_SECONDS = 60 * 60 * 2;

    // Our response to indicate no caching
    const noCacheResponse = {};

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore ctx.req is available for SSR but not SSG
    const isSSR = !!ctx?.req;
    if (isSSR) {
      return noCacheResponse;
    }

    // No caching if we have a non-public path
    // Assuming we have all our public routes in `viewer.public`
    if (!paths || !paths.every((path) => path.startsWith("viewer.public."))) {
      return noCacheResponse;
    }

    // No caching if we have any procedures errored
    if (errors.length !== 0) {
      return noCacheResponse;
    }

    // Never cache non-queries (aka mutations)
    if (type !== "query") {
      return noCacheResponse;
    }

    // cache request for 1 day + revalidate once every 5 seconds
    let cacheValue = `s-maxage=${ONE_DAY_IN_SECONDS}, stale-while-revalidate=5`;

    // Our cache can change depending on our current paths value. Since paths is an array,
    // we want to create a map that can match potential paths with their desired cache value
    const cacheRules = {
      "viewer.public.i18n": `maxage=${TWO_HOURS_IN_SECONDS}, stale-while-revalidate=30`,
      // Revalidation time here should be 1 second, per https://github.com/calcom/cal.com/pull/6823#issuecomment-1423215321
      "viewer.public.slots.getSchedule": `s-maxage=5, stale-while-revalidate=1`,
    } as const;

    // Find which element above is an exact match for this group of paths
    const matchedPath = paths.find((v) => v in cacheRules) as keyof typeof cacheRules;

    // Get the cache value of the matching element, if any
    if (matchedPath) cacheValue = cacheRules[matchedPath];

    // Finally we respond with our resolved cache value
    return {
      headers: {
        "Cache-Control": cacheValue,
      },
    };
  },
});
