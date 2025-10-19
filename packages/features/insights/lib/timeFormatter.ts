import dayjs from "@calcom/dayjs";

export const formatTimeToBook = (seconds: number) => {
  const duration = dayjs.duration(seconds, "seconds");
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const secs = duration.seconds();

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};
