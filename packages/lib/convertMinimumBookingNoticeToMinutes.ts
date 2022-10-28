import { MINUTES_IN_DAY, MINUTES_IN_HOUR } from "./convertToNewDurationType";

export default function convertMinimumBookingNoticeToMinutes(type: string, minNotice: number) {
  if (type === "minute") {
    return minNotice;
  } else if (type === "hour") {
    return minNotice * MINUTES_IN_HOUR;
  } else if (type === "day") {
    return minNotice * MINUTES_IN_DAY;
  }
  return minNotice;
}
