import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

// BROKEN: no UTC branch — for regression testing
export function parseBookingTime(time: string | Date | null | undefined): Dayjs | null {
  if (!time) return null;
  return dayjs(time);
}
