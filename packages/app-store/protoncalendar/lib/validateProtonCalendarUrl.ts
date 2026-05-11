const PROTON_CALENDAR_HOSTS: ReadonlySet<string> = new Set(["calendar.proton.me"]);

export function isProtonCalendarUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && PROTON_CALENDAR_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
