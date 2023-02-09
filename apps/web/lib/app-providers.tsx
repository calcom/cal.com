import { TooltipProvider } from "@radix-ui/react-tooltip";
import { SessionProvider } from "next-auth/react";
import { EventCollectionProvider } from "next-collect/client";
import { appWithTranslation, SSRConfig } from "next-i18next";
import { ThemeProvider } from "next-themes";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import { NextRouter } from "next/router";
import { ComponentProps, ReactNode } from "react";

import DynamicHelpscoutProvider from "@calcom/features/ee/support/lib/helpscout/providerDynamic";
import DynamicIntercomProvider from "@calcom/features/ee/support/lib/intercom/providerDynamic";
import { trpc } from "@calcom/trpc/react";
import { MetaProvider } from "@calcom/ui";

import usePublicPage from "@lib/hooks/usePublicPage";
import { WithNonceProps } from "@lib/withNonce";

const I18nextAdapter = appWithTranslation<NextJsAppProps<SSRConfig> & { children: React.ReactNode }>(
  ({ children }) => <>{children}</>
);

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = Omit<NextAppProps<WithNonceProps & Record<string, unknown>>, "Component"> & {
  Component: NextAppProps["Component"] & {
    requiresLicense?: boolean;
    isThemeSupported?: boolean | ((arg: { router: NextRouter }) => boolean);
    getLayout?: (page: React.ReactElement, router: NextRouter) => ReactNode;
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
  const { i18n, locale } = trpc.viewer.public.i18n.useQuery(undefined, {
    trpc: { context: { skipBatch: true } },
  }).data ?? {
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
  const session = trpc.viewer.public.session.useQuery().data;
  // No need to have intercom on public pages - Good for Page Performance
  const isPublicPage = usePublicPage();
  const isThemeSupported =
    typeof props.Component.isThemeSupported === "function"
      ? props.Component.isThemeSupported({ router: props.router })
      : props.Component.isThemeSupported;
  const forcedTheme = isThemeSupported ? undefined : "light";
  // Use namespace of embed to ensure same namespaced embed are displayed with same theme. This allows different embeds on the same website to be themed differently
  // One such example is our Embeds Demo and Testing page at http://localhost:3100
  // Having `getEmbedNamespace` defined on window before react initializes the app, ensures that embedNamespace is available on the first mount and can be used as part of storageKey
  const embedNamespace = typeof window !== "undefined" ? window.getEmbedNamespace() : null;
  const storageKey = typeof embedNamespace === "string" ? `embed-theme-${embedNamespace}` : "theme";

  const RemainingProviders = (
    <EventCollectionProvider options={{ apiPath: "/api/collect-events" }}>
      <SessionProvider session={session || undefined}>
        <CustomI18nextProvider {...props}>
          <TooltipProvider>
            {/* color-scheme makes background:transparent not work which is required by embed. We need to ensure next-theme adds color-scheme to `body` instead of `html`(https://github.com/pacocoursey/next-themes/blob/main/src/index.tsx#L74). Once that's done we can enable color-scheme support */}
            <ThemeProvider
              nonce={props.pageProps.nonce}
              enableColorScheme={false}
              storageKey={storageKey}
              forcedTheme={forcedTheme}
              attribute="class">
              <MetaProvider>{props.children}</MetaProvider>
            </ThemeProvider>
          </TooltipProvider>
        </CustomI18nextProvider>
      </SessionProvider>
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
