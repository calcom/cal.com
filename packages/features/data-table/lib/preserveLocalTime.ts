import dayjs from "@calcom/dayjs";

/**
 * Converts a timestamp to maintain the same local time in a different timezone.
 *
 * For example, if it's midnight (00:00) in Paris time:
 * - Input : "2025-05-22T22:00:00.000Z" (Midnight/00:00 in Paris)
 * - Output: "2025-05-22T15:00:00.000Z" (Midnight/00:00 in Seoul)
 *
 * This ensures that times like midnight (00:00) or end of day (23:59)
 * remain at those exact local times when converting between timezones.
 * The output timestamp is based on the timezone in the user's profile settings.
 */
export const preserveLocalTime = (isoString: string, originalTimeZone: string, targetTimeZone: string) => {
  // Parse the input time
  const time = dayjs(isoString).tz(originalTimeZone);
  // Get the wall clock time components
  const hours = time.hour();
  const minutes = time.minute();
  const seconds = time.second();
  const milliseconds = time.millisecond();

  // Create a new date in target timezone with same wall clock time
  return dayjs
    .tz(time.format("YYYY-MM-DD"), targetTimeZone)
    .hour(hours)
    .minute(minutes)
    .second(seconds)
    .millisecond(milliseconds)
    .toISOString();
};
