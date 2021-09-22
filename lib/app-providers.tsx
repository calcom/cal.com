import React from "react";
import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";
import { Provider } from "next-auth/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";

export const queryClient = new QueryClient();

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
