import { appWithTranslation } from "next-i18next";
import { DefaultSeo } from "next-seo";
import type { AppProps as NextAppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";

import AppProviders from "@lib/app-providers";
import { seoConfig } from "@lib/config/next-seo.config";

import { useMeQuery } from "../lib/hooks/useMeQuery";
import "../styles/globals.css";

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = NextAppProps & {
  /** Will be defined only is there was an error */
  err?: Error;
};

function navigatorLanguage() {
  return process.browser ? navigator.language : "en";
}
function useViewerLocale() {
  const router = useRouter();

  const meQuery = useMeQuery();
  const viewerPreferredLanguage = meQuery.data?.locale ?? navigatorLanguage();

  // switch locale to `navigator.language` on first mount
  useEffect(() => {
    const currentLocale = router.locale;
    console.log("locale witch check", { currentLocale, viewerPreferredLanguage });

    if (currentLocale === viewerPreferredLanguage) {
      return;
    }
    router.replace(
      {
        pathname: router.pathname,
        query: router.query,
      },
      undefined,
      {
        locale: viewerPreferredLanguage,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerPreferredLanguage]);

  useEffect(() => {
    console.log("locale switch:", router.locale);
  }, [router.locale]);
}

function UseViewerLocale() {
  useViewerLocale();
  return null;
}

function MyApp(props: AppProps) {
  const { Component, pageProps, err } = props;

  return (
    <AppProviders {...props}>
      <UseViewerLocale />
      <DefaultSeo {...seoConfig.defaultNextSeo} />
      <Component {...pageProps} err={err} />
    </AppProviders>
  );
}

export default appWithTranslation(MyApp);
