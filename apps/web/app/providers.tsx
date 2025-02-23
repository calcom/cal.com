"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import { TrpcProvider } from "app/_trpc/trpc-provider";
import { dir } from "i18next";
import { SessionProvider } from "next-auth/react";
import { useSession } from "next-auth/react";
import { EventCollectionProvider } from "next-collect/client";
import type { SSRConfig } from "next-i18next";
import { appWithTranslation } from "next-i18next";
import type { AppProps as NextJsAppProps } from "next/app";
import { useEffect } from "react";
import CacheProvider from "react-inlinesvg/provider";

import DynamicPostHogProvider from "@calcom/features/ee/event-tracking/lib/posthog/providerDynamic";
import { OrgBrandingProvider } from "@calcom/features/ee/organizations/context/provider";
import DynamicHelpscoutProvider from "@calcom/features/ee/support/lib/helpscout/providerDynamic";
import { FeatureProvider } from "@calcom/features/flags/context/provider";
import { useFlags } from "@calcom/features/flags/hooks";

import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import useIsThemeSupported from "@lib/hooks/useIsThemeSupported";
import PlainChat from "@lib/plain/dynamicProvider";

import { useViewerI18n } from "@components/I18nLanguageHandler";

import { CalcomThemeProvider } from "./themeProvider";

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

const I18nextAdapter = appWithTranslation<
  NextJsAppProps<SSRConfig> & {
    children: React.ReactNode;
  }
>(({ children }) => <>{children}</>);

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

export function Providers({ children }: { children: React.ReactNode }) {
  const isBookingPage = useIsBookingPage();
  const isThemeSupported = useIsThemeSupported();
  const ClientProviders = (
    <SessionProvider>
      <TrpcProvider>
        {!isBookingPage ? <PlainChat /> : null}
        {/* @ts-expect-error FIXME remove this comment when upgrading typescript to v5 */}
        <CacheProvider>
          <EventCollectionProvider options={{ apiPath: "/api/collect-events" }}>
            <CustomI18nextProvider>
              <TooltipProvider>
                <CalcomThemeProvider
                  themeBasis={null}
                  isThemeSupported={isThemeSupported}
                  isBookingPage={isBookingPage}>
                  <FeatureFlagsProvider>
                    <OrgBrandProvider>{children}</OrgBrandProvider>
                  </FeatureFlagsProvider>
                </CalcomThemeProvider>
              </TooltipProvider>
            </CustomI18nextProvider>
          </EventCollectionProvider>
        </CacheProvider>
      </TrpcProvider>
    </SessionProvider>
  );

  if (isBookingPage) {
    return ClientProviders;
  }

  return (
    <>
      <DynamicHelpscoutProvider>
        <DynamicPostHogProvider>{ClientProviders}</DynamicPostHogProvider>
      </DynamicHelpscoutProvider>
    </>
  );
}
