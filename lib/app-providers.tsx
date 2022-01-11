import { IdProvider } from "@radix-ui/react-id";
import { SessionProvider } from "next-auth/react";
import { appWithTranslation } from "next-i18next";
import type { AppProps as NextAppProps } from "next/app";
import React, { ComponentProps, ReactNode } from "react";

import DynamicIntercomProvider from "@ee/lib/intercom/providerDynamic";

import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";

import { trpc } from "./trpc";

const I18nextAdapter = appWithTranslation(({ children }: { children?: ReactNode }) => <>{children}</>);

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = NextAppProps & {
  /** Will be defined only is there was an error */
  err?: Error;
};

type AppPropsWithChildren = AppProps & {
  children: ReactNode;
};

const CustomI18nextProvider = (props: AppPropsWithChildren) => {
  const { i18n, locale } = trpc.useQuery(["viewer.i18n"]).data ?? {
    locale: "en",
  };

  const passedProps = {
    ...props,
    pageProps: {
      ...props.pageProps,
      ...i18n,
    },
    router: locale ? { locale } : props.router,
  } as unknown as ComponentProps<typeof I18nextAdapter>;
  return <I18nextAdapter {...passedProps} />;
};

const AppProviders = (props: AppPropsWithChildren) => {
  const session = trpc.useQuery(["viewer.session"]).data;
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <IdProvider>
        <DynamicIntercomProvider>
          <SessionProvider session={session || undefined}>
            <CustomI18nextProvider {...props}>{props.children}</CustomI18nextProvider>
          </SessionProvider>
        </DynamicIntercomProvider>
      </IdProvider>
    </TelemetryProvider>
  );
};

export default AppProviders;
