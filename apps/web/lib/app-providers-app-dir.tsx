import { TooltipProvider } from "@radix-ui/react-tooltip";
import { HydrateClient } from "app/_trpc/HydrateClient";
import { dir } from "i18next";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { EventCollectionProvider } from "next-collect/client";
import type { SSRConfig } from "next-i18next";
import { appWithTranslation } from "next-i18next";
import { ThemeProvider } from "next-themes";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import CacheProvider from "react-inlinesvg/provider";

import DynamicPostHogProvider from "@calcom/features/ee/event-tracking/lib/posthog/providerDynamic";
import { OrgBrandingProvider } from "@calcom/features/ee/organizations/context/provider";
import DynamicHelpscoutProvider from "@calcom/features/ee/support/lib/helpscout/providerDynamic";
import DynamicIntercomProvider from "@calcom/features/ee/support/lib/intercom/providerDynamic";
import { FeatureProvider } from "@calcom/features/flags/context/provider";
import { useFlags } from "@calcom/features/flags/hooks";
import { MetaProvider } from "@calcom/ui";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import type { WithLocaleProps } from "@lib/withLocale";
import type { WithNonceProps } from "@lib/withNonce";

import { useViewerI18n } from "@components/I18nLanguageHandler";
import type { PageWrapperProps } from "@components/PageWrapperAppDir";

const I18nextAdapter = appWithTranslation<
  NextJsAppProps<SSRConfig> & {
    children: React.ReactNode;
  }
>(({ children }) => <>{children}</>);

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = Omit<
  NextAppProps<
    WithLocaleProps<
      WithNonceProps<{
        themeBasis?: string;
        session: Session;
        i18n?: SSRConfig;
      }>
    >
  >,
  "Component"
> & {
  Component: NextAppProps["Component"] & {
    requiresLicense?: boolean;
    isThemeSupported?: boolean;
    isBookingPage?: boolean | ((arg: { router: NextAppProps["router"] }) => boolean);
    getLayout?: (page: React.ReactElement) => ReactNode;
    PageWrapper?: (props: AppProps) => JSX.Element;
  };

  /** Will be defined only is there was an error */
  err?: Error;
};

const getEmbedNamespace = (searchParams: ReadonlyURLSearchParams) => {
  // Mostly embed query param should be available on server. Use that there.
  // Use the most reliable detection on client
  return typeof window !== "undefined" ? window.getEmbedNamespace() : searchParams.get("embed") ?? null;
};

const CustomI18nextProvider = (props: { children: React.ReactElement; i18n?: SSRConfig }) => {
  /**
   * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
   **/

  const session = useSession();
  const fallbackLocale =
    typeof window !== "undefined" && window.document.documentElement.lang
      ? window.document.documentElement.lang
      : "en";
  const newLocale = typeof window !== "undefined" && window.calNewLocale ? window.calNewLocale : null;
  const locale = session?.data?.user.locale ?? newLocale ?? fallbackLocale;

  useEffect(() => {
    try {
      // @ts-expect-error TS2790: The operand of a 'delete' operator must be optional.
      delete window.document.documentElement["lang"];

      window.document.documentElement.lang = locale;

      // Next.js writes the locale to the same attribute
      // https://github.com/vercel/next.js/blob/1609da2d9552fed48ab45969bdc5631230c6d356/packages/next/src/shared/lib/router/router.ts#L1786
      // which can result in a race condition
      // this property descriptor ensures this never happens
      Object.defineProperty(window.document.documentElement, "lang", {
        configurable: true,
        // value: locale,
        set: function (this) {
          // empty setter on purpose
        },
        get: function () {
          return locale;
        },
      });
    } catch (error) {
      console.error(error);

      window.document.documentElement.lang = locale;
    }
    window.document.dir = dir(locale);
  }, [locale]);

  const clientViewerI18n = useViewerI18n(locale);
  const i18n = clientViewerI18n.data?.i18n ?? props.i18n;

  return (
    // @ts-expect-error AppWithTranslationHoc expects AppProps
    <I18nextAdapter pageProps={{ _nextI18Next: i18n?._nextI18Next }}>{props.children}</I18nextAdapter>
  );
};

const enum ThemeSupport {
  // e.g. Login Page
  None = "none",
  // Entire App except Booking Pages
  App = "appConfigured",
  // Booking Pages(including Routing Forms)
  Booking = "bookingConfigured",
}

type CalcomThemeProps = Readonly<{
  isBookingPage: boolean;
  themeBasis: string | null;
  nonce: string | undefined;
  children: React.ReactNode;
  isThemeSupported?: boolean;
}>;

