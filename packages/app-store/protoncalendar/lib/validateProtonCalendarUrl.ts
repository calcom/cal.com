const PROTON_CALENDAR_HOST = "calendar.proton.me";
const PROTON_CALENDAR_PATH_PREFIX = "/api/calendar/v1/url/";

/**
 * Normalizes a Proton Calendar subscription URL by trimming whitespace and
 * converting the webcal protocol prefix to https.
 * @param url - The raw URL string to normalize.
 * @returns The normalized URL string starting with https.
 */
export const normalizeProtonCalendarUrl = (url: string): string => url.trim().replace(/^webcal:/i, "https:");

/**
 * Validates whether the given URL is a legitimate Proton Calendar subscription ICS feed URL.
 * Enforces HTTPS, the official Proton Calendar domain, and the correct path structure.
 * @param url - The URL string to validate.
 * @returns True if the URL is valid, false otherwise.
 */
export const isValidProtonCalendarUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(normalizeProtonCalendarUrl(url));

    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname.toLowerCase() === PROTON_CALENDAR_HOST &&
      parsedUrl.pathname.startsWith(PROTON_CALENDAR_PATH_PREFIX) &&
      parsedUrl.pathname.toLowerCase().endsWith(".ics")
    );
  } catch {
    return false;
  }
};
