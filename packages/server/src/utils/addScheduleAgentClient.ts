export function addScheduleAgentClient(ics: string): string {
  if (!ics) return ics;

  const unfolded = ics.replace(/\r\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n/);

  const outLines = lines.map((line) => {
    if (!/^ATTENDEE/i.test(line)) return line;
    if (/SCHEDULE-AGENT\s*=/i.test(line)) return line;

    const idx = line.indexOf(':');
    if (idx === -1) return line + ';SCHEDULE-AGENT=CLIENT';
    const before = line.slice(0, idx);
    const after = line.slice(idx);
    return `${before};SCHEDULE-AGENT=CLIENT${after}`;
  });

  return outLines.join('\r\n');
}

