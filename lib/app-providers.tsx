import { IdProvider } from "@radix-ui/react-id";
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

export default AppProviders;
