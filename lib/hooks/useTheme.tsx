import { Maybe } from "@trpc/server";
import { useEffect, useState } from "react";

// makes sure the ui doesn't flash
export default function useTheme(theme?: Maybe<string>) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    setIsReady(true);
    if (!theme) {
      return;
    }
    if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add(theme);
    }
  }, []);

  return {
    isReady,
  };
}
