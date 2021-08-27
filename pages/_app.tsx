import "../styles/globals.css";
import AppProviders from "@lib/app-providers";
import type { AppProps as NextAppProps } from "next/app";
import { DefaultSeo } from "next-seo";
import { seoConfig } from "@lib/config/next-seo.config";

// Workaround for https://github.com/zeit/next.js/issues/8592
export type AppProps = NextAppProps & {
  /** Will be defined only is there was an error */
  err?: Error;
};

function MyApp({ Component, pageProps, err }: AppProps) {
  return (
    <AppProviders>
      <DefaultSeo {...seoConfig.defaultNextSeo} />
      <Component {...pageProps} err={err} />
    </AppProviders>
  );
}

export default MyApp;
