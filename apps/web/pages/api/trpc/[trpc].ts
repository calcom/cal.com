/**
 * This file contains tRPC's HTTP response handler
 */
import { createContext } from "@server/createContext";
import { appRouter } from "@server/routers/_app";
import * as trpcNext from "@trpc/server/adapters/next";

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
    // assuming we have all our public routes in `viewer.public`
    const allPublic = paths && paths.every((path) => path.startsWith("viewer.public."));
    // checking that no procedures errored
    const allOk = errors.length === 0;
    // checking we're doing a query request
    const isQuery = type === "query";

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore ctx.req is available for SSR but not SSG
    if (!!ctx?.req && allPublic && allOk && isQuery) {
      // cache request for 1 day + revalidate once every 5 seconds
      const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
      return {
        headers: {
          "cache-control": `s-maxage=5, stale-while-revalidate=${ONE_DAY_IN_SECONDS}`,
        },
      };
    }
    return {};
  },
});
