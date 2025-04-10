export default function isBeyondThresholdTime(
  startTime: string | Date | undefined,
  time: number | undefined,
  unit: "minutes" | "hours" | undefined
): boolean {
  if (!startTime || !time || !unit) return true;
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();

  const thresholdMs = unit === "hours" ? time * 60 * 60 * 1000 : time * 60 * 1000;

  return start - now > thresholdMs;
}
