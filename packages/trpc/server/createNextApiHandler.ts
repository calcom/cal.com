import { z } from "zod";

import * as trpcNext from "@calcom/trpc/server/adapters/next";
import { createContext as createTrpcContext } from "@calcom/trpc/server/createContext";

import type { AnyRouter } from "@trpc/server";

/**
 * Creates an API handler executed by Next.js.
 */
export function createNextApiHandler(router: AnyRouter, isPublic = false, namespace = "") {
  return trpcNext.createNextApiHandler({
    router,
    /**
     * @link https://trpc.io/docs/context
     */
    createContext: ({ req, res }) => {
      return createTrpcContext({ req, res });
    },
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
      const allOk = errors.length === 0;
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
      if (!(isPublic && allOk && isQuery)) return defaultHeaders;

      // No cache by default
      defaultHeaders.headers["cache-control"] = `no-cache`;

      if (isPublic && paths) {
        const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
        const FIVE_MINUTES_IN_SECONDS = 5 * 60;
        const ONE_YEAR_IN_SECONDS = 31536000;

        const cacheRules = {
          session: "no-cache",

          i18n: process.env.NODE_ENV === "development" ? "no-cache" : `max-age=${ONE_YEAR_IN_SECONDS}`,

          // FIXME: Using `max-age=1, stale-while-revalidate=60` fails some booking tests.
          "slots.getSchedule": `no-cache`,

          // Timezones are hardly updated. No need to burden the servers with requests for this by keeping low max-age.
          // Keep it cached for a day and then give it 60 seconds more at most to be updated.
          cityTimezones: `max-age=${ONE_DAY_IN_SECONDS}, stale-while-revalidate=60`,

          // Feature Flags change but it might be okay to have a 5 minute cache to avoid burdening the servers with requests for this.
          // Note that feature flags can be used to quickly kill a feature if it's not working as expected. So, we have to keep fresh time lesser than the deployment time atleast
          "features.map": `max-age=${FIVE_MINUTES_IN_SECONDS}, stale-while-revalidate=60`, // "map" - Feature Flag Map
        } as const;

        const prependNamespace = (key: string) =>
          (namespace ? `${namespace}.${key}` : key) as keyof typeof cacheRules;
        const matchedPath = paths.find((v) => prependNamespace(v) in cacheRules);
        if (matchedPath) {
          const cacheRule = cacheRules[prependNamespace(matchedPath)];

          // We must set cdn-cache-control as well to ensure that Vercel doesn't strip stale-while-revalidate
          // https://vercel.com/docs/concepts/edge-network/caching#:~:text=If%20you%20set,in%20the%20response.
          defaultHeaders.headers["cache-control"] = defaultHeaders.headers["cdn-cache-control"] = cacheRule;
        }
      }

      return defaultHeaders;
    },
  });
}
