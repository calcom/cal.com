import { useEffect } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getCenteredPopupFeatures } from "@calcom/lib/popup";
import { EMBED_PARAMS } from "@calcom/web/modules/onboarding/hooks/use-embed-query-string";

export const GOOGLE_AUTH_WINDOW_SUCCESS = "window:google-auth:success";

export function openGoogleAuthWindow(): boolean {
  const callbackUrl = `${WEBAPP_URL}/auth/google-auth-window-callback`;
  const authUrl = `${WEBAPP_URL}/auth/sso/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const popup = window.open(authUrl, "google-auth-window", getCenteredPopupFeatures(500, 600));
  return popup !== null;
}

export function useGoogleAuthWindowListener(isEmbed: boolean) {
  useEffect(() => {
    if (!isEmbed) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === GOOGLE_AUTH_WINDOW_SUCCESS) {
        const currentParams = new URLSearchParams(window.location.search);
        const redirectUrl = currentParams.get("redirect") || currentParams.get("callbackUrl");
        const sourceParams = redirectUrl
          ? new URL(redirectUrl, window.location.origin).searchParams
          : new URLSearchParams();

        const embedParams = new URLSearchParams();
        for (const key of EMBED_PARAMS) {
          const value = sourceParams.get(key);
          if (value) embedParams.set(key, value);
        }

        window.location.href = `/onboarding/personal/settings?${embedParams.toString()}`;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEmbed]);
}
