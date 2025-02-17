"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "app/_trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { httpBatchLink, httpLink, loggerLink, splitLink, TRPCClientError } from "@calcom/trpc/client";
import { ENDPOINTS } from "@calcom/trpc/react/shared";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";

export type Endpoint = (typeof ENDPOINTS)[number];

const MAX_QUERY_RETRIES = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolveEndpoint = (links: any) => {
  // TODO: Update our trpc routes so they are more clear.
  // This function parses paths like the following and maps them
  // to the correct API endpoints.
  // - viewer.me - 2 segment paths like this are for logged in requests
  // - viewer.public.i18n - 3 segments paths can be public or authed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ctx: any) => {
    const parts = ctx.op.path.split(".");
    let endpoint;
    let path = "";
    if (parts.length == 2) {
      endpoint = parts[0] as keyof typeof links;
      path = parts[1];
    } else {
      endpoint = parts[1] as keyof typeof links;
      path = parts.splice(2, parts.length - 2).join(".");
    }
    return links[endpoint]({ ...ctx, op: { ...ctx.op, path } });
  };
};

const isTRPCClientError = (cause: unknown): cause is TRPCClientError<AppRouter> => {
  return cause instanceof TRPCClientError;
};

type Props = {
  children: React.ReactNode;
};

export const TrpcProvider = ({ children }: Props) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      })
  );

  const url =
    typeof window !== "undefined"
      ? "/api/trpc"
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/trpc`
      : `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/trpc`;

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        // adds pretty logs to your console in development and logs errors in production
        loggerLink({
          enabled: (opts) =>
            (typeof process.env.NEXT_PUBLIC_LOGGER_LEVEL === "number" &&
              process.env.NEXT_PUBLIC_LOGGER_LEVEL >= 0) ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        splitLink({
          // check for context property `skipBatch`
          condition: (op) => !!op.context.skipBatch,
          // when condition is true, use normal request
          true: (runtime) => {
            const links = Object.fromEntries(
              ENDPOINTS.map((endpoint) => [
                endpoint,
                httpLink({
                  url: `${url}/${endpoint}`,
                })(runtime),
              ])
            );
            return resolveEndpoint(links);
          },
          // when condition is false, use batch request
          false: (runtime) => {
            const links = Object.fromEntries(
              ENDPOINTS.map((endpoint) => [
                endpoint,
                httpBatchLink({
                  url: `${url}/${endpoint}`,
                })(runtime),
              ])
            );
            return resolveEndpoint(links);
          },
        }),
      ],
      transformer: superjson,
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
