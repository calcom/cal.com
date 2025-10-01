/* eslint-disable react/no-danger */
import { dir } from "i18next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { headers, cookies } from "next/headers";
import Script from "next/script";
import React from "react";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { IS_PROD_DOMAIN, IS_PRODUCTION } from "@calcom/lib/constants";
import { loadTranslations } from "@calcom/lib/server/i18n";
import { IconSprites } from "@calcom/ui/components/icon";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import "../styles/globals.css";
import { AnalyticsScripts } from "./AnalyticsScripts";
import { AppRouterI18nProvider } from "./AppRouterI18nProvider";
import { SpeculationRules } from "./SpeculationRules";
import { Providers } from "./providers";

const interFont = Inter({ subsets: ["latin"], variable: "--font-inter", preload: true, display: "swap" });
const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "block",
  weight: "600",
});

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f9fafb",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#1C1C1C",
    },
  ],
};

export const metadata = {
  manifest: "/site.webmanifest",
  other: {
    "application-TileColor": "#ff0000",
  },
  twitter: {
    site: "@calcom",
    creator: "@calcom",
    card: "summary_large_image",
  },
  robots: IS_PROD_DOMAIN
    ? {
        index: true,
        follow: true,
      }
    : { index: false, follow: false },
};

const getInitialProps = async () => {
  const h = await headers();
  const isEmbed = h.get("x-isEmbed") === "true";
  const embedColorScheme = h.get("x-embedColorScheme");
  const newLocale = (await getLocale(buildLegacyRequest(await headers(), await cookies()))) ?? "en";
  const direction = dir(newLocale) ?? "ltr";

  return {
    isEmbed,
    embedColorScheme,
    locale: newLocale,
    direction,
  };
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-csp-nonce") ?? "";

  const { locale, direction, isEmbed, embedColorScheme } = await getInitialProps();

  const ns = "common";
  const translations = await loadTranslations(locale, ns);

  return (
    <html
      className="notranslate"
      translate="no"
      lang={locale}
      dir={direction}
      style={embedColorScheme ? { colorScheme: embedColorScheme as string } : undefined}
      suppressHydrationWarning
      data-nextjs-router="app">
      <head nonce={nonce}>
        <style>{`
          :root {
            --font-inter: ${interFont.style.fontFamily.replace(/\'/g, "")};
            --font-cal: ${calFont.style.fontFamily.replace(/\'/g, "")};
          }
        `}</style>

        {/* Favicon and Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/api/logo?type=apple-touch-icon" />
        <link rel="icon" type="image/png" sizes="32x32" href="/api/logo?type=favicon-32" />
        <link rel="icon" type="image/png" sizes="16x16" href="/api/logo?type=favicon-16" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
        <meta name="msapplication-TileColor" content="#ff0000" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F9FAFC" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1F1F1F" />

        {/* Meticulous for non-production preview environments */}
        {!IS_PRODUCTION && process.env.VERCEL_ENV === "preview" && (
          <Script
            id="meticulous"
            data-project-id="KjpMrKTnXquJVKfeqmjdTffVPf1a6Unw2LZ58iE4"
            src="https://snippet.meticulous.ai/v1/stagingMeticulousSnippet.js"
            strategy="afterInteractive"
          />
        )}

        {/* Locale initialization script */}
        <script
          nonce={nonce}
          id="newLocale"
          dangerouslySetInnerHTML={{
            __html: `window.calNewLocale = "${locale}";`,
          }}
        />

        {/* Brand details JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "OneHash",
              alternateName: "Cal ID",
              legalName: "OneHash Technologies Limited",
              url: "https://www.onehash.ai",
              logo: "https://cdn.prod.website-files.com/5e53d34464688e6f5960a338/610a36c2792530d601aaf35f_OneHash_Logo.svg",
              description:
                "A Robust, Scalable, Economical, AI Powered & Fully- Featured platform with CRM, ERP, Meeting Scheduling and Chat Solution.",
              sameAs: [
                "https://www.linkedin.com/company/onehash/",
                "https://www.instagram.com/onehash.ai/",
                "https://x.com/onehash",
                "https://www.facebook.com/OneHashAI/",
              ],
              founder: {
                "@type": "Person",
                name: "Rohit Gadia",
                sameAs: "https://www.linkedin.com/in/rohitgadia",
              },
              foundingDate: "2021",
              address: {
                "@type": "PostalAddress",
                streetAddress: "903 NRK Business Park, Vijay Nagar Square",
                addressLocality: "Indore",
                addressRegion: "Madhya Pradesh",
                postalCode: "452010",
                addressCountry: "IN",
              },
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+91 8827 000 000",
                contactType: "Customer Support",
                email: "support@cal.id",
                areaServed: "Worldwide",
                availableLanguage: [
                  "en",
                  "hi",
                  "es",
                  "zh",
                  "ar",
                  "fr",
                  "ru",
                  "pt",
                  "de",
                  "ja",
                  "ko",
                  "it",
                  "nl",
                  "tr",
                  "sv",
                  "pl",
                  "uk",
                  "vi",
                  "th",
                  "id",
                ],
              },
            }),
          }}
        />

        {/* Website JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "OneHash",
              url: "https://www.onehash.ai",
              alternateName: "Cal ID",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://www.onehash.ai/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        {/* Customer.io Analytics */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              !function(){
                var i="cioanalytics", analytics=(window[i]=window[i]||[]);
                if(!analytics.initialize) {
                  if(analytics.invoked) {
                    window.console && console.error && console.error("Snippet included twice.");
                  } else {
                    analytics.invoked = !0;
                    analytics.methods = [
                      "trackSubmit","trackClick","trackLink","trackForm","pageview","identify",
                      "reset","group","track","ready","alias","debug","page","once","off","on",
                      "addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"
                    ];
                    analytics.factory = function(e) {
                      return function() {
                        var t = Array.prototype.slice.call(arguments);
                        t.unshift(e);
                        analytics.push(t);
                        return analytics;
                      };
                    };
                    for (var e = 0; e < analytics.methods.length; e++) {
                      var key = analytics.methods[e];
                      analytics[key] = analytics.factory(key);
                    }
                    analytics.load = function(key, e) {
                      var t = document.createElement("script");
                      t.type = "text/javascript";
                      t.async = !0;
                      t.setAttribute("data-global-customerio-analytics-key", i);
                      t.src = "https://cdp.customer.io/v1/analytics-js/snippet/" + key + "/analytics.min.js";
                      var n = document.getElementsByTagName("script")[0];
                      n.parentNode.insertBefore(t, n);
                      analytics._writeKey = key;
                      analytics._loadOptions = e;
                    };
                    analytics.SNIPPET_VERSION = "4.15.3";
                    analytics.load("fa6d11bb6fbfbf91cf0d");
                    analytics.page();
                  }
                }
              }();
            `,
          }}
        />
      </head>

      <body
        className="dark:bg-default bg-primary antialiased"
        style={
          isEmbed
            ? {
                background: "transparent",
                visibility: "hidden",
              }
            : {
                visibility: "visible",
              }
        }>
        <IconSprites />
        <SpeculationRules
          prerenderPathsOnHover={[
            "/event-types",
            "/availability",
            "/bookings/upcoming",
            "/teams",
            "/apps",
            "/apps/routing-forms/forms",
            "/workflows",
            "/insights/bookings",
          ]}
        />

        <Providers isEmbed={isEmbed} nonce={nonce}>
          <AppRouterI18nProvider translations={translations} locale={locale} ns={ns}>
            {children}
          </AppRouterI18nProvider>
        </Providers>

        {/* Conditionally loaded scripts based on pathname */}
        <AnalyticsScripts nonce={nonce} />
      </body>
    </html>
  );
}
