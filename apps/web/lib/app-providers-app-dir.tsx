import { TooltipProvider } from "@radix-ui/react-tooltip";
import { HydrateClient } from "app/_trpc/HydrateClient";
import { dir } from "i18next";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { EventCollectionProvider } from "next-collect/client";
import type { SSRConfig } from "next-i18next";
import { appWithTranslation } from "next-i18next";
import { ThemeProvider } from "next-themes";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import DynamicPostHogProvider from "@calcom/features/ee/event-tracking/lib/posthog/providerDynamic";
import { OrgBrandingProvider } from "@calcom/features/ee/organizations/context/provider";
import DynamicHelpscoutProvider from "@calcom/features/ee/support/lib/helpscout/providerDynamic";
import { FeatureProvider } from "@calcom/features/flags/context/provider";
import { useFlags } from "@calcom/features/flags/hooks";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import useIsThemeSupported from "@lib/hooks/useIsThemeSupported";
import type { WithLocaleProps } from "@lib/withLocale";
import type { WithNonceProps } from "@lib/withNonce";

import { useViewerI18n } from "@components/I18nLanguageHandler";
import type { PageWrapperProps } from "@components/PageWrapperAppDir";

import { getThemeProviderProps } from "./getThemeProviderProps";

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

type CalcomThemeProps = Readonly<{
  isBookingPage: boolean;
  nonce: string | undefined;
  children: React.ReactNode;
  isThemeSupported: boolean;
}>;

const CalcomThemeProvider = (props: CalcomThemeProps) => {
  // Use namespace of embed to ensure same namespaced embed are displayed with same theme. This allows different embeds on the same website to be themed differently
  // One such example is our Embeds Demo and Testing page at http://localhost:3100
  // Having `getEmbedNamespace` defined on window before react initializes the app, ensures that embedNamespace is available on the first mount and can be used as part of storageKey
  const searchParams = useSearchParams();
  const embedNamespace = searchParams ? getEmbedNamespace(searchParams) : null;
  const isEmbedMode = typeof embedNamespace === "string";
  const pathname = usePathname();
  const { key, ...themeProviderProps } = getThemeProviderProps({
    props,
    isEmbedMode,
    embedNamespace,
    pathname,
    searchParams,
  });

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
  const isThemeSupported = useIsThemeSupported();

  const RemainingProviders = (
    <EventCollectionProvider options={{ apiPath: "/api/collect-events" }}>
      <CustomI18nextProvider i18n={props.i18n}>
        <TooltipProvider>
          {/* color-scheme makes background:transparent not work which is required by embed. We need to ensure next-theme adds color-scheme to `body` instead of `html`(https://github.com/pacocoursey/next-themes/blob/main/src/index.tsx#L74). Once that's done we can enable color-scheme support */}
          <CalcomThemeProvider
            nonce={props.nonce}
            isThemeSupported={isThemeSupported}
            isBookingPage={props.isBookingPage || isBookingPage}>
            <FeatureFlagsProvider>
              <OrgBrandProvider>{props.children}</OrgBrandProvider>
            </FeatureFlagsProvider>
          </CalcomThemeProvider>
        </TooltipProvider>
      </CustomI18nextProvider>
    </EventCollectionProvider>
  );
  const Hydrated = props.dehydratedState ? (
    <HydrateClient state={props.dehydratedState}>{RemainingProviders}</HydrateClient>
  ) : (
    RemainingProviders
  );

  if (props.isBookingPage || isBookingPage) {
    return Hydrated;
  }

  return (
    <>
      <DynamicHelpscoutProvider>
        <DynamicPostHogProvider>{Hydrated}</DynamicPostHogProvider>
      </DynamicHelpscoutProvider>
    </>
  );
};

export default AppProviders;
