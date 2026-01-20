import { useEffect } from "react";

export function useExternalRedirectHandler(callback: (referrer: string) => void) {
  useEffect(() => {
    const referrer = document.referrer;
    const isExternal = referrer && !referrer.includes(window.location.hostname);

    if (isExternal) {
      callback(referrer);
    }
  }, [callback]);
}
