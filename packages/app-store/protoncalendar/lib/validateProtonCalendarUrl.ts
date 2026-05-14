export const normalizeProtonCalendarUrl = (url: string): string => url.trim().replace(/^webcal:/i, "https:");

export const isValidProtonCalendarUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(normalizeProtonCalendarUrl(url));
    return parsedUrl.protocol === "https:" && parsedUrl.hostname.length > 0;
  } catch {
    return false;
  }
};
