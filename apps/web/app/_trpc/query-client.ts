"use client";

import { QueryClient } from "@tanstack/react-query";

import type { TRPCClientErrorLike } from "@trpc/react-query";

import type { AppRouter } from "@calcom/trpc/server/routers/_app";

type Maybe<T> = T | null | undefined;

const MAX_QUERY_RETRIES = 3;

export const queryClient = new QueryClient({
  // these configurations are copied from "packages/trpc/react/trpc.ts"
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
        return failureCount < MAX_QUERY_RETRIES;
      },
    },
  },
});
