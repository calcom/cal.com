export const normalizeProtonCalendarUrl = (url: string): string => url.trim().replace(/^webcal:/i, "https:");

export const isValidProtonCalendarUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(normalizeProtonCalendarUrl(url));
    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "calendar.proton.me" &&
      parsedUrl.pathname.startsWith("/api/calendar/v1/url/") &&
      parsedUrl.pathname.toLowerCase().endsWith(".ics")
    );
  } catch {
    return false;
  }
};
