import "highlight.js/styles/default.css";
import { type AppProps } from "next/app";
import "swagger-ui-react/swagger-ui.css";

import "@calcom/ui/css";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
