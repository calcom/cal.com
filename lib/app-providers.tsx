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
  const _nextI18Next = trpc.useQuery(["viewer._nextI18Next"]).data;
  const locale = trpc.useQuery(["viewer.me"]).data?.locale;
  const passedProps = {
    ...props,
    pageProps: { _nextI18Next },
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
          <Provider session={session}>
            <CustomI18nextProvider>{props.children}</CustomI18nextProvider>
          </Provider>
        </DynamicIntercomProvider>
      </IdProvider>
    </TelemetryProvider>
  );
};

export default AppProviders;
