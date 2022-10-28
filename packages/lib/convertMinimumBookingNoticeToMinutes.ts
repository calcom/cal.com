export default function convertMinimumBookingNoticeToMinutes(type: string, minNotice: number) {
  if (type == "minute") {
    return minNotice;
  } else if (type == "hour") {
    return minNotice * 60;
  } else if (type == "day") {
    return minNotice * 1440;
  }
  return minNotice;
}
