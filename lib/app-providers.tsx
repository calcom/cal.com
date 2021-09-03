import React from "react";
import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";
import { Elements } from "@stripe/react-stripe-js";
import { Provider } from "next-auth/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { Hydrate } from "react-query/hydration";
import getStripe from "./stripe/client";

export const queryClient = new QueryClient();

const StripeProvider: React.FC = ({ children }) =>
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ? (
    <Elements stripe={getStripe()}>{children}</Elements>
  ) : (
    <>{children}</>
  );

const AppProviders: React.FC = (props, pageProps) => {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <Provider session={pageProps.session}>
            <StripeProvider>{props.children}</StripeProvider>
          </Provider>
        </Hydrate>
      </QueryClientProvider>
    </TelemetryProvider>
  );
};

export default AppProviders;
