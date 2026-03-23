import { WEBAPP_URL } from "@calcom/lib/constants";

import { getSafeRedirectUrl } from "./getSafeRedirectUrl";

/**
 * Validates a returnTo parameter (typically a relative path from query params)
 * by converting it to an absolute URL and checking it against getSafeRedirectUrl.
 *
 * @param returnTo - The returnTo parameter from URL search params
 * @param fallback - The fallback path to use if returnTo is invalid
 * @returns A safe relative path to redirect to
 */
export function getSafeReturnTo(returnTo: string | null | undefined, fallback: string): string {
  if (!returnTo) return fallback;

  try {
    // Build an absolute URL so getSafeRedirectUrl can validate the origin
    const absolute = returnTo.startsWith("http") ? returnTo : `${WEBAPP_URL}${returnTo}`;
    const safe = getSafeRedirectUrl(absolute);

    if (!safe) return fallback;

    // Extract just the path + search + hash to return a relative URL
    const parsed = new URL(safe);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
