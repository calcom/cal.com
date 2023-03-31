import type { NextPageContext } from "next/types";
import superjson from "superjson";

import { httpLink } from "../client/links/httpLink";
import { loggerLink } from "../client/links/loggerLink";
import { splitLink } from "../client/links/splitLink";
import { createTRPCNext } from "../next";
// ℹ️ Type-only import:
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export
import type { TRPCClientErrorLike } from "../react";
import { httpBatchLink } from "../react";
import type { inferRouterInputs, inferRouterOutputs, Maybe } from "../server";
import type { AppRouter } from "../server/routers/_app";

/**
 * We deploy our tRPC router on multiple lambdas to keep bundle size as small as possible
 */
const ENDPOINTS = ["slots", "viewer"] as const;
export type Endpoint = typeof ENDPOINTS[number];

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createTRPCReact`.
 * @link https://trpc.io/docs/v10/react#2-create-trpc-hooks
 */
export const trpc = createTRPCNext<AppRouter, NextPageContext, "ExperimentalSuspense">({
  config() {
    const url =
      typeof window !== "undefined"
        ? "/api/trpc"
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/trpc`
        : `http://${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/trpc`;

    /**
     * If you want to use SSR, you need to use the server's full URL
     * @link https://trpc.io/docs/ssr
     */
    return {
      /**
       * @link https://trpc.io/docs/links
       */
      links: [
        // adds pretty logs to your console in development and logs errors in production
        loggerLink({
          enabled: (opts) =>
            !!process.env.NEXT_PUBLIC_DEBUG || (opts.direction === "down" && opts.result instanceof Error),
        }),
        splitLink({
          // check for context property `skipBatch`
          condition: (op) => !!op.context.skipBatch,
          // when condition is true, use normal request
          true: (runtime) => {
            const links = Object.fromEntries(
              ENDPOINTS.map((endpoint) => [endpoint, httpLink({ url: url + "/" + endpoint })(runtime)])
            );
            return (ctx) => {
              const parts = ctx.op.path.split(".");
              const endpoint = parts.shift() as keyof typeof links;
              const path = parts.join(".");
              return links[endpoint]({ ...ctx, op: { ...ctx.op, path } });
            };
          },
          // when condition is false, use batch request
          false: (runtime) => {
            const links = Object.fromEntries(
              ENDPOINTS.map((endpoint) => [endpoint, httpBatchLink({ url: url + "/" + endpoint })(runtime)])
            );
            return (ctx) => {
              const parts = ctx.op.path.split(".");
              const endpoint = parts.shift() as keyof typeof links;
              const path = parts.join(".");
              return links[endpoint]({ ...ctx, op: { ...ctx.op, path } });
            };
          },
        }),
      ],
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      queryClientConfig: {
        defaultOptions: {
          queries: {
            /**
             * 1s should be enough to just keep identical query waterfalls low
             * @example if one page components uses a query that is also used further down the tree
             */
            staleTime: 1000,
            /**
             * Retry `useQuery()` calls depending on this function
             */
            retry(failureCount, _err) {
              const err = _err as never as Maybe<TRPCClientErrorLike<AppRouter>>;
              const code = err?.data?.code;
              if (code === "BAD_REQUEST" || code === "FORBIDDEN" || code === "UNAUTHORIZED") {
                // if input data is wrong or you're not authorized there's no point retrying a query
                return false;
              }
              const MAX_QUERY_RETRIES = 3;
              return failureCount < MAX_QUERY_RETRIES;
            },
          },
        },
      },
      /**
       * @link https://trpc.io/docs/data-transformers
       */
      transformer: superjson,
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   */
  ssr: false,
});

export const transformer = superjson;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
