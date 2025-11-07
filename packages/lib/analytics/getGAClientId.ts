/**
 * Utility to capture Google Analytics 4 client ID from gtag
 * Based on: https://developers.google.com/tag-platform/gtagjs/reference
 */

export const GA_MEASUREMENT_ID = "G-RX4HHQ613S";

/**
 * Retrieves the Google Analytics client ID using the gtag API
 * Falls back to parsing the _ga cookie if gtag is unavailable
 *
 * @param measurementId - Optional GA4 measurement ID (defaults to GA_MEASUREMENT_ID)
 * @param timeout - Optional timeout in milliseconds (defaults to 2000ms)
 * @returns Promise that resolves to the GA client ID or null if unavailable
 *
 * @example
 * ```typescript
 * const clientId = await getGAClientId();
 * if (clientId) {
 *   // Send to backend
 *   await api.call({ gaClientId: clientId });
 * }
 * ```
 */
export function getGAClientId(
  measurementId: string = GA_MEASUREMENT_ID,
  timeout: number = 2000
): Promise<string | null> {
  return new Promise((resolve) => {
    // Check if running in browser
    if (typeof window === "undefined") {
      console.warn("[GA] Cannot get client ID: not running in browser");
      resolve(null);
      return;
    }

    // Try gtag API first (preferred method)
    if (window.gtag && typeof window.gtag === "function") {
      try {
        let resolved = false;

        window.gtag("get", measurementId, "client_id", (clientId: string) => {
          if (!resolved && clientId) {
            resolved = true;
            resolve(clientId);
          } else if (!resolved && !clientId) {
            console.warn("[GA] gtag returned empty client ID, trying cookie fallback");
            resolved = true;
            resolve(getClientIdFromCookie());
          }
        });

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            console.warn("[GA] gtag fetch timed out, trying cookie fallback");
            resolved = true;
            resolve(getClientIdFromCookie());
          }
        }, timeout);
      } catch (error) {
        console.error("[GA] Error fetching client ID from gtag:", error);
        resolve(getClientIdFromCookie());
      }
    } else {
      // gtag not available, try cookie fallback
      console.warn("[GA] gtag not available, trying cookie fallback");
      resolve(getClientIdFromCookie());
    }
  });
}

/**
 * Fallback method to extract GA client ID from the _ga cookie
 * GA4 cookie format: GA1.1.XXXXXXXXXX.YYYYYYYYYY
 * We extract XXXXXXXXXX.YYYYYYYYYY as the client ID
 */
function getClientIdFromCookie(): string | null {
  try {
    const gaCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("_ga="));

    if (!gaCookie) {
      console.warn("[GA] _ga cookie not found");
      return null;
    }

    // Extract the client ID from the cookie value
    // Cookie format: _ga=GA1.1.123456789.987654321
    // We want: 123456789.987654321
    const parts = gaCookie.split(".");
    if (parts.length >= 4) {
      const clientId = `${parts[2]}.${parts[3]}`;
      return clientId;
    }

    console.warn("[GA] Unable to parse client ID from cookie:", gaCookie);
    return null;
  } catch (error) {
    console.error("[GA] Error parsing client ID from cookie:", error);
    return null;
  }
}

/**
 * Type definitions for gtag function
 */
declare global {
  interface Window {
    gtag?: (
      command: "get" | "event" | "config" | "js" | "set",
      targetId: string,
      ...args: any[]
    ) => void;
    dataLayer?: any[];
  }
}
