import { appWithTranslation } from "next-i18next";
import { DefaultSeo } from "next-seo";
import type { AppProps as NextAppProps } from "next/app";

import AppProviders from "@lib/app-providers";
import { seoConfig } from "@lib/config/next-seo.config";

import "../styles/globals.css";

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = NextAppProps & {
  /** Will be defined only is there was an error */
  err?: Error;
};

function MyApp({ Component, pageProps, err }: AppProps) {
  return (
    <AppProviders pageProps={pageProps}>
      <DefaultSeo {...seoConfig.defaultNextSeo} />
      <Component {...pageProps} err={err} />
    </AppProviders>
  );
}

export default appWithTranslation(MyApp);
