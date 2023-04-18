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
    isThemeSupported?: boolean;
    isBookingPage?: boolean | ((arg: { router: NextRouter }) => boolean);
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

const enum ThemeSupport {
  // e.g. Login Page
  None = "none",
  // Entire App except Booking Pages
  App = "systemOnly",
  // Booking Pages(including Routing Forms)
  Booking = "userConfigured",
}

const CalcomThemeProvider = (
  props: PropsWithChildren<
    WithNonceProps & {
      isBookingPage?: boolean | ((arg: { router: NextRouter }) => boolean);
      isThemeSupported?: boolean;
    }
  >
) => {
  // We now support the inverse of how we handled it in the past. Setting this to false will disable theme.
  // undefined or true means we use system theme
  const router = useRouter();
  const isBookingPage = (() => {
    if (typeof props.isBookingPage === "function") {
      return props.isBookingPage({ router: router });
    }

    return props.isBookingPage;
  })();

  const themeSupport = isBookingPage
    ? ThemeSupport.Booking
    : // if isThemeSupported is explicitly false, we don't use theme there
    props.isThemeSupported === false
    ? ThemeSupport.None
    : ThemeSupport.App;

  const forcedTheme = themeSupport === ThemeSupport.None ? "light" : undefined;
  // Use namespace of embed to ensure same namespaced embed are displayed with same theme. This allows different embeds on the same website to be themed differently
  // One such example is our Embeds Demo and Testing page at http://localhost:3100
  // Having `getEmbedNamespace` defined on window before react initializes the app, ensures that embedNamespace is available on the first mount and can be used as part of storageKey
  const embedNamespace = typeof window !== "undefined" ? window.getEmbedNamespace() : null;
  const isEmbedMode = typeof embedNamespace === "string";

  const storageKey = isEmbedMode
    ? `embed-theme-${embedNamespace}`
    : themeSupport === ThemeSupport.App
    ? "app-theme"
    : themeSupport === ThemeSupport.Booking
    ? "booking-theme"
    : undefined;

  return (
    <ThemeProvider
      nonce={props.nonce}
      enableColorScheme={false}
      enableSystem={themeSupport !== ThemeSupport.None}
      forcedTheme={forcedTheme}
      storageKey={storageKey}
      // next-themes doesn't listen to changes on storageKey. So we need to force a re-render when storageKey changes
      // This is how login to dashboard soft navigation changes theme from light to dark
      key={storageKey}
      attribute="class">
      {/* Embed Mode can be detected reliably only on client side here as there can be static generated pages as well which can't determine if it's embed mode at backend */}
      {/* color-scheme makes background:transparent not work in iframe which is required by embed. */}
      {typeof window !== "undefined" && !isEmbedMode && (
        <style jsx global>
          {`
            .dark {
              color-scheme: dark;
            }
          `}
        </style>
      )}
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
            <CalcomThemeProvider
              nonce={props.pageProps.nonce}
              isThemeSupported={props.Component.isThemeSupported}
              isBookingPage={props.Component.isBookingPage}>
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
