import dayjs from "@calcom/dayjs";

/**
 * Checks if a provided timeZone string is recognized as a valid timezone by dayjs.
 *
 * @param {string} timeZone - The timezone string to be verified.
 * @returns {boolean} - Returns 'true' if the provided timezone string is recognized as a valid timezone by dayjs. Otherwise, returns 'false'.
 *
 */
export const isSupportedTimeZone = (timeZone: string) => {
  try {
    dayjs().tz(timeZone);
    return true;
  } catch (error) {
    return false;
  }
};
