import React from "react";
import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";
import { Provider } from "next-auth/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // don't fetch when window is focused
      retry: false, // if it fails don't retry (you can configure this on a specific resource)
    },
  },
});

const AppProviders: React.FC = (props, pageProps) => {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <Provider session={pageProps.session}>{props.children}</Provider>
        </Hydrate>
      </QueryClientProvider>
    </TelemetryProvider>
  );
};

export default AppProviders;
