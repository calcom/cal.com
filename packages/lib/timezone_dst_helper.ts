export function getTimezoneOffsetMinutes(tz: string, date = new Date()): number {
  const str = date.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
  const match = str.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + (match[2] ? parseInt(match[2], 10) : 0);
}
