/**
 * Proton Calendar only exposes calendars through read-only ICS share links
 * (e.g. https://calendar.proton.me/api/calendar/v1/url/<token>/calendar.ics).
 * These helpers validate and normalize the URLs a user pastes before they are
 * stored as a credential, so that the Proton integration never ends up holding
 * an arbitrary or unfetchable feed.
 */
export const PROTON_CALENDAR_HOST = "proton.me";

const isProtonCalendarHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  return host === PROTON_CALENDAR_HOST || host.endsWith(`.${PROTON_CALENDAR_HOST}`);
};

/**
 * Normalize a single Proton Calendar ICS URL.
 *
 * - `webcal://` subscription links are upgraded to `https://` (fetch() cannot
 *   handle the webcal scheme, but Proton's "Subscribe" links use it).
 * - Only `https://*.proton.me` URLs are accepted; anything else throws so the
 *   Proton app is not misused as a generic ICS feed.
 */
export function normalizeProtonIcsUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string") {
    throw new Error("Proton Calendar URL must be a string");
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Proton Calendar URL must not be empty");
  }

  const upgraded = trimmed.replace(/^webcal:\/\//i, "https://");

  let parsed: URL;
  try {
    parsed = new URL(upgraded);
  } catch {
    throw new Error(`Invalid Proton Calendar URL: ${trimmed}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Proton Calendar URL must use https: ${trimmed}`);
  }

  if (!isProtonCalendarHost(parsed.hostname)) {
    throw new Error(`Not a Proton Calendar URL (expected a ${PROTON_CALENDAR_HOST} share link): ${trimmed}`);
  }

  return parsed.toString();
}

/**
 * Validate and normalize the list of Proton Calendar URLs submitted by a user,
 * removing duplicates while preserving order.
 */
export function getProtonIcsUrls(rawUrls: unknown): string[] {
  if (!Array.isArray(rawUrls)) {
    throw new Error("Proton Calendar URLs must be provided as an array");
  }

  if (rawUrls.length === 0) {
    throw new Error("At least one Proton Calendar URL is required");
  }

  const normalized = rawUrls.map((url) => normalizeProtonIcsUrl(url));
  return Array.from(new Set(normalized));
}
