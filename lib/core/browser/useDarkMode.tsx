import { useEffect, useState } from "react";

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

interface UseDarkModeOutput {
  isDarkMode: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

function useDarkMode(defaultValue?: boolean): UseDarkModeOutput {
  const getPrefersScheme = (): boolean => {
    // Prevents SSR issues
    if (process.browser) {
      return window.matchMedia(COLOR_SCHEME_QUERY).matches;
    }

    return !!defaultValue;
  };

  const [isDarkMode, setDarkMode] = useState<boolean>(getPrefersScheme());

  // Update darkMode if os prefers changes
  useEffect(() => {
    const handler = () => setDarkMode(getPrefersScheme);
    const matchMedia = window.matchMedia(COLOR_SCHEME_QUERY);

    matchMedia.addEventListener("change", handler);

    return () => {
      matchMedia.removeEventListener("change", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isDarkMode,
    toggle: () => setDarkMode((prev) => !prev),
    enable: () => setDarkMode(true),
    disable: () => setDarkMode(false),
  };
}

export default useDarkMode;
