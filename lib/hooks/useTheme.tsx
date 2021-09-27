import { useEffect, useState } from "react";

// makes sure the ui doesn't flash
export default function useTheme(theme: string | null) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else if (!theme) {
      /** Uncovered case */
    } else {
      document.documentElement.classList.add(theme);
    }
    setIsReady(true);
  }, []);

  return {
    isReady,
  };
}
