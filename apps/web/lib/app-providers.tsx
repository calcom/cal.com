import { TooltipProvider } from "@radix-ui/react-tooltip";
import { SessionProvider } from "next-auth/react";
import { EventCollectionProvider } from "next-collect/client";
import type { SSRConfig } from "next-i18next";
import { appWithTranslation } from "next-i18next";
import { ThemeProvider } from "next-themes";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";

import DynamicHelpscoutProvider from "@calcom/features/ee/support/lib/helpscout/providerDynamic";
import DynamicIntercomProvider from "@calcom/features/ee/support/lib/intercom/providerDynamic";
import { FeatureProvider } from "@calcom/features/flags/context/provider";
import { useFlags } from "@calcom/features/flags/hooks";
import { trpc } from "@calcom/trpc/react";
import { MetaProvider } from "@calcom/ui";

import usePublicPage from "@lib/hooks/usePublicPage";
import type { WithNonceProps } from "@lib/withNonce";

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

const CalcomThemeProvider = (
  props: PropsWithChildren<
    WithNonceProps & { isThemeSupported?: boolean | ((arg: { router: NextRouter }) => boolean) }
  >
) => {
  // We now support the inverse of how we handled it in the past. Setting this to false will disable theme.
  // undefined or true means we use system theme
  const router = useRouter();
  const isThemeSupported = (() => {
    if (typeof props.isThemeSupported === "function") {
      return props.isThemeSupported({ router: router });
    }
    if (typeof props.isThemeSupported === "undefined") {
      return true;
    }
    return props.isThemeSupported;
  })();

  const forcedTheme = !isThemeSupported ? "light" : undefined;
  // Use namespace of embed to ensure same namespaced embed are displayed with same theme. This allows different embeds on the same website to be themed differently
  // One such example is our Embeds Demo and Testing page at http://localhost:3100
  // Having `getEmbedNamespace` defined on window before react initializes the app, ensures that embedNamespace is available on the first mount and can be used as part of storageKey
  const embedNamespace = typeof window !== "undefined" ? window.getEmbedNamespace() : null;
  // If embedNamespace is not defined, we use the default storageKey -> The default storage key changs based on if we force light mode or not
  // This is done to ensure that the default theme is light when we force light mode and as soon as you navigate to a page that is dark we dont need a hard refresh to change
  const storageKey =
    typeof embedNamespace === "string"
      ? `embed-theme-${embedNamespace}`
      : !isThemeSupported
      ? "cal-light"
      : "theme";

  return (
    <ThemeProvider
      nonce={props.nonce}
      enableColorScheme={false}
      enableSystem={isThemeSupported}
      forcedTheme={forcedTheme}
      storageKey={storageKey}
      attribute="class">
      {props.children}
    </ThemeProvider>
  );
};

function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const flags = useFlags();
  return <FeatureProvider value={flags}>{children}</FeatureProvider>;
}

const AppProviders = (props: AppPropsWithChildren) => {
  const session = trpc.viewer.public.session.useQuery().data;
  // No need to have intercom on public pages - Good for Page Performance
  const isPublicPage = usePublicPage();

  const RemainingProviders = (
    <EventCollectionProvider options={{ apiPath: "/api/collect-events" }}>
      <SessionProvider session={session || undefined}>
        <CustomI18nextProvider {...props}>
          <TooltipProvider>
            {/* color-scheme makes background:transparent not work which is required by embed. We need to ensure next-theme adds color-scheme to `body` instead of `html`(https://github.com/pacocoursey/next-themes/blob/main/src/index.tsx#L74). Once that's done we can enable color-scheme support */}
            <CalcomThemeProvider
              nonce={props.pageProps.nonce}
              isThemeSupported={props.Component.isThemeSupported}>
              <FeatureFlagsProvider>
                <MetaProvider>{props.children}</MetaProvider>
              </FeatureFlagsProvider>
            </CalcomThemeProvider>
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
