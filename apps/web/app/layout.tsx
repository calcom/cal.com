/* eslint-disable react/no-danger */
import { readFileSync } from "fs";
import { dir } from "i18next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { headers, cookies } from "next/headers";
import Script from "next/script";
import { join } from "path";
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
  icons: {
    icon: "/calid_favicon.svg",
    apple: "/apple-touch-icon.png",
  },
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

  // Read and inline the sprite sheet for immediate icon availability
  let spriteSheetContent = "";
  try {
    const spritePath = join(process.cwd(), "public", "icons", "sprite.svg");
    spriteSheetContent = readFileSync(spritePath, "utf-8");
    // Remove XML declaration and comments for cleaner inline SVG
    spriteSheetContent = spriteSheetContent
      .replace(/<\?xml[^>]*\?>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
  } catch (error) {
    console.warn("Failed to read sprite.svg, icons will load asynchronously:", error);
  }

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

        {/* Favicon and Icons - Set per-page via metadata */}
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
                email: "support@onehash.ai",
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
              name: "Cal ID",
              url: "https://www.cal.id",
            }),
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
        {spriteSheetContent ? (
          <div
            dangerouslySetInnerHTML={{
              __html: spriteSheetContent,
            }}
            style={{ display: "none" }}
            aria-hidden="true"
          />
        ) : (
          <IconSprites />
        )}
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
