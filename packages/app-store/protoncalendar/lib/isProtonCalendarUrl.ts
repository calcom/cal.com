const PROTON_CALENDAR_HOSTS: Set<string> = new Set([
  "calendar.proton.me",
  "calendar.protonmail.com",
  "calendar.pm.me",
]);

export function isProtonCalendarUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && PROTON_CALENDAR_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
