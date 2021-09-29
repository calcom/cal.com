import { appWithTranslation } from "next-i18next";
import { DefaultSeo } from "next-seo";
import type { AppProps as NextAppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";

import AppProviders from "@lib/app-providers";
import { seoConfig } from "@lib/config/next-seo.config";

import "../styles/globals.css";

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = NextAppProps & {
  /** Will be defined only is there was an error */
  err?: Error;
};

function useViewerLanguage() {
  const router = useRouter();

  // switch locale to `navigator.language` on first mount
  useEffect(() => {
    const currentLocale = router.locale;

    if (currentLocale === navigator.language) {
      return;
    }
    router.replace(
      {
        pathname: router.pathname,
        query: router.query,
      },
      undefined,
      {
        locale: navigator.language,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("locale switch:", router.locale);
  }, [router.locale]);
}

function MyApp(props: AppProps) {
  const { Component, pageProps, err } = props;
  useViewerLanguage();
  return (
    <AppProviders {...props}>
      <DefaultSeo {...seoConfig.defaultNextSeo} />
      <Component {...pageProps} err={err} />
    </AppProviders>
  );
}

export default appWithTranslation(MyApp);
