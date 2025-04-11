export default function isBeyondThresholdTime(
  startTime: string | Date | undefined,
  time: number | undefined,
  unit: "minutes" | "hours" | undefined
): boolean {
  if (!startTime || !time || !unit) return true;

  const start = new Date(startTime);
  const bookingStartTime = start.getTime();
  if (isNaN(bookingStartTime)) return true; // check for invalid date string

  const now = new Date().getTime();
  const thresholdMs = unit === "hours" ? time * 60 * 60 * 1000 : time * 60 * 1000;

  return bookingStartTime - now > thresholdMs;
}
