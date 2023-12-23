import { type DehydratedState, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HydrateClient } from "_app/_trpc/HydrateClient";
import { trpc } from "_app/_trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { httpBatchLink } from "@calcom/trpc/client/links/httpBatchLink";
import { httpLink } from "@calcom/trpc/client/links/httpLink";
import { loggerLink } from "@calcom/trpc/client/links/loggerLink";
import { splitLink } from "@calcom/trpc/client/links/splitLink";
import { ENDPOINTS } from "@calcom/trpc/react/shared";

export type Endpoint = (typeof ENDPOINTS)[number];

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

export const TrpcProvider: React.FC<{ children: React.ReactNode; dehydratedState?: DehydratedState }> = ({
  children,
  dehydratedState,
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5000 } },
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
            !!process.env.NEXT_PUBLIC_DEBUG || (opts.direction === "down" && opts.result instanceof Error),
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
      <QueryClientProvider client={queryClient}>
        {dehydratedState ? <HydrateClient state={dehydratedState}>{children}</HydrateClient> : children}
      </QueryClientProvider>
    </trpc.Provider>
  );
};
