import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { Maybe } from "@trpc/server";

// This method is stringified and executed only on client. So,
// - Pass all the params explicitly to this method. Don't use closure
function applyThemeAndAddListener(theme: string) {
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
  const router = useRouter();

  // Embed UI configuration takes more precedence over App Configuration
  theme = (router.query.theme as string | null) || theme;

  useEffect(() => {
    // TODO: isReady doesn't seem required now. This is also impacting PSI Score for pages which are using isReady.
    setIsReady(true);
  }, []);

  function Theme() {
    const code = applyThemeAndAddListener.toString();
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
