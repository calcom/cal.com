import { IS_PRODUCTION } from "./constants";

export function captureAndStoreUtmParams() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const utmParams = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };

  // Only store if at least one UTM parameter exists
  const hasUtmParams = Object.values(utmParams).some((val) => val !== null);

  if (hasUtmParams) {
    // Store for 30 days
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds

    document.cookie = `utm_params=${encodeURIComponent(
      JSON.stringify(utmParams)
    )}; path=/; max-age=${maxAge}; SameSite=${IS_PRODUCTION ? "None" : "Lax"}${
      IS_PRODUCTION ? "; Secure" : ""
    }`;

    console.log("UTM parameters captured:", utmParams);
  }
}

export function getUtmParamsFromCookie(cookieString?: string): Record<string, string | null> | null {
  if (!cookieString) return null;

  const cookies = cookieString.split("; ");
  const utmCookie = cookies.find((cookie) => cookie.startsWith("utm_params="));

  if (!utmCookie) return null;

  try {
    const value = utmCookie.split("=")[1];
    return JSON.parse(decodeURIComponent(value));
  } catch (e) {
    console.error("Failed to parse UTM params from cookie:", e);
    return null;
  }
}
