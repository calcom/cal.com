import "../styles/globals.css";
import { createTelemetryClient, TelemetryProvider } from "@lib/telemetry";
import { Provider } from "next-auth/client";
import type { AppProps } from "next/app";
import { DefaultSeo } from "next-seo";
import { seoConfig } from "@lib/config/next-seo.config";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <Provider session={pageProps.session}>
        <DefaultSeo {...seoConfig.defaultNextSeo} />
        <Component {...pageProps} />
      </Provider>
    </TelemetryProvider>
  );
}

export default MyApp;
