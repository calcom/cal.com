// packages/server/src/utils/addScheduleAgentClient.ts
/**
 * Add SCHEDULE-AGENT=CLIENT to ATTENDEE parameter lists
 * - unfolds folded lines (RFC 5545)
 * - avoids altering lines that already contain SCHEDULE-AGENT
 * - preserves non-ATTENDEE lines
 */

export function addScheduleAgentClient(ics: string): string {
  if (!ics) return ics;

  // Unfold folded lines per RFC (replace CRLF + space/tab with nothing)
  // Accept CRLF or LF line endings
  const unfolded = ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

  // Split lines reliably
  const lines = unfolded.split(/\r\n|\n/);

  const outLines = lines.map((line) => {
    // Only operate on ATTENDEE lines (case-insensitive)
    if (!/^ATTENDEE/i.test(line)) return line;

    // If line already has a SCHEDULE-AGENT parameter, leave it alone
    if (/SCHEDULE-AGENT\s*=/i.test(line)) return line;

    // Insert ;SCHEDULE-AGENT=CLIENT before the ':' delimiter that begins the value
    const idx = line.indexOf(':');
    if (idx === -1) {
      // If malformed (no ":"), append param
      return `${line};SCHEDULE-AGENT=CLIENT`;
    }

    const before = line.slice(0, idx);
    const after = line.slice(idx); // includes ':'
    return `${before};SCHEDULE-AGENT=CLIENT${after}`;
  });

  // Return with CRLF (common ICS convention)
  return outLines.join('\r\n');
}
