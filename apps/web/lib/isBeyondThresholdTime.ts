export default function isBeyondThresholdTime(
  startTime: string | Date,
  time: number,
  unit: "minutes" | "hours"
): boolean {
  if (!startTime) return true;
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();

  const thresholdMs = unit === "hours" ? time * 60 * 60 * 1000 : time * 60 * 1000;

  return start - now > thresholdMs;
}
