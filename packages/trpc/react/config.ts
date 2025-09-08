import superjson from "superjson";

import { httpBatchLink, httpLink, loggerLink, splitLink } from "@trpc/client";
import type { TRPCClientErrorLike } from "@trpc/react-query";

import type { AppRouter } from "../server/routers/_app";
import { ENDPOINTS } from "./shared";

type Maybe<T> = T | null | undefined;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const resolveEndpoint = (links: any) => {
  // TODO: Update our trpc routes so they are more clear.
  // This function parses paths like the following and maps them
  // to the correct API endpoints.
  // - viewer.me - 2 segment paths like this are for logged in requests
  // - viewer.public.i18n - 3 segments paths can be public or authed
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

export const getTrpcUrl = () => {
  return typeof window !== "undefined"
    ? "/api/trpc"
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/trpc`
    : `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/trpc`;
};

export const createTrpcLinks = (url: string) => [
  loggerLink({
    enabled: (opts) =>
      (typeof process.env.NEXT_PUBLIC_LOGGER_LEVEL === "number" &&
        process.env.NEXT_PUBLIC_LOGGER_LEVEL >= 0) ||
      (opts.direction === "down" && opts.result instanceof Error),
  }),
  splitLink({
    condition: (op) => !!op.context.skipBatch,
    true: (runtime) => {
      const links = Object.fromEntries(
        ENDPOINTS.map((endpoint) => [endpoint, httpLink({ url: `${url}/${endpoint}` })(runtime)])
      );
      return resolveEndpoint(links);
    },
    false: (runtime) => {
      const links = Object.fromEntries(
        ENDPOINTS.map((endpoint) => [endpoint, httpBatchLink({ url: `${url}/${endpoint}` })(runtime)])
      );
      return resolveEndpoint(links);
    },
  }),
];

export const createQueryClientConfig = () => ({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      retry(failureCount: number, _err: unknown) {
        const err = _err as never as Maybe<TRPCClientErrorLike<AppRouter>>;
        const code = err?.data?.code;
        if (code === "BAD_REQUEST" || code === "FORBIDDEN" || code === "UNAUTHORIZED") {
          return false;
        }
        const MAX_QUERY_RETRIES = 3;
        return failureCount < MAX_QUERY_RETRIES;
      },
    },
  },
});

export const transformer = superjson;
