const PROTON_CALENDAR_HOST = "calendar.proton.me";
const PROTON_CALENDAR_PATH_PREFIX = "/api/calendar/v1/url/";

export const normalizeProtonCalendarUrl = (url: string): string => url.trim().replace(/^webcal:/i, "https:");

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
