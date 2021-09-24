import { Provider } from "next-auth/client";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";

import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";

import DynamicIntercomProvider from "./intercom/providerDynamic";

export const queryClient = new QueryClient();

const AppProviders: React.FC = (props, pageProps) => {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <QueryClientProvider client={queryClient}>
        <DynamicIntercomProvider>
          <Hydrate state={pageProps.dehydratedState}>
            <Provider session={pageProps.session}>{props.children}</Provider>
          </Hydrate>
        </DynamicIntercomProvider>
      </QueryClientProvider>
    </TelemetryProvider>
  );
};

export default AppProviders;
