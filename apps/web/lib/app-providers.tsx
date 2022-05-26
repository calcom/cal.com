import { SessionProvider } from "next-auth/react";
import { appWithTranslation } from "next-i18next";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import { ComponentProps, ReactNode, useMemo } from "react";

import DynamicHelpscoutProvider from "@ee/lib/helpscout/providerDynamic";
import DynamicIntercomProvider from "@ee/lib/intercom/providerDynamic";

import usePublicPage from "@lib/hooks/usePublicPage";
import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";

import { trpc } from "./trpc";

const I18nextAdapter = appWithTranslation<NextJsAppProps & { children: React.ReactNode }>(({ children }) => (
  <>{children}</>
));

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
  // No need to have intercom on public pages - Good for Page Performance
  const isPublicPage = usePublicPage();
  const RemainingProviders = (
    <SessionProvider session={session || undefined}>
      <CustomI18nextProvider {...props}>{props.children}</CustomI18nextProvider>
    </SessionProvider>
  );
  const telemetryClient = useMemo(createTelemetryClient, []);
  return (
    <TelemetryProvider value={telemetryClient}>
      {isPublicPage ? (
        RemainingProviders
      ) : (
        <DynamicHelpscoutProvider>
          <DynamicIntercomProvider>{RemainingProviders}</DynamicIntercomProvider>
        </DynamicHelpscoutProvider>
      )}
    </TelemetryProvider>
  );
};

export default AppProviders;
