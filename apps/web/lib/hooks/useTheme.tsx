import Head from "next/head";
import { useEffect, useState } from "react";
import { minify as minifyType } from "uglify-js";

import { Maybe } from "@trpc/server";

const isServer = typeof window === "undefined";

let minify: typeof minifyType;

if (isServer) {
  // HACK: To import uglify-js only on server use `require`
  // Dynamic Imports are asynchronous and thus can't be used in the component on server.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  minify = require("uglify-js").minify;
}

// This method is stringified and executed only on client. So,
// - Pass all the params explicitly to this method. Don't use closure
function applyTheme(theme: string) {
  const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = function (theme: string, darkMatch: boolean) {
    if (!theme) {
      if (darkMatch) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      document.documentElement.classList.add(theme);
    }
  };
  mediaQueryList.onchange = function (e) {
    applyTheme(theme, e.matches);
  };
  applyTheme(theme, mediaQueryList.matches);
}

// makes sure the ui doesn't flash
export default function useTheme(theme?: Maybe<string>) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // TODO: isReady doesn't seem required now. This is also impacting PSI Score.
    setIsReady(true);
  }, []);

  function Theme() {
    const isServer = typeof window === "undefined";
    if (!isServer) {
      // This component's job is to inject the JS that listens to media queries and applies the change.
      // So, we can avoid this to be sent to client, which would also avoid execution of uglify on client.
      return null;
    }
    const code = minify(applyTheme.toString()).code;
    const themeStr = theme ? `"${theme}"` : null;
    return (
      <Head>
        <script dangerouslySetInnerHTML={{ __html: `(${code})(${themeStr})` }}></script>
      </Head>
    );
  }

  return {
    isReady,
    Theme,
  };
}
