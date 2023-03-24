import type { DAVObject } from "tsdav";

/**
 * sanitizeCalendarObject is a utility function that cleans up and normalizes
 * the iCalendar data from a DAVObject before parsing it using the ICAL.js library.
 * It addresses issues with incorrect line endings, line folding, and unwanted line
 * breaks before colons, semicolons, and equal signs.
 *
 * @param {DAVObject} obj - The DAVObject containing the iCalendar data to be sanitized.
 * @returns {string} The sanitized iCalendar data.
 *
 * NOTE: This function is a workaround for handling improperly formatted iCalendar
 * data. It is recommended to use a well-formed iCalendar data source to avoid
 * the need for these manual corrections. This function may not cover all edge cases
 * and might still cause issues with specific inputs.
 */

export const sanitizeCalendarObject = (obj: DAVObject) => {
  return obj.data
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n ", "")
    .replaceAll("\n\t", "")
    .replaceAll("\n", "\r\n")
    .replaceAll(/(:[ \t]*\r\n[ \t]*:)/gm, ":")
    .replaceAll(/(;[ \t]*\r\n[ \t]*;)/gm, ";")
    .replaceAll(/(=[ \t]*\r\n[ \t]*=)/gm, "=");
};

export default sanitizeCalendarObject;
