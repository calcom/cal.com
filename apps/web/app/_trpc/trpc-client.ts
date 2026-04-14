"use client";

import { ENDPOINTS } from "@calcom/trpc/react/shared";
import { metrics } from "@sentry/nextjs";
import type { TRPCLink } from "@trpc/client";
import { httpBatchLink, httpLink, loggerLink, splitLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";
import { trpc } from "./trpc";

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

const url =
  typeof window !== "undefined"
    ? "/api/trpc"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/trpc`
      : `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/trpc`;

/**
 * Lightweight tRPC metrics link that reports client-side latency
 * as Sentry metrics (counters + distributions) instead of spans.
 * This avoids consuming span quota while providing full visibility
 * into tRPC round-trip times per operation path and type.
 */
const metricsLink: TRPCLink<AnyRouter> = () => {
  return ({ next, op }) => {
    const startTime = performance.now();
    return observable((observer) => {
      const unsub = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          const duration = performance.now() - startTime;
          metrics.distribution("trpc.client.duration_ms", duration, {
            attributes: { path: op.path, type: op.type, status: "error" },
          });
          metrics.count("trpc.client.error", 1, {
            attributes: { path: op.path, type: op.type },
          });
          observer.error(err);
        },
        complete() {
          const duration = performance.now() - startTime;
          metrics.distribution("trpc.client.duration_ms", duration, {
            attributes: { path: op.path, type: op.type, status: "ok" },
          });
          observer.complete();
        },
      });
      return unsub;
    });
  };
};

export const trpcClient = trpc.createClient({
  links: [
    // Reports tRPC latency as Sentry metrics — zero span overhead
    metricsLink,
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
});
