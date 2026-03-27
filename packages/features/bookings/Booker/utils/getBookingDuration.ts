/**
 * Computes the duration in minutes of a booking from its start and end times.
 * Returns the duration if it's a valid option in the durationConfig, otherwise returns null.
 *
 * Used when rescheduling multi-duration events to preserve the original booking's duration.
 */
export const getBookingDuration = (
  startTime: Date | string,
  endTime: Date | string,
  durationConfig: number[]
): number | null => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationInMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  if (durationConfig.includes(durationInMinutes)) {
    return durationInMinutes;
  }

  return null;
};
