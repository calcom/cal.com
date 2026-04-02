import process from "node:process";
import type { AnyRouter } from "@trpc/server";
import { createNextApiHandler as _createNextApiHandler } from "@trpc/server/adapters/next";
import { createContext as createTrpcContext } from "./createContext";
import { onErrorHandler } from "./onErrorHandler";

/**
 * Creates an API handler executed by Next.js.
 */
export function createNextApiHandler(router: AnyRouter, isPublic = false, namespace = "") {
  return _createNextApiHandler({
    router,
    /**
     * @link https://trpc.io/docs/context
     */
    createContext: (opts) => {
      return createTrpcContext(opts);
    },
    /**
     * @link https://trpc.io/docs/error-handling
     */
    onError: onErrorHandler,
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

      // We need all these conditions to be true to set cache headers
      if (!(isPublic && allOk && isQuery)) return defaultHeaders;

      // No cache by default
      defaultHeaders.headers["cache-control"] = `no-cache`;

      if (isPublic && paths) {
        const FIVE_MINUTES_IN_SECONDS = 5 * 60;
        const ONE_YEAR_IN_SECONDS = 31536000;
        const SETTING_FOR_CACHED_BY_VERSION =
          process.env.NODE_ENV === "development" ? "no-cache" : `max-age=${ONE_YEAR_IN_SECONDS}`;

        const cacheRules = {
          session: "no-cache",

          // i18n and cityTimezones are now being accessed using the CalComVersion, which updates on every release,
          // letting the clients get the new versions when the version number changes.
          "i18n.get": SETTING_FOR_CACHED_BY_VERSION,
          cityTimezones: SETTING_FOR_CACHED_BY_VERSION,

          // FIXME: Using `max-age=1, stale-while-revalidate=60` fails some booking tests.
          "slots.getSchedule": `no-cache`, // INFO: This needs the slots prefix because it lives us the public router
          getTeamSchedule: `no-cache`,

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
