import Head from "next/head";
import { useEffect, createContext, useRef, useState, useContext } from "react";

import { useEmbedTheme } from "@calcom/embed-core/embed-iframe";

// This method is stringified and executed only on client. So,
// - Pass all the params explicitly to this method. Don't use closure
function applyThemeAndAddListener(theme: string) {
  console.log("Executing theme change listener");
  const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = function (theme: string, darkMatch: boolean) {
    let selectedTheme: string | null = null;
    if (!theme) {
      if (darkMatch) {
        selectedTheme = "dark";
      } else {
        selectedTheme = "light";
      }
    } else {
      selectedTheme = theme;
    }

    if (selectedTheme) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add(selectedTheme);
      window.selectedTheme = selectedTheme;
      console.log("Selected Theme by vanila JS code: ", selectedTheme);
      if (window.setSelectedTheme) {
        console.log("Updated selected Theme by vanila JS code in React: ", selectedTheme);
        window.setSelectedTheme && window.setSelectedTheme(selectedTheme);
      }
    }
  };
  mediaQueryList.onchange = function (e) {
    applyTheme(theme, e.matches);
  };
  applyTheme(theme, mediaQueryList.matches);
}
const ThemeContext = createContext<[{ theme?: string | null; isReady?: boolean }, () => void]>();

export const ThemeProvider = ({ initialValue, children }) => {
  initialValue = initialValue || { isReady: false };
  const [value, setValue] = useState(initialValue);
  const { Theme, theme: selectedTheme, isReady } = useTheme(value.theme);

  const stableValue = useRef(value);
  stableValue.current.theme = selectedTheme;
  stableValue.current.isReady = isReady;
  return (
    <>
      <ThemeContext.Provider value={[stableValue.current, setValue]}>{children}</ThemeContext.Provider>
      <Theme />
      <Head>
        {!isReady ? (
          <style
            id="theme-anti-flicker"
            dangerouslySetInnerHTML={{
              __html: `
           #__next {
            display:none
           }
            `,
            }}
          />
        ) : null}
      </Head>
    </>
  );
};

/**
 *
 * @param suggestedTheme - null in case theme is auto-detected from system.
 * @returns
 */
export default function useTheme(suggestedTheme: string | null) {
  const [isReady, setIsReady] = useState(suggestedTheme);
  const embedTheme = useEmbedTheme();
  // Embed UI configuration takes more precedence over App Configuration
  suggestedTheme = embedTheme || suggestedTheme;
  const initialThemeRef = useRef<typeof suggestedTheme>(suggestedTheme);
  const [selectedTheme, setSelectedTheme] = useState<typeof suggestedTheme>(initialThemeRef.current);
  console.log(
    `Embed Theme: ${embedTheme}, Suggested Theme: ${suggestedTheme}, Selected Theme: ${selectedTheme}, Initial Theme: ${initialThemeRef.current}`
  );
  useEffect(() => {
    // TODO: isReady doesn't seem required now. This is also impacting PSI Score for pages which are using isReady.
    setIsReady(true);
    // Because theme might change before React initializes on client, update from that value as well.
    setSelectedTheme(window.selectedTheme || suggestedTheme);
    window.setSelectedTheme = setSelectedTheme;
  }, []);

  function Theme() {
    const code = applyThemeAndAddListener.toString();
    const themeStr = initialThemeRef.current ? `"${initialThemeRef.current}"` : null;
    return (
      <Head>
        <script dangerouslySetInnerHTML={{ __html: `(${code})(${themeStr})` }} />
      </Head>
    );
  }

  return {
    Provider: ThemeContext.Provider,
    isReady,
    Theme,
    theme: selectedTheme,
  };
}

export function useUpdateTheme(theme) {
  const [vars, setVars] = useContext(ThemeContext);
  useEffect(() => {
    setVars({ ...vars, theme });
  }, [theme, setVars, vars]);
  return vars;
}
