import dayjs from "@calcom/dayjs";

/**
 * Converts a time string to UTC format, handling timezone information if present
 * @param timeString - The time string which may include timezone information
 * @param timeZone - The timezone to use if no timezone is specified in the time string
 * @returns UTC formatted time string
 */
export const convertTimeToUTC = (timeString: string, timeZone: string): string => {
  // Check if the time string already has timezone information (ends with Z or has timezone offset)
  const hasTimezoneInfo = timeString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(timeString);

  if (hasTimezoneInfo) {
    // If timezone info is present, parse it and convert to UTC
    return dayjs(timeString).utc().format();
  } else {
    // If no timezone info, assume it's in the provided timezone and convert to UTC
    return dayjs(timeString).tz(timeZone).utc().format();
  }
};
