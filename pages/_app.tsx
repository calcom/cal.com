import "../styles/globals.css";
import AppProviders from "@lib/app-providers";
import type { AppProps as NextAppProps } from "next/app";
import Head from "next/head";

// Workaround for https://github.com/zeit/next.js/issues/8592
export type AppProps = NextAppProps & {
  /** Will be defined only is there was an error */
  err?: Error;
};

function MyApp({ Component, pageProps, err }: AppProps) {
  return (
    <AppProviders>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Component {...pageProps} err={err} />
    </AppProviders>
  );
}

export default MyApp;
