import { IdProvider } from "@radix-ui/react-id";
import { Provider } from "next-auth/client";
import { appWithTranslation } from "next-i18next";
import { AppProps } from "next/dist/shared/lib/router/router";
import React, { ComponentProps, ReactNode } from "react";

import DynamicIntercomProvider from "@ee/lib/intercom/providerDynamic";

import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";

import { trpc } from "./trpc";

const I18nextAdapter = appWithTranslation(({ children }: { children?: ReactNode }) => <>{children}</>);

const CustomI18nextProvider = (props: { children: ReactNode }) => {
  const { i18n, locale } = trpc.useQuery(["viewer.i18n"]).data ?? {};
  const passedProps = {
    ...props,
    pageProps: { ...i18n },
    router: { locale },
  } as unknown as ComponentProps<typeof I18nextAdapter>;
  return <I18nextAdapter {...passedProps} />;
};

const AppProviders = (props: AppProps) => {
  const session = trpc.useQuery(["viewer.session"]).data;
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <IdProvider>
        <DynamicIntercomProvider>
          <Provider session={session || undefined}>
            <CustomI18nextProvider>{props.children}</CustomI18nextProvider>
          </Provider>
        </DynamicIntercomProvider>
      </IdProvider>
    </TelemetryProvider>
  );
};

export default AppProviders;
