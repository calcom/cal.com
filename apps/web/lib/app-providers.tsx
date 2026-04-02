/**
 * PAGES ROUTER ONLY - Used exclusively by Next.js Pages Router (_app.tsx)
 *
 * Currently only serves the /router endpoint (routing forms redirect page).
 * DO NOT add new features here - this file will be deprecated once we remove apps/web/pages.
 *
 * For App Router, use app-providers-app-dir.tsx instead.
 */

import process from "node:process";
import type { ParsedUrlQuery } from "node:querystring";
import { OrgBrandingProvider } from "@calcom/features/ee/organizations/context/provider";
import { FeatureProvider } from "@calcom/features/flags/context/provider";
import DynamicHelpscoutProvider from "@calcom/web/modules/ee/support/lib/helpscout/providerDynamic";
import DynamicIntercomProvider from "@calcom/web/modules/ee/support/lib/intercom/providerDynamic";
import { useFlags } from "@calcom/web/modules/feature-flags/hooks/useFlags";
import { useViewerI18n } from "@components/I18nLanguageHandler";
import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import { useNuqsParams } from "@lib/hooks/useNuqsParams";
import type { WithLocaleProps } from "@lib/withLocale";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { dir } from "i18next";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { appWithTranslation } from "next-i18next";
import type { SSRConfig } from "next-i18next/dist/types/types";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/pages";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect } from "react";

const I18nextAdapter = appWithTranslation<
  NextJsAppProps<SSRConfig> & {
    children: React.ReactNode;
  }
>(({ children }) => <>{children}</>);

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = Omit<
  NextAppProps<
    WithLocaleProps<{
      themeBasis?: string;
      session: Session;
      i18n?: SSRConfig;
    }>
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

type AppPropsWithChildren = AppProps & {
  children: ReactNode;
};

const getEmbedNamespace = (query: ParsedUrlQuery) => {
  // Mostly embed query param should be available on server. Use that there.
  // Use the most reliable detection on client
  return typeof window !== "undefined" ? window.getEmbedNamespace() : (query.embed as string) || null;
};

const CustomI18nextProvider = (props: AppPropsWithChildren) => {
  /**
   * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
   **/

  const session = useSession();
  const locale = session?.data?.user.locale ?? props.pageProps.newLocale;

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
        get: () => locale,
      });
    } catch (error) {
      console.error(error);

      window.document.documentElement.lang = locale;
    }

    window.document.dir = dir(locale);
  }, [locale]);

  const clientViewerI18n = useViewerI18n(locale);
  const i18n = clientViewerI18n.data?.i18n ?? props.pageProps.i18n;

  const passedProps = {
    ...props,
    pageProps: {
      ...props.pageProps,

      ...i18n,
    },
  };

  return <I18nextAdapter {...passedProps} />;
};

enum ThemeSupport {
  // e.g. Login Page
  None = "none",
  // Entire App except Booking Pages
  App = "appConfigured",
  // Booking Pages(including Routing Forms)
  Booking = "bookingConfigured",
}

type CalcomThemeProps = PropsWithChildren<
  Pick<AppProps, "router"> &
    Pick<AppProps["pageProps"], "themeBasis"> &
    Pick<AppProps["Component"], "isBookingPage" | "isThemeSupported">
>;
const CalcomThemeProvider = (props: CalcomThemeProps) => {
  // Use namespace of embed to ensure same namespaced embed are displayed with same theme. This allows different embeds on the same website to be themed differently
  // One such example is our Embeds Demo and Testing page at http://localhost:3100
  // Having `getEmbedNamespace` defined on window before react initializes the app, ensures that embedNamespace is available on the first mount and can be used as part of storageKey
  const embedNamespace = getEmbedNamespace(props.router.query);
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
 * - Theme flickering becomes infinitely ongoing in case of embeds because of the browser's delay in processing `storage` event within iframes. Consider two embeds simultaneously opened with pages A and B. Note the timeline and keep in mind that it happened
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
  const isBookingPage = (() => {
    if (typeof props.isBookingPage === "function") {
      return props.isBookingPage({ router: props.router });
    }
    return props.isBookingPage;
  })();

  const themeSupport = isBookingPage
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

const AppProviders = (props: AppPropsWithChildren) => {
  const isBookingPage = useIsBookingPage();
  const _isBookingPage =
    (typeof props.Component.isBookingPage === "function"
      ? props.Component.isBookingPage({ router: props.router })
      : props.Component.isBookingPage) || isBookingPage;
  const nuqsParams = useNuqsParams();

  const RemainingProviders = (
    <CustomI18nextProvider {...props}>
      <TooltipProvider>
        <CalcomThemeProvider
          themeBasis={props.pageProps.themeBasis}
          isThemeSupported={props.Component.isThemeSupported}
          isBookingPage={props.Component.isBookingPage || isBookingPage}
          router={props.router}>
          <NuqsAdapter {...nuqsParams}>
            <FeatureFlagsProvider>
              {_isBookingPage ? (
                <OrgBrandProvider>{props.children}</OrgBrandProvider>
              ) : (
                <DynamicIntercomProvider>
                  <OrgBrandProvider>{props.children}</OrgBrandProvider>
                </DynamicIntercomProvider>
              )}
            </FeatureFlagsProvider>
          </NuqsAdapter>
        </CalcomThemeProvider>
      </TooltipProvider>
    </CustomI18nextProvider>
  );

  if (isBookingPage) {
    return RemainingProviders;
  }

  return (
    <>
      <DynamicHelpscoutProvider>{RemainingProviders}</DynamicHelpscoutProvider>
    </>
  );
};

export default AppProviders;
