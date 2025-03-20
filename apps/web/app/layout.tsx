import { dir } from "i18next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { headers, cookies } from "next/headers";
import React from "react";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { IconSprites } from "@calcom/ui/components/icon";
import { NotificationSoundHandler } from "@calcom/web/components/notification-sound-handler";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { prepareRootMetadata } from "@lib/metadata";

import { ssrInit } from "@server/lib/ssr";

import "../styles/globals.css";
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

export const generateMetadata = () => prepareRootMetadata();

const getInitialProps = async (url: string) => {
  const { pathname, searchParams } = new URL(url);

  const isEmbed = pathname.endsWith("/embed") || (searchParams?.get("embedType") ?? null) !== null;
  const embedColorScheme = searchParams?.get("ui.color-scheme");

  const req = { headers: headers(), cookies: cookies() };
  const newLocale = await getLocale(req);
  const direction = dir(newLocale);

  return { isEmbed, embedColorScheme, locale: newLocale, direction };
};

const getFallbackProps = () => ({
  locale: "en",
  direction: "ltr",
  isEmbed: false,
  embedColorScheme: false,
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = headers();

  const fullUrl = h.get("x-url") ?? "";
  const nonce = h.get("x-csp") ?? "";

  const isSSG = !fullUrl;

  const { locale, direction, isEmbed, embedColorScheme } = isSSG
    ? getFallbackProps()
    : await getInitialProps(fullUrl);

  const ssr = await ssrInit(buildLegacyCtx(h, cookies(), {}, {}));
  return (
    <html
      lang={locale}
      dir={direction}
      style={embedColorScheme ? { colorScheme: embedColorScheme as string } : undefined}
      suppressHydrationWarning
      data-nextjs-router="app">
      <head nonce={nonce}>
        {!!process.env.NEXT_PUBLIC_HEAD_SCRIPTS && (
          <script
            nonce={nonce}
            id="injected-head-scripts"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: process.env.NEXT_PUBLIC_HEAD_SCRIPTS,
            }}
          />
        )}
        <style>{`
          :root {
            --font-inter: ${interFont.style.fontFamily.replace(/\'/g, "")};
            --font-cal: ${calFont.style.fontFamily.replace(/\'/g, "")};
          }
        `}</style>
      </head>
      <body
        className="dark:bg-default bg-subtle antialiased"
        style={
          isEmbed
            ? {
                background: "transparent",
                // Keep the embed hidden till parent initializes and
                // - gives it the appropriate styles if UI instruction is there.
                // - gives iframe the appropriate height(equal to document height) which can only be known after loading the page once in browser.
                // - Tells iframe which mode it should be in (dark/light) - if there is a a UI instruction for that
                visibility: "hidden",
              }
            : {}
        }>
        <IconSprites />
        {!!process.env.NEXT_PUBLIC_BODY_SCRIPTS && (
          <script
            nonce={nonce}
            id="injected-head-scripts"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: process.env.NEXT_PUBLIC_BODY_SCRIPTS,
            }}
          />
        )}
        <SpeculationRules
          // URLs In Navigation
          prerenderPathsOnHover={[
            "/event-types",
            "/availability",
            "/bookings/upcoming",
            "/teams",
            "/apps",
            "/apps/routing-forms/forms",
            "/workflows",
            "/insights",
          ]}
        />
        <Providers dehydratedState={ssr.dehydrate()}>{children}</Providers>
        {!isEmbed && <NotificationSoundHandler />}
        <NotificationSoundHandler />
      </body>
    </html>
  );
}
