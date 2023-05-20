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

import { useViewerI18n } from "@components/I18nLanguageHandler";

const I18nextAdapter = appWithTranslation<NextJsAppProps<SSRConfig> & { children: React.ReactNode }>(
  ({ children }) => <>{children}</>
);

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = Omit<
  NextAppProps<WithNonceProps & { themeBasis?: string } & Record<string, unknown>>,
  "Component"
> & {
  Component: NextAppProps["Component"] & {
    requiresLicense?: boolean;
    isThemeSupported?: boolean;
    isBookingPage?: boolean | ((arg: { router: NextRouter }) => boolean);
    getLayout?: (page: React.ReactElement, router: NextRouter) => ReactNode;
    PageWrapper?: (props: AppProps) => JSX.Element;
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
  const { i18n, locale } = useViewerI18n().data ?? {
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

type CalcomThemeProps = PropsWithChildren<
  Pick<AppProps["pageProps"], "nonce" | "themeBasis"> &
    Pick<AppProps["Component"], "isBookingPage" | "isThemeSupported">
>;
const CalcomThemeProvider = (props: CalcomThemeProps) => {
  const router = useRouter();

  // Use namespace of embed to ensure same namespaced embed are displayed with same theme. This allows different embeds on the same website to be themed differently
  // One such example is our Embeds Demo and Testing page at http://localhost:3100
  // Having `getEmbedNamespace` defined on window before react initializes the app, ensures that embedNamespace is available on the first mount and can be used as part of storageKey
  const embedNamespace = typeof window !== "undefined" ? window.getEmbedNamespace() : null;
  const isEmbedMode = typeof embedNamespace === "string";

  return (
    <ThemeProvider {...getThemeProviderProps({ props, isEmbedMode, embedNamespace, router })}>
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

/**
 * The most important job for this fn is to generate correct storageKey for theme persistenc.
 * `storageKey` is important because that key is listened for changes(using [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event) and any pages opened will change it's theme based on that(as part of next-themes implementation).
 * Choosing the right storageKey avoids theme flickering caused by another page using different theme
 * So, we handle all the cases here namely,
 * - Both Booking Pages, /free/30min and /pro/30min but configured with different themes but being operated together.
 * - Embeds using different namespace. They can be completely themed different on the same page.
 * - Embeds using the same namespace but showing different cal.com links with different themes
 * - Embeds using the same namespace and showing same cal.com links with different themes(Different theme is possible for same cal.com link in case of embed because of theme config available in embed)
 * - App has different theme then Booking Pages.
 *
 * All the above cases have one thing in common, which is the origin and thus localStorage is shared and thus `storageKey` is critical to avoid theme flickering.
 *
 * Some things to note:
 * - There is a side effect of so many factors in `storageKey` that many localStorage keys will be created if a user goes through all these scenarios(e.g like booking a lot of different users)
 * - Some might recommend disabling localStorage persistence but that doesn't give good UX as then we would default to light theme always for a few seconds before switching to dark theme(if that's the user's preference).
 * - We can't disable [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event handling as well because changing theme in one tab won't change the theme without refresh in other tabs. That's again a bad UX
 * - Theme flickering becomes infinitely ongoing in case of embeds because of the browser's delay in processing `storage` event within iframes. Consider two embeds simulatenously opened with pages A and B. Note the timeline and keep in mind that it happened
 *  because 'setItem(A)' and 'Receives storageEvent(A)' allowed executing setItem(B) in b/w because of the delay.
 *    - t1 -> setItem(A) & Fires storageEvent(A) - On Page A) - Current State(A)
 *    - t2 -> setItem(B) & Fires storageEvent(B) - On Page B) - Current State(B)
 *    - t3 -> Receives storageEvent(A) & thus setItem(A) & thus fires storageEvent(A) (On Page B) - Current State(A)
 *    - t4 -> Receives storageEvent(B) & thus setItem(B) & thus fires storageEvent(B) (On Page A) - Current State(B)
 *    - ... and so on ...
 */
function getThemeProviderProps({
  props,
  isEmbedMode,
  embedNamespace,
  router,
}: {
  props: Omit<CalcomThemeProps, "children">;
  isEmbedMode: boolean;
  embedNamespace: string | null;
  router: NextRouter;
}) {
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

  const isBookingPageThemSupportRequired = themeSupport === ThemeSupport.Booking;
  const themeBasis = props.themeBasis;

  if ((isBookingPageThemSupportRequired || isEmbedMode) && !themeBasis) {
    console.warn(
      "`themeBasis` is required for booking page theme support. Not providing it will cause theme flicker."
    );
  }

  const appearanceIdSuffix = themeBasis ? ":" + themeBasis : "";
  const forcedTheme = themeSupport === ThemeSupport.None ? "light" : undefined;
  let embedExplicitlySetThemeSuffix = "";

  if (typeof window !== "undefined") {
    const embedTheme = window.getEmbedTheme();
    if (embedTheme) {
      embedExplicitlySetThemeSuffix = ":" + embedTheme;
    }
  }

  const storageKey = isEmbedMode
    ? // Same Namespace, Same Organizer but different themes would still work seamless and not cause theme flicker
      // Even though it's recommended to use different namespaces when you want to theme differently on the same page but if the embeds are on different pages, the problem can still arise
      `embed-theme-${embedNamespace}${appearanceIdSuffix}${embedExplicitlySetThemeSuffix}`
    : themeSupport === ThemeSupport.App
    ? "app-theme"
    : isBookingPageThemSupportRequired
    ? `booking-theme${appearanceIdSuffix}`
    : undefined;

  return {
    storageKey,
    forcedTheme,
    themeSupport,
    nonce: props.nonce,
    enableColorScheme: false,
    enableSystem: themeSupport !== ThemeSupport.None,
    // next-themes doesn't listen to changes on storageKey. So we need to force a re-render when storageKey changes
    // This is how login to dashboard soft navigation changes theme from light to dark
    key: storageKey,
    attribute: "class",
  };
}

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
              themeBasis={props.pageProps.themeBasis}
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
