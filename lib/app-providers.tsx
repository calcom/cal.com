import { IdProvider } from "@radix-ui/react-id";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import { loggerLink } from "@trpc/client/links/loggerLink";
import { withTRPC } from "@trpc/next";
import { Provider } from "next-auth/client";
import { AppProps } from "next/dist/shared/lib/router/router";
import React from "react";

import DynamicIntercomProvider from "@ee/lib/intercom/providerDynamic";

import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";

const AppProviders = (props: AppProps) => {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <IdProvider>
        <DynamicIntercomProvider>
          <Provider session={props.pageProps.session}>{props.children}</Provider>
        </DynamicIntercomProvider>
      </IdProvider>
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
      // queryClientConfig: { defaultOptions: { queries: { staleTime: 6000 } } },
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   */
  ssr: false,
})(AppProviders);
