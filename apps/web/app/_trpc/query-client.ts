"use client";

import { QueryClient } from "@tanstack/react-query";

import { TRPCClientError } from "@trpc/client";

const MAX_QUERY_RETRIES = 3;

const isTRPCClientError = (cause: unknown): cause is TRPCClientError<any> => {
  return cause instanceof TRPCClientError;
};

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
      retry(failureCount, error) {
        if (isTRPCClientError(error) && error.data) {
          const { code } = error.data;
          if (code === "BAD_REQUEST" || code === "FORBIDDEN" || code === "UNAUTHORIZED") {
            // if input data is wrong or you're not authorized there's no point retrying a query
            return false;
          }
        }
        return failureCount < MAX_QUERY_RETRIES;
      },
    },
  },
});
