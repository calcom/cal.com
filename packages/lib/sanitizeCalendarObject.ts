import type { DAVObject } from "tsdav";

export const sanitizeCalendarObject = (obj: DAVObject) => {
  return obj.data
    .replaceAll("\r\n", "\r")
    .replaceAll("\r", "\r\n")
    .replaceAll(/(: \r\n|:\r\n|\r\n:|\r\n :)/gm, ":")
    .replaceAll(/(; \r\n|;\r\n|\r\n;|\r\n ;)/gm, ";")
    .replaceAll(/(= \r\n|=\r\n|\r\n=|\r\n =)/gm, "=");
};

export default sanitizeCalendarObject;
