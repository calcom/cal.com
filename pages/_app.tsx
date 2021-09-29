import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import { loggerLink } from "@trpc/client/links/loggerLink";
import { withTRPC } from "@trpc/next";
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

  // switch locale to viewer language on first mount
  useEffect(() => {
    const currentLocale = router.locale;
    // console.debug("locale check", { currentLocale, viewerPreferredLanguage });

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

  // useEffect(() => {
  //   console.debug("locale switch:", router.locale);
  // }, [router.locale]);
}

function MyApp(props: AppProps) {
  const { Component, pageProps, err } = props;
  useViewerLocale();
  return (
    <AppProviders {...props}>
      <DefaultSeo {...seoConfig.defaultNextSeo} />
      <Component {...pageProps} err={err} />
    </AppProviders>
  );
}

export default withTRPC({
  config() {
    /**
     * If you want to use SSR, you need to use the server's full URL
     * @link https://trpc.io/docs/ssr
     */
    return {
      /**
       * @link https://trpc.io/docs/links
       */
      links: [
        // adds pretty logs to your console in development and logs errors in production
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `/api/trpc`,
        }),
      ],
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      // queryClientConfig: { defaultOptions: { queries: { staleTime: 6000 } } },
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   */
  ssr: false,
})(appWithTranslation(MyApp));
