export const formatBookingDuration = (durationMinutes: number): string => {
  if (durationMinutes < 60) {
    return `${durationMinutes} mins`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  const hourLabel = `${hours} ${hours === 1 ? "hr" : "hrs"}`;
  if (minutes === 0) {
    return hourLabel;
  }

  const minuteLabel = `${minutes} ${minutes === 1 ? "min" : "mins"}`;
  return `${hourLabel} ${minuteLabel}`;
};
