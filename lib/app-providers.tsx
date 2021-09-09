import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import { loggerLink } from "@trpc/client/links/loggerLink";
import { withTRPC } from "@trpc/next";
import { Provider } from "next-auth/client";
import React from "react";

const AppProviders: React.FC = (props, pageProps) => {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <Provider session={pageProps.session}>{props.children}</Provider>
    </TelemetryProvider>
  );
};

export default withTRPC({
  config() {
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
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `/api/trpc`,
        }),
      ],
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      queryClientConfig: { defaultOptions: { queries: { staleTime: 6000 } } },
    };
  },
  ssr: false,
})(AppProviders);
