import "../styles/globals.css";
import { createTelemetryClient, TelemetryProvider } from "../lib/telemetry";
import { Provider } from "next-auth/client";
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TelemetryProvider value={createTelemetryClient()}>
      <Provider session={pageProps.session}>
        <Component {...pageProps} />
      </Provider>
    </TelemetryProvider>
  );
}

export default MyApp;
