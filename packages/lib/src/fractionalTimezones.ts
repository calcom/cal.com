
/**
 * Accurately parses and computes total minute offsets for positive and negative
 * fractional GMT timezones (e.g. GMT-03:30, GMT-09:30, GMT+05:30, GMT+05:45).
 *
 * @param gmtString Format like "GMT-03:30", "GMT+05:45", "-03:30", "+05:30"
 * @returns Offset in minutes from UTC
 */
export function parseFractionalTimezoneOffset(gmtString: string): number {
  const match = gmtString.trim().match(/^GMT?([+-])(\d{1,2}):?(\d{2})?$/i);
  if (!match) {
    throw new Error(`Invalid timezone format: ${gmtString}`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;

  return sign * (hours * 60 + minutes);
}
