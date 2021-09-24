import { Provider } from "next-auth/client";
import React from "react";
import { HydrateProps, QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";

import { Session } from "@lib/auth";
import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";

export const queryClient = new QueryClient();

type AppProviderProps = {
  pageProps: {
    session?: Session;
    dehydratedState?: HydrateProps;
  };
};

const AppProviders: React.FC<AppProviderProps> = ({ pageProps, children }) => {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <Provider session={pageProps.session}>{children}</Provider>
        </Hydrate>
      </QueryClientProvider>
    </TelemetryProvider>
  );
};

export default AppProviders;
