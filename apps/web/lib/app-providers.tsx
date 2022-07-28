import { SessionProvider } from "next-auth/react";
import { EventCollectionProvider } from "next-collect/client";
import { appWithTranslation } from "next-i18next";
import { ThemeProvider } from "next-themes";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import { NextRouter } from "next/router";
import { ComponentProps, ReactNode } from "react";

import DynamicHelpscoutProvider from "@calcom/ee/support/lib/helpscout/providerDynamic";
import DynamicIntercomProvider from "@calcom/ee/support/lib/intercom/providerDynamic";
import { ContractsProvider } from "@calcom/ee/web3/contexts/contractsContext";
import { trpc } from "@calcom/trpc/react";

import usePublicPage from "@lib/hooks/usePublicPage";

const I18nextAdapter = appWithTranslation<NextJsAppProps & { children: React.ReactNode }>(({ children }) => (
  <>{children}</>
));

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = Omit<NextAppProps, "Component"> & {
  Component: NextAppProps["Component"] & {
    requiresLicense?: boolean;
    isThemeSupported?: boolean | ((arg: { router: NextRouter }) => boolean);
  };
  /** Will be defined only is there was an error */
  err?: Error;
};

type AppPropsWithChildren = AppProps & {
  children: ReactNode;
};

const CustomI18nextProvider = (props: AppPropsWithChildren) => {
  /**
   * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
   * We intend to not cache i18n query
   **/
  const { i18n, locale } = trpc.useQuery(["viewer.public.i18n"], { context: { skipBatch: true } }).data ?? {
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
  const session = trpc.useQuery(["viewer.public.session"]).data;
  // No need to have intercom on public pages - Good for Page Performance
  const isPublicPage = usePublicPage();
  const forcedTheme = props.Component.isThemeSupported ? undefined : "light";
  const RemainingProviders = (
    <EventCollectionProvider options={{ apiPath: "/api/collect-events" }}>
      <ContractsProvider>
        <SessionProvider session={session || undefined}>
          <CustomI18nextProvider {...props}>
            {/* color-scheme makes background:transparent not work which is required by embed. We need to ensure next-theme adds color-scheme to `body` instead of `html`(https://github.com/pacocoursey/next-themes/blob/main/src/index.tsx#L74). Once that's done we can enable color-scheme support */}
            <ThemeProvider enableColorScheme={false} forcedTheme={forcedTheme} attribute="class">
              {props.children}
            </ThemeProvider>
          </CustomI18nextProvider>
        </SessionProvider>
      </ContractsProvider>
    </EventCollectionProvider>
  );

  if (isPublicPage) {
    return RemainingProviders;
  }

  return (
    <DynamicHelpscoutProvider>
      <DynamicIntercomProvider>{RemainingProviders}</DynamicIntercomProvider>
    </DynamicHelpscoutProvider>
  );
};

export default AppProviders;
