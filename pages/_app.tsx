import "../styles/globals.css";
import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";
import { Provider } from "next-auth/client";
import type { AppProps } from "next/app";
import Head from "next/head";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <Provider session={pageProps.session}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <Component {...pageProps} />
      </Provider>
    </TelemetryProvider>
  );
}

export default MyApp;
