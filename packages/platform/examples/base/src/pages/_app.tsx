import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { CalProvider } from "@calcom/platform-atoms/components";
import "@calcom/platform-atoms/dist/globals.min.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <CalProvider
        accessToken="12qwsedweqdf"
        clientId="clqqg5iww0001336q05lhocns"
        options={{ apiUrl: "http://localhost:5555/api/v2" }}>
        <Component {...pageProps} />
      </CalProvider>{" "}
    </div>
  );
}
