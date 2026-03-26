import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["timezoneConversion"] });

/**
 * Converts offset-based timezone formats (GMT±HH:MM, UTC±HH:MM) to IANA Etc/GMT timezones.
 * Etc/GMT uses inverted signs: Etc/GMT+5 = UTC-5, Etc/GMT-8 = UTC+8.
 */
export function convertOffsetToIanaTimezone(timezone: string): string | null {
  const match = timezone.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (!match) return null;

  const [, sign, hoursStr, minutesStr] = match;
  const hours = parseInt(hoursStr, 10);
  const minutes = minutesStr ? parseInt(minutesStr, 10) : 0;

  // Etc/GMT only supports whole hours up to 14
  if (minutes !== 0 || hours > 14) return null;

  if (hours === 0) return "Etc/GMT";
  return `Etc/GMT${sign === "+" ? "-" : "+"}${hours}`;
}

/**
 * Validates and normalizes a timezone string to a valid IANA timezone.
 * Converts offset formats to Etc/GMT, falls back to UTC if invalid.
 */
export function normalizeTimezone(timezone: string | undefined): string {
  if (!timezone) return "UTC";

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    const converted = convertOffsetToIanaTimezone(timezone);
    if (converted) {
      log.info(`Converted offset timezone to IANA format`, { original: timezone, converted });
      return converted;
    }
    log.warn(`Invalid timezone format, falling back to UTC`, { invalidTimezone: timezone });
    return "UTC";
  }
}
