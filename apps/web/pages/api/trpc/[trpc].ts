/**
 * This file contains tRPC's HTTP response handler
 */
import { z } from "zod";

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
    // assuming you have all your public routes with the keyword `public` in them
    const allPublic = paths && paths.every((path) => path.startsWith("viewer.public."));
    // checking that no procedures errored
    const allOk = errors.length === 0;
    // checking we're doing a query request
    const isQuery = type === "query";
    const noHeaders = {};

    // We cannot set headers on SSG queries
    if (!ctx?.res) return noHeaders;

    const defaultHeaders: Record<"headers", Record<string, string>> = {
      headers: {},
    };

    const timezone = z.string().safeParse(ctx.req?.headers["x-vercel-ip-timezone"]);
    if (timezone.success) defaultHeaders.headers["x-cal-timezone"] = timezone.data;

    // We need all these conditions to be true to set cache headers
    if (!(allPublic && allOk && isQuery)) return defaultHeaders;

    // No cache by default
    defaultHeaders.headers["cache-control"] = `no-cache`;

    // Our cache can change depending on our current paths value. Since paths is an array,
    // we want to create a map that can match potential paths with their desired cache value
    const cacheRules = {
      "viewer.public.session": `no-cache`,
      "viewer.public.i18n": `no-cache`,
      // Revalidation time here should be 1 second, per https://github.com/calcom/cal.com/pull/6823#issuecomment-1423215321
      "viewer.public.slots.getSchedule": `no-cache`, // FIXME
    } as const;

    // Find which element above is an exact match for this group of paths
    const matchedPath = paths.find((v) => v in cacheRules) as keyof typeof cacheRules;

    if (matchedPath) defaultHeaders.headers["cache-control"] = cacheRules[matchedPath];

    return defaultHeaders;
  },
});
