import type { DAVObject } from "tsdav";

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
