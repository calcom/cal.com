import type { Dayjs } from "dayjs";

import dayjs from "@calcom/dayjs";
import type { CurrentSeats } from "@calcom/lib/getUserAvailability";

// if true, there are conflicts.
export function checkForConflicts({
  busy,
  time,
  eventLength,
  currentSeats,
}: {
  busy: { start: Dayjs | Date; end: Dayjs | Date }[];
  time: Dayjs;
  eventLength: number;
  currentSeats?: CurrentSeats;
}) {
  // Early return
  if (!Array.isArray(busy) || busy.length < 1) {
    return false; // guaranteed no conflicts when there is no busy times.
  }
  // no conflicts if some seats are found for the current time slot
  if (currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString())) {
    return false;
  }
  const slotStart = time.valueOf();
  const slotEnd = slotStart + eventLength * 60 * 1000;

  const sortedBusyTimes = busy
    .map((busyTime) => ({
      start: busyTime.start.valueOf(),
      end: busyTime.end.valueOf(),
    }))
    .sort((a, b) => a.start - b.start);

  for (const busyTime of sortedBusyTimes) {
    if (busyTime.start >= slotEnd) {
      break;
    }
    if (busyTime.end <= slotStart) {
      continue;
    }
    return true;
  }

  return false;
}