const CalcomThemeProvider = (props: CalcomThemeProps) => {
  // Use namespace of embed to ensure same namespaced embed are displayed with same theme. This allows different embeds on the same website to be themed differently
  // One such example is our Embeds Demo and Testing page at http://localhost:3100
  // Having `getEmbedNamespace` defined on window before react initializes the app, ensures that embedNamespace is available on the first mount and can be used as part of storageKey
  const searchParams = useSearchParams();
  const embedNamespace = searchParams ? getEmbedNamespace(searchParams) : null;
  const isEmbedMode = typeof embedNamespace === "string";

  const { key, ...themeProviderProps } = getThemeProviderProps({ props, isEmbedMode, embedNamespace });

  return (
    <ThemeProvider key={key} {...themeProviderProps}>
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
}: {
  props: Omit<CalcomThemeProps, "children">;
  isEmbedMode: boolean;
  embedNamespace: string | null;
}) {
  const themeSupport = props.isBookingPage
    ? ThemeSupport.Booking
    : // if isThemeSupported is explicitly false, we don't use theme there
    props.isThemeSupported === false
    ? ThemeSupport.None
    : ThemeSupport.App;

  const isBookingPageThemeSupportRequired = themeSupport === ThemeSupport.Booking;
  const themeBasis = props.themeBasis;

  if (!process.env.NEXT_PUBLIC_IS_E2E && (isBookingPageThemeSupportRequired || isEmbedMode) && !themeBasis) {
    console.warn(
      "`themeBasis` is required for booking page theme support. Not providing it will cause theme flicker."
    );
  }

  const appearanceIdSuffix = themeBasis ? `:${themeBasis}` : "";
  const forcedTheme = themeSupport === ThemeSupport.None ? "light" : undefined;
  let embedExplicitlySetThemeSuffix = "";

  if (typeof window !== "undefined") {
    const embedTheme = window.getEmbedTheme();
    if (embedTheme) {
      embedExplicitlySetThemeSuffix = `:${embedTheme}`;
    }
  }

  const storageKey = isEmbedMode
    ? // Same Namespace, Same Organizer but different themes would still work seamless and not cause theme flicker
      // Even though it's recommended to use different namespaces when you want to theme differently on the same page but if the embeds are on different pages, the problem can still arise
      `embed-theme-${embedNamespace}${appearanceIdSuffix}${embedExplicitlySetThemeSuffix}`
    : themeSupport === ThemeSupport.App
    ? "app-theme"
    : isBookingPageThemeSupportRequired
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

function useOrgBrandingValues() {
  const session = useSession();
  return session?.data?.user.org;
}

function OrgBrandProvider({ children }: { children: React.ReactNode }) {
  const orgBrand = useOrgBrandingValues();
  return <OrgBrandingProvider value={{ orgBrand }}>{children}</OrgBrandingProvider>;
}

const AppProviders = (props: PageWrapperProps) => {
  // No need to have intercom on public pages - Good for Page Performance
  const isBookingPage = useIsBookingPage();
  const RemainingProviders = (
    <EventCollectionProvider options={{ apiPath: "/api/collect-events" }}>
      <SessionProvider>
        <CustomI18nextProvider i18n={props.i18n}>
          <TooltipProvider>
            {/* color-scheme makes background:transparent not work which is required by embed. We need to ensure next-theme adds color-scheme to `body` instead of `html`(https://github.com/pacocoursey/next-themes/blob/main/src/index.tsx#L74). Once that's done we can enable color-scheme support */}
            <CalcomThemeProvider
              themeBasis={props.themeBasis}
              nonce={props.nonce}
              isThemeSupported={/* undefined gets treated as true */ props.isThemeSupported}
              isBookingPage={props.isBookingPage || isBookingPage}>
              <FeatureFlagsProvider>
                <OrgBrandProvider>
                  {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
                  <CacheProvider>
                    <MetaProvider>{props.children}</MetaProvider>
                  </CacheProvider>
                </OrgBrandProvider>
              </FeatureFlagsProvider>
            </CalcomThemeProvider>
          </TooltipProvider>
        </CustomI18nextProvider>
      </SessionProvider>
    </EventCollectionProvider>
  );
  const Hydrated = props.dehydratedState ? (
    <HydrateClient state={props.dehydratedState}>{RemainingProviders}</HydrateClient>
  ) : (
    RemainingProviders
  );

  if (isBookingPage) {
    return Hydrated;
  }

  return (
    <DynamicHelpscoutProvider>
      <DynamicIntercomProvider>
        <DynamicPostHogProvider>{Hydrated}</DynamicPostHogProvider>
      </DynamicIntercomProvider>
    </DynamicHelpscoutProvider>
  );
};

export default AppProviders;
