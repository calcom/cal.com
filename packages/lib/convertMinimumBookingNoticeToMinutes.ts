import { MINUTES_IN_DAY, MINUTES_IN_HOUR } from "./convertToNewDurationType";

export default function convertMinimumBookingNoticeToMinutes(type: string, minNotice: number) {
  if (type === "minutes") {
    return minNotice;
  } else if (type === "hours") {
    return minNotice * MINUTES_IN_HOUR;
  } else if (type === "days") {
    return minNotice * MINUTES_IN_DAY;
  }
  return minNotice;
}
