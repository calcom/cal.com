import { useEffect, useState } from "react";

// makes sure the ui doesn't flash
export default function useTheme(theme?: string) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add(theme);
    }
    setIsReady(true);
  }, []);

  return {
    isReady,
  };
}
