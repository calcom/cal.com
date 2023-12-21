import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { CalProvider } from "@calcom/platform-atoms";
import "@calcom/platform-atoms/dist/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <CalProvider apiKey="1234">
        <Component {...pageProps} />
      </CalProvider>{" "}
    </div>
  );
}
