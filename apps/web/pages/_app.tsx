import { DefaultSeo } from "next-seo";
import Head from "next/head";
import Script from "next/script";

import "@calcom/embed-core/src/embed-iframe";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { trpc } from "@calcom/trpc/react";

import type { AppProps } from "@lib/app-providers";
import AppProviders from "@lib/app-providers";
import { seoConfig } from "@lib/config/next-seo.config";

import I18nLanguageHandler from "@components/I18nLanguageHandler";

import "../styles/globals.css";

function MyApp(props: AppProps) {
  const { Component, pageProps, err, router } = props;
  let pageStatus = "200";
  if (router.pathname === "/404") {
    pageStatus = "404";
  } else if (router.pathname === "/500") {
    pageStatus = "500";
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
  return (
    <AppProviders {...providerProps}>
      <DefaultSeo {...seoConfig.defaultNextSeo} />
      <I18nLanguageHandler />
      <Script
        nonce={nonce}
        id="page-status"
        dangerouslySetInnerHTML={{ __html: `window.CalComPageStatus = '${pageStatus}'` }}
      />
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      {getLayout(
        Component.requiresLicense ? (
          <LicenseRequired>
            <Component {...pageProps} err={err} />
          </LicenseRequired>
        ) : (
          <Component {...pageProps} err={err} />
        ),
        router
      )}
    </AppProviders>
  );
}

export default trpc.withTRPC(MyApp);
