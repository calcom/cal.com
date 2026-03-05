"use client";

import { useEffect } from "react";

/**
 * Detects outgoing network requests from booking pages,
 * groups them by destination origin, and logs the count per origin.
 */
export function BookingPageRequestTracker(): null {
  useEffect(() => {
    const requestCountByOrigin = new Map<string, number>();

    function getOrigin(input: string | URL): string {
      try {
        let url: URL;
        if (typeof input === "string") {
          url = new URL(input, window.location.origin);
        } else {
          url = input;
        }
        return url.origin;
      } catch {
        return "unknown";
      }
    }

    function trackRequest(origin: string): void {
      requestCountByOrigin.set(origin, (requestCountByOrigin.get(origin) ?? 0) + 1);
    }

    function logRequestCounts(): void {
      if (requestCountByOrigin.size === 0) return;
      const grouped: Record<string, number> = {};
      requestCountByOrigin.forEach((count, origin) => {
        grouped[origin] = count;
      });
      console.log("[BookingPageRequestTracker] Requests by origin:", grouped);
    }

    const originalFetch = window.fetch;
    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let url: string;
      if (input instanceof Request) {
        url = input.url;
      } else {
        url = String(input);
      }
      trackRequest(getOrigin(url));
      logRequestCounts();
      return originalFetch.apply(this, [input, init] as Parameters<typeof originalFetch>);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function patchedOpen(
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ): void {
      trackRequest(getOrigin(url));
      logRequestCounts();
      originalXHROpen.apply(this, [method, url, ...rest] as Parameters<typeof originalXHROpen>);
    };

    return (): void => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      logRequestCounts();
    };
  }, []);

  return null;
}
