"use client";

import { DefaultSeo } from "next-seo";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import Head from "next/head";
import Script from "next/script";

import "@calcom/embed-core/src/embed-iframe";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { IS_CALCOM, WEBAPP_URL } from "@calcom/lib/constants";
import { buildCanonical } from "@calcom/lib/next-seo.config";
import { IconSprites } from "@calcom/ui";

import type { AppProps } from "@lib/app-providers";
import AppProviders from "@lib/app-providers";
import { seoConfig } from "@lib/config/next-seo.config";

import { GoogleTagManagerComponent } from "@components/GTM";

export interface CalPageWrapper {
  (props?: AppProps): JSX.Element;
  PageWrapper?: AppProps["Component"]["PageWrapper"];
}

const interFont = Inter({ subsets: ["latin"], variable: "--font-inter", preload: true, display: "swap" });
const calFont = localFont({
  src: "../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "swap",
  weight: "600",
});

function PageWrapper(props: AppProps) {
  const { Component, pageProps, err, router } = props;
  let pageStatus = "200";

  if (router.pathname === "/404") {
    pageStatus = "404";
  } else if (router.pathname === "/500") {
    pageStatus = "500";
  } else if (router.pathname === "/403") {
    pageStatus = "403";
  }

  // On client side don't let nonce creep into DOM
  // It also avoids hydration warning that says that Client has the nonce value but server has "" because browser removes nonce attributes before DOM is built
  // See https://github.com/kentcdodds/nonce-hydration-issues
  // Set "" only if server had it set otherwise keep it undefined because server has to match with client to avoid hydration error
  const nonce = typeof window !== "undefined" ? (pageProps.nonce ? "" : undefined) : pageProps.nonce;
  const providerProps = {
    ...props,
    pageProps: {
      ...props.pageProps,
      nonce,
    },
  };
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);

  const path = router.asPath;

  return (
    <AppProviders {...providerProps}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover"
        />
      </Head>
      <DefaultSeo
        // Set canonical to https://cal.com or self-hosted URL
        canonical={
          IS_CALCOM
            ? buildCanonical({ path, origin: "https://cal.com" }) // cal.com & .dev
            : buildCanonical({ path, origin: WEBAPP_URL }) // self-hosted
        }
        {...seoConfig.defaultNextSeo}
      />
      <Script
        nonce={nonce}
        id="page-status"
        // It is strictly not necessary to disable, but in a future update of react/no-danger this will error.
        // And we don't want it to error here anyways
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: `window.CalComPageStatus = '${pageStatus}'` }}
      />

      <style jsx global>{`
        :root {
          --font-inter: ${interFont.style.fontFamily};
          --font-cal: ${calFont.style.fontFamily};
        }
      `}</style>
      <IconSprites />

      {getLayout(
        Component.requiresLicense ? (
          <LicenseRequired>
            <Component {...pageProps} err={err} />
          </LicenseRequired>
        ) : (
          <Component {...pageProps} err={err} />
        )
      )}
      <GoogleTagManagerComponent />
    </AppProviders>
  );
}

export default PageWrapper;
